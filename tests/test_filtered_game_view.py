from __future__ import annotations

from rlm_diplomacy._vendor.diplomacy.engine.message import GLOBAL, Message
from rlm_diplomacy.game_view import FilteredGameView


def test_filtered_messages_targets_and_global(fresh_game) -> None:
    phase = fresh_game.get_current_phase()
    view = FilteredGameView(fresh_game, "FRANCE", ["ENGLAND", "ITALY"])

    fresh_game.add_message(
        Message(sender="ENGLAND", recipient="FRANCE", phase=phase, message="eng->fra")
    )
    fresh_game.add_message(
        Message(sender="FRANCE", recipient="ITALY", phase=phase, message="fra->ita")
    )
    fresh_game.add_message(
        Message(sender="GERMANY", recipient="FRANCE", phase=phase, message="ger->fra")
    )
    fresh_game.add_message(
        Message(sender="GERMANY", recipient=GLOBAL, phase=phase, message="global")
    )
    fresh_game.add_message(
        Message(sender="ENGLAND", recipient="RUSSIA", phase=phase, message="eng->rus")
    )

    messages = list(view.get_messages().values())
    contents = {m.message for m in messages}

    assert "eng->fra" in contents
    assert "fra->ita" in contents
    assert "global" in contents
    assert "ger->fra" not in contents
    assert "eng->rus" not in contents


def test_add_target_and_history_filter(fresh_game) -> None:
    phase = fresh_game.get_current_phase()
    view = FilteredGameView(fresh_game, "FRANCE", ["ENGLAND"])

    fresh_game.add_message(
        Message(sender="GERMANY", recipient="FRANCE", phase=phase, message="pre-add")
    )
    assert all(m.message != "pre-add" for m in view.get_messages().values())

    view.add_target("GERMANY")
    assert any(m.message == "pre-add" for m in view.get_messages().values())

    # Message history stores archived (processed) phases, not the current live phase.
    for power in fresh_game.get_units().keys():
        possible = fresh_game.get_all_possible_orders()
        holds = []
        for loc in fresh_game.get_orderable_locations(power):
            hold = next((order for order in possible.get(loc, []) if order.endswith(" H")), None)
            if hold:
                holds.append(hold)
        fresh_game.set_orders(power, holds)
    fresh_game.process()

    history = view.get_message_history()
    assert phase in history
    assert any(m.message == "pre-add" for m in history[phase].values())


def test_empty_targets_only_global(fresh_game) -> None:
    phase = fresh_game.get_current_phase()
    view = FilteredGameView(fresh_game, "FRANCE", [])

    fresh_game.add_message(
        Message(sender="ENGLAND", recipient="FRANCE", phase=phase, message="private")
    )
    fresh_game.add_message(
        Message(sender="GERMANY", recipient=GLOBAL, phase=phase, message="global")
    )

    msgs = list(view.get_messages().values())
    assert len(msgs) == 1
    assert msgs[0].recipient == GLOBAL
