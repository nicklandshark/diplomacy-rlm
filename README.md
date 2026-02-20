# Diplomacy-RLM

We gave LLMs a Python REPL and told them to play Diplomacy against each other. They strategize, negotiate alliances, backstab their allies, and submit military orders. All autonomously, all in real time, and you can watch it happen in a live web viewer.

This is a benchmark for the stuff that actually matters in AI agents: can they reason about other agents? Can they form and break alliances at the right moment? Can they hold a strategic plan across dozens of turns while adapting to a board state that six rival powers are actively trying to destabilize?

## Why Diplomacy?

Most LLM benchmarks test one thing. Math. Code. Trivia. Diplomacy tests everything at once.

A single turn requires a model to read a complex board state (76 provinces, 34 supply centers, 22 starting units across seven powers), reason about what opponents are likely doing, draft diplomatic messages that are persuasive without revealing too much, and then convert all of that into valid military orders. And it has to do this repeatedly across years of game time, remembering what happened before and adjusting.

There's no right answer to look up. No training set to memorize. Every game produces novel board states because seven independent agents are making simultaneous decisions. You can't game this benchmark by pattern matching.

The specific capabilities that surface:

- **Strategic reasoning.** Reading a map, predicting opponent moves, planning multi-turn campaigns.
- **Natural language negotiation.** Proposing alliances, making threats, reading between the lines of what another agent says.
- **Theory of mind.** Modeling what other agents believe, want, and fear. Knowing when an ally is about to betray you.
- **Long-horizon planning.** Maintaining coherent strategy across a full game (9 years by default, up to 20+ if you raise `--max-year`) while adapting to surprises.
- **Graceful failure.** When a plan falls apart (and it will), recovering instead of freezing.

The result is measurable. Supply center counts, unit survival, win/draw/loss records, Elo ratings across games. Not vibes.

## What is RLM?

RLM (Recursive Language Model) is a runtime that gives an LLM a persistent Python environment. Instead of one-shot prompt-in, text-out, the model gets an iterative loop: think, write code, execute it, see the output, think again. It can call functions, store variables, and build up state across multiple turns of reasoning.

In this project, each Diplomacy power gets its own RLM instance. Strategist agents get `game_view` (to read the board), `submit_orders()` (to commit moves during the decide step), `memory_path` (to persist notes across phases), and `time_remaining()` (to check their clock). Conversation agents get `game_view`, `send_message()` (to talk to other powers), `memory_snapshot` (read-only view of their power's notes), `objectives` (what they're negotiating toward), and `time_remaining()`. The agents write Python code to analyze positions, draft messages, and decide orders. All inside a sandbox that blocks dangerous modules, restricts file access, and removes builtins like `eval` and `exec`.

## How a Turn Works

Each movement phase has three steps. All active powers run concurrently.

**1. Strategize** (5 minutes) — Each power's strategist agent looks at the board and decides who to talk to. It can emit `SPAWN_CONVERSATION({"FRANCE": "propose alliance against Germany"})` to open negotiations. If it doesn't spawn any conversations, the converse step still runs (other powers might message it), and it submits orders in the decide step either way.

**2. Converse** (6 minutes, up to 5 rounds) — Ephemeral conversation agents spin up for each power that requested talks. They exchange messages back and forth. If a power gets messaged but didn't initiate, a reactive agent spins up automatically. Messages route through a thread-safe queue so nothing gets lost.

**3. Decide** (5 minutes) — Strategists get summaries of how negotiations went, then submit final orders. They also update their memory file (a markdown doc that persists across phases). If an agent times out, it gets default orders (hold everything, disband if forced, waive builds).

Retreat and adjustment phases skip straight to step 3.

## Quickstart

You need Python 3.11+, [uv](https://docs.astral.sh/uv/), and an Anthropic API key. If you want the live web viewer, also install [bun](https://bun.sh/).

```bash
# Install
uv pip install -e ".[web]"
cd web && bun install && cd ..

# Set your API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Run a two-power game with live viewer
uv run diplomacy-rlm \
  --powers FRANCE,GERMANY \
  --backend anthropic \
  --backend-arg-for anthropic.model_name=claude-opus-4-6 \
  --max-year 1903 \
  --serve-web \
  --log-events
```

That's it. The CLI prints a localhost URL. Open it and watch France and Germany go at it.

Without the web viewer:

```bash
uv run diplomacy-rlm \
  --powers FRANCE,GERMANY \
  --backend anthropic \
  --backend-arg-for anthropic.model_name=claude-opus-4-6 \
  --max-year 1903
```

Game output lands in `./game_output/` by default (override with `--game-dir`). You'll find per-power memory files, phase snapshots with orders and messages, and a game log.

## Pit Different Models Against Each Other

The fun part. You can assign different backends and models to different powers:

```bash
uv run diplomacy-rlm \
  --powers FRANCE,GERMANY,ENGLAND \
  --power-backend FRANCE=anthropic \
  --power-model FRANCE=claude-opus-4-6 \
  --power-backend GERMANY=openai \
  --power-model GERMANY=gpt-4o \
  --power-backend ENGLAND=openrouter \
  --power-model ENGLAND=google/gemini-2.5-pro \
  --max-year 1905 \
  --serve-web
```

Supported backends: `anthropic`, `openai`, `openrouter`, `gemini`, `azure_openai`, `vllm`, `litellm`, `portkey`, `vercel`.

After enough games, the built-in Elo system will tell you which model is actually better at this kind of multi-agent reasoning. Not better at benchmarks. Better at playing the game.

## Full Setup Guide

For detailed instructions (local models with vLLM, all CLI flags, output format, web viewer setup, reading results), see [docs/guide.md](docs/guide.md).

## Development

```bash
uv run pytest
```

Tests use a scripted RLM stub, so you don't need API keys to run them.
