# Diplomacy-RLM

## About
Diplomacy is a classic board game where the objective is to outwit your opponents and conquer Europe. This repo provides a harness for LLMs controlling 2-7 AI agents (powers) to play the board game fully autonomously. They can negotiate alliances, coordinate attacks, betray others, and ultimately conquer in the fun classic game.

To avoid stuffing the full game state into an ever-growing prompt (which degrades via ["context rot"](https://research.trychroma.com/context-rot)), each agent operates in an RLM-backed Python REPL powered by the [RLM (Recursive Language Models) framework](https://github.com/alexzhang13/rlm)). With the default local sandbox this REPL is persistent across turns; with Modal sandbox mode, state is bridged in/out per completion. Agents, "Powers" in Diplomacy terms, write code to query a read-only game view, maintain a markdown memory file on disk, and call sub-LM helpers for focused analysis.

## Running

```bash
uv pip install -e .
uv run diplomacy-rlm --game-dir ./test_game --max-year 1910 --verbose # Requires `ANTHROPIC_API_KEY` to be set
```

Run with a subset of powers and per-power model overrides:

```bash
uv run diplomacy-rlm \
  --game-dir ./test_game_outputs/claude_game \
  --max-year 1905 \
  --powers FRANCE,GERMANY,ITALY \
  --power-model FRANCE=claude-opus-4-6 \
  --power-model GERMANY=claude-sonnet-4-5 \
  --power-model ITALY=claude-3-5-haiku-latest \
  --verbose
```

Run mixed backends per power (OpenAI + Anthropic):

```bash
uv run diplomacy-rlm \
  --game-dir ./test_game \
  --powers FRANCE,GERMANY,ITALY \
  --backend anthropic \
  --model claude-sonnet-4-5 \
  --power-backend FRANCE=openai \
  --power-model FRANCE=gpt-4.1-mini \
  --power-model GERMANY=claude-opus-4-6 \
  --power-model ITALY=claude-3-5-haiku-latest
```

Run in Modal sandbox mode:

```bash
uv pip install -e ".[modal]"
modal setup

uv run diplomacy-rlm \
  --game-dir ./test_game \
  --powers FRANCE,GERMANY \
  --backend openai \
  --model gpt-4.1-mini \
  --sandbox modal \
  --modal-app-name diplomacy-rlm \
  --modal-timeout 900
```

Run with the live console dashboard (colors + ASCII panels + countdown):

```bash
uv run diplomacy-rlm \
  --game-dir ./test_game \
  --powers FRANCE,GERMANY,ITALY \
  --power-model FRANCE=claude-opus-4-6 \
  --power-model GERMANY=claude-sonnet-4-5 \
  --power-model ITALY=claude-3-5-haiku-latest \
  --live-ui \
  --live-detail trace \
  --show-prompts \
  --show-repl \
  --show-messages \
  --show-memory-diff
```

CLI validation rules:
- `--powers` must contain at least two valid powers.
- `--power-model` must use `POWER=MODEL` format.
- `--power-model` power must be present in `--powers`.
- `--power-backend` must use `POWER=BACKEND` format.
- `--power-backend` power must be present in `--powers`.
- A base model (`--model`) or per-power models (`--power-model`) must cover all selected powers.
- `--live-ui` is auto-disabled in CI/non-TTY unless `--force-live-ui` is provided.

### Configuration

All settings live in `GameConfig` (`data_model.py`):

| Field | Default | Description |
|---|---|---|
| `backend` | `"anthropic"` | LLM backend for the RLM |
| `backend_kwargs` | `{"model_name": "claude-opus-4-6", "api_key": ...}` | Base model parameters for all powers |
| `sub_backend` | `None` | Optional secondary backend for `llm_query()` calls |
| `power_model_overrides` | `{}` | Optional per-power `model_name` override (e.g. `{"FRANCE": "..."}`) |
| `power_backend_overrides` | `{}` | Optional per-power backend override (e.g. `{"FRANCE": "openai"}`) |
| `environment` | `"local"` | RLM sandbox (`local` or `modal`) |
| `environment_kwargs` | `{}` | Extra environment args (e.g. Modal `app_name`, `timeout`) |
| `observe_prompts` | `False` | Include raw prompts in observability events (live UI) |
| `observe_repl` | `False` | Include completion/REPL text in observability events (live UI) |
| `observe_messages` | `False` | Include raw diplomatic message content in events (live UI) |
| `observe_memory_diffs` | `False` | Include unified memory diffs in events (live UI) |
| `strategize_timeout` | 120s | Wall-clock limit for STRATEGIZE |
| `converse_timeout` | 180s | Wall-clock limit for CONVERSE |
| `decide_timeout` | 120s | Wall-clock limit for DECIDE |
| `converse_max_rounds` | 5 | Max negotiation rounds per phase |
| `max_year` | 1910 | Game ends after this year |
| `powers` | `["AUSTRIA", "ENGLAND", "FRANCE", "GERMANY", "ITALY", "RUSSIA", "TURKEY"]` | Powers controlled by LLM strategists (minimum 2) |
| `max_iterations` | 15 | Max RLM REPL turns per completion |
| `max_retries` | 10 | Retries before `GameHaltError` |

### Output

```
game_output/
  game_log.jsonl            Phase-level event log
  FRANCE_memory.md          Per-controlled-power persistent memory
  GERMANY_memory.md
  ...
  snapshots/
    S1901M/                 Per-phase snapshots
      game_state.json
      orders.json
      results.json
      messages.json
      memory/               Memory file copies
      repl_state/           Serialized REPL environments (dill)
```

Games can be resumed from any snapshot:

```python
from rlm_diplomacy import Orchestrator, GameConfig
orch = Orchestrator.from_snapshot("./game_output/snapshots/S1901M", GameConfig())
orch.run()
```

## Development

```bash
uv pip install -e ".[dev]"
pytest
```

Tests use `FallbackRLM` -- no API keys needed.

---

# Architecture

There are 7 powers on the standard map: Austria, England, France, Germany, Italy, Russia, Turkey. The orchestrator activates a configurable subset (minimum 2) and deactivates non-selected powers at startup, so agents only reason about configured participants. Each controlled power gets two agent tiers:

| Agent | Lifetime | Role |
|---|---|---|
| **Strategist** | Persistent (local) / bridged per completion (modal) | Analyzes the board, manages memory, spawns conversations, submits orders |
| **Conversation Agent** | Ephemeral (one phase) | Negotiates with specific targets, sends/receives messages, returns a summary |

The split enforces information compartmentalization architecturally: conversation agents get a filtered game view scoped to their negotiation targets, so they cannot accidentally leak intelligence across conversations. Strategy needs persistence and full board access; negotiation needs isolation and a fresh slate.

## Phase Loop

Every movement phase runs a 3-step loop. Retreat and adjustment phases skip straight to DECIDE.

```
  1. STRATEGIZE  (all controlled strategists, parallel)
     Analyze board + memory -> emit SPAWN_CONVERSATION({targets}) or FINAL(done)

  2. CONVERSE  (conversation agents, parallel, round-based)
     Exchange messages via thread-safe router, flush between rounds
     Incoming chats from non-targets go through strategist accept/decline
     -> FINAL(summary)

  3. DECIDE  (all controlled strategists, parallel)
     Receive conversation summaries + unread messages
     Call submit_orders([...]) once, update memory -> FINAL(done)

  game.process() -> adjudicate -> next phase
```

All agents/Powers run in parallel via `ThreadPoolExecutor`. Timed-out agents receive safe default orders (hold/disband/waive).

## What Agents/Powers Can See and Do

**Strategist REPL:**
- `game_view` -- read-only board state (units, centers, possible orders, message history)
- `memory_path` -- path to a persistent markdown file the agent reads/writes across turns
- `time_remaining()` -- seconds left for the current step
- `submit_orders(orders)` -- available during DECIDE; validates against legal moves
- `llm_query()` / `llm_query_batched()` -- sub-model calls for focused analysis

**Conversation Agent REPL:**
- `game_view` -- filtered to messages involving current negotiation targets only
- `memory_snapshot` -- read-only text copy of the strategist's memory
- `objectives` -- per-target goals set by the strategist
- `send_message(recipient, content)` -- queues a diplomatic message through the router
- `time_remaining()` -- seconds left

---

# Map of Codebase

## Module Map

### Core

| Module | Purpose |
|---|---|
| `orchestrator.py` | Main game loop. Runs controlled powers in parallel, handles movement/retreat/adjustment flow, applies timeout-safe defaults, writes snapshots/logs, restores from snapshots, and emits structured observability events. Entry point: `Orchestrator(config).run()`. |
| `data_model.py` | Shared types and validated `GameConfig`: power subset normalization (min 2), supported backend/environment validation, per-power model/backend overrides, and backend resolution helpers. |
| `cli.py` | CLI entry point (`diplomacy-rlm`). Parses powers, per-power model/backend overrides, backend/sub-backend args, sandbox args (`local`/`modal`), live dashboard options, and builds `GameConfig`. |
| `__init__.py` | Public package exports for orchestrator, agents, data model types, timer, memory/router utilities, and observability primitives. |

### Agents/Powers

| Module | Purpose |
|---|---|
| `agents/strategist.py` | Per-power strategist. Supports local persistent REPL and modal bridged execution, handles conversation spawn/decide/incoming chat, validates order submission, syncs memory state, and emits rich status/retry/error events. |
| `agents/conversation.py` | Per-phase diplomat. Negotiates over target-scoped state, queues messages through router, tracks target response timeouts, supports local persistent or modal bridged execution, and emits conversation/message events. |

### Game Interface

| Module | Purpose |
|---|---|
| `game_view.py` | `GameView`: read-only wrapper around the diplomacy `Game`. `FilteredGameView`: adds target-scoped message visibility for conversation agents. All accessors return deep copies. |
| `message_router.py` | Thread-safe round-based outbox across configured powers. `queue_message()` validates/queues + emits events; `flush()` atomically commits to game; `get_unread()` returns stable ordered unread context. |
| `memory.py` | Per-power markdown memory files (`POWER_memory.md`) with symlink/non-regular file guards, secure creation, snapshot reads, and memory read/init observability events. |
| `timer.py` | Monotonic wall-clock `PhaseTimer`. Injected into agent REPLs as `time_remaining()`. |

### RLM Integration

| Module | Purpose |
|---|---|
| `rlm_runtime.py` | Compatibility layer around external `rlm` with fallback stub for offline tests, Anthropic timeout patching, and env hooks that support both pre-completion and post-completion callbacks. |
| `modal_bridge.py` | Modal state bridge: serializes host game/context into sandbox-compatible snapshots, installs snapshot-backed helper APIs in sandbox, and exports sandbox outputs (orders/messages/memory/chat decisions) back to host agents. |
| `sentinels.py` | Parses `FINAL(...)` and `SPAWN_CONVERSATION({...})` sentinels from agent output. Patches the RLM parser at runtime to recognize the custom spawn sentinel. |
| `prompts.py` | System prompt builders for both agent types. Documents the REPL API, valid order syntax, and behavioral constraints. |

### Observability

| Module | Purpose |
|---|---|
| `observability/events.py` | Canonical event schema (`ObservableEvent`) and priority constants used across runtime/agents/router/memory. |
| `observability/bus.py` | Event emitter interfaces and implementations: `NoopEmitter`, `RecorderEmitter` (tests), and bounded `BufferedEventBus` with priority-aware dropping. |
| `observability/console.py` | Rich live dashboard renderer: phase/step countdown, power states, message/conversation stats, event log, and inspector pane with redaction. |

### Tests

| Module | Purpose |
|---|---|
| `tests/test_cli.py` | CLI parsing/validation coverage for powers, per-power model/backend overrides, sandbox flags, and live UI fallback behavior. |
| `tests/test_data_model_timer.py` | `GameConfig` defaults/validation (including powers, backend overrides, environment validation) and `PhaseTimer` lifecycle tests. |
| `tests/test_agents.py` | Strategist/conversation lifecycle behavior, per-power override wiring, environment propagation, and order/message flow tests. |
| `tests/test_observability.py` | Event bus and live dashboard state-update behavior tests for the observability stack. |

### Vendored

| Module | Purpose |
|---|---|
| `_vendor/diplomacy/` | Patched diplomacy game engine (v1.1.2). Zero external dependencies -- `ujson` replaced with `json`, `bcrypt` removed. Provides game state, order adjudication, map topology, and message system. |

### Security

| Module | Purpose |
|---|---|
| `repl_sandbox.py` | In-process REPL hardening. Blocks dangerous modules (`os`, `sys`, `subprocess`, `socket`, `threading`, `ctypes`, etc.), restricts `open()` to the agent's memory file (strategist) or disables it entirely (conversation), removes `eval`/`exec`/`compile` from builtins. Re-applied before every completion to prevent monkey-patching. |
