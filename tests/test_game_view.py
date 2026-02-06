from __future__ import annotations

from rlm_diplomacy._vendor.diplomacy.engine.message import GLOBAL, Message
from rlm_diplomacy.game_view import GameView


def _hold_orders_for_power(game, power: str) -> list[str]:
    possible = game.get_all_possible_orders()
    orders: list[str] = []
    for loc in game.get_orderable_locations(power):
        options = possible.get(loc, [])
        hold = next((order for order in options if order.endswith(" H")), None)
        if hold:
            orders.append(hold)
    return orders


def _apply_all_holds(game) -> None:
    for power in game.get_units().keys():
        game.set_orders(power, _hold_orders_for_power(game, power))


def test_board_state_methods(fresh_game) -> None:
    view = GameView(fresh_game, "FRANCE")
    assert set(view.get_units("FRANCE")) == {"A PAR", "A MAR", "F BRE"}
    assert set(view.get_centers("FRANCE")) == {"PAR", "MAR", "BRE"}
    assert view.get_current_phase() == "S1901M"
    assert view.phase_type == "M"
    assert view.is_game_done is False


def test_messages_visibility_filtering(fresh_game) -> None:
    france = GameView(fresh_game, "FRANCE")
    england = GameView(fresh_game, "ENGLAND")
    russia = GameView(fresh_game, "RUSSIA")

    phase = fresh_game.get_current_phase()
    fresh_game.add_message(
        Message(sender="GERMANY", recipient=GLOBAL, phase=phase, message="global")
    )
    fresh_game.add_message(
        Message(sender="ENGLAND", recipient="FRANCE", phase=phase, message="private")
    )
    fresh_game.add_message(
        Message(sender="ENGLAND", recipient="RUSSIA", phase=phase, message="secret")
    )

    france_msgs = list(france.get_messages().values())
    england_msgs = list(england.get_messages().values())
    russia_msgs = list(russia.get_messages().values())

    assert any(msg.message == "global" for msg in france_msgs)
    assert any(msg.message == "private" for msg in france_msgs)
    assert not any(msg.message == "secret" for msg in france_msgs)

    assert any(msg.message == "private" for msg in england_msgs)
    assert any(msg.message == "secret" for msg in england_msgs)
    assert any(msg.message == "secret" for msg in russia_msgs)


def test_read_only_surface(fresh_game) -> None:
    view = GameView(fresh_game, "FRANCE")
    for blocked in [
        "set_orders",
        "process",
        "add_message",
        "clear_orders",
        "set_current_phase",
        "set_status",
    ]:
        assert not hasattr(view, blocked)


def test_live_reference_updates(fresh_game) -> None:
    view = GameView(fresh_game, "FRANCE")
    assert view.get_current_phase() == "S1901M"

    _apply_all_holds(fresh_game)
    fresh_game.process()

    assert view.get_current_phase() != "S1901M"


def test_map_access_and_abuts(fresh_game) -> None:
    view = GameView(fresh_game, "FRANCE")
    assert bool(view.map.abuts("A", "PAR", "-", "BUR")) is True
    assert bool(view.map.abuts("A", "PAR", "-", "LON")) is False


def test_visible_powers_filtering(fresh_game) -> None:
    view = GameView(fresh_game, "FRANCE", visible_powers=["FRANCE", "GERMANY"])
    units = view.get_units()
    centers = view.get_centers()
    powers = view.powers
    assert set(units.keys()) == {"FRANCE", "GERMANY"}
    assert set(centers.keys()) == {"FRANCE", "GERMANY"}
    assert set(powers.keys()) == {"FRANCE", "GERMANY"}
    assert view.get_units("ITALY") == []
    assert view.get_centers("ITALY") == []
