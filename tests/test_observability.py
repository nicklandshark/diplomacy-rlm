from __future__ import annotations

from io import StringIO

from rlm_diplomacy.observability import (
    BufferedEventBus,
    ConsoleEventLogger,
    ConsoleLogOptions,
    RecorderEmitter,
)
from rlm_diplomacy.observability.console import format_event_line, redact_text
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


def test_format_event_line_tolerates_non_dict_payload() -> None:
    event = ObservableEvent(
        event_id=1,
        event_type="debug.custom",
        power=123,  # type: ignore[arg-type]
        payload="not-a-dict",  # type: ignore[arg-type]
    )

    line = format_event_line(event)
    assert "debug.custom" in line
    assert "123" in line


def test_console_event_logger_writes_event_lines() -> None:
    out = StringIO()
    logger = ConsoleEventLogger(
        stream=out,
        options=ConsoleLogOptions(include_timestamp=False, include_payload=True),
    )
    logger.emit(
        "agent.status",
        phase="S1901M",
        step="STRATEGIZE",
        power="FRANCE",
        payload={"status": "RUNNING", "summary": "FRANCE strategizing"},
    )
    line = out.getvalue().strip()
    assert "agent.status" in line
    assert "phase=S1901M" in line
    assert "step=STRATEGIZE" in line
    assert "power=FRANCE" in line
    assert '"status": "RUNNING"' in line
    assert "summary=FRANCE strategizing" in line


def test_console_event_logger_redacts_payload() -> None:
    out = StringIO()
    logger = ConsoleEventLogger(
        stream=out,
        options=ConsoleLogOptions(include_timestamp=False, include_payload=True),
    )
    logger.emit(
        "agent.repl",
        power="FRANCE",
        payload={"summary": 'token=abcdef123456789012345678 secret="my-secret-token"'},
    )
    line = out.getvalue().strip()
    assert "abcdef123456789012345678" not in line
    assert "my-secret-token" not in line
    assert "***" in line


def test_console_event_logger_close_stops_emission() -> None:
    out = StringIO()
    logger = ConsoleEventLogger(
        stream=out,
        options=ConsoleLogOptions(include_timestamp=False),
    )
    logger.emit("first.event")
    logger.close()
    logger.emit("second.event")

    lines = [line for line in out.getvalue().splitlines() if line.strip()]
    assert len(lines) == 1
    assert "first.event" in lines[0]
