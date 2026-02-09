"""FastAPI SSE sidecar for streaming observability events to the web viewer."""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .bus import BufferedEventBus
from .events import ObservableEvent

app = FastAPI(title="Diplomacy RLM Events API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# These get set by the CLI before starting uvicorn
_bus: BufferedEventBus | None = None
_game_state: dict[str, Any] = {}


def configure(bus: BufferedEventBus, game_id: str = "", game_dir: str = "") -> None:
    """Set the event bus and game metadata. Called by CLI before server start."""
    global _bus, _game_state
    _bus = bus
    _game_state = {
        "game_id": game_id,
        "game_dir": game_dir,
        "status": "running",
        "phase": "",
        "started_at": time.time(),
    }


def update_phase(phase: str) -> None:
    """Update the current phase. Called by the orchestrator hook."""
    _game_state["phase"] = phase


def _serialize_event(event: ObservableEvent) -> dict[str, Any]:
    return {
        "event_id": event.event_id,
        "event_type": event.event_type,
        "priority": event.priority,
        "ts_wall": event.ts_wall,
        "phase": event.phase,
        "step": event.step,
        "power": event.power,
        "payload": event.payload,
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": _game_state.get("status", "unknown"),
        "phase": _game_state.get("phase", ""),
    }


@app.get("/state")
async def state() -> dict[str, Any]:
    return dict(_game_state)


@app.get("/events/stream")
async def events_stream(after_id: int = Query(default=0)) -> StreamingResponse:
    """SSE endpoint that streams events from the BufferedEventBus.

    Uses :meth:`BufferedEventBus.read_after` for non-destructive reads so
    that multiple SSE clients can connect simultaneously without
    interfering with each other, and reconnecting clients can resume
    from where they left off by passing ``after_id``.
    """

    async def generate():
        if _bus is None:
            yield f"data: {json.dumps({'error': 'No event bus configured'})}\n\n"
            return

        last_id = after_id
        while True:
            # Non-destructive read -- does not remove events from the bus
            events = _bus.read_after(last_id, max_items=50)
            if events:
                for event in events:
                    last_id = event.event_id
                    data = json.dumps(_serialize_event(event))
                    yield f"id: {event.event_id}\nevent: game_event\ndata: {data}\n\n"
            else:
                # Send keepalive
                yield f": keepalive {int(time.time())}\n\n"

            # Check if bus is closed before sleeping
            if _bus._closed:
                # Drain any final events that arrived before close
                final_events = _bus.read_after(last_id, max_items=50)
                for event in final_events:
                    last_id = event.event_id
                    data = json.dumps(_serialize_event(event))
                    yield f"id: {event.event_id}\nevent: game_event\ndata: {data}\n\n"
                yield f"event: close\ndata: {json.dumps({'reason': 'game_ended'})}\n\n"
                return

            # Wait for new events or timeout
            await asyncio.sleep(0.5)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
