"""Helpers for bridging agent state into/out of Modal sandbox completions."""

from __future__ import annotations

import ast
import json
from typing import Any


def _serialize_message(message: Any) -> dict[str, Any]:
    return {
        "sender": str(getattr(message, "sender", "")),
        "recipient": str(getattr(message, "recipient", "")),
        "message": str(getattr(message, "message", "")),
        "phase": str(getattr(message, "phase", "")),
        "time_sent": getattr(message, "time_sent", None),
    }


def _serialize_messages(messages: dict[Any, Any]) -> list[dict[str, Any]]:
    serialized: list[dict[str, Any]] = []
    sortable: list[tuple[int, Any]] = []
    for key, message in messages.items():
        ts = getattr(message, "time_sent", None)
        if isinstance(ts, int):
            sortable.append((ts, message))
            continue
        if isinstance(key, int):
            sortable.append((key, message))
        else:
            sortable.append((len(sortable), message))
    for _, message in sorted(sortable, key=lambda pair: pair[0]):
        serialized.append(_serialize_message(message))
    return serialized


def build_game_snapshot(game: Any, game_view: Any, power_name: str) -> dict[str, Any]:
    units = game_view.get_units()
    centers = game_view.get_centers()
    orderable_locations_by_power = {
        name: list(game.get_orderable_locations(name))
        for name in sorted(units.keys())
    }
    messages = _serialize_messages(game_view.get_messages())
    message_history = {
        str(phase): _serialize_messages(phase_messages)
        for phase, phase_messages in game_view.get_message_history().items()
    }
    powers_summary = {
        name: {
            "units": list(units.get(name, [])),
            "centers": list(centers.get(name, [])),
        }
        for name in sorted(units.keys())
    }
    return {
        "power_name": power_name.upper(),
        "current_phase": game_view.get_current_phase(),
        "phase_type": game_view.phase_type,
        "is_game_done": bool(game_view.is_game_done),
        "units": units,
        "centers": centers,
        "all_possible_orders": game_view.get_all_possible_orders(),
        "orderable_locations_by_power": orderable_locations_by_power,
        "messages": messages,
        "message_history": message_history,
        "order_history": game_view.get_order_history(),
        "result_history": game_view.get_result_history(),
        "phase_history": [str(entry) for entry in game_view.get_phase_history()],
        "powers": powers_summary,
    }


def build_strategist_setup_code(memory_path: str) -> str:
    return f"""
import time as _bridge_time

class _BridgeMessage:
    __slots__ = ("sender", "recipient", "message", "phase", "time_sent")

    def __init__(self, payload):
        payload = payload or {{}}
        self.sender = str(payload.get("sender", ""))
        self.recipient = str(payload.get("recipient", ""))
        self.message = str(payload.get("message", ""))
        self.phase = str(payload.get("phase", ""))
        self.time_sent = payload.get("time_sent")


class _SnapshotGameView:
    def __init__(self):
        self.power_name = ""
        self._snapshot = {{}}

    def _copy(self, value):
        if isinstance(value, dict):
            return {{k: self._copy(v) for k, v in value.items()}}
        if isinstance(value, list):
            return [self._copy(v) for v in value]
        return value

    def _set_snapshot(self, snapshot):
        snapshot = snapshot or {{}}
        self._snapshot = self._copy(snapshot)
        self.power_name = str(snapshot.get("power_name", "")).upper()

    def get_units(self, power_name=None):
        units = self._snapshot.get("units", {{}})
        if power_name is None:
            return {{name: list(vals) for name, vals in units.items()}}
        return list(units.get(str(power_name).upper(), []))

    def get_centers(self, power_name=None):
        centers = self._snapshot.get("centers", {{}})
        if power_name is None:
            return {{name: list(vals) for name, vals in centers.items()}}
        return list(centers.get(str(power_name).upper(), []))

    def get_all_possible_orders(self):
        raw = self._snapshot.get("all_possible_orders", {{}})
        return {{loc: list(orders) for loc, orders in raw.items()}}

    def get_orderable_locations(self, power_name=None):
        raw = self._snapshot.get("orderable_locations_by_power", {{}})
        key = str(power_name or self.power_name).upper()
        return list(raw.get(key, []))

    def get_current_phase(self):
        return str(self._snapshot.get("current_phase", ""))

    @property
    def phase_type(self):
        return str(self._snapshot.get("phase_type", "-"))

    @property
    def is_game_done(self):
        return bool(self._snapshot.get("is_game_done", False))

    def get_messages(self):
        data = self._snapshot.get("messages", [])
        return {{
            int(entry.get("time_sent") or idx): _BridgeMessage(entry)
            for idx, entry in enumerate(data)
        }}

    def get_message_history(self):
        history = self._snapshot.get("message_history", {{}})
        return {{
            str(phase): {{
                int(entry.get("time_sent") or idx): _BridgeMessage(entry)
                for idx, entry in enumerate(entries)
            }}
            for phase, entries in history.items()
        }}

    def get_phase_history(self):
        return list(self._snapshot.get("phase_history", []))

    def get_order_history(self):
        return self._copy(self._snapshot.get("order_history", {{}}))

    def get_result_history(self):
        return self._copy(self._snapshot.get("result_history", {{}}))

    @property
    def map(self):
        return None

    @property
    def powers(self):
        return self._copy(self._snapshot.get("powers", {{}}))


game_view = _SnapshotGameView()
memory_path = {memory_path!r}
conversation_results = []
unread_messages = []
_bridge_deadline_epoch = 0.0
_bridge_allow_submit_orders = False
_bridge_submitted_orders = None
_bridge_expected_sender = None
_bridge_chat_decision = None


def _bridge_apply_state(state):
    global conversation_results
    global unread_messages
    global _bridge_deadline_epoch
    global _bridge_allow_submit_orders
    global _bridge_submitted_orders
    global _bridge_expected_sender
    global _bridge_chat_decision

    state = state or {{}}
    game_view._set_snapshot(state.get("game_view", {{}}))
    conversation_results = list(state.get("conversation_results", []))
    unread_messages = list(state.get("unread_messages", []))
    _bridge_allow_submit_orders = bool(state.get("allow_submit_orders", False))
    remaining = float(state.get("time_remaining_seconds", 0.0))
    if remaining < 0.0:
        remaining = 0.0
    _bridge_deadline_epoch = _bridge_time.time() + remaining
    _bridge_submitted_orders = None
    _bridge_expected_sender = state.get("incoming_sender")
    _bridge_chat_decision = None

    memory_text = state.get("memory_text")
    if isinstance(memory_text, str):
        with open(memory_path, "w", encoding="utf-8") as _bridge_file:
            _bridge_file.write(memory_text)


def _bridge_export_state():
    global _bridge_submitted_orders
    global _bridge_chat_decision

    memory_text = ""
    try:
        with open(memory_path, "r", encoding="utf-8") as _bridge_file:
            memory_text = _bridge_file.read()
    except Exception:
        memory_text = ""

    exported = {{
        "memory_text": memory_text,
        "submitted_orders": _bridge_submitted_orders,
        "chat_decision": _bridge_chat_decision,
    }}
    _bridge_submitted_orders = None
    _bridge_chat_decision = None
    return exported


def time_remaining():
    return max(0.0, _bridge_deadline_epoch - _bridge_time.time())


def submit_orders(orders):
    global _bridge_submitted_orders
    if not _bridge_allow_submit_orders:
        return "Error: submit_orders is only available during DECIDE."
    if _bridge_submitted_orders is not None:
        return "Error: orders already submitted. First submission is final."
    if not isinstance(orders, list):
        return "Error: submit_orders expects a list of order strings."
    _bridge_submitted_orders = [str(order) for order in orders]
    return f"Accepted {{len(_bridge_submitted_orders)}} orders."


def accept_chat(power, objective):
    global _bridge_chat_decision
    power = str(power).upper()
    expected = str(_bridge_expected_sender or "").upper()
    if expected and power != expected:
        return f"Error: expected sender {{expected}}, got {{power}}."
    _bridge_chat_decision = {{
        "accepted": True,
        "objective": str(objective),
    }}
    return f"Accepted chat with {{power}}."


def decline_chat(power):
    global _bridge_chat_decision
    power = str(power).upper()
    expected = str(_bridge_expected_sender or "").upper()
    if expected and power != expected:
        return f"Error: expected sender {{expected}}, got {{power}}."
    _bridge_chat_decision = {{
        "accepted": False,
        "objective": "",
    }}
    return f"Declined chat with {{power}}."
""".strip()


def build_conversation_setup_code() -> str:
    return """
import time as _bridge_time

class _BridgeMessage:
    __slots__ = ("sender", "recipient", "message", "phase", "time_sent")

    def __init__(self, payload):
        payload = payload or {}
        self.sender = str(payload.get("sender", ""))
        self.recipient = str(payload.get("recipient", ""))
        self.message = str(payload.get("message", ""))
        self.phase = str(payload.get("phase", ""))
        self.time_sent = payload.get("time_sent")


class _SnapshotGameView:
    def __init__(self):
        self.power_name = ""
        self._snapshot = {}

    def _copy(self, value):
        if isinstance(value, dict):
            return {k: self._copy(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self._copy(v) for v in value]
        return value

    def _set_snapshot(self, snapshot):
        snapshot = snapshot or {}
        self._snapshot = self._copy(snapshot)
        self.power_name = str(snapshot.get("power_name", "")).upper()

    def get_units(self, power_name=None):
        units = self._snapshot.get("units", {})
        if power_name is None:
            return {name: list(vals) for name, vals in units.items()}
        return list(units.get(str(power_name).upper(), []))

    def get_centers(self, power_name=None):
        centers = self._snapshot.get("centers", {})
        if power_name is None:
            return {name: list(vals) for name, vals in centers.items()}
        return list(centers.get(str(power_name).upper(), []))

    def get_all_possible_orders(self):
        raw = self._snapshot.get("all_possible_orders", {})
        return {loc: list(orders) for loc, orders in raw.items()}

    def get_orderable_locations(self, power_name=None):
        raw = self._snapshot.get("orderable_locations_by_power", {})
        key = str(power_name or self.power_name).upper()
        return list(raw.get(key, []))

    def get_current_phase(self):
        return str(self._snapshot.get("current_phase", ""))

    @property
    def phase_type(self):
        return str(self._snapshot.get("phase_type", "-"))

    @property
    def is_game_done(self):
        return bool(self._snapshot.get("is_game_done", False))

    def get_messages(self):
        data = self._snapshot.get("messages", [])
        return {
            int(entry.get("time_sent") or idx): _BridgeMessage(entry)
            for idx, entry in enumerate(data)
        }

    def get_message_history(self):
        history = self._snapshot.get("message_history", {})
        return {
            str(phase): {
                int(entry.get("time_sent") or idx): _BridgeMessage(entry)
                for idx, entry in enumerate(entries)
            }
            for phase, entries in history.items()
        }

    def get_phase_history(self):
        return list(self._snapshot.get("phase_history", []))

    def get_order_history(self):
        return self._copy(self._snapshot.get("order_history", {}))

    def get_result_history(self):
        return self._copy(self._snapshot.get("result_history", {}))

    @property
    def map(self):
        return None

    @property
    def powers(self):
        return self._copy(self._snapshot.get("powers", {}))


game_view = _SnapshotGameView()
memory_snapshot = ""
objectives = {}
_bridge_deadline_epoch = 0.0
_bridge_outbox = []


def _bridge_apply_state(state):
    global memory_snapshot
    global objectives
    global _bridge_deadline_epoch
    global _bridge_outbox

    state = state or {}
    game_view._set_snapshot(state.get("game_view", {}))
    memory_snapshot = str(state.get("memory_snapshot", ""))
    objectives = dict(state.get("objectives", {}))
    remaining = float(state.get("time_remaining_seconds", 0.0))
    if remaining < 0.0:
        remaining = 0.0
    _bridge_deadline_epoch = _bridge_time.time() + remaining
    _bridge_outbox = []


def _bridge_export_state():
    global _bridge_outbox
    exported = {"outbox": list(_bridge_outbox)}
    _bridge_outbox = []
    return exported


def time_remaining():
    return max(0.0, _bridge_deadline_epoch - _bridge_time.time())


def send_message(recipient, content):
    recipient = str(recipient).upper()
    content = str(content)
    _bridge_outbox.append({"recipient": recipient, "content": content})
    return f"Queued message to {recipient}."
""".strip()


def apply_state(env: Any, state: dict[str, Any]) -> None:
    payload = json.dumps(state)
    env.execute_code(
        "import json as _bridge_json\n"
        f"_bridge_apply_state(_bridge_json.loads({payload!r}))"
    )


def export_state(env: Any) -> dict[str, Any]:
    result = env.execute_code(
        "import json as _bridge_json\n"
        "__bridge_state_json = _bridge_json.dumps(_bridge_export_state())"
    )
    raw = result.locals.get("__bridge_state_json")
    decoded = _decode_local_value(raw)
    if isinstance(decoded, dict):
        return decoded
    if isinstance(decoded, str):
        try:
            parsed = json.loads(decoded)
        except Exception:
            return {}
        if isinstance(parsed, dict):
            return parsed
    return {}


def _decode_local_value(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    try:
        return ast.literal_eval(value)
    except Exception:
        return value
