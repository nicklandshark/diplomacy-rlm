# Diplomacy-RLM

## About
Diplomacy is a classic board game where the objective is to outwit your opponents and conquer Europe. This repo provides a harness for LLMs to up to seven AI agents to play the board game fully autonomously. They can negotiate alliances, coordinate attacks, betray others, and ultimately conquer in the fun classic game.

To avoid stuffing the full game state into an ever-growing prompt (which degrades via ["context rot"](https://research.trychroma.com/context-rot)), each agent operates in a persistent Python REPL powered by the [RLM (Recursive Language Models) framework](https://github.com/alexzhang13/rlm)). Agents, "Powers" in Diplomacy terms, write code to query a read-only game view, maintain a markdown memory file on disk, and call sub-LM helpers for focused analysis.

## Running

```bash
uv pip install -e .
diplomacy-rlm --game-dir ./my_game --max-year 1910 --verbose
```

Requires the `rlm` package and an API key for your chosen backend. Without `rlm` installed, the system falls back to `FallbackRLM` with canned responses (useful for tests).

### Configuration

All settings live in `GameConfig` (`data_model.py`):

| Field | Default | Description |
|---|---|---|
| `backend` | `"anthropic"` | LLM backend for the RLM |
| `backend_kwargs` | `claude-opus-4-6` | Model parameters |
| `sub_backend` | `None` | Optional secondary backend for `llm_query()` calls |
| `strategize_timeout` | 120s | Wall-clock limit for STRATEGIZE |
| `converse_timeout` | 180s | Wall-clock limit for CONVERSE |
| `decide_timeout` | 120s | Wall-clock limit for DECIDE |
| `converse_max_rounds` | 5 | Max negotiation rounds per phase |
| `max_year` | 1910 | Game ends after this year |
| `max_iterations` | 15 | Max RLM REPL turns per completion |
| `max_retries` | 10 | Retries before `GameHaltError` |

### Output

```
game_output/
  game_log.jsonl            Phase-level event log
  AUSTRIA_memory.md         Per-power persistent memory
  ENGLAND_memory.md
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

There are 7 Powers in Diplomacy: Austria, England, France, Germany, Italy, Russia, Turkey. Each Power gets two agent tiers:

| Agent | Lifetime | Role |
|---|---|---|
| **Strategist** | Persistent (entire game) | Analyzes the board, manages memory, spawns conversations, submits orders |
| **Conversation Agent** | Ephemeral (one phase) | Negotiates with specific targets, sends/receives messages, returns a summary |

The split enforces information compartmentalization architecturally: conversation agents get a filtered game view scoped to their negotiation targets, so they cannot accidentally leak intelligence across conversations. Strategy needs persistence and full board access; negotiation needs isolation and a fresh slate.

## Phase Loop

Every movement phase runs a 3-step loop. Retreat and adjustment phases skip straight to DECIDE.

```
  1. STRATEGIZE  (all 7 strategists, parallel)
     Analyze board + memory -> emit SPAWN_CONVERSATION({targets}) or FINAL(done)

  2. CONVERSE  (conversation agents, parallel, round-based)
     Exchange messages via thread-safe router, flush between rounds
     Incoming chats from non-targets go through strategist accept/decline
     -> FINAL(summary)

  3. DECIDE  (all 7 strategists, parallel)
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

# Map of Codebase (may not be up-to-date)

## Module Map

### Core

| Module | Purpose |
|---|---|
| `orchestrator.py` | Main game loop. Manages phase progression, parallel agent execution, snapshots, and JSONL event logging. Entry point: `Orchestrator(config).run()`. |
| `data_model.py` | Shared types: `PowerName`, `GameConfig`, `ConversationRequest`, `ConversationSummary`, `PendingMessage`, `GameHaltError`. |
| `cli.py` | CLI entry point (`diplomacy-rlm`). Accepts `--game-dir`, `--max-year`, `--verbose`. |

### Agents/Powers

| Module | Purpose |
|---|---|
| `agents/strategist.py` | Persistent per-power agent. Manages RLM lifecycle, injects game objects into REPL, handles retries. Methods: `bootstrap()`, `strategize()`, `decide()`, `notify_incoming_chat()`. |
| `agents/conversation.py` | Ephemeral per-phase diplomat. Operates on a `FilteredGameView` scoped to targets. Tracks per-target message timing for timeout detection. |

### Game Interface

| Module | Purpose |
|---|---|
| `game_view.py` | `GameView`: read-only wrapper around the diplomacy `Game`. `FilteredGameView`: adds target-scoped message visibility for conversation agents. All accessors return deep copies. |
| `message_router.py` | Thread-safe outbox queue. `queue_message()` buffers during a round; `flush()` commits all pending messages to the game atomically between rounds. |
| `memory.py` | Per-power markdown files (`POWER_memory.md`). Symlink-safe creation with `O_NOFOLLOW`. |
| `timer.py` | Monotonic wall-clock `PhaseTimer`. Injected into agent REPLs as `time_remaining()`. |

### RLM Integration

| Module | Purpose |
|---|---|
| `rlm_runtime.py` | Compatibility layer. Uses the real `rlm` package when installed; falls back to a scriptable `FallbackRLM` stub for offline testing. |
| `sentinels.py` | Parses `FINAL(...)` and `SPAWN_CONVERSATION({...})` sentinels from agent output. Patches the RLM parser at runtime to recognize the custom spawn sentinel. |
| `prompts.py` | System prompt builders for both agent types. Documents the REPL API, valid order syntax, and behavioral constraints. |

### Vendored

| Module | Purpose |
|---|---|
| `_vendor/diplomacy/` | Patched diplomacy game engine (v1.1.2). Zero external dependencies -- `ujson` replaced with `json`, `bcrypt` removed. Provides game state, order adjudication, map topology, and message system. |

### Security

| Module | Purpose |
|---|---|
| `repl_sandbox.py` | In-process REPL hardening. Blocks dangerous modules (`os`, `sys`, `subprocess`, `socket`, `threading`, `ctypes`, etc.), restricts `open()` to the agent's memory file (strategist) or disables it entirely (conversation), removes `eval`/`exec`/`compile` from builtins. Re-applied before every completion to prevent monkey-patching. |
