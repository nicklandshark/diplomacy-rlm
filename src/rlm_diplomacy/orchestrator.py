"""Top-level game orchestrator for Diplomacy RLM."""

from __future__ import annotations

import json
import logging
import os
import shutil
import time
from concurrent.futures import ThreadPoolExecutor, as_completed, wait
from pathlib import Path
from typing import Any

import dill

from rlm_diplomacy._vendor.diplomacy import Game
from rlm_diplomacy._vendor.diplomacy.engine.message import GLOBAL

from .agents import ConversationAgent, StrategistAgent
from .data_model import ALL_POWERS, ConversationRequest, ConversationSummary, GameConfig, GameHaltError
from .memory import MemoryManager
from .message_router import MessageRouter
from .timer import PhaseTimer

logger = logging.getLogger(__name__)


class Orchestrator:
    """Coordinates strategists, conversations, order submission, and game progression."""

    def __init__(self, config: GameConfig):
        self.config = config

        self.game_dir = Path(config.game_dir).expanduser().resolve()
        self.game_dir.mkdir(parents=True, exist_ok=True)
        self.snapshots_dir = self.game_dir / "snapshots"
        self.snapshots_dir.mkdir(parents=True, exist_ok=True)
        self.game_log_path = self.game_dir / "game_log.jsonl"

        self.game = Game()
        self.memory = MemoryManager(str(self.game_dir))
        self.memory.initialize_all()
        self.router = MessageRouter(self.game)

        self.strategists: dict[str, StrategistAgent] = {
            power: StrategistAgent(
                power_name=power,
                game=self.game,
                memory=self.memory,
                config=config,
            )
            for power in ALL_POWERS
        }

        self._notified_messages: set[int] = set()

    def run(self) -> None:
        try:
            self._bootstrap_all()

            while not self.game.is_game_done:
                phase = self.game.get_current_phase()
                phase_start = time.monotonic()

                if phase not in ("FORMING", "COMPLETED"):
                    year = int(phase[1:5])
                    if year > self.config.max_year:
                        break

                phase_type = self.game.phase_type
                if phase_type == "M":
                    self._run_movement_phase()
                elif phase_type == "R":
                    self._run_retreat_phase()
                elif phase_type == "A":
                    self._run_adjustment_phase()

                self.game.process()

                if phase_type == "M":
                    self._save_snapshot(phase)

                self._log_event(
                    {
                        "phase": phase,
                        "event": "processed",
                        "duration_seconds": round(time.monotonic() - phase_start, 3),
                    }
                )
        except GameHaltError:
            self._save_snapshot(self.game.get_current_phase())
            self._log_event(
                {
                    "phase": self.game.get_current_phase(),
                    "event": "halt",
                }
            )
            raise
        finally:
            for strategist in self.strategists.values():
                strategist.close()

    @classmethod
    def from_snapshot(cls, snapshot_dir: str, config: GameConfig) -> "Orchestrator":
        snapshot_path = Path(snapshot_dir).expanduser().resolve()

        game = Game()
        with (snapshot_path / "game_state.json").open("r", encoding="utf-8") as f:
            state = json.load(f)
        game.set_state(state, clear_history=True)

        orch = cls.__new__(cls)
        orch.config = config
        orch.game_dir = Path(config.game_dir).expanduser().resolve()
        orch.game_dir.mkdir(parents=True, exist_ok=True)
        orch.snapshots_dir = orch.game_dir / "snapshots"
        orch.snapshots_dir.mkdir(parents=True, exist_ok=True)
        orch.game_log_path = orch.game_dir / "game_log.jsonl"

        orch.game = game
        orch.memory = MemoryManager(str(orch.game_dir))
        orch.router = MessageRouter(orch.game)
        orch._notified_messages = set()

        memory_src = snapshot_path / "memory"
        if memory_src.exists():
            for md_file in memory_src.glob("*_memory.md"):
                shutil.copy(md_file, orch.game_dir / md_file.name)

        orch.strategists = {}
        for power in ALL_POWERS:
            strategist = StrategistAgent(
                power_name=power,
                game=orch.game,
                memory=orch.memory,
                config=config,
            )
            strategist.bootstrap()

            dill_path = snapshot_path / "repl_state" / f"{power}.dill"
            if dill_path.exists() and strategist.rlm._persistent_env is not None:
                with dill_path.open("rb") as f:
                    saved_state = dill.load(f)
                strategist.rlm._persistent_env.locals.update(saved_state)

            strategist.inject(PhaseTimer(0.0), include_submit_orders=False)
            orch.strategists[power] = strategist

        return orch

    def _bootstrap_all(self) -> None:
        with ThreadPoolExecutor(max_workers=7) as pool:
            futures = {
                pool.submit(strategist.bootstrap): power
                for power, strategist in self.strategists.items()
            }
            for future in as_completed(futures):
                future.result()

    def _run_movement_phase(self) -> None:
        phase = self.game.get_current_phase()

        requests, timed_out_strategize = self._run_strategize_step(phase)
        summaries = self._run_converse_step(phase, requests)
        self._run_decide_step(phase, summaries, timed_out_strategize)

    def _run_retreat_phase(self) -> None:
        self._run_decide_only()

    def _run_adjustment_phase(self) -> None:
        self._run_decide_only()

    def _run_strategize_step(self, phase: str) -> tuple[dict[str, ConversationRequest], set[str]]:
        timer = PhaseTimer(self.config.strategize_timeout)

        futures: dict[Any, str] = {}
        with ThreadPoolExecutor(max_workers=7) as pool:
            for power, strategist in self._active_strategists():
                strategist.inject(timer, include_submit_orders=False)
                futures[pool.submit(strategist.strategize, phase)] = power

            done, not_done = wait(futures, timeout=timer.remaining())

        for future in done:
            future.result()

        timed_out = {futures[future] for future in not_done}

        requests: dict[str, ConversationRequest] = {}
        for power, strategist in self._active_strategists():
            if power in timed_out:
                continue
            req = strategist.get_conversation_requests()
            if req is not None and req.objectives:
                requests[power] = req

        self._log_event(
            {
                "phase": phase,
                "event": "strategize_complete",
                "requests": {power: len(req.objectives) for power, req in requests.items()},
            }
        )
        return requests, timed_out

    def _run_converse_step(
        self,
        phase: str,
        requests: dict[str, ConversationRequest],
    ) -> dict[str, list[ConversationSummary]]:
        if not requests:
            self._log_event({"phase": phase, "event": "converse_complete", "rounds": 0, "agents": 0, "messages": 0})
            return {}

        agents: dict[str, ConversationAgent] = {}
        for power, request in requests.items():
            agent = ConversationAgent(
                power_name=power,
                targets=list(request.objectives.keys()),
                objectives=request.objectives,
                game=self.game,
                memory_snapshot=self.memory.read_snapshot(power),
                router=self.router,
                config=self.config,
            )
            agent.bootstrap()
            agents[power] = agent

        timer = PhaseTimer(self.config.converse_timeout)
        round_num = 0
        messages_sent = 0
        active = list(agents.values())

        while active and not timer.expired and round_num < self.config.converse_max_rounds:
            round_num += 1

            with ThreadPoolExecutor(max_workers=len(active)) as pool:
                futures = {pool.submit(agent.run_round, round_num): agent for agent in active}
                done, not_done = wait(futures, timeout=timer.remaining())

            for future in done:
                future.result()
            for future in not_done:
                futures[future].force_finish()

            flushed = self.router.flush()
            messages_sent += len(flushed)
            self._update_response_tracking(flushed, agents)

            self._process_incoming_chats(agents, phase)
            self._check_target_timeouts(agents)

            active = [agent for agent in active if not agent.is_finished]

        for agent in active:
            agent.force_finish()

        summaries: dict[str, list[ConversationSummary]] = {}
        for power, agent in agents.items():
            summaries[power] = [agent.get_summary()]
            agent.close()

        self._log_event(
            {
                "phase": phase,
                "event": "converse_complete",
                "rounds": round_num,
                "agents": len(agents),
                "messages": messages_sent,
            }
        )
        return summaries

    def _run_decide_step(
        self,
        phase: str,
        summaries_by_power: dict[str, list[ConversationSummary]],
        strategize_timed_out: set[str],
    ) -> None:
        # Prepare unread context for powers that were not involved in any active conversations.
        involved_powers: set[str] = set()
        for power, summaries in summaries_by_power.items():
            involved_powers.add(power)
            for summary in summaries:
                involved_powers.update(summary.targets)

        for power, strategist in self._active_strategists():
            strategist.deliver_results(
                summaries_by_power.get(power, []),
                self.router.get_unread(involved_powers),
            )

        timer = PhaseTimer(self.config.decide_timeout)

        futures: dict[Any, str] = {}
        with ThreadPoolExecutor(max_workers=7) as pool:
            for power, strategist in self._active_strategists():
                strategist.inject(timer, include_submit_orders=True)
                futures[pool.submit(strategist.decide, phase)] = power

            done, not_done = wait(futures, timeout=timer.remaining())

        for future in done:
            future.result()

        timed_out = {futures[future] for future in not_done}

        order_counts: dict[str, int] = {}
        for power, strategist in self._active_strategists():
            orders = strategist.get_submitted_orders()
            if power in timed_out or power in strategize_timed_out or orders is None:
                applied = self._apply_default_orders(power)
            else:
                self.game.set_orders(power, orders)
                applied = list(orders)
            order_counts[power] = len(applied)

        self._log_event(
            {
                "phase": phase,
                "event": "decide_complete",
                "orders": order_counts,
            }
        )

    def _run_decide_only(self) -> None:
        phase = self.game.get_current_phase()
        timer = PhaseTimer(self.config.decide_timeout)

        futures: dict[Any, str] = {}
        with ThreadPoolExecutor(max_workers=7) as pool:
            for power, strategist in self._active_strategists():
                strategist.inject(timer, include_submit_orders=True)
                futures[pool.submit(strategist.decide, phase)] = power

            done, not_done = wait(futures, timeout=timer.remaining())

        for future in done:
            future.result()

        timed_out = {futures[future] for future in not_done}

        order_counts: dict[str, int] = {}
        for power, strategist in self._active_strategists():
            orders = strategist.get_submitted_orders()
            if power in timed_out or orders is None:
                applied = self._apply_default_orders(power)
            else:
                self.game.set_orders(power, orders)
                applied = list(orders)
            order_counts[power] = len(applied)

        self._log_event({"phase": phase, "event": "decide_complete", "orders": order_counts})

    def _apply_default_orders(self, power: str) -> list[str]:
        phase_type = self.game.phase_type
        possible = self.game.get_all_possible_orders()
        orderable = self.game.get_orderable_locations(power)

        if phase_type == "M":
            orders: list[str] = []
            for loc in orderable:
                hold = self._pick_first_matching_order(possible, loc, lambda order: order.endswith(" H"))
                if hold:
                    orders.append(hold)
            self.game.set_orders(power, orders)
            return orders

        if phase_type == "R":
            orders = []
            for loc in orderable:
                disband = self._pick_first_matching_order(
                    possible, loc, lambda order: order.endswith(" D")
                )
                if disband:
                    orders.append(disband)
            self.game.set_orders(power, orders)
            return orders

        # Adjustment phase.
        build_count = len(self.game.get_centers(power)) - len(self.game.get_units(power))
        if build_count > 0:
            orders = ["WAIVE"] * build_count
            self.game.set_orders(power, orders)
            return orders

        if build_count < 0:
            units = self.game.get_units(power)
            excess = -build_count
            disband_locs = self._farthest_unit_locations(power, units, excess)
            orders = []
            for loc in disband_locs:
                disband = self._pick_first_matching_order(
                    possible, loc, lambda order: order.endswith(" D")
                )
                if disband:
                    orders.append(disband)
            self.game.set_orders(power, orders)
            return orders

        self.game.set_orders(power, [])
        return []

    def _pick_first_matching_order(
        self,
        possible: dict[str, list[str]],
        loc: str,
        predicate,
    ) -> str | None:
        candidates = list(possible.get(loc, []))
        if "/" in loc:
            candidates.extend(possible.get(loc[:3], []))
        else:
            for key, vals in possible.items():
                if key.startswith(loc + "/"):
                    candidates.extend(vals)

        for candidate in candidates:
            if predicate(candidate):
                return candidate
        return None

    def _farthest_unit_locations(self, power: str, units: list[str], count: int) -> list[str]:
        homes = list(self.game.powers[power].homes or [])
        locs = [unit.split()[1] for unit in units]

        def base(loc: str) -> str:
            return loc[:3]

        def neighbors(loc: str) -> set[str]:
            adjacent = self.game.map.loc_abut.get(loc, [])
            return {adj[:3] for adj in adjacent}

        def min_distance(start: str) -> int:
            if not homes:
                return 10_000
            start_base = base(start)
            target_bases = {base(home) for home in homes}
            if start_base in target_bases:
                return 0

            visited = {start_base}
            frontier = {start_base}
            distance = 0
            while frontier and distance < 30:
                distance += 1
                next_frontier: set[str] = set()
                for node in frontier:
                    for nxt in neighbors(node):
                        if nxt in visited:
                            continue
                        if nxt in target_bases:
                            return distance
                        visited.add(nxt)
                        next_frontier.add(nxt)
                frontier = next_frontier
            return 10_000

        ranked = sorted(locs, key=lambda loc: (min_distance(loc), loc), reverse=True)
        return ranked[:count]

    def _process_incoming_chats(self, agents: dict[str, ConversationAgent], phase: str) -> None:
        for timestamp, msg in self.game.messages.items():
            if timestamp in self._notified_messages:
                continue
            if msg.recipient == GLOBAL:
                continue
            if msg.recipient not in agents:
                continue

            recipient_agent = agents[msg.recipient]
            sender = msg.sender.upper()

            if sender in recipient_agent.targets:
                continue

            accepted, objective = self.strategists[msg.recipient].notify_incoming_chat(
                sender=sender,
                message=msg.message,
                phase=phase,
            )
            self._notified_messages.add(timestamp)
            if accepted and objective:
                recipient_agent.add_target(sender, objective)

    def _check_target_timeouts(self, agents: dict[str, ConversationAgent]) -> None:
        for agent in agents.values():
            for power in agent.timed_out_targets(self.config.target_response_timeout):
                agent.note_target_timeout(power)

    def _update_response_tracking(
        self,
        flushed: list[Any],
        agents: dict[str, ConversationAgent],
    ) -> None:
        for pending in flushed:
            if pending.recipient == GLOBAL:
                continue
            recipient = pending.recipient
            if recipient in agents:
                agents[recipient].mark_target_responded(pending.sender)

    def _active_strategists(self):
        for power, strategist in self.strategists.items():
            if power not in self.game.powers:
                continue
            if not self.game.powers[power].is_eliminated():
                yield power, strategist

    def _snapshot_repl_state(self, strategist: StrategistAgent) -> bytes:
        env = strategist.rlm._persistent_env
        if env is None:
            return dill.dumps({})

        state: dict[str, Any] = {}
        merged = {}
        merged.update(getattr(env, "globals", {}))
        merged.update(getattr(env, "locals", {}))
        for key, value in merged.items():
            if key.startswith("_"):
                continue
            if key in {
                "game_view",
                "submit_orders",
                "time_remaining",
                "memory_path",
                "send_message",
                "accept_chat",
                "decline_chat",
            }:
                continue
            try:
                dill.dumps(value)
            except Exception:
                continue
            state[key] = value

        return dill.dumps(state)

    def _save_snapshot(self, phase: str | None = None) -> None:
        if phase is None:
            phase = self.game.get_current_phase()
        snapshot_dir = self.snapshots_dir / phase
        snapshot_dir.mkdir(parents=True, exist_ok=True)

        with (snapshot_dir / "game_state.json").open("w", encoding="utf-8") as f:
            json.dump(self.game.get_state(), f, indent=2, sort_keys=True)

        with (snapshot_dir / "orders.json").open("w", encoding="utf-8") as f:
            json.dump(self.game.get_orders(), f, indent=2, sort_keys=True)

        results = self.game.result_history.last_value() if self.game.result_history else {}
        with (snapshot_dir / "results.json").open("w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, sort_keys=True)

        messages = {
            ts: {
                "sender": msg.sender,
                "recipient": msg.recipient,
                "phase": msg.phase,
                "message": msg.message,
            }
            for ts, msg in self.game.messages.items()
        }
        with (snapshot_dir / "messages.json").open("w", encoding="utf-8") as f:
            json.dump(messages, f, indent=2, sort_keys=True)

        memory_dir = snapshot_dir / "memory"
        memory_dir.mkdir(exist_ok=True)
        for power in ALL_POWERS:
            src = Path(self.memory.memory_path(power))
            if src.exists():
                shutil.copy(src, memory_dir / src.name)

        repl_dir = snapshot_dir / "repl_state"
        repl_dir.mkdir(exist_ok=True)
        for power, strategist in self.strategists.items():
            with (repl_dir / f"{power}.dill").open("wb") as f:
                f.write(self._snapshot_repl_state(strategist))

    def _log_event(self, event: dict[str, Any]) -> None:
        with self.game_log_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(event, sort_keys=True) + "\n")
