"""Read-only game views injected into agent REPLs."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from rlm_diplomacy._vendor.diplomacy import Game, Map
from rlm_diplomacy._vendor.diplomacy.engine.message import GLOBAL


class GameView:
    """Read-only wrapper around the live Diplomacy game object."""

    __slots__ = ("__game", "power_name", "_visible_powers")

    def __init__(self, game: Game, power_name: str, visible_powers: list[str] | None = None):
        object.__setattr__(self, "_GameView__game", game)
        object.__setattr__(self, "power_name", power_name.upper())
        visible = (
            frozenset(str(name).upper() for name in visible_powers)
            if visible_powers is not None
            else None
        )
        object.__setattr__(self, "_visible_powers", visible)

    def __dir__(self) -> list[str]:
        # Hide implementation-private attributes from casual introspection.
        return sorted(
            [
                "get_units",
                "get_centers",
                "get_all_possible_orders",
                "get_orderable_locations",
                "get_current_phase",
                "phase_type",
                "is_game_done",
                "get_visible_powers",
                "get_messages",
                "get_message_history",
                "get_phase_history",
                "get_order_history",
                "get_result_history",
                "map",
                "powers",
                "power_name",
            ]
        )

    def _game(self) -> Game:
        return object.__getattribute__(self, "_GameView__game")

    def _is_visible_power(self, power: str) -> bool:
        visible = self._visible_powers
        if visible is None:
            return True
        return power.upper() in visible

    def get_visible_powers(self) -> list[str]:
        visible = self._visible_powers
        if visible is None:
            return [name for name in self._game().powers.keys()]
        return [name for name in self._game().powers.keys() if name in visible]

    def get_units(self, power_name: str | None = None) -> list[str] | dict[str, list[str]]:
        if power_name is not None:
            target = power_name.upper()
            if not self._is_visible_power(target):
                return []
            return list(self._game().get_units(target))
        raw = self._game().get_units()
        return {
            name: list(units)
            for name, units in raw.items()
            if self._is_visible_power(name)
        }

    def get_centers(self, power_name: str | None = None) -> list[str] | dict[str, list[str]]:
        if power_name is not None:
            target = power_name.upper()
            if not self._is_visible_power(target):
                return []
            return list(self._game().get_centers(target))
        raw = self._game().get_centers()
        return {
            name: list(centers)
            for name, centers in raw.items()
            if self._is_visible_power(name)
        }

    def get_all_possible_orders(self) -> dict[str, list[str]]:
        raw = self._game().get_all_possible_orders()
        if self._visible_powers is None:
            return {loc: list(orders) for loc, orders in raw.items()}

        allowed_locations: set[str] = set()
        for power in self.get_visible_powers():
            allowed_locations.update(self._game().get_orderable_locations(power))
        allowed_bases = {loc[:3] for loc in allowed_locations}
        return {
            loc: list(orders)
            for loc, orders in raw.items()
            if (loc in allowed_locations or loc[:3] in allowed_bases)
        }

    def get_orderable_locations(self, power_name: str | None = None) -> list[str]:
        target = (power_name or self.power_name).upper()
        if not self._is_visible_power(target):
            return []
        return list(self._game().get_orderable_locations(target))

    def get_current_phase(self) -> str:
        return self._game().get_current_phase()

    @property
    def phase_type(self) -> str:
        phase = self.get_current_phase()
        if phase in ("FORMING", "COMPLETED"):
            return "-"
        return phase[-1]

    @property
    def is_game_done(self) -> bool:
        return bool(self._game().is_game_done)

    def get_messages(self) -> dict[int, Any]:
        visible = self._game().filter_messages(self._game().messages, self.power_name)
        if self._visible_powers is None:
            return dict(visible)
        filtered: dict[int, Any] = {}
        all_powers = set(self._game().powers.keys())
        for ts, msg in visible.items():
            sender = str(getattr(msg, "sender", "")).upper()
            recipient = str(getattr(msg, "recipient", "")).upper()
            if sender in all_powers and not self._is_visible_power(sender):
                continue
            if recipient in all_powers and not self._is_visible_power(recipient):
                continue
            filtered[ts] = msg
        return filtered

    def get_message_history(self) -> dict[str, dict[int, Any]]:
        history: dict[str, dict[int, Any]] = {}
        all_powers = set(self._game().powers.keys())
        for phase, messages in self._game().message_history.items():
            visible = dict(self._game().filter_messages(messages, self.power_name))
            if self._visible_powers is None:
                history[str(phase)] = visible
                continue
            history[str(phase)] = {
                ts: msg
                for ts, msg in visible.items()
                if (
                    (
                        str(getattr(msg, "sender", "")).upper() not in all_powers
                        or self._is_visible_power(str(getattr(msg, "sender", "")).upper())
                    )
                    and (
                        str(getattr(msg, "recipient", "")).upper() not in all_powers
                        or self._is_visible_power(str(getattr(msg, "recipient", "")).upper())
                    )
                )
            }
        return history

    def get_phase_history(self) -> list[Any]:
        return list(self._game().get_phase_history(game_role=self.power_name))

    def get_order_history(self) -> dict[str, dict[str, list[str]]]:
        if self._visible_powers is None:
            return {str(phase): deepcopy(orders) for phase, orders in self._game().order_history.items()}
        return {
            str(phase): {
                power: deepcopy(power_orders)
                for power, power_orders in orders.items()
                if self._is_visible_power(power)
            }
            for phase, orders in self._game().order_history.items()
        }

    def get_result_history(self) -> dict[str, dict[str, list[str]]]:
        if self._visible_powers is None:
            return {
                str(phase): deepcopy(results)
                for phase, results in self._game().result_history.items()
            }
        return {
            str(phase): {
                power: deepcopy(power_results)
                for power, power_results in results.items()
                if self._is_visible_power(power)
            }
            for phase, results in self._game().result_history.items()
        }

    @property
    def map(self) -> Map:
        return self._game().map

    @property
    def powers(self) -> dict[str, Any]:
        # Return deep copies to avoid leaking mutable back-references to the live game.
        return {
            name: deepcopy(power)
            for name, power in self._game().powers.items()
            if self._is_visible_power(name)
        }


class FilteredGameView(GameView):
    """GameView with target-scoped message visibility for conversation agents."""

    __slots__ = ("_targets",)

    def __init__(
        self,
        game: Game,
        power_name: str,
        targets: list[str],
        visible_powers: list[str] | None = None,
    ):
        super().__init__(game=game, power_name=power_name, visible_powers=visible_powers)
        self._targets: set[str] = {target.upper() for target in targets}

    def add_target(self, target: str) -> None:
        self._targets.add(target.upper())

    def get_messages(self) -> dict[int, Any]:
        all_msgs = super().get_messages()
        power_name = self.power_name
        targets = self._targets
        return {
            ts: msg
            for ts, msg in all_msgs.items()
            if (
                (
                    (msg.sender in targets or msg.recipient in targets)
                    and (msg.sender == power_name or msg.recipient == power_name)
                )
                or msg.recipient == GLOBAL
            )
        }

    def get_message_history(self) -> dict[str, dict[int, Any]]:
        history = super().get_message_history()
        power_name = self.power_name
        targets = self._targets
        filtered: dict[str, dict[int, Any]] = {}
        for phase, messages in history.items():
            filtered[phase] = {
                ts: msg
                for ts, msg in messages.items()
                if (
                    (
                        (msg.sender in targets or msg.recipient in targets)
                        and (msg.sender == power_name or msg.recipient == power_name)
                    )
                    or msg.recipient == GLOBAL
                )
            }
        return filtered
