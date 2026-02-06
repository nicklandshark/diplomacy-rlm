from __future__ import annotations

from rich.console import Console

from rlm_diplomacy.observability import (
    BufferedEventBus,
    LiveConsoleDashboard,
    LiveConsoleOptions,
    RecorderEmitter,
)
from rlm_diplomacy.observability.console import redact_text
from rlm_diplomacy.observability.events import ObservableEvent
from rlm_diplomacy.observability.events import PRIORITY_CRITICAL


def test_buffered_event_bus_priority_drop_policy() -> None:
    bus = BufferedEventBus(max_events=3)
    bus.emit("debug.a", priority=3)
    bus.emit("debug.b", priority=3)
    bus.emit("debug.c", priority=3)
    bus.emit("critical", priority=PRIORITY_CRITICAL)

    events = bus.poll(10)
    names = [event.event_type for event in events]
    assert "critical" in names
    assert len(events) == 3
    assert bus.drop_stats().total >= 1


def test_recorder_emitter_records_events() -> None:
    recorder = RecorderEmitter()
    recorder.emit("phase.start", phase="S1901M", payload={"summary": "phase start"})
    recorder.emit("step.start", step="STRATEGIZE", payload={"summary": "strategize"})

    events = recorder.events()
    assert len(events) == 2
    assert events[0].event_type == "phase.start"
    assert events[1].event_type == "step.start"
    assert events[1].event_id == events[0].event_id + 1


def test_redact_text_masks_secret_like_tokens() -> None:
    text = 'api_key="sk-ant-12345678901234567890" token=abcdef123456789012345678'
    redacted = redact_text(text)
    assert "sk-ant" not in redacted
    assert "abcdef123456789012345678" not in redacted
    assert "***" in redacted


def test_dashboard_state_applies_basic_events() -> None:
    bus = BufferedEventBus(max_events=20)
    dashboard = LiveConsoleDashboard(
        bus,
        powers=["FRANCE", "GERMANY"],
        options=LiveConsoleOptions(detail="minimal"),
        console=Console(record=True, force_terminal=False),
    )

    bus.emit("phase.start", payload={"phase": "S1901M", "phase_type": "M", "summary": "start"})
    bus.emit("step.start", payload={"step": "STRATEGIZE", "timeout_seconds": 120, "summary": "step"})
    bus.emit(
        "agent.status",
        power="FRANCE",
        payload={"status": "RUNNING", "role": "STRATEGIST", "step": "STRATEGIZE"},
    )
    for event in bus.poll(20):
        dashboard._apply_event(event)

    assert dashboard.state.phase == "S1901M"
    assert dashboard.state.step == "STRATEGIZE"
    assert dashboard.state.powers["FRANCE"].status == "RUNNING"


def test_dashboard_format_line_tolerates_non_dict_payload() -> None:
    bus = BufferedEventBus(max_events=20)
    dashboard = LiveConsoleDashboard(
        bus,
        powers=["FRANCE", "GERMANY"],
        options=LiveConsoleOptions(detail="minimal"),
        console=Console(record=True, force_terminal=False),
    )

    event = ObservableEvent(
        event_id=1,
        event_type="debug.custom",
        power=123,  # type: ignore[arg-type]
        payload="not-a-dict",  # type: ignore[arg-type]
    )

    line = dashboard._format_event_line(event)
    assert "debug.custom" in line
    assert "123" in line


def test_dashboard_render_tolerates_unexpected_event_shapes() -> None:
    bus = BufferedEventBus(max_events=20)
    dashboard = LiveConsoleDashboard(
        bus,
        powers=["FRANCE", "GERMANY"],
        options=LiveConsoleOptions(detail="minimal"),
        console=Console(record=True, force_terminal=False),
    )

    malformed_status = ObservableEvent(
        event_id=1,
        event_type="agent.status",
        power="FRANCE",
        payload={"status": {"bad": "shape"}, "role": ["x"], "step": {"x": 1}},
    )
    malformed_message = ObservableEvent(
        event_id=2,
        event_type="message.queued",
        payload={"sender": ["FRANCE"], "recipient": {"r": "GERMANY"}},
    )

    dashboard._apply_event(malformed_status)
    dashboard._apply_event(malformed_message)

    # Should not raise even when event payload values have odd types.
    dashboard._render_layout()
