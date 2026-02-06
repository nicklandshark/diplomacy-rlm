# Diplomacy-RLM

Run autonomous Diplomacy powers with an RLM-backed Python runtime, and watch the game live in the built-in web viewer (SSE updates).

## Quickstart: Two Powers on Claude Opus 4.6 + Live Web Viewer

### 1) Prerequisites

- Python `>=3.11`
- [`uv`](https://docs.astral.sh/uv/)
- [`bun`](https://bun.sh/) (required for `--serve-web`)
- Anthropic API key with Opus access

### 2) Install backend + web dependencies

From repo root:

```bash
uv pip install -e ".[web]"
```

Install frontend dependencies:

```bash
cd web
bun install
cd ..
```

### 3) Export API key

```bash
export ANTHROPIC_API_KEY="your-key-here"
```

### 4) Run game + web server together

```bash
uv run diplomacy-rlm \
  --game-dir ./runs/opus46-two-power \
  --powers FRANCE,GERMANY \
  --backend anthropic \
  --backend-arg-for anthropic.model_name=claude-opus-4-6 \
  --power-model FRANCE=claude-opus-4-6 \
  --power-model GERMANY=claude-opus-4-6 \
  --max-year 1903 \
  --serve-web \
  --web-port 3000 \
  --log-events \
  --verbose
```

The CLI will print a URL like:

`http://localhost:3000/game/<game_id>`

Open that in your browser for the live viewer.

## What `--serve-web` Starts

- A local FastAPI SSE stream for live observability events.
- A Next.js dev server from `web/`.
- The game run itself (`Orchestrator`), all in one command.

## Output Files

Game output goes to your `--game-dir`, for example:

- `game_log.jsonl`
- `snapshots/<phase>/...`
- `FRANCE_memory.md`, `GERMANY_memory.md`

## Run Without the Web Viewer

If you only want the game run:

```bash
uv run diplomacy-rlm \
  --game-dir ./runs/opus46-two-power \
  --powers FRANCE,GERMANY \
  --backend anthropic \
  --backend-arg-for anthropic.model_name=claude-opus-4-6 \
  --max-year 1903
```

## Useful Flags

- `--serve-web`: launch live web viewer + SSE API.
- `--web-port <port>`: choose web viewer port (`0` auto-selects).
- `--powers A,B`: select controlled powers (minimum 2).
- `--power-backend POWER=BACKEND`: per-power backend override.
- `--backend-arg-for BACKEND.KEY=VALUE`: backend-scoped kwargs.
- `--power-backend-arg POWER.KEY=VALUE`: power-scoped backend kwargs.
- `--log-events`: print structured runtime events.

## Common Issues

- `bun: command not found`
  - Install bun, then run `cd web && bun install`.
- `No model specified for powers ...`
  - Provide `--model`, `--backend-arg-for ...model_name=...`, or `--power-model`.
- Viewer starts but no live updates
  - Make sure you launched with `--serve-web` (not just `web` frontend manually).
- Port already in use
  - Change `--web-port` or set `--web-port 0` to auto-pick.

## Development

Run tests:

```bash
uv run pytest
```
