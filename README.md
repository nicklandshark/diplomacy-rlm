# Diplomacy-RLM

## What You Are Running

- `diplomacy-rlm` runs autonomous Diplomacy agents (powers) with an RLM-backed Python REPL.
- The run output is written to a folder (`game_log.jsonl`, snapshots, memory files).
- This repo does not include a bundled browser UI. You can serve the output directory over HTTP and inspect files in browser or connect your own viewer.

## 1. Prerequisites

- Python `>=3.11`
- `uv` installed
- Anthropic API key with access to Claude Opus 4.6

Install `uv` if needed:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## 2. Install This Project

From this repository root:

```bash
uv pip install -e .
```

## 3. Set Your Anthropic API Key

```bash
export ANTHROPIC_API_KEY="your-key-here"
```

Optional check:

```bash
echo "$ANTHROPIC_API_KEY" | wc -c
```

## 4. Run Two Powers on Claude Opus 4.6

This command runs two controlled powers (`FRANCE`, `GERMANY`) using Claude Opus 4.6:

```bash
uv run diplomacy-rlm \
  --game-dir ./runs/opus46-two-power \
  --powers FRANCE,GERMANY \
  --backend anthropic \
  --backend-arg-for anthropic.model_name=claude-opus-4-6 \
  --power-model FRANCE=claude-opus-4-6 \
  --power-model GERMANY=claude-opus-4-6 \
  --max-year 1903 \
  --log-events \
  --verbose
```

Notes:

- `--powers FRANCE,GERMANY` is the two-power selection.
- `--backend-arg-for anthropic.model_name=claude-opus-4-6` sets the Anthropic model explicitly.
- The run writes output to `./runs/opus46-two-power`.

## 5. Run the Webserver for Output

Serve the run directory:

```bash
python -m http.server 8080 --bind 0.0.0.0 --directory ./runs/opus46-two-power
```

Open:

- `http://localhost:8080` (local machine)
- `http://<server-ip>:8080` (remote access)

You will see files like:

- `game_log.jsonl`
- `snapshots/`
- `FRANCE_memory.md`
- `GERMANY_memory.md`

## 6. Typical Remote Server Workflow

Run game (example in background):

```bash
nohup uv run diplomacy-rlm \
  --game-dir /srv/diplomacy/opus46-two-power \
  --powers FRANCE,GERMANY \
  --backend anthropic \
  --backend-arg-for anthropic.model_name=claude-opus-4-6 \
  --max-year 1903 \
  --log-events \
  --verbose > /srv/diplomacy/opus46-two-power/run.log 2>&1 &
```

Serve output:

```bash
python -m http.server 8080 --bind 0.0.0.0 --directory /srv/diplomacy/opus46-two-power
```

## 7. Useful Flags for This Setup

- `--powers FRANCE,GERMANY`: exactly two controlled powers.
- `--backend anthropic`: use Anthropic backend.
- `--backend-arg-for anthropic.model_name=claude-opus-4-6`: set Opus 4.6.
- `--max-year 1903`: shorten runs while testing.
- `--log-events --verbose`: show structured runtime events.

## 8. Troubleshooting

- `No model specified for powers ...`:
  - Add `--backend-arg-for anthropic.model_name=claude-opus-4-6` or `--power-model` values.
- `ANTHROPIC_API_KEY` auth issues:
  - Re-export the key and verify the shell running `uv` has it.
- Cannot access webserver remotely:
  - Check firewall/security group for port `8080`.
  - Confirm server binds `0.0.0.0`.

## 9. Run Tests (Optional)

```bash
uv run pytest
```
