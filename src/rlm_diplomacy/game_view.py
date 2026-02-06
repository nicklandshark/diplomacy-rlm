"""Read-only game views injected into agent REPLs."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from rlm_diplomacy._vendor.diplomacy import Game, Map
from rlm_diplomacy._vendor.diplomacy.engine.message import GLOBAL


class GameView:
    """Read-only wrapper around the live Diplomacy game object."""

    __slots__ = ("__game", "power_name")

    def __init__(self, game: Game, power_name: str):
        object.__setattr__(self, "_GameView__game", game)
        object.__setattr__(self, "power_name", power_name.upper())

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

    def get_units(self, power_name: str | None = None) -> list[str] | dict[str, list[str]]:
        if power_name is not None:
            return list(self._game().get_units(power_name.upper()))
        raw = self._game().get_units()
        return {name: list(units) for name, units in raw.items()}

    def get_centers(self, power_name: str | None = None) -> list[str] | dict[str, list[str]]:
        if power_name is not None:
            return list(self._game().get_centers(power_name.upper()))
        raw = self._game().get_centers()
        return {name: list(centers) for name, centers in raw.items()}

    def get_all_possible_orders(self) -> dict[str, list[str]]:
        raw = self._game().get_all_possible_orders()
        return {loc: list(orders) for loc, orders in raw.items()}

    def get_orderable_locations(self, power_name: str | None = None) -> list[str]:
        target = (power_name or self.power_name).upper()
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
        return dict(visible)

    def get_message_history(self) -> dict[str, dict[int, Any]]:
        history: dict[str, dict[int, Any]] = {}
        for phase, messages in self._game().message_history.items():
            history[str(phase)] = dict(self._game().filter_messages(messages, self.power_name))
        return history

    def get_phase_history(self) -> list[Any]:
        return list(self._game().get_phase_history(game_role=self.power_name))

    def get_order_history(self) -> dict[str, dict[str, list[str]]]:
        return {str(phase): deepcopy(orders) for phase, orders in self._game().order_history.items()}

    def get_result_history(self) -> dict[str, dict[str, list[str]]]:
        return {
            str(phase): deepcopy(results)
            for phase, results in self._game().result_history.items()
        }

    @property
    def map(self) -> Map:
        return self._game().map

    @property
    def powers(self) -> dict[str, Any]:
        # Return deep copies to avoid leaking mutable back-references to the live game.
        return {name: deepcopy(power) for name, power in self._game().powers.items()}


class FilteredGameView(GameView):
    """GameView with target-scoped message visibility for conversation agents."""

    __slots__ = ("_targets",)

    def __init__(self, game: Game, power_name: str, targets: list[str]):
        super().__init__(game=game, power_name=power_name)
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
