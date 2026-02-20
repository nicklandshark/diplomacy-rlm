# Setup Guide

Everything you need to run Diplomacy-RLM, from a quick two-power test to a full seven-power tournament with mixed models and live spectating.

## Prerequisites

You'll need these regardless of which backend you use:

- **Python 3.11+**
- **[uv](https://docs.astral.sh/uv/)** for dependency management
- **[bun](https://bun.sh/)** if you want the live web viewer (optional but recommended)

Install the project:

```bash
git clone <repo-url>
cd diplomacy-rlm
uv pip install -e ".[web]"
```

Install the web viewer frontend (skip if you don't need it):

```bash
cd web && bun install && cd ..
```

## Running with Cloud APIs

The fastest way to get started. You call a cloud model provider, they do the inference, you pay per token.

### Anthropic (Claude)

```bash
export ANTHROPIC_API_KEY="sk-ant-..."

uv run diplomacy-rlm \
  --powers FRANCE,GERMANY \
  --backend anthropic \
  --backend-arg-for anthropic.model_name=claude-opus-4-6 \
  --max-year 1903
```

In our runs so far, Opus has been the most capable player. Sonnet works too but tends to negotiate less aggressively. Your mileage will vary.

### OpenAI (GPT-4o, o1, etc.)

```bash
export OPENAI_API_KEY="sk-..."

uv run diplomacy-rlm \
  --powers FRANCE,GERMANY \
  --backend openai \
  --backend-arg-for openai.model_name=gpt-4o \
  --max-year 1903
```

### OpenRouter

OpenRouter gives you access to models from multiple providers through one API. Useful for running models you don't have direct API access to.

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."

uv run diplomacy-rlm \
  --powers FRANCE,GERMANY \
  --backend openrouter \
  --backend-arg-for openrouter.model_name=anthropic/claude-opus-4-6 \
  --max-year 1903
```

Model names follow OpenRouter's naming convention (e.g., `google/gemini-2.5-pro`, `meta-llama/llama-3.1-405b`).

### Google Gemini

```bash
export GEMINI_API_KEY="..."

uv run diplomacy-rlm \
  --powers FRANCE,GERMANY \
  --backend gemini \
  --backend-arg-for gemini.model_name=gemini-2.5-pro \
  --max-year 1903
```

### Azure OpenAI

```bash
export AZURE_OPENAI_API_KEY="..."

uv run diplomacy-rlm \
  --powers FRANCE,GERMANY \
  --backend azure_openai \
  --backend-arg-for azure_openai.model_name=your-deployment-name \
  --max-year 1903
```

You'll also need to set any Azure-specific endpoint configuration via `--backend-arg-for`.

## Running with Local Models

If you have a GPU and want to run inference yourself. No API costs, full control, but you need the hardware.

### vLLM

Start a vLLM server first:

```bash
# In a separate terminal (vLLM 0.6+)
vllm serve meta-llama/Llama-3.1-70B-Instruct --port 8000

# Or on older vLLM versions:
# python -m vllm.entrypoints.openai.api_server --model meta-llama/Llama-3.1-70B-Instruct --port 8000
```

Then point the harness at it:

```bash
uv run diplomacy-rlm \
  --powers FRANCE,GERMANY \
  --backend vllm \
  --backend-arg-for vllm.base_url=http://localhost:8000 \
  --backend-arg-for vllm.model_name=meta-llama/Llama-3.1-70B-Instruct \
  --max-year 1903
```

### LiteLLM

LiteLLM wraps a bunch of providers behind one interface. If your model is accessible through LiteLLM, it'll work here.

```bash
uv run diplomacy-rlm \
  --powers FRANCE,GERMANY \
  --backend litellm \
  --backend-arg-for litellm.model_name=ollama/llama3.1 \
  --max-year 1903
```

This is also how you'd connect to Ollama or any other local inference server that LiteLLM supports.

## Mixing Models

This is where things get interesting. You can assign different backends and models to different powers and see who wins.

```bash
uv run diplomacy-rlm \
  --powers FRANCE,GERMANY,ENGLAND,RUSSIA \
  --power-backend FRANCE=anthropic \
  --power-model FRANCE=claude-opus-4-6 \
  --power-backend GERMANY=openai \
  --power-model GERMANY=gpt-4o \
  --power-backend ENGLAND=openrouter \
  --power-model ENGLAND=google/gemini-2.5-pro \
  --power-backend RUSSIA=vllm \
  --power-model RUSSIA=meta-llama/Llama-3.1-70B-Instruct \
  --backend-arg-for vllm.base_url=http://localhost:8000 \
  --max-year 1905 \
  --serve-web
```

Per-power backend args work too, for when different backends need different configuration:

```bash
--power-backend-arg RUSSIA.base_url=http://localhost:8000
```

## The Web Viewer

The built-in viewer shows the game board, diplomatic messages, agent memory, and an activity feed. All updating in real time via SSE.

Launch it alongside the game:

```bash
uv run diplomacy-rlm \
  --powers FRANCE,GERMANY \
  --backend anthropic \
  --backend-arg-for anthropic.model_name=claude-opus-4-6 \
  --serve-web \
  --web-port 3000 \
  --log-events
```

The CLI prints a URL like `http://localhost:3000/game/<game_id>`. Open it.

What you'll see:

- **Game board** with unit positions and supply center ownership
- **Phase timeline** showing the game's progression
- **Message panel** with the actual diplomatic messages agents sent each other
- **Order panel** showing what each power ordered its units to do
- **Activity feed** streaming orchestrator events in real time
- **Leaderboard** with per-game standings and cross-game Elo ratings

If you just want the SSE API without the full Next.js frontend (maybe you're building your own viewer):

```bash
--serve-api
```

This starts the FastAPI sidecar alongside the game, but without the Next.js frontend. The game still runs normally. The API writes its port to `.api_port` in the game directory.

### Viewing Past Games

The web viewer can also browse completed games. Set the `GAMES_DIR` environment variable to your runs directory:

```bash
cd web
GAMES_DIR=../runs bun dev
```

Then open `http://localhost:3000` to see a list of all completed games.

## Game Output

Everything lands in `--game-dir` (defaults to `./game_output/`). Here's what you get:

```
game_output/
  game_log.jsonl              # Every event, one JSON object per line
  .game_meta.json             # Which backend/model ran each power
  FRANCE_memory.md            # France's persistent memory (updated each phase)
  GERMANY_memory.md           # Germany's persistent memory
  ...one per power...
  snapshots/
    S1901M/                   # Spring 1901 Movement phase
      game_state.json         # Board state (units, centers, builds, retreats, homes, influence)
      orders.json             # What each power ordered
      messages.json           # Diplomatic messages exchanged
      results.json            # Adjudication results (what succeeded/failed)
      memory/                 # Per-power memory snapshots at this phase
      repl_state/             # Serialized Python environment per power
    F1901M/                   # Fall 1901 Movement
    W1901A/                   # Winter 1901 Adjustment
    S1902M/                   # ...and so on
```

Phase naming: `S` = Spring, `F` = Fall, `W` = Winter. `M` = Movement, `R` = Retreat, `A` = Adjustment. `S1901M` means "Spring 1901 Movement phase."

### Reading the Game Log

`game_log.jsonl` is newline-delimited JSON. Each line is one event:

```json
{"event": "strategize_complete", "phase": "S1901M", "requests": {}}
{"event": "converse_complete", "phase": "S1901M", "agents": 0, "messages": 0, "rounds": 0}
{"event": "decide_complete", "phase": "S1901M", "orders": {"FRANCE": 3, "GERMANY": 3}}
{"event": "processed", "phase": "S1901M", "duration_seconds": 82.865}
```

The `requests` field in `strategize_complete` tells you how many conversation targets each power requested. An empty object means nobody wanted to talk that phase.

### The Elo System

After running multiple games, the API exposes Elo ratings at `/api/agents/elo`. Each agent is identified by `backend:model` (e.g., `anthropic:claude-opus-4-6`). Ratings start at 1500, K-factor is 24, and scores are computed from pairwise supply center comparisons at game end.

The leaderboard endpoint (`/api/agents/leaderboard`) shows per-game standings and cross-game records (wins/draws/losses).

## All CLI Flags

### Game configuration

| Flag | Default | What it does |
|------|---------|--------------|
| `--game-dir` | `./game_output` | Where to write snapshots, logs, and memory |
| `--max-year` | `1910` | Stop the game after this year |
| `--powers` | all seven | Comma-separated list of active powers (minimum 2) |

### Backend selection

| Flag | Default | What it does |
|------|---------|--------------|
| `--backend` | `anthropic` | Default backend for all powers |
| `--model` | none | Default model name for all powers |
| `--backend-arg KEY=VALUE` | none | Global backend kwargs (repeatable) |
| `--backend-arg-for BACKEND.KEY=VALUE` | none | Backend-scoped kwargs (repeatable) |
| `--power-backend POWER=BACKEND` | none | Override backend for one power (repeatable) |
| `--power-model POWER=MODEL` | none | Override model for one power (repeatable) |
| `--power-backend-arg POWER.KEY=VALUE` | none | Per-power backend kwargs (repeatable) |

### Sub-backend (for `llm_query()` inside the sandbox)

| Flag | Default | What it does |
|------|---------|--------------|
| `--sub-backend` | none | Secondary backend for in-sandbox LLM calls |
| `--sub-model` | none | Model name for sub-backend |
| `--sub-backend-arg KEY=VALUE` | none | Sub-backend kwargs (repeatable) |

### Sandbox

| Flag | Default | What it does |
|------|---------|--------------|
| `--sandbox` | `local` | Where agents execute: `local` (in-process) or `modal` (remote) |
| `--sandbox-arg KEY=VALUE` | none | Sandbox kwargs (repeatable) |
| `--modal-app-name` | `rlm-sandbox` | Modal app name when using modal sandbox |
| `--modal-timeout` | `600` | Modal sandbox timeout in seconds |

### Logging

| Flag | What it does |
|------|--------------|
| `--log-events` | Print structured events to console |
| `--log-prompts` | Include full prompt text in events |
| `--log-repl` | Include REPL output in events |
| `--log-messages` | Include diplomatic message content |
| `--log-memory-diff` | Include memory file diffs |
| `--verbose` | INFO-level logging for the `rlm_diplomacy` module |

### Web viewer

| Flag | Default | What it does |
|------|---------|--------------|
| `--serve-web` | off | Launch Next.js viewer + SSE API |
| `--serve-api` | off | Launch SSE API alongside the game (no web frontend) |
| `--web-port` | `0` (auto) | Port for the web viewer |

## Troubleshooting

**`bun: command not found`** — Install bun (`curl -fsSL https://bun.sh/install | bash`), then `cd web && bun install`.

**`No model specified for powers ...`** — You need to tell it which model to use. Either `--model`, `--backend-arg-for anthropic.model_name=...`, or `--power-model FRANCE=...`.

**Viewer shows no live updates** — You probably started the Next.js dev server manually instead of using `--serve-web`. The SSE sidecar only starts when the game does.

**Port already in use** — Use `--web-port 0` to auto-pick a free port.

**Agent keeps timing out** — Weaker models sometimes can't produce valid orders in time. The orchestrator gives them default orders (hold, disband, or waive) and moves on. Check `--log-events` output to see what's happening.

**Tests fail with import errors** — Make sure you installed in dev mode: `uv pip install -e ".[web]"`. Tests use a scripted RLM stub so you don't need API keys.
