# Diplomacy-RLM: Technical Specification

## Objective

1. Read the reference materials in `.tmp/` — the RLM library, vendored diplomacy engine, AI_Diplomacy harness, twenty_questions example, and the research paper
2. Read this spec in full
3. Write the code
4. Run the tests in `tests/` based on `tests/TESTS.md`

## Overview

### What We're Building

Diplomacy-RLM is a framework for up to 7 AI agents to play the board game Diplomacy autonomously — negotiating alliances, coordinating attacks, betraying each other, and submitting orders — using Recursive Language Models (RLMs). Diplomacy is a 7-player strategy game with no dice; outcomes are determined entirely by the orders submitted. The game's difficulty comes from simultaneous moves and natural language negotiation: players must persuade, deceive, and reason about what others will do, over 10-20+ phases of play.

### Why RLM

LLMs suffer from **context rot** — quality degrades as the context window fills up, and the effective window shrinks further for complex tasks. Diplomacy is a worst case for this: game state accumulates across dozens of phases — board positions, negotiation histories, past orders, relationship dynamics, strategic memory. Cramming all of it into a prompt is exactly the pattern that triggers context rot.

RLMs solve this by keeping data **outside the LLM's context window**. The prompt is loaded as a variable in a Python REPL, and the LLM writes code to examine, decompose, and query it. The LLM's context stays light — it only sees its own code and printed outputs. Heavy reading is delegated to sub-LM calls (`llm_query()`), which receive focused data slices in their own clean context windows.

### What Came Before: AI_Diplomacy

The AI_Diplomacy project (arxiv:2508.07485) is the existing approach — a harness that has run ~4,000 Diplomacy games across 62+ LLM models. It works, but its architecture is dominated by scaffolding to manage context:

- **Dual-layer memory** (full diary + consolidated diary) to prevent history from overflowing the prompt
- **Diary consolidation** (LLM-driven summarization every Spring) to fit old entries into shrinking context budgets
- **BFS tactical context pre-computation** because agents can't run code — every tactical option must be serialized into the prompt upfront
- **Complex prompt assembly pipeline** for careful token budgeting across system + context + instructions
- **Multi-stage JSON parsing** (`json` → `json5` → `json_repair` + regex fallbacks) because extracting structured orders from LLM prose is unreliable
- **Explicit relationship tracking** because agents can't re-derive relationships from full history each time

All of this exists to work around one limitation: the agent can only see what's in its prompt. Every piece of information the agent might need must be pre-computed, formatted, and injected by the harness.

### How This Is Different

RLM Diplomacy takes the opposite approach. Instead of the harness deciding what the agent sees, the **agent decides what it needs** by writing code. This is the bitter lesson applied: rather than encoding human knowledge about what's important into hardcoded pipelines, give agents a general-purpose tool (a REPL) and let them figure it out.

| AI_Diplomacy (hardcoded scaffolding) | RLM Diplomacy (agent writes code) |
|---|---|
| Dual-layer diary with LLM consolidation | Agent reads/writes a markdown file via `open()` |
| BFS tactical context pre-computed per unit | Agent calls `game_view.get_all_possible_orders()` and writes its own analysis |
| Fixed-format prompt assembly pipeline | Agent queries what it needs via `llm_query()` on data in REPL variables |
| Multi-stage JSON parsing for order extraction | Agent calls `submit_orders(["A PAR - BUR", ...])` directly |
| Explicit relationship scoring per phase | Agent derives relationships from memory + message history in code |
| Fixed 3-round negotiation structure | Agent negotiates in rounds, calls `FINAL()` when done |

The harness shrinks to its essential job: running the game loop, routing messages between agents, enforcing timeouts, and preventing cheating (read-only game views, order validation).

### Architecture at a Glance

Each of the 7 powers is controlled by two tiers of RLM agents:

```
                    ┌─────────────────────────────────────┐
                    │  Strategist (persistent RLM)        │
                    │  Lives for the entire game           │
                    │  REPL accumulates state across phases│
                    │  Reads/writes memory.md              │
                    │  Submits orders                      │
                    │  Signals SPAWN_CONVERSATION          │
                    └──────────┬──────────────────────────┘
                               │ may spawn (one per phase)
                    ┌──────────┴──────────────┐
                    │  Conversation Agent     │
                    │  (ephemeral RLM)        │
                    │  One per power per phase│
                    │  Sends/reads messages   │
                    │  Returns summary via    │
                    │  FINAL()                │
                    │  Destroyed after phase  │
                    └─────────────────────────┘
```

**Strategist**: The decision-maker. A single persistent RLM that lives for the entire game. Its REPL environment (variables, functions, files) accumulates across every phase. It reads the board, decides who to negotiate with, reviews conversation results, updates its memory file, and submits orders. There are exactly 7 strategists.

**Conversation Agent**: The diplomat. An ephemeral RLM created for a single negotiation phase, destroyed after. One per power per phase, handling all of that power's conversation targets. It can send and read messages but cannot submit orders. The strategist gives it per-target objectives; it returns a summary.

Both use `llm_query()` (depth=1 sub-LM calls) for focused sub-tasks: drafting messages, analyzing opponent intentions, evaluating options.

### Phase Flow

Each movement phase follows three steps:

```
STEP 1: STRATEGIZE (7 strategists in parallel)
  Each agent: reads memory → analyzes board → writes SPAWN_CONVERSATION({...})
  Output: conversation requests (who to talk to, with what objectives)

STEP 2: CONVERSE (up to 7 conversation agents in parallel, round-based)
  Round 1: all agents run → messages queued in outboxes → flush → check incoming chats
  Round 2: agents read new messages → respond → flush
  ...
  Round N: agents call FINAL("summary") when done, or timer expires
  Output: conversation summaries per power

STEP 3: DECIDE (7 strategists in parallel)
  Harness injects: conversation_results + unread_messages
  Each agent: reviews results → analyzes board → updates memory → calls submit_orders()
  Output: orders per power

→ game.process() → resolve orders → next phase
```

Retreat and adjustment phases skip CONVERSE — only DECIDE runs (no negotiation needed).

### Concurrency Model

All 7 strategists run in parallel via `ThreadPoolExecutor`. Each `RLM.completion()` call creates its own `LMHandler` socket server on an auto-assigned port — no shared state between agents. The `Game` object is only mutated by the orchestrator between steps (via `set_orders`, `add_message`, `process`). During agent execution, the game is read-only through `GameView` wrappers.

Conversation agents also run in parallel across all powers within each round. Messages go through a thread-safe outbox; the orchestrator flushes all outboxes atomically between rounds so no agent sees another's messages from the same round.

```
    STRATEGIZE          CONVERSE              DECIDE
   ┌─────────┐    ┌──────────────────┐    ┌─────────┐
   │ 7 strats │    │ Round 1: ≤7 agts │    │ 7 strats │
   │ parallel │    │ ★ flush          │    │ parallel │
   │          │    │ Round 2: ≤7 agts │    │          │
   │ GameView │    │ ★ flush          │    │ GameView │
   │ (read)   │    │ ...              │    │ (read)   │
   └────┬─────┘    │ Round N: done    │    └────┬─────┘
        │          └────────┬─────────┘         │
        ▼                   ▼                   ▼
   [orchestrator     [orchestrator         [orchestrator
    collects          flushes msgs,         applies orders,
    conv requests]    manages rounds]       calls process()]
```

Writes to the game happen only in the gaps between boxes — never during agent execution. No locking needed.

### The Two RLM Tiers

| | Strategist | Conversation Agent |
|---|---|---|
| **Lifetime** | Entire game (persistent RLM) | Single negotiation phase (ephemeral) |
| **REPL state** | Accumulates across all phases | Fresh each phase, persists across rounds within phase |
| **Memory** | Reads/writes `{POWER}_memory.md` on disk | Read-only snapshot of strategist's memory |
| **Can submit orders** | Yes (`submit_orders()`) | No |
| **Can send messages** | No | Yes (`send_message()`) |
| **Spawns conversations** | Yes (`SPAWN_CONVERSATION` sentinel) | No |
| **Game view** | Full (filtered to own power's message visibility) | Filtered to target powers' messages only |
| **How it ends** | `FINAL("done")` after each step | `FINAL("summary text")` — the summary IS the return value |
| **`llm_query()`** | Yes | Yes |
| **Count** | 7 (one per power) | Up to 7 per phase (one per active power) |

### Document Map

| Section | What It Covers |
|---|---|
| **Reference Material** | What's in `.tmp/` — the RLM library, diplomacy engine, AI_Diplomacy, and the paper |
| **Recursive Language Models** | How RLM works: REPL, sentinels, persistent mode, sub-LM calls, communication architecture |
| **Vendoring Diplomacy** | Why and how we vendor the `diplomacy` game engine (4 patches, zero dependencies) |
| **Key Design Decisions** | The 5 "why" answers: persistent RLM, separate conversation agents, outbox pattern, no BFS, text sentinels |
| **Data Model** | Shared types: `ConversationRequest`, `ConversationSummary`, `PendingMessage`, `GameConfig`, `GameHaltError` |
| **GameView** | Read-only wrapper around the `Game` object, scoped to one power's message visibility |
| **Memory** | Per-power markdown files on disk — no schema, no consolidation, agent organizes its own memory |
| **Timer** | `PhaseTimer` with soft signals for agents and hard deadlines for the orchestrator |
| **MessageRouter** | Outbox pattern: thread-safe message queuing, atomic flush between rounds |
| **Orchestrator** | Main game loop: phase flow, conversation management, incoming chats, snapshots, error handling |
| **Strategist** | Persistent RLM agent: bootstrap, function injection, STRATEGIZE/DECIDE steps, system prompt |
| **Conversation Agent** | Ephemeral RLM diplomat: lifecycle, filtered GameView, outbox messaging, force-finish |

---

## Reference Material (`.tmp/`)

All reference code and papers live in `.tmp/`. Nothing in `.tmp/` is part of the implementation — it's source material for the engineer.

### `2512.24601v1.pdf`
The RLM paper (Zhang, Kraska, Khattab; MIT CSAIL, 2025). Defines the Recursive Language Model paradigm. Read the RLM section below for a summary.

### `rlm/`
The RLM library we build on. Key source files under `rlm/rlm/`:

| File | Purpose |
|---|---|
| `core/rlm.py` | `RLM` class — `completion()`, persistent mode, system prompt setup |
| `core/lm_handler.py` | `LMHandler` — TCP socket server routing sub-LM calls to backend clients |
| `core/comms_utils.py` | `LMRequest`/`LMResponse` dataclasses, socket send/recv protocol |
| `core/types.py` | `RLMChatCompletion` and related types |
| `environments/local_repl.py` | `LocalREPL` — sandboxed Python execution, `llm_query()`, `llm_query_batched()` |
| `environments/base_env.py` | `SupportsPersistence` protocol for multi-turn REPL sessions |
| `utils/prompts.py` | Default `RLM_SYSTEM_PROMPT`, `build_rlm_system_prompt()`, `build_user_prompt()` |
| `utils/parsing.py` | `find_final_answer()` — regex parsing for `FINAL()`/`FINAL_VAR()` sentinels |
| `clients/` | Backend clients: Anthropic, OpenAI, Azure, Gemini, LiteLLM, Portkey |

### `diplomacy/`
Upstream diplomacy game engine (v1.1.2, cloned from `github.com/diplomacy/diplomacy`). We vendor a subset of this. Key files we use:

| File | Purpose |
|---|---|
| `diplomacy/engine/game.py` | Game state, order adjudication, phase processing (205 KB) |
| `diplomacy/engine/map.py` | Board topology, adjacencies, coasts (67 KB) |
| `diplomacy/engine/power.py` | Per-power state (units, centers, orders) |
| `diplomacy/engine/message.py` | Negotiation messages with visibility filtering, `GLOBAL` constant |
| `diplomacy/utils/game_phase_data.py` | Historical phase snapshots |
| `diplomacy/utils/jsonable.py` | JSON serialization (needs `ujson` → `json` patch) |
| `diplomacy/utils/common.py` | Utilities (needs `bcrypt` removal patch) |
| `diplomacy/utils/sorted_dict.py`, `sorted_set.py`, `priority_dict.py` | Data structures |
| `diplomacy/utils/parsing.py` | Order string parsing |
| `diplomacy/maps/` | `.map` data files (esp. `standard.map`) + `convoy_paths_cache.pkl` |

### `AI_Diplomacy/`
Existing AI Diplomacy harness (arxiv:2508.07485). Reference for how LLMs have been used to play Diplomacy before. Not used directly — our approach replaces its scaffolding with RLM.

| Path | Purpose |
|---|---|
| `ai_diplomacy/` | Main package — game engine integration, prompt construction, agent logic |
| `lm_game.py` | Core LM-based game loop |
| `experiment_runner.py` | Orchestration for running experiments |
| `config.py` | Experiment configuration |
| `diplomacy/` | Their vendored copy of the diplomacy engine |
| `analysis/` | Post-game analysis and metrics |
| `experiments/` | Experiment configs and results |

### `twenty_questions/`
Example RLM app — two Claude agents play 20 Questions. Uses the Anthropic API directly, **not** the RLM library. Useful only as a reference for how agents can interact in turns.

---

## Recursive Language Models (RLM)

### The Problem: Context Rot

Modern LLMs have limited context windows, and even within those limits, quality degrades as context grows — a phenomenon called **context rot** (Hong et al., 2025). The effective context window is not a fixed number; it depends on the task's complexity. Simple needle-in-a-haystack lookups work at 1M+ tokens, but tasks requiring dense reasoning over the full input (like OOLONG's semantic aggregation) degrade at much shorter lengths.

From the paper:

> "Despite rapid progress in reasoning and tool use, modern language models still have limited context lengths and, even within these limits, appear to inevitably exhibit *context rot*, the phenomenon where the quality of even frontier models like GPT-5 degrades quickly as context gets longer."

This matters for Diplomacy because game state accumulates across dozens of phases — board positions, negotiation histories, past orders, relationships, memory. Feeding all of it into a prompt is exactly the pattern that triggers context rot.

### The Insight

The key insight of RLMs (Zhang, Kraska, Khattab; MIT CSAIL, 2025; arxiv:2512.24601) is that **long prompts should not be fed into the neural network directly**. Instead, they should be treated as data in an external environment that the LLM interacts with programmatically:

> "The key insight is that long prompts should not be fed into the neural network (e.g., Transformer) directly but should instead be treated as *part of the environment that the LLM can symbolically interact with*."

Given a prompt P, the RLM:

1. Loads P as a **variable** in a Python REPL environment
2. Tells the LLM metadata about P (its length, structure) but **does not put P in the LLM's context window**
3. The LLM writes Python code to examine, decompose, and query P
4. Code executes in the REPL; results are fed back to the LLM
5. The LLM can call `llm_query(sub_prompt)` to recursively invoke sub-LMs on chunks of P
6. This iterates until the LLM calls `FINAL(answer)`

The root LM stays light — its context only contains its own code and printed outputs. The heavy data reading is delegated to sub-LM calls.

### Depth Model

The current implementation uses two levels:

- **depth=0 (root LM)**: Has a REPL environment. Writes code in ` ```repl``` ` blocks. Sees only metadata + its own code output. Never sees raw data in its prompt. This is "the programmer."
- **depth=1 (sub-LM via `llm_query()`)**: A flat LLM API call. Receives data directly in its prompt. No REPL, no code execution. This is "the reader."

The root LM and sub-LMs can use different models. In the paper's GPT-5 experiments, GPT-5 is the root and GPT-5-mini handles sub-calls — a cost-effective split since sub-LMs do focused reading tasks. The `LMHandler` routes requests by depth: depth=0 goes to the default client, depth=1 can go to a separate `other_backend_client`.

### The REPL Environment

The RLM library provides `LocalREPL`, a sandboxed Python execution environment:

**Available to agent code:**
- `llm_query(prompt, model=None)` — Single sub-LM call (blocking). Sends a socket request to the `LMHandler`, which routes to the appropriate backend. Returns the response string.
- `llm_query_batched(prompts, model=None)` — Concurrent sub-LM calls. Sends all prompts in a single socket request; the handler processes them concurrently via `asyncio.gather()`. Returns a list of response strings in the same order as the input prompts.
- `FINAL_VAR(variable_name)` — A Python function (unlike `FINAL`) that retrieves a REPL variable's value. Useful for returning large computed results.
- `SHOW_VARS()` — Prints all current REPL variables.
- `print()` — Standard output, captured and fed back to the LLM as execution results.
- Standard Python builtins including `open()`, `__import__()`, file I/O, type operations.

**Blocked builtins:** `input`, `eval`, `exec`, `compile`, `globals`, `locals` — set to `None` in the safe builtins sandbox.

**Injection points:** The orchestrator injects custom functions and data into the REPL via `env.globals["name"] = value` and `env.locals["name"] = value`. During `execute_code()`, the REPL merges globals and locals into a combined namespace via `exec(code, combined, combined)`, then updates `self.locals` with any new variables the code created.

### Sentinels: FINAL and FINAL_VAR

The RLM's `completion()` call loops up to `max_iterations` times. Each iteration: the LLM generates text (possibly containing ` ```repl``` ` code blocks that get executed), then the library calls `find_final_answer()` on the LLM's output to check for sentinels.

`find_final_answer()` (in `rlm/utils/parsing.py`) uses two regexes with `re.MULTILINE`:

```python
# FINAL_VAR checked first — line-start anchored
r"^\s*FINAL_VAR\((.*?)\)"    # non-greedy capture

# FINAL checked second — line-start AND line-end anchored
r"^\s*FINAL\((.*)\)\s*$"     # greedy capture
```

Both must appear at the start of a line (outside code blocks — they're in the LLM's raw text, not in ` ```repl``` ` blocks). `FINAL_VAR` is checked first; if found, it executes the `FINAL_VAR()` Python function to retrieve the variable's value. `FINAL` captures whatever text is inside the parentheses as the answer.

If neither sentinel is found after `max_iterations`, the library returns a default answer (the last LLM output).

**These are text sentinels, not Python functions.** The LLM writes `FINAL(my answer here)` as plain text. The library regex-parses it from the output. This distinction matters because we extend this pattern with `SPAWN_CONVERSATION()` — a new sentinel that our harness parses using the same approach.

### Persistent Mode

`RLM(persistent=True)` enables multi-turn REPL sessions. On the first `completion()` call, a `LocalREPL` environment is created and stored as `rlm._persistent_env`. On subsequent calls:

1. The existing environment is reused (same globals, locals, temp directory)
2. A **new** `LMHandler` is created on a fresh auto-assigned port (safe for parallel execution)
3. The environment's handler address is updated to point to the new handler
4. The new prompt/context is added via `environment.add_context()`
5. Contexts are versioned: `context_0` (aliased as `context`), `context_1`, `context_2`, etc.

This means variables, functions, and files created in one `completion()` call persist into the next. The agent's REPL is its working memory. Each call gets its own `LMHandler` socket server, so multiple persistent RLMs can run `completion()` concurrently without port conflicts.

### The `root_prompt` Parameter

Each `completion()` call accepts an optional `root_prompt` string. This provides a small per-call instruction visible to the root LM — it appears in the user message for that call only and does not persist across calls. We use this to tell the agent what step it's in ("STRATEGIZE", "DECIDE") and how much time remains.

### The `custom_system_prompt` Parameter

`custom_system_prompt` **replaces** the default RLM system prompt entirely. It does not append or extend. The default prompt (`RLM_SYSTEM_PROMPT` in `rlm/utils/prompts.py`) explains the REPL environment, code block syntax, `llm_query()` usage, and `FINAL`/`FINAL_VAR` rules. When we provide a custom system prompt for our strategist and conversation agents, we must include all of this information ourselves.

The library's `build_rlm_system_prompt()` function still prepends a metadata message about context structure (type, length, chunk count), but the core behavioral instructions are entirely from our custom prompt.

### Communication Architecture

The LLM never calls `llm_query()` directly. The call flow is:

```
Agent REPL code: llm_query("analyze this chunk")
    → LocalREPL.llm_query() constructs LMRequest(prompt=..., depth=1)
    → Socket send to LMHandler address (TCP, 4-byte length-prefix + JSON)
    → LMHandler.handle() receives request
    → Routes to backend client based on depth/model
    → Backend client makes LLM API call
    → Response sent back over socket
    → llm_query() returns response string to REPL
```

For batched calls, all prompts travel in a single socket request. The handler processes them concurrently with `asyncio.gather()` and returns all responses at once.

Each `completion()` call creates its own `LMHandler` on an auto-assigned port (`ThreadingTCPServer` with port 0). This is why parallel execution is safe — no shared sockets, no port conflicts.

### Results

RLMs demonstrate strong performance at scale:

| Task | Context Size | Base GPT-5 | RLM(GPT-5) |
|---|---|---|---|
| BrowseComp+ (1K docs) | 6-11M tokens | 0.00% (can't fit) | **91.33%** |
| OOLONG | 131K tokens | 44.00% | **56.50%** |
| OOLONG-Pairs | 32K tokens | 0.04% | **58.00%** |
| CodeQA | 23K-4.2M tokens | 24.00% | **62.00%** |

Costs are comparable to or cheaper than summarization baselines. On BrowseComp+, ingesting 6-11M tokens via GPT-5-mini costs $1.50-$2.75, while RLM(GPT-5) averages $0.99.

### Known Limitations (from Paper)

1. **Sub-LM calls are synchronous/sequential in current implementation.** The authors note async sub-calls could significantly reduce runtime.
2. **Max recursion depth of 1.** Sub-calls are flat LMs — they can't spawn further sub-calls. Deeper recursion is future work.
3. **Distinguishing final answers from intermediate thoughts is brittle.** The FINAL/FINAL_VAR sentinel approach sometimes causes models to output their plan as a final answer prematurely. Minor safeguards were added (first-iteration message: "don't provide final answer yet").
4. **Models need sufficient coding ability.** Smaller models (Qwen3-8B) struggled to use the REPL effectively.
5. **Different models need different prompting.** Qwen3-Coder required an extra line warning against excessive sub-LM calls (it would make a sub-call per line of input without it).

### Emergent Behaviors (from Paper)

When frontier models are placed in the RLM framework, they exhibit interesting problem-solving patterns without explicit training:

- **Filtering via code priors**: Using `regex` searches and keyword filtering to narrow large contexts before reading
- **Chunking and recursive decomposition**: Breaking input into chunks and using `llm_query_batched()` for parallel processing
- **Answer verification through sub-LM calls**: Using additional sub-calls to verify and cross-check answers
- **Building composite outputs through variables**: Storing sub-call results in REPL variables and stitching them together programmatically for long outputs

---

## Vendoring `Diplomacy`

### 1. The Package

The [`diplomacy`](https://github.com/diplomacy/diplomacy) package (v1.1.2) is a DATC-compliant Diplomacy game engine written by Philip Paquette. It provides the game logic, order adjudication, map topology, and message system for the board game Diplomacy.

- **PyPI**: https://pypi.org/project/diplomacy/
- **GitHub**: https://github.com/diplomacy/diplomacy
- **Docs**: https://diplomacy.readthedocs.io/en/stable/
- **License**: AGPL-3.0
- **Last release**: v1.1.2, April 13 2020
- **Python support**: Declared 3.5, 3.6, 3.7 (no updates for 3.8+)

The package is a monolith that bundles the game engine with a Tornado-based client/server networking stack, a React web UI, a DAIDE protocol adapter, and webdiplomacy.net integration — all in one install.

---

### 2. What We Need

We need exactly five classes and their supporting utilities:

| Class | File | Purpose |
|---|---|---|
| `Game` | `engine/game.py` | Game state, order adjudication, phase processing |
| `Map` | `engine/map.py` | Board topology, adjacencies, coasts |
| `Power` | `engine/power.py` | Per-power state (units, centers, orders) |
| `Message` | `engine/message.py` | Negotiation messages with visibility filtering |
| `GamePhaseData` | `utils/game_phase_data.py` | Historical phase snapshots |

Plus:
- `maps/` directory containing `.map` data files (esp. `standard.map`) and `convoy_paths_cache.pkl`
- `utils/` modules for serialization (`jsonable.py`), data structures (`sorted_dict.py`, `sorted_set.py`, `priority_dict.py`), parsing, string constants, and error types

We do **not** need: `client/`, `server/`, `communication/`, `daide/`, `integration/`, `web/`, `tests/`, or `Renderer`.

---

### 3. The Conflicts

#### 3.1 Dependency Bloat

The package declares these `install_requires`:

| Dependency | Required by | Used by engine? |
|---|---|---|
| `tornado>=5.0` | `client/`, `server/`, `daide/` | **No** |
| `bcrypt` | `utils/common.py` (password hashing) | **No** (only `hash_password`, `is_valid_password`) |
| `ujson` | `utils/jsonable.py` (JSON serialization) | **Yes** (but stdlib `json` works fine) |
| `coloredlogs` | `diplomacy/__init__.py` (logging setup) | **No** |
| `pytz` | `utils/time.py` (timezone handling) | **No** |
| `tqdm` | `utils/convoy_paths.py` (progress bars) | **No** |
| `python-dateutil` | Not directly visible | **No** |

Installing via `uv add diplomacy` would pull in **7 unnecessary packages**, including a web server framework.

#### 3.2 Import Chain Forces All Dependencies

Even if you only import `Game`, the import chain triggers every external dependency:

```
from diplomacy import Game
  → diplomacy/__init__.py
    → import coloredlogs                          ← FAILS without coloredlogs
    → from .client.connection import Connection    ← FAILS without tornado
    → from .server.server import Server            ← FAILS without tornado
    → from .engine.game import Game
      → from diplomacy.utils import PriorityDict, common, ...
        → diplomacy/utils/__init__.py
          → from .time import str_to_seconds       ← FAILS without pytz
        → diplomacy/utils/common.py
          → import bcrypt                          ← FAILS without bcrypt
      → from diplomacy.utils.jsonable import Jsonable
        → diplomacy/utils/jsonable.py
          → import ujson as json                   ← FAILS without ujson
```

You cannot `from diplomacy import Game` without installing tornado, coloredlogs, bcrypt, pytz, and ujson. The `__init__.py` eagerly imports the client/server networking layer.

#### 3.3 Python Version Rot

The package targets Python 3.5-3.7 and has not been updated since 2020.

| Issue | Location | Severity for engine/ |
|---|---|---|
| `@gen.coroutine` + `yield` coroutines | `client/`, `server/`, `daide/` (16+ files) | **None** — engine is synchronous |
| `IOLoop.instance()` deprecated | `server/server.py`, `client/connection.py` | **None** — engine doesn't use it |
| `ujson` maintenance-only status | `utils/jsonable.py` | **Low** — replaceable with stdlib `json` |
| `datetime.utcfromtimestamp(0)` deprecated in 3.12 | `utils/common.py` line 32 | **Low** — cosmetic warning |

The good news: `engine/` and `utils/` are pure synchronous Python. No `@gen.coroutine`, no `collections.abc` issues, no `inspect.getargspec`. The compatibility problems are confined to the networking stack we don't need.

#### 3.4 No Modern Packaging

The package uses `setup.py` (no `pyproject.toml`), `find_packages()`, and no version pinning beyond `tornado>=5.0`. There is no lockfile, no dependency groups, no optional extras.

---

### 4. Plan

#### 4.1 What to Not Copy

**Not copied:**
- `client/` — Tornado WebSocket networking
- `server/` — Tornado game server
- `communication/` — network protocol definitions
- `daide/` — DAIDE protocol adapter
- `integration/` — webdiplomacy.net bridge
- `web/` — React frontend + build artifacts
- `tests/` — test suite
- `engine/renderer.py` — SVG rendering (optional, skip for now)

#### 4.2 Patches (4 Files)

**Patch 1: `diplomacy/__init__.py`** — Remove networking and coloredlogs

```python
# BEFORE (upstream)
import coloredlogs
from .engine.map import Map
from .engine.power import Power
from .engine.game import Game
from .engine.message import Message
from .client.connection import Connection, connect
from .server.server import Server
from .utils.game_phase_data import GamePhaseData
# ... coloredlogs logging setup ...

# AFTER (vendored)
from .engine.map import Map
from .engine.power import Power
from .engine.game import Game
from .engine.message import Message
from .utils.game_phase_data import GamePhaseData
```

**Patch 2: `utils/__init__.py`** — Remove pytz-dependent time imports

```python
# BEFORE (upstream)
from .keywords import KEYWORDS, ALIASES
from .priority_dict import PriorityDict
from .time import str_to_seconds, trunc_time, next_time_at

# AFTER (vendored)
from .keywords import KEYWORDS, ALIASES
from .priority_dict import PriorityDict
```

**Patch 3: `utils/common.py`** — Remove bcrypt top-level import

```python
# BEFORE (upstream)
import bcrypt
# ... password functions using bcrypt ...

# AFTER (vendored)
# Remove: import bcrypt
# Remove or stub: _sub_hash_password, is_valid_password, hash_password
# Keep everything else (is_dictionary, is_sequence, camel_case_to_snake_case,
#   assert_no_common_keys, timestamp_microseconds, StringableCode, etc.)
# Also remove class Tornado at the bottom (tornado utility, not needed)
```

**Patch 4: `utils/jsonable.py`** — Use stdlib json instead of ujson

```python
# BEFORE (upstream)
import ujson as json

# AFTER (vendored)
import json
```

Also apply the same patch to `utils/export.py` if included.

#### 4.3 No Other External Dependencies

After these 4 patches, the vendored `diplomacy` engine requires **zero external packages**. Every import resolves to either stdlib or internal diplomacy modules.

#### 4.4 How Our Code Imports It

```python
# In rlm_diplomacy/game_view.py, orchestrator.py, etc.
from rlm_diplomacy._vendor.diplomacy import Game, Map, Message
from rlm_diplomacy._vendor.diplomacy.engine.message import GLOBAL
from rlm_diplomacy._vendor.diplomacy.utils.game_phase_data import GamePhaseData
```

The `_vendor` prefix is a Python convention signaling "this is third-party code we maintain a copy of." It's the same pattern used by pip (`pip/_vendor/`), setuptools, and many other projects.

#### 4.5 Map Loading

`engine/map.py` loads `.map` files via `settings.PACKAGE_DIR`:

```python
# settings.py
PACKAGE_DIR = os.path.dirname(os.path.realpath(__file__))

# map.py (line ~310)
file_path = os.path.join(settings.PACKAGE_DIR, 'maps', file_name)
```

This uses `__file__`-relative paths. As long as the `maps/` directory sits next to `settings.py` inside the vendored package, it works without modification.

---

### 5. Rationale

#### Why not `uv add diplomacy`?

1. Pulls in 7 packages we don't use (tornado, bcrypt, ujson, coloredlogs, pytz, tqdm, python-dateutil)
2. The `__init__.py` fails on import without all dependencies present
3. Package targets Python 3.5-3.7; untested on 3.11+
4. The networking stack (`client/`, `server/`) uses deprecated Tornado patterns that break on modern Python
5. Unmaintained since April 2020

#### Why not `sys.path` into AI_Diplomacy?

1. Couples our project to the AI_Diplomacy directory layout
2. AI_Diplomacy's copy may have been modified from upstream (unknown provenance)
3. AI_Diplomacy's copy includes the full package (client/server/web) — importing it still triggers the dependency chain
4. Fragile: moving files, renaming directories, or running from a different working directory breaks it

#### Why vendor from upstream?

1. Clean provenance — we know exactly what version we copied (v1.1.2 from `github.com/diplomacy/diplomacy`)
2. Minimal footprint — only the ~20 files we actually use
3. Zero external dependencies after 4 small patches
4. Self-contained — the vendored package travels with our code
5. Maintainable — each patch is documented and small (1-3 lines changed per file)
6. Standard practice — pip, setuptools, requests, and many Python projects vendor dependencies this way

#### Why not fork and publish our own `diplomacy-engine` package?

Overkill for now. We can always extract the vendor into its own package later. Vendoring keeps things simple and avoids the maintenance burden of a separate package.

---

### 6. Verification

After vendoring, verify with:

```python
# Should succeed with zero external dependencies
from rlm_diplomacy._vendor.diplomacy import Game, Message

game = Game()
assert game.get_current_phase() == 'S1901M'
assert len(game.get_units()) == 7  # 7 powers
assert 'A PAR' in game.get_units('FRANCE')

possible = game.get_all_possible_orders()
assert 'PAR' in possible
assert 'A PAR H' in possible['PAR']

game.set_orders('FRANCE', ['A PAR - BUR', 'A MAR - SPA', 'F BRE - MAO'])
game.process()
assert game.get_current_phase() in ('S1901R', 'F1901M')  # depends on whether retreats are needed
```

---

## Key Design Decisions

### 1) Why Persistent RLM (not fresh per phase)?

The strategist accumulates REPL variables, utility functions, and data structures across the entire game. A fresh RLM each phase would lose this state. Persistent mode preserves the programming environment — the agent's code, variables, and imported modules carry forward.

### 2) Why Conversation Agents Are Separate RLMs (not part of the strategist)?

1. **Isolation**: Conversation agents can't access `submit_orders()`. This is enforced by not injecting it into their REPL.
2. **Parallelism**: Multiple conversations run in parallel. If they were part of the strategist's RLM, they'd serialize.
3. **Cleanup**: Conversation state (drafts, analysis) doesn't pollute the strategist's REPL.

### 3) Why Outbox Pattern (not direct game.add_message)?

Round-based synchronization. If agents wrote directly to the game, an agent running slightly faster could see another agent's message from the *same* round, creating race conditions and unfair advantages.

### 4) Why No BFS Tactical Context Pre-computation?

The RLM agent can call `game_view.get_all_possible_orders()` and `game_view.map.abuts()` directly in its REPL code. If it needs BFS, it can write the BFS code itself. The AI_Diplomacy BFS exists because their agents can't run code — they need everything pre-computed in the prompt.

### 5) Why Text Sentinels (`FINAL`, `SPAWN_CONVERSATION`) Instead of Return Values?

The RLM library's `completion()` call only returns when it detects `FINAL(...)` or `FINAL_VAR(...)` in the model's output. There's no way to "return" from inside the REPL — the `FINAL()` sentinel is the mechanism. We extend this pattern with `SPAWN_CONVERSATION()` — a new text sentinel that the harness parses to initiate negotiations. Sentinels work at the text level, outside code blocks, keeping the agent's REPL code simple while the harness manages complex orchestration.

## Data Model

Shared dataclasses used across modules. No business logic.

```python
from dataclasses import dataclass, field
from typing import Literal

PowerName = Literal[
    "AUSTRIA", "ENGLAND", "FRANCE", "GERMANY", "ITALY", "RUSSIA", "TURKEY"
]
ALL_POWERS: list[PowerName] = [
    "AUSTRIA", "ENGLAND", "FRANCE", "GERMANY", "ITALY", "RUSSIA", "TURKEY"
]

@dataclass
class ConversationRequest:
    """Parsed from a SPAWN_CONVERSATION sentinel. One per power per phase."""
    power: PowerName                    # The strategist's own power
    objectives: dict[str, str]          # {target_power: objective_string}

@dataclass
class ConversationSummary:
    """Return value from a completed conversation agent."""
    power: PowerName            # The strategist's own power
    targets: list[PowerName]    # Who was talked to
    summary: str                # Agent's summary of the conversation
    rounds_used: int            # How many rounds the conversation lasted

@dataclass
class PendingMessage:
    """A message queued in an outbox, not yet flushed to the game."""
    sender: PowerName
    recipient: PowerName | Literal["GLOBAL"]
    content: str
    phase: str                  # Current phase when message was created

class GameHaltError(Exception):
    """Raised when a completion() call fails after exhausting all retries.

    The orchestrator catches this at the game loop level. On halt:
    1. Save a snapshot of the current state
    2. Log the error to game_log.jsonl
    3. Propagate the exception to the caller (CLI)
    """
    pass

@dataclass
class GameConfig:
    """Full game configuration."""
    # Model settings
    backend: str = "anthropic"
    backend_kwargs: dict = field(default_factory=lambda: {
        "model_name": "claude-sonnet-4-5-20250929"
    })
    sub_backend: str | None = None
    sub_backend_kwargs: dict | None = None

    # Timeouts
    strategize_timeout: float = 120.0
    converse_timeout: float = 180.0
    decide_timeout: float = 120.0
    converse_max_rounds: int = 5
    target_response_timeout: float = 60.0  # per-target silence timeout

    # Game settings
    max_year: int = 1910
    game_dir: str = "./game_output"

    # RLM settings
    max_iterations: int = 15   # Max REPL iterations per completion() call
    max_retries: int = 10      # Retries per completion() call before GameHaltError

    # Output
    verbose: bool = False
```

---

## GameView

### What It Does

GameView is a read-only wrapper around the `diplomacy.Game` object, scoped to a single power's visibility. It is injected into every agent's REPL as `game_view`. Every method either delegates directly to the underlying Game or applies message visibility filtering.

GameView exists to enforce two invariants:

1. **Agents cannot mutate game state.** No `set_orders`, `process`, `add_message`, or any other write method is exposed. The orchestrator is the only code that mutates the Game.
2. **Agents only see messages they should see.** A power sees global messages and private messages where it is the sender or recipient. It cannot see private messages between other powers.

---

### Interface

```python
class GameView:
    def __init__(self, game: Game, power_name: str): ...

    # --- Board state (all public) ---
    def get_units(self, power_name: str | None = None) -> list[str] | dict: ...
    def get_centers(self, power_name: str | None = None) -> list[str] | dict: ...
    def get_all_possible_orders(self) -> dict[str, list[str]]: ...
    def get_orderable_locations(self, power_name: str | None = None) -> list[str]: ...

    # --- Phase info ---
    def get_current_phase(self) -> str: ...
    @property
    def phase_type(self) -> str: ...
    @property
    def is_game_done(self) -> bool: ...

    # --- Messages (visibility-filtered) ---
    def get_messages(self) -> dict: ...
    def get_message_history(self) -> dict: ...

    # --- Game history (all public) ---
    def get_phase_history(self) -> list: ...
    def get_order_history(self) -> dict: ...
    def get_result_history(self) -> dict: ...

    # --- Map topology ---
    @property
    def map(self) -> Map: ...
    @property
    def powers(self) -> dict: ...

    # --- Identity ---
    power_name: str
```

Every method is a thin pass-through to `Game`. No caching, no transformation, no convenience helpers.

---

### What the Agent Sees

#### Board State

All unit positions and supply center ownership are public knowledge in Diplomacy. Every power can see every other power's units and centers:

```python
# Agent's REPL code
all_units = game_view.get_units()          # dict of all 7 powers' units
my_units = game_view.get_units("FRANCE")   # ['A PAR', 'A MAR', 'F BRE']
my_centers = game_view.get_centers("FRANCE")  # ['PAR', 'MAR', 'BRE']
```

#### Legal Orders

`get_all_possible_orders()` returns every legal order for every location on the board. This is the same data that AI_Diplomacy pre-computes as "BFS tactical context," but here the agent accesses it programmatically:

```python
possible = game_view.get_all_possible_orders()
paris_orders = possible.get("PAR", [])
# ['A PAR H', 'A PAR - BUR', 'A PAR - PIC', 'A PAR S A MAR - BUR', ...]
```

The agent can filter, search, and analyze these orders in code — no need for pre-computation in the prompt.

#### Orderable Locations

`get_orderable_locations()` returns where a power must submit orders. This varies by phase type:

- **Movement**: all unit locations
- **Retreat**: dislodged unit locations only
- **Adjustment**: home centers (for builds) or all unit locations (for disbands)

```python
locs = game_view.get_orderable_locations()  # uses own power_name by default
# Movement: ['PAR', 'MAR', 'BRE']
```

#### Phase Info

```python
game_view.get_current_phase()  # 'S1901M'
game_view.phase_type           # 'M'
game_view.is_game_done         # False
```

#### Messages

Messages are filtered by the `Game.filter_messages()` class method. The filtering rule:

- **A power sees**: all GLOBAL messages + all messages where it is the sender or recipient
- **A power does NOT see**: private messages between two other powers

```python
# Current phase messages
msgs = game_view.get_messages()
for ts, msg in msgs.items():
    print(f"{msg.sender} → {msg.recipient}: {msg.message}")
# FRANCE sees:
#   ENGLAND → FRANCE: "Let's ally"         ← FRANCE is recipient
#   FRANCE → ENGLAND: "Agreed"             ← FRANCE is sender
#   GERMANY → GLOBAL: "Peace to all"       ← GLOBAL message
# FRANCE does NOT see:
#   ENGLAND → RUSSIA: "Attack France"      ← private, neither sender nor recipient
```

#### Message History

`get_message_history()` returns all past phases' messages, filtered to this power's visibility. The full history is always accessible — no range limits, no pagination:

```python
history = game_view.get_message_history()
# {'S1901M': {ts: Message, ...}, 'F1901M': {ts: Message, ...}, ...}

# Agent can query specific phases
spring_msgs = history.get('S1901M', {})
```

The data structure is a dict of phase_name → dict of timestamp → Message. The agent works with it in code:

```python
# Count messages from England across all phases
england_msgs = []
for phase, msgs in game_view.get_message_history().items():
    for ts, msg in msgs.items():
        if msg.sender == "ENGLAND":
            england_msgs.append((phase, msg.message))
print(f"England sent us {len(england_msgs)} messages total")
```

#### Order History

All past orders are public knowledge. After each phase resolves, every power's orders are revealed:

```python
orders = game_view.get_order_history()
# {'S1901M': {'FRANCE': ['A PAR - BUR', ...], 'ENGLAND': [...], ...}}
```

#### Result History

Order results show what happened — whether moves succeeded, were bounced, cut, etc.:

```python
results = game_view.get_result_history()
# {'S1901M': {'A PAR': ['OK'], 'F LON': ['BOUNCE'], ...}}
```

#### Map Topology

The `map` property exposes the raw `Map` object. This gives the agent access to:

- `map.locs` — all locations (including coasts like `BUL/EC`)
- `map.loc_abut` — adjacency lists per location
- `map.abuts(unit_type, unit_loc, order_type, other_loc)` — check if a move/support/convoy is geographically valid
- `map.loc_type` — whether a location is LAND, WATER, COAST, or PORT
- `map.scs` — list of all supply centers
- `map.powers` — list of all power names

```python
# Agent can check adjacency
game_view.map.abuts("A", "PAR", "-", "BUR")  # True
game_view.map.abuts("A", "PAR", "-", "LON")  # False (can't walk across water)

# Agent can build its own BFS if needed
neighbors = game_view.map.loc_abut.get("PAR", [])
```

---

### What's Blocked

GameView deliberately does **not** expose:

| Method | Why blocked |
|---|---|
| `set_orders(power, orders)` | Orders go through `submit_orders()`, which validates and stores them for the orchestrator |
| `process()` | Only the orchestrator advances phases |
| `add_message(message)` | Messages go through `send_message()` → outbox → router |
| `clear_orders(power)` | Agents should not be able to clear orders |
| `set_current_phase(phase)` | Agents cannot jump phases |
| `set_status(status)` | Agents cannot end the game |

These write operations are handled by the orchestrator or by purpose-specific injected functions (`submit_orders`, `send_message`). GameView is strictly read-only.

---

### Why Raw Pass-Through?

GameView does not provide convenience helpers like `get_my_units()`, `get_adjacent_provinces()`, or `compute_threats()`. Every method maps 1:1 to the underlying `Game` API.

The rationale:

1. **Agents write code.** An RLM agent that wants `get_my_units()` writes `game_view.get_units(game_view.power_name)`. This is one line of code — a convenience method saves nothing meaningful.

2. **Avoids API surface bloat.** Every helper we add is a method the agent must learn (via the system prompt), the spec must document, and tests must cover. The `Game` API is already well-defined.

3. **Agents can build their own helpers.** In persistent mode, REPL state carries across phases. An agent can define utility functions in its first `completion()` call and reuse them:

```python
# Agent defines its own helpers in the REPL
def my_units():
    return game_view.get_units(game_view.power_name)

def my_centers():
    return game_view.get_centers(game_view.power_name)

def neighbors(loc):
    return game_view.map.loc_abut.get(loc, [])
```

These functions persist across `completion()` calls thanks to the persistent REPL. The agent builds exactly the abstractions it finds useful.

4. **AI_Diplomacy's BFS context exists because their agents can't code.** Their agents receive a flat text prompt — tactical context must be pre-computed and serialized. Our agents have a REPL. If an agent wants BFS, it writes BFS. If it doesn't need BFS, it doesn't pay for it.

---

### Thread Safety

GameView reads from the `Game` object. The orchestrator writes to it (via `set_orders`, `process`, `add_message`). These never overlap:

```
  STRATEGIZE:    7 agents READ via GameView    (parallel)
  [orchestrator: no writes]

  CONVERSE:      ≤7 agents READ via GameView   (parallel)
  [orchestrator: router.flush() writes messages between rounds]

  DECIDE:        7 agents READ via GameView    (parallel)
  [orchestrator: set_orders + process AFTER all agents return]
```

Reads happen during agent execution. Writes happen between steps, after all agents have finished. No locking is needed.

The one exception is `router.flush()` during CONVERSE, which writes messages to the game between conversation rounds. This is safe because flush happens between rounds — no agents are executing during flush.

---

### One GameView Per Power

The orchestrator creates one `GameView` per power at game start. Each is bound to that power's visibility:

```python
views = {
    power: GameView(game, power)
    for power in ALL_POWERS
}
```

The same `GameView` instance is passed to the strategist and to any conversation agents spawned for that power. They all see the same filtered view.

When the game state changes (after `game.process()`), the GameView immediately reflects the new state — it holds a reference to the live `Game` object, not a snapshot.

---

## Memory

### What It Does

Each of the 7 powers has a markdown file on disk that serves as its long-term memory. The strategist reads and writes this file freely via `open()` in its REPL code. There is no imposed structure, no schema, no summarization pipeline. The agent organizes its memory however it wants.

This is intentionally minimal. The RLM architecture handles context management — the agent writes code to extract what it needs, and delegates heavy reading to `llm_query()`. No consolidation system is necessary.

---

### Interface

```python
class MemoryManager:
    def __init__(self, game_dir: str): ...
    def memory_path(self, power: str) -> str: ...
    def initialize(self, power: str) -> None: ...
    def read_snapshot(self, power: str) -> str: ...
    def initialize_all(self) -> None: ...
```

- `MemoryManager("/path/to/game_output")` creates the manager.
- `memory_path("FRANCE")` returns `"/path/to/game_output/FRANCE_memory.md"`.
- `initialize("FRANCE")` creates the file if it doesn't exist.
- `read_snapshot("FRANCE")` returns the current file contents as a string.
- `initialize_all()` initializes all 7 powers.

---

### File Format

Each memory file starts blank with a header:

```markdown
# FRANCE — Strategic Memory

```

That's it. No template sections, no pre-seeded content. The agent decides what to write, when, and in what structure. Some agents might maintain bullet lists. Others might write long narrative entries. Others might create structured sections with headers. The format is entirely up to the LLM.

---

### How the Strategist Uses It

The strategist's REPL has `memory_path` injected as a string global. The agent uses standard Python file I/O:

```python
# Agent's REPL code — reading memory
with open(memory_path) as f:
    memory = f.read()
print(f"Memory is {len(memory)} chars")

# Analyze memory with a sub-LM call
summary = llm_query(f"Summarize the key alliances from this memory:\n{memory}")
print(summary)
```

```python
# Agent's REPL code — writing memory
with open(memory_path, "a") as f:
    f.write(f"\n## Phase {game_view.get_current_phase()}\n")
    f.write("- Allied with England against Germany\n")
    f.write("- Germany broke promise about Belgium\n")
    f.write("- Russia is building fleet in StP — watch carefully\n")
```

```python
# Agent can also rewrite the entire file
with open(memory_path, "w") as f:
    f.write("# FRANCE — Strategic Memory\n\n")
    f.write(updated_content)
```

The file lives in the RLM's temp directory namespace, but since `memory_path` is an absolute path to the game output directory, it persists across REPL sessions and is visible to the orchestrator.

---

### How Conversation Agents See It

Conversation agents receive a **read-only snapshot** — a Python string copied from the memory file at the time the agent is created:

```python
# Orchestrator creates conversation agent
snapshot = memory_manager.read_snapshot("FRANCE")
agent = ConversationAgent(
    ...,
    memory_snapshot=snapshot,
)
```

Inside the conversation agent's REPL, the snapshot is available as a string variable:

```python
# Conversation agent's REPL code
print(len(memory_snapshot))  # It's a string, not a file path
analysis = llm_query(f"Based on this strategic memory, what should I "
                     f"propose to England?\n{memory_snapshot}")
```

The conversation agent **cannot modify the strategist's memory**. It has no access to `memory_path`. The snapshot is a value copy — writes to it change nothing on disk.

This separation is deliberate: the diplomat negotiates with information available at deployment time, but only the strategist (the leader) decides what to remember long-term.

---

### When Memory Is Read/Written

| Step | Who | Access |
|---|---|---|
| STRATEGIZE | Strategist | Read + Write |
| CONVERSE (agent creation) | Orchestrator | Read (to create snapshot) |
| CONVERSE (rounds) | Conversation agent | Read-only snapshot (string) |
| DECIDE | Strategist | Read + Write |

The strategist typically reads memory at the start of STRATEGIZE (to recall context) and writes memory at the end of DECIDE (to record what happened this phase). But this is a convention, not a requirement — the agent can read and write at any point.

---

### File Lifecycle

```
Game start:
  MemoryManager.initialize_all()
  → Creates 7 files: AUSTRIA_memory.md, ENGLAND_memory.md, ...
  → Each contains: "# {POWER} — Strategic Memory\n\n"

Each phase:
  Strategist reads/writes via open(memory_path)
  Orchestrator reads snapshot for conversation agents

Game end:
  Files remain in game_dir for post-game analysis
```

Memory files accumulate for the entire game. They are never truncated or consolidated by the system. If an agent's memory grows too large for it to process, the agent can choose to rewrite the file with a summary — but that's the agent's decision, not the system's.

---

### Concurrency

Each power has its own memory file. The 7 strategists run in parallel, but each writes only to its own file — there are no cross-power writes. No locking is needed. 

---

### Why No Structure?

AI_Diplomacy imposes a rigid dual-layer diary system with phase-prefixed entries, yearly consolidation, and LLM-driven summarization. This exists because their agents can't run code — everything must fit in a single prompt.

RLM agents can run code. An agent that wants structured memory can write:

```python
import json
with open(memory_path) as f:
    data = json.loads(f.read())
alliances = data.get("alliances", {})
```

An agent that wants narrative memory can write prose. An agent that wants phase-indexed entries can use markdown headers. The system doesn't care.

This avoids:
- A consolidation pipeline that burns LLM tokens every Spring phase
- A schema that may not match what the agent actually needs
- A token budget system that artificially limits what the agent can remember

The trade-off: the agent might write poorly organized memory that becomes hard to search. But that's a prompt engineering problem (tell the agent to organize well), not a systems problem.

---

### Why a File (Not a REPL Variable)?

The memory could live as a REPL variable (`self.memory = "..."`). A file has three advantages:

1. **Survives crashes.** If the process dies, the file is on disk. REPL variables are lost.
2. **Observable.** A human can `cat game_output/FRANCE_memory.md` during a game to see what the agent is thinking. REPL variables are opaque from outside.
3. **Size.** Files can grow without consuming REPL namespace memory. The agent loads only what it needs via `open()`.

The agent's REPL *also* has persistent variables across `completion()` calls (that's what persistent mode does). The memory file is for durable, inspectable state. REPL variables are for ephemeral working data (analysis results, helper functions, cached computations).

---

## Timer

### What It Does

The timer enforces time limits on each step of the game loop (STRATEGIZE, CONVERSE, DECIDE). It serves two purposes:

1. **Soft signal for agents** — A `time_remaining()` function is injected into every REPL. The agent can check it, pace itself, and wrap up before the deadline.
2. **Hard deadline for the orchestrator** — If an agent's `completion()` call hasn't returned by the deadline, the orchestrator stops waiting and proceeds with default behavior (HOLD orders, etc.).

---

### Interface

```python
class PhaseTimer:
    def __init__(self, timeout_seconds: float): ...

    @property
    def expired(self) -> bool: ...

    def remaining(self) -> float: ...

    def remaining_fn(self) -> Callable[[], float]: ...
```

- `PhaseTimer(120.0)` starts a 120-second countdown from the moment of construction.
- `expired` returns `True` when `time.monotonic()` passes the deadline.
- `remaining()` returns seconds left, clamped to `0.0`.
- `remaining_fn()` returns a zero-argument closure suitable for REPL injection.

Uses `time.monotonic()` (not `time.time()`) because it's immune to system clock adjustments.

---

### How the Agent Sees It

The orchestrator injects `time_remaining` into the REPL globals before each `completion()` call:

```python
env.globals["time_remaining"] = timer.remaining_fn()
```

Inside the REPL, the agent can call it:

```python
# Agent's REPL code
remaining = time_remaining()
print(f"{remaining:.0f} seconds left")
if remaining < 10:
    # Hurry — submit what we have
    submit_orders(current_orders)
```

The agent also sees the remaining time in the `root_prompt` passed to each `completion()`:

```
Phase: S1901M. DECIDE step. You have 108s remaining.
```

This is informational. The agent is encouraged to use `time_remaining()` for real-time checks since the `root_prompt` value is a snapshot from before the call started.

---

### How the Orchestrator Enforces It

The orchestrator runs agents in a `ThreadPoolExecutor`. Each agent's `completion()` call is a blocking operation in its own thread. The orchestrator enforces the deadline by waiting with a timeout:

```python
timer = PhaseTimer(config.decide_timeout)

with ThreadPoolExecutor(max_workers=7) as pool:
    futures = {
        pool.submit(strategist.decide, phase): power
        for power, strategist in active_strategists
    }

    done, not_done = wait(futures, timeout=timer.remaining())

    for future in done:
        future.result()  # Collect results, propagate exceptions

    for future in not_done:
        # Agent timed out — mark it, use default orders later
        power = futures[future]
        timed_out.add(power)
```

**What happens to timed-out agents:**

Python threads cannot be killed. A timed-out `completion()` continues running in the background — it will eventually finish when the current LLM API call returns and `FINAL()` is found (or `max_iterations` is hit). This is acceptable because:

1. Each `completion()` creates its own `LMHandler` socket server on an auto-assigned port. The timed-out thread's handler is isolated from everything else.
2. The persistent REPL environment is not touched by the orchestrator until the next step for that agent. By then, the orphaned call has finished.
3. The orchestrator applies default orders for timed-out agents and moves on. The game doesn't stall.

The only cost is a background thread consuming LLM API tokens after the deadline. To mitigate this, the `max_iterations` on the RLM is set low enough (default 15) that even a worst-case runaway completes within a bounded time.

---

### Timer Lifecycle Per Phase

```
Movement Phase (S1901M):

  timer_1 = PhaseTimer(strategize_timeout)
  ├── 7 strategists run in parallel
  ├── wait(futures, timeout=timer_1.remaining())
  └── collect conversation requests (or defaults for timed-out)

  timer_2 = PhaseTimer(converse_timeout)
  ├── conversation agents run in rounds
  ├── each round: wait(futures, timeout=timer_2.remaining())
  ├── between rounds: check timer_2.expired → force-finish remaining agents
  └── collect summaries

  timer_3 = PhaseTimer(decide_timeout)
  ├── 7 strategists run in parallel
  ├── wait(futures, timeout=timer_3.remaining())
  └── collect orders (or defaults for timed-out)
```

Each step gets its own timer. Timers do not carry over — unused time from STRATEGIZE does not extend CONVERSE.

---

### Conversation Round Timing

During CONVERSE, the timer governs multiple rounds of conversation. Between each round, the orchestrator checks:

```python
while active_agents and not timer.expired and round_num < max_rounds:
    round_num += 1
    # run all active agents in parallel
    done, not_done = wait(futures, timeout=timer.remaining())
    # handle timed-out agents
    router.flush()
    active_agents = [a for a in active_agents if not a.is_finished]
```

If the timer expires mid-round, agents that haven't returned are force-finished (their summary is set to a timeout message). The orchestrator does not start another round.

---

### Default Behavior on Timeout

When a strategist times out during DECIDE (the critical step where orders are submitted):

| Phase type | Default orders |
|---|---|
| Movement (`M`) | All units HOLD |
| Retreat (`R`) | All dislodged units DISBAND |
| Adjustment (`A`) | WAIVE all builds, DISBAND units farthest from home supply centers (by map adjacency distance) for excess |

These defaults are safe — they don't lose units unnecessarily and don't make aggressive moves that could backfire.

When a strategist times out during STRATEGIZE, it simply has no conversation requests. The agent proceeds directly to DECIDE without any negotiation input.

---

### Configuration

Timer-related fields from `GameConfig` (defined in the Data Model section):

- `strategize_timeout` (120s), `converse_timeout` (180s), `decide_timeout` (120s) — wall-clock seconds per step
- `converse_max_rounds` (5) — maximum conversation rounds per phase
- `max_iterations` (15) — RLM REPL iteration cap per `completion()` call
- `target_response_timeout` (60s) — per-target silence timeout

All timeouts are wall-clock seconds. They include LLM API latency, code execution, and any `llm_query()` sub-calls the agent makes.

---

### Why Not Cancel the Thread?

Python's `threading` module provides no mechanism to kill or interrupt a running thread. The standard approaches are:

1. **`future.result(timeout=...)`** — Stop *waiting*, but the thread continues. This is what we use.
2. **`ctypes.pythonapi.PyThreadState_SetAsyncExc`** — Raises an exception in the target thread. Unreliable — doesn't interrupt blocking I/O (like the LLM API call) and can leave resources in an inconsistent state.
3. **`multiprocessing`** — Processes can be killed, but each would need its own RLM instance and can't share the persistent environment.

Option 1 is the simplest and safest. The background thread finishes naturally, cleans up its own resources, and the persistent environment remains intact for the next step.

---

## MessageRouter

### What It Does

The MessageRouter implements the outbox pattern for inter-agent communication. Messages sent by conversation agents are queued in per-power outboxes and committed to the game atomically between rounds. This ensures round-based synchronization: no agent sees another agent's messages from the same round.

---

### Interface

```python
class MessageRouter:
    def __init__(self, game: Game):
        self._game = game
        self._lock = threading.Lock()
        self._outboxes: dict[str, list[PendingMessage]] = {p: [] for p in ALL_POWERS}

    def queue_message(self, message: PendingMessage) -> None:
        """Thread-safe. Add a message to the sender's outbox."""
        with self._lock:
            self._outboxes[message.sender].append(message)

    def flush(self) -> list[PendingMessage]:
        """Commit all outboxed messages to the game. Returns flushed messages.

        Called by the orchestrator between conversation rounds (single-threaded).
        Messages are committed via game.add_message() in send order.
        GLOBAL messages are added once (not duplicated per recipient).
        """
        with self._lock:
            flushed = []
            for power in ALL_POWERS:
                for pending in self._outboxes[power]:
                    msg = Message(
                        sender=pending.sender,
                        recipient=pending.recipient,
                        phase=pending.phase,
                        message=pending.content,
                    )
                    self._game.add_message(msg)
                    flushed.append(pending)
                self._outboxes[power] = []
            return flushed

    def get_unread(self, involved_powers: set[str]) -> list[dict]:
        """After flush, find messages sent to powers not in any conversation.

        Returns list of dicts with keys: sender, recipient, content, phase.
        """
```

---

### Thread Safety

- `queue_message()` is called by conversation agents running in parallel — protected by `threading.Lock`
- `flush()` is called by the orchestrator between rounds (single-threaded), but still acquires the lock for safety
- The `Game` object's `add_message()` is only called during `flush()`, which runs between rounds when no agents are executing

---

## Orchestrator

### What It Does

The orchestrator is the main game loop. It owns the `diplomacy.Game` object, all strategist RLMs, the message router, and the memory manager. It coordinates phases, manages conversation agents, enforces timeouts, applies orders, saves snapshots, and handles errors.

The orchestrator is the only code that mutates game state. Agents interact through read-only views and injected functions — the orchestrator mediates everything.

---

### Interface

```python
class Orchestrator:
    def __init__(self, config: GameConfig): ...
    def run(self) -> None: ...

    @classmethod
    def from_snapshot(cls, snapshot_dir: str, config: GameConfig) -> "Orchestrator": ...
```

That's it. Create it, run it, or restore from a snapshot.

---

### Game Loop

```python
def run(self) -> None:
    try:
        self._bootstrap_all()

        while not self.game.is_game_done:
            phase = self.game.get_current_phase()
            year = int(phase[1:5])
            if year > self.config.max_year:
                break

            if self.game.phase_type == "M":
                self._run_movement_phase()
            elif self.game.phase_type == "R":
                self._run_retreat_phase()
            elif self.game.phase_type == "A":
                self._run_adjustment_phase()

            self.game.process()
            self._save_snapshot()
    except GameHaltError:
        self._save_snapshot()   # Save state before halting
        raise
    finally:
        for strategist in self.strategists.values():
            strategist.close()  # Clean up RLM instances
```

The loop processes phases until the game ends (a power reaches 18 supply centers), `max_year` is exceeded, or a `GameHaltError` is raised. Draw detection uses `game.is_game_done` (set by the engine when a draw is declared or a power reaches 18 centers).

---

### Initialization

```python
def __init__(self, config: GameConfig):
    self.game = Game()
    self.memory = MemoryManager(config.game_dir)
    self.memory.initialize_all()
    self.router = MessageRouter(self.game)

    self.strategists: dict[str, StrategistAgent] = {}
    for power in ALL_POWERS:
        self.strategists[power] = StrategistAgent(
            power_name=power,
            game=self.game,
            memory=self.memory,
            config=config,
        )
```

One `Game`, one `MemoryManager`, one `MessageRouter`, seven `StrategistAgent`s.

---

### Bootstrap

All 7 strategists bootstrap in parallel. Bootstrap is a real initialization — the agent reads its memory, surveys the board, and defines helper functions:

```python
def _bootstrap_all(self) -> None:
    with ThreadPoolExecutor(max_workers=7) as pool:
        futures = {
            pool.submit(s.bootstrap): power
            for power, s in self.strategists.items()
        }
        for future in as_completed(futures):
            future.result()
```

---

### Movement Phase Flow

Movement phases have negotiation. The flow is:

```
Phase: S1901M

STEP 1: STRATEGIZE
  ┌──────────────────────────────────────────┐
  │ All 7 strategists run completion()       │
  │ in parallel.                             │
  │                                          │
  │ Each strategist:                         │
  │   1. Reads memory, analyzes board        │
  │   2. Writes SPAWN_CONVERSATION({...})    │
  │      OR writes FINAL("done") to skip     │
  │                                          │
  │ Harness detects SPAWN_CONVERSATION       │
  │ sentinel and collects requests.          │
  └──────────────────────────────────────────┘
                    │
                    ▼
STEP 2: CONVERSE (managed entirely by harness)
  ┌──────────────────────────────────────────┐
  │ Harness creates conversation agents      │
  │ from SPAWN_CONVERSATION requests.        │
  │                                          │
  │ Round 1: all conv agents run in parallel │
  │   ★ flush messages                       │
  │   ★ check for incoming chats to powers   │
  │     that didn't target the sender        │
  │   ★ notify strategists via mini          │
  │     completion() callbacks               │
  │                                          │
  │ Round 2-N: repeat until all FINAL()      │
  │   or timer expires                       │
  │                                          │
  │ 60s timeout per unanswered target        │
  └──────────────────────────────────────────┘
                    │
                    ▼
STEP 3: DECIDE
  ┌──────────────────────────────────────────┐
  │ Harness injects results into REPL:       │
  │   conversation_results = [...]           │
  │   unread_messages = [...]                │
  │                                          │
  │ All 7 strategists run completion()       │
  │ in parallel.                             │
  │                                          │
  │ Each strategist:                         │
  │   1. Reads conversation_results          │
  │   2. Analyzes board                      │
  │   3. Updates memory                      │
  │   4. Calls submit_orders()               │
  │   5. FINAL("done")                       │
  └──────────────────────────────────────────┘
                    │
                    ▼
  Apply orders → game.process() → next phase
```

---

### The SPAWN_CONVERSATION Sentinel

`SPAWN_CONVERSATION` is a text sentinel like `FINAL`. The LLM writes it as plain text (not in a code block). The harness parses it from the model's output and takes over.

```
# LLM's raw text output:
I've analyzed the board. France needs to ally with England
and probe Italy about Tyrolia.

SPAWN_CONVERSATION({"ENGLAND": "Propose alliance against Germany", "ITALY": "Discuss Tyrolia DMZ"})
```

The harness detects `SPAWN_CONVERSATION({...})`, terminates the current `completion()` call (just as `FINAL()` would), extracts the JSON parameters, and proceeds to the CONVERSE step.

If a strategist writes `FINAL("done")` instead of `SPAWN_CONVERSATION`, it skips negotiation — no conversation agent is created for that power.

**Parsing**: A regex similar to `find_final_answer()`:

```python
def find_spawn_conversation(text: str) -> dict | None:
    pattern = r"^\s*SPAWN_CONVERSATION\((.*)\)\s*$"
    match = re.search(pattern, text, re.MULTILINE)  # no DOTALL — match within one line, like FINAL()
    if match:
        return json.loads(match.group(1))
    return None
```

Note: The JSON dict must be on a single line (same constraint as `FINAL()`). Multi-line JSON is not supported.

**Priority**: The harness checks for `SPAWN_CONVERSATION` before checking for `FINAL`. If both appear, `SPAWN_CONVERSATION` wins.

**Integration with the RLM library**: The RLM library's `completion()` loop only terminates on `FINAL`/`FINAL_VAR` sentinels. To support `SPAWN_CONVERSATION`, we extend `find_final_answer()` in the harness:

```python
# Wrap the library's find_final_answer to also detect SPAWN_CONVERSATION
original_find = rlm_parsing.find_final_answer

def custom_find_final_answer(text: str):
    spawn = find_spawn_conversation(text)
    if spawn is not None:
        # Return a sentinel string that the harness can detect post-completion
        return f"__SPAWN__:{json.dumps(spawn)}"
    return original_find(text)
```

The harness monkey-patches `find_final_answer` before calling `completion()` during STRATEGIZE. After `completion()` returns, it checks if the response starts with `__SPAWN__:` to distinguish spawn requests from regular `FINAL()` completions. This is reverted after the STRATEGIZE step.

**Error handling**: If the JSON inside `SPAWN_CONVERSATION(...)` is malformed, the harness treats it as if the agent wrote `FINAL("done")` — no conversation is created. The malformed sentinel is logged as a warning.

---

### Conversation Management

The orchestrator manages all conversation mechanics. The strategist never writes event loops or async code.

#### Creating Conversation Agents

For each `SPAWN_CONVERSATION` request, the orchestrator creates one conversation agent RLM:

```python
# France wrote: SPAWN_CONVERSATION({"ENGLAND": "Propose alliance", "ITALY": "DMZ"})
agent = ConversationAgent(
    power_name="FRANCE",
    targets=["ENGLAND", "ITALY"],
    objectives={"ENGLAND": "Propose alliance", "ITALY": "DMZ"},
    game=self.game,
    memory_snapshot=self.memory.read_snapshot("FRANCE"),
    router=self.router,
    config=self.config,
)
```

One agent per power, handling all that power's conversations.

#### Round-Based Execution

```python
round_num = 0
while active_agents and not timer.expired and round_num < max_rounds:
    round_num += 1

    # Run all conversation agents in parallel
    with ThreadPoolExecutor(max_workers=len(active_agents)) as pool:
        futures = {pool.submit(a.run_round, round_num): a for a in active_agents}
        done, not_done = wait(futures, timeout=timer.remaining())

    # Flush all outboxed messages atomically
    self.router.flush()

    # Check for incoming chats (messages to powers that didn't target the sender)
    self._process_incoming_chats()

    # Check 60s timeouts on unanswered targets
    self._check_target_timeouts()

    # Remove finished agents
    active_agents = [a for a in active_agents if not a.is_finished]
```

#### Incoming Chat Notifications

After each flush, the orchestrator scans for messages sent to a power from a sender that the power's conversation agent doesn't target:

```
France's conv agent targets: [ENGLAND, ITALY]
After flush: GERMANY sent a message to FRANCE

→ FRANCE's strategist gets a mini completion() callback:
  root_prompt: "GERMANY says: 'Let's discuss the eastern border.'
  Call accept_chat('GERMANY', 'your objective') or decline_chat('GERMANY').
  Then FINAL('done')."
```

The strategist handles it in one quick `completion()` call:

```python
# Strategist's quick response
accept_chat("GERMANY", "Probe their intentions, don't commit to anything")
FINAL("done")
```

If accepted, the orchestrator adds GERMANY to France's conversation agent's target list. The conversation agent gets a notification on its next round: "GERMANY added. Objective: Probe their intentions."

If declined, GERMANY's message stays in the game (visible to France's strategist in DECIDE) but no conversation happens.

`accept_chat()` and `decline_chat()` are REPL functions injected only during notification callbacks.

#### 60-Second Target Timeout

When a conversation agent sends a message to a target and gets no response:

```
Round 1: France agent sends "Let's ally!" to England
  ... 60 seconds pass across rounds with no response from England ...
→ Harness signals timeout to the conversation agent
→ Agent's next round root_prompt: "ENGLAND timed out (60s, no response). They may be busy."
→ Agent can continue with other targets or FINAL()
```

The timeout is tracked per-target, per-power. It resets if a response arrives.

---

### Early Termination

Timeouts are ceilings, not floors. Every step finishes as soon as all agents are done — it never waits for the full timeout if work completes early.

**STRATEGIZE and DECIDE**: The orchestrator waits on `ThreadPoolExecutor` futures via `wait(futures, timeout=timer.remaining())`. If all 7 strategists return in 15 seconds of a 120-second timeout, `wait()` returns immediately with all futures in the `done` set.

**CONVERSE**: The round loop exits when `active_agents` is empty:

```python
while active_agents and not timer.expired and round_num < max_rounds:
    ...
    active_agents = [a for a in active_agents if not a.is_finished]
```

If every conversation agent calls `FINAL()` in round 2, rounds 3-5 never run. Similarly, within a round, if all agent futures complete before the timeout, the round ends immediately and proceeds to flush.

**In practice**: Most steps will finish well before their timeout. The timeout exists to bound worst-case behavior (runaway agents, slow API responses), not to pace normal execution.

---

### Retreat and Adjustment Phases

No negotiation. Only DECIDE runs:

```python
def _run_retreat_phase(self) -> None:
    self._run_decide_only()

def _run_adjustment_phase(self) -> None:
    self._run_decide_only()

def _run_decide_only(self) -> None:
    phase = self.game.get_current_phase()
    timer = PhaseTimer(self.config.decide_timeout)

    with ThreadPoolExecutor(max_workers=7) as pool:
        futures = {}
        for power, strategist in self._active_strategists():
            strategist.inject(timer)
            futures[pool.submit(strategist.decide, phase)] = power

        done, not_done = wait(futures, timeout=timer.remaining())
        for future in done:
            future.result()
        for future in not_done:
            timed_out_power = futures[future]
            self.logger.warning(f"{timed_out_power} timed out during DECIDE")

    for power, strategist in self._active_strategists():
        orders = strategist.get_submitted_orders()
        if orders:
            self.game.set_orders(power, orders)
        else:
            self._apply_default_orders(power)
```

---

### Default Order Fallback

Default orders are applied whenever `get_submitted_orders()` returns `None`. This covers three distinct failure modes:

1. **Timeout**: The agent's `completion()` didn't return before the deadline. The orchestrator stopped waiting and moved on.
2. **No submission**: The agent completed normally (called `FINAL("done")`) but never called `submit_orders()`. This can happen if the agent "forgets," runs out of REPL iterations before getting to it, or deliberately chooses not to submit.
3. **Crash**: The agent's `completion()` raised an exception after exhausting all retries.

In all three cases, the same defaults apply:

| Phase type | Default orders |
|---|---|
| Movement (`M`) | All units HOLD |
| Retreat (`R`) | All dislodged units DISBAND |
| Adjustment (`A`) | WAIVE all builds, DISBAND units farthest from home supply centers (by map adjacency distance) for excess |

These defaults are conservative — they don't lose units unnecessarily and don't make aggressive moves that could backfire. A power that defaults to HOLD every phase will slowly lose territory but won't self-destruct.

---

### Error Handling: 10 Retries Per Completion

Each `completion()` call gets up to 10 retries. If all 10 fail, the game halts.

```python
def _run_completion_with_retries(self, fn, *args, max_retries=10):
    for attempt in range(max_retries):
        try:
            return fn(*args)
        except Exception as e:
            self.logger.warning(f"Attempt {attempt+1}/{max_retries} failed: {e}")
            if attempt == max_retries - 1:
                raise GameHaltError(
                    f"completion() failed {max_retries} times. Game halted."
                ) from e
```

This covers transient LLM API errors, socket failures, and unexpected exceptions. The persistent REPL survives across retries — the agent picks up where it left off.

---

### Snapshot System

#### What's Saved

After every movement phase, the orchestrator saves a full snapshot:

```
game_output/
  snapshots/
    S1901M/
      game_state.json           # diplomacy Game serialized state
      orders.json               # {power: [order strings]}
      results.json              # {unit: [result strings]}
      messages.json             # all messages this phase
      summaries.json            # {power: conversation_results}
      timing.json               # {step: duration_seconds}
      memory/
        AUSTRIA_memory.md       # copy of memory at end of phase
        ENGLAND_memory.md
        FRANCE_memory.md
        GERMANY_memory.md
        ITALY_memory.md
        RUSSIA_memory.md
        TURKEY_memory.md
      repl_state/
        AUSTRIA.dill            # dill-serialized REPL locals/globals
        ENGLAND.dill
        FRANCE.dill
        GERMANY.dill
        ITALY.dill
        RUSSIA.dill
        TURKEY.dill
    F1901M/
      ...
```

Snapshots are saved for **movement phases only**. Retreat and adjustment phases are skipped (most interesting state changes happen during movement).

#### REPL State Serialization

Agent-defined REPL state (helper functions, variables, cached analysis) is serialized with `dill`:

```python
import dill

def snapshot_repl(repl) -> bytes:
    """Serialize REPL state. Skip non-serializable values."""
    state = {}
    for k, v in {**repl.globals, **repl.locals}.items():
        if k.startswith("_"):
            continue
        try:
            dill.dumps(v)
            state[k] = v
        except (TypeError, AttributeError, dill.PicklingError):
            pass  # skip injected functions, game_view, etc.
    return dill.dumps(state)
```

**What survives dill**: user-defined functions, classes, variables, data structures, lambdas, most closures.

**What doesn't survive**: injected system functions (`game_view`, `submit_orders`, `time_remaining`), objects with live references (file handles, sockets). These are re-injected by the orchestrator on restore.

#### Loading a Snapshot

```python
@classmethod
def from_snapshot(cls, snapshot_dir: str, config: GameConfig) -> "Orchestrator":
    """Restore a game from a snapshot directory."""

    # 1. Load game state
    game = Game()
    with open(os.path.join(snapshot_dir, "game_state.json")) as f:
        game_state = json.load(f)
    # ... restore Game from state ...

    # 2. Restore memory files
    memory_dir = os.path.join(snapshot_dir, "memory")
    for md_file in glob.glob(os.path.join(memory_dir, "*_memory.md")):
        shutil.copy(md_file, config.game_dir)

    # 3. Create orchestrator with restored game
    orch = cls.__new__(cls)
    orch.config = config
    orch.game = game
    orch.memory = MemoryManager(config.game_dir)
    orch.router = MessageRouter(game)

    # 4. Bootstrap strategists and restore REPL state
    orch.strategists = {}
    for power in ALL_POWERS:
        strategist = StrategistAgent(power_name=power, game=game, ...)
        strategist.bootstrap()

        # Restore dill state into REPL
        dill_path = os.path.join(snapshot_dir, "repl_state", f"{power}.dill")
        if os.path.exists(dill_path):
            with open(dill_path, "rb") as f:
                saved_state = dill.load(f)
            strategist.rlm._persistent_env.locals.update(saved_state)

        # Re-inject system functions (game_view, submit_orders, etc.)
        strategist.inject()

        orch.strategists[power] = strategist

    return orch
```

On restore:
1. Game state loaded from JSON
2. Memory files copied back to game_dir
3. Fresh strategists bootstrapped (creates REPL environment)
4. Dill state loaded into REPL (agent's helper functions, variables restored)
5. System functions re-injected (game_view, submit_orders, etc.)
6. Game loop resumes from the next phase

---

### Skipped Phases

The diplomacy engine skips retreat phases when no units are dislodged (jumps straight to the next movement or adjustment phase). The orchestrator logs these to the audit trail but does not notify agents:

```python
# In game_log.jsonl
{"phase": "S1901R", "event": "skipped", "reason": "no_retreats"}
```

Agents notice the skip via `game_view.get_current_phase()` on their next call.

---

### Game Log

The orchestrator appends to `game_output/game_log.jsonl` throughout the game:

```jsonl
{"phase": "S1901M", "event": "strategize_complete", "requests": {"FRANCE": 2, "ENGLAND": 1, ...}}
{"phase": "S1901M", "event": "converse_complete", "rounds": 4, "agents": 6, "messages": 38}
{"phase": "S1901M", "event": "decide_complete", "orders": {"FRANCE": 3, "ENGLAND": 3, ...}}
{"phase": "S1901M", "event": "processed", "duration_seconds": 145.2}
{"phase": "S1901R", "event": "skipped", "reason": "no_retreats"}
{"phase": "F1901M", "event": "strategize_complete", ...}
```

This is the audit trail. Combined with snapshots, it provides full replay capability.

---

### Terminal Output

Configurable verbosity. Default is minimal (phase transitions and errors). `--verbose` enables rich step-by-step output:

**Default (minimal):**
```
S1901M: processing...
S1901M: complete (145.2s)
F1901M: processing...
```

**Verbose (`--verbose`):**
```
S1901M: STRATEGIZE
  FRANCE: 2 conversations requested (→ENGLAND, →ITALY)
  ENGLAND: 1 conversation requested (→FRANCE)
  GERMANY: 0 conversations (skipped negotiation)
  ...
S1901M: CONVERSE (4 rounds, 6 agents, 38 messages)
  Round 1: 6 agents active, 15 messages sent
  Incoming: GERMANY→FRANCE (notification sent)
    FRANCE accepted GERMANY
  Round 2: 11 agents active, 12 messages sent
  Timeout: RUSSIA→TURKEY (60s, no response)
  Round 3: 8 agents active, 6 messages sent
  Round 4: 3 agents finished
S1901M: DECIDE
  FRANCE: A PAR - BUR, A MAR - SPA, F BRE - MAO
  ENGLAND: F LON - NTH, F EDI - NWG, A LVP - YOR
  ...
S1901M: complete (145.2s)
```

---

### Eliminated Powers

When a power is eliminated, its strategist is skipped:

```python
def _active_strategists(self):
    for power, strategist in self.strategists.items():
        if not self.game.powers[power].is_eliminated():
            yield power, strategist
```

The strategist is not closed — just not called. Its REPL state and memory file remain intact.

---

### Concurrency Model

| Step | What runs in parallel | Thread safety |
|---|---|---|
| Bootstrap | 7 strategist bootstraps | Each has own RLM + LMHandler |
| STRATEGIZE | 7 strategist completions | Each reads own GameView, writes own memory |
| CONVERSE | N conversation agents per round | Outbox protected by `threading.Lock` |
| Notification callbacks | 1 strategist at a time (sequential) | Only the notified strategist runs |
| DECIDE | 7 strategist completions | Each reads own GameView, writes own memory |
| Order application | Sequential (orchestrator only) | Single-threaded |
| game.process() | Sequential (orchestrator only) | Single-threaded |

The `Game` object is only written to by the orchestrator between steps. During agent execution, it's read-only (via `GameView`). No locking needed.

---

### Why the Harness Manages Conversations

The orchestrator handles all conversation mechanics because:

1. **Agents don't write event loops.** The strategist just signals intent (`SPAWN_CONVERSATION`) and gets results. No `while True`, no `wait_for_event()`, no async code.

2. **Notification routing is a system concern.** Detecting incoming chats, routing them to strategists, managing accept/decline — this is orchestration, not agent logic.

3. **Round synchronization is centralized.** The flush cycle, timeout tracking, and agent lifecycle are managed in one place. Agents don't need to know about rounds.

4. **The sentinel pattern matches the RLM philosophy.** Just as `FINAL()` signals "I'm done" without the agent understanding the completion loop, `SPAWN_CONVERSATION()` signals "I want to negotiate" without the agent understanding the conversation machinery.

---

### Why Snapshots on Movement Phases Only

Movement phases are where interesting state changes happen — units move, supply centers change hands, alliances form and break. Retreat and adjustment phases are mechanical consequences of movement.

Skipping retreat/adjustment snapshots reduces snapshot count by ~60% without losing meaningful restore points. If a game has 20 years (40 movement phases), that's 40 snapshots instead of ~100.

If finer granularity is needed, the `game_log.jsonl` audit trail still records every phase (including retreats and adjustments).

---

### Configuration

The full `GameConfig` dataclass is defined in the Data Model section. Key orchestrator-relevant fields:

- **Model**: `backend`, `backend_kwargs`, `sub_backend`, `sub_backend_kwargs` — LLM backend configuration. When `sub_backend` is `None`, `llm_query()` uses the primary backend.
- **Timeouts**: `strategize_timeout` (120s), `converse_timeout` (180s), `decide_timeout` (120s)
- **Game**: `max_year` (1910), `game_dir` (`./game_output`)
- **RLM**: `max_iterations` (15), `max_retries` (10)
- **Output**: `verbose` (False)

---

## Strategist

### What It Does

The strategist is the decision-maker for a single power. It is a **persistent RLM** that lives for the entire game — its REPL environment (variables, functions, files) accumulates across every phase. The strategist reads the board, decides who to negotiate with, reviews conversation results, updates its memory, and submits orders.

There are exactly 7 strategists, one per power. They run in parallel during STRATEGIZE and DECIDE.

---

### Interface

```python
class StrategistAgent:
    def __init__(self, power_name: str, game: Game, memory: MemoryManager, config: GameConfig): ...

    def bootstrap(self) -> None: ...
    def inject(self, timer: PhaseTimer) -> None: ...
    def strategize(self, phase: str) -> None: ...
    def deliver_results(self, summaries: list[ConversationSummary], unread: list[dict]) -> None: ...
    def decide(self, phase: str) -> None: ...

    def get_conversation_requests(self) -> ConversationRequest | None: ...
    def get_submitted_orders(self) -> list[str] | None: ...

    def close(self) -> None: ...
```

---

### Lifecycle

```
Game start:
  1. __init__()       → Create RLM with persistent=True, custom_system_prompt
  2. bootstrap()      → First completion() — creates REPL env, agent initializes

Each movement phase:
  3. inject(timer)    → Update time_remaining in REPL globals
  4. strategize()     → completion() — agent analyzes board, writes SPAWN_CONVERSATION or FINAL
  5. [CONVERSE]       → Harness manages conversation agents (strategist may get notification callbacks)
  6. deliver_results() → Inject conversation_results + unread_messages into REPL
  7. inject(timer)    → Update time_remaining for DECIDE
  8. decide()         → completion() — agent reviews results, submits orders

Each retreat/adjustment phase:
  3. inject(timer)    → Update time_remaining
  4. decide()         → completion() — agent submits retreat/build/disband orders

Game end:
  8. close()          → Clean up RLM
```

The same `StrategistAgent` instance persists across every phase. The RLM's REPL environment carries forward — variables defined during bootstrap are available during the final phase.

---

### Bootstrap: Real Initialization

The first `completion()` call creates the persistent REPL environment. Unlike a minimal no-op, the bootstrap prompt tells the agent to do real work:

- Read the memory file (empty on first game, populated on subsequent phases)
- Survey the starting board position
- Define helper functions the agent wants to reuse
- Plan initial strategy

```python
# Bootstrap
# The `prompt` parameter is the data loaded as a REPL variable (context_0).
# For all strategist calls, prompt is an empty string — data lives in
# injected REPL globals (game_view, memory_path), not in the prompt.
prompt = ""

root_prompt = (
    f"You are {self.power_name}. Game starting. Phase: {phase}.\n"
    f"Initialize: read your memory file, examine the board, define any helper "
    f"functions you want. When done, call FINAL('done')."
)

result = self.rlm.completion(prompt, root_prompt=root_prompt)
```

The `prompt` parameter is empty for all strategist and conversation agent calls. Unlike typical RLM usage where a large document is loaded as `context_0`, our agents access data through injected REPL globals (`game_view`, `memory_path`, `memory_snapshot`). The `root_prompt` provides per-call instructions.

The agent might write:

```python
# Agent's REPL code during bootstrap
with open(memory_path) as f:
    memory = f.read()
print(f"Memory: {len(memory)} chars")

# Define reusable helpers
def my_units():
    return game_view.get_units(game_view.power_name)

def my_centers():
    return game_view.get_centers(game_view.power_name)

def neighbors(loc):
    return game_view.map.loc_abut.get(loc, [])

# Initial board survey
units = my_units()
print(f"Starting units: {units}")
```

These functions persist across all future `completion()` calls.

---

### Function Injection

After `bootstrap()`, the persistent environment exists at `self.rlm._persistent_env`. The orchestrator injects:

```python
env = self.rlm._persistent_env

# Read-only game state
env.globals["game_view"] = self.game_view        # GameView instance

# Memory file path (agent reads/writes via open())
env.globals["memory_path"] = self.memory_path     # str

# Timer (updated before each completion() call)
env.globals["time_remaining"] = timer.remaining_fn()

# Order submission (once-only per DECIDE step)
env.globals["submit_orders"] = self._submit_orders
```

The agent also has the default RLM functions: `llm_query()`, `llm_query_batched()`, `FINAL_VAR()`, `SHOW_VARS()`, plus the text sentinels `FINAL()` and `SPAWN_CONVERSATION()` (written as plain text outside code blocks, not Python function calls).

**Not injected as a function**: Conversation spawning uses the `SPAWN_CONVERSATION` text sentinel (see Orchestrator section). The agent writes `SPAWN_CONVERSATION({...})` as plain text, not as a Python function call.

---

### STRATEGIZE Step

During STRATEGIZE, the agent analyzes the board and decides who to negotiate with. It signals its intent by writing `SPAWN_CONVERSATION({...})` as a text sentinel, or `FINAL("done")` to skip negotiation.

```python
# root_prompt for STRATEGIZE
root_prompt = (
    f"Phase: {phase}. STRATEGIZE step. You have {time}s remaining.\n"
    f"Analyze the board, read your memory, decide who to negotiate with.\n"
    f"Write SPAWN_CONVERSATION({{\"POWER\": \"objective\", ...}}) to start negotiations,\n"
    f"or FINAL('done') to skip negotiation this phase."
)
```

The agent might write:

```python
# Agent's REPL code during STRATEGIZE
with open(memory_path) as f:
    memory = f.read()

units = game_view.get_units()
my_locs = game_view.get_orderable_locations()

analysis = llm_query(
    f"I am {game_view.power_name}. My units: {my_units()}. "
    f"All units: {units}. Who should I negotiate with and why?"
)
print(analysis)
```

Then, outside of a code block, the agent writes:

```
SPAWN_CONVERSATION({"ENGLAND": "Propose alliance against Germany. Offer to support them into Belgium.", "ITALY": "Discuss Tyrolia DMZ, explore non-aggression."})
```

The harness detects `SPAWN_CONVERSATION`, terminates `completion()`, parses the JSON dict, and creates one conversation agent for this power with all targets.

If the agent writes `FINAL("done")` instead, no conversation agent is created — the power skips negotiation.

---

### SPAWN_CONVERSATION Sentinel Format

The sentinel takes a JSON dict where keys are power names and values are objective strings:

```
SPAWN_CONVERSATION({"ENGLAND": "Propose alliance against Germany", "ITALY": "Discuss Tyrolia DMZ"})
```

The harness creates **one conversation agent per power**, handling all targets listed in the dict. The dict becomes the agent's `objectives` — per-target instructions.

```
# Single target — bilateral
SPAWN_CONVERSATION({"ENGLAND": "Propose alliance against Germany"})

# Multiple targets — one multi-party agent
SPAWN_CONVERSATION({"GERMANY": "Probe their intentions", "RUSSIA": "Explore non-aggression"})
```

This is NOT a Python function. It's a text sentinel (like `FINAL()`), written outside code blocks, regex-parsed by the harness. See the Orchestrator section for parsing details.

---

### `submit_orders()` — Once Only

```python
def _submit_orders(self, orders: list[str]) -> str:
    """Validate and store orders. Called from agent REPL code.

    First call locks in orders. Subsequent calls return an error.

    Args:
        orders: List of order strings, e.g. ["A PAR - BUR", "F BRE - MAO"]

    Returns:
        Status string describing accepted/rejected orders.
    """
```

The agent gets one shot. Every order is validated against `game_view.get_all_possible_orders()`. Invalid orders are rejected but valid ones are kept.

```python
# Agent's REPL code during DECIDE
possible = game_view.get_all_possible_orders()
my_locs = game_view.get_orderable_locations()

# Build orders
orders = []
for loc in my_locs:
    loc_orders = possible.get(loc, [])
    # ... agent logic to pick the best order ...
    orders.append(best_order)

result = submit_orders(orders)
print(result)
# "Accepted 3 orders."
# or "Accepted 2 orders. Rejected 1: ['A PAR - LON']"
```

If the agent calls `submit_orders()` a second time:

```python
result = submit_orders(new_orders)
print(result)
# "Error: orders already submitted. First submission is final."
```

This forces the agent to finalize its analysis before committing. The agent should use `llm_query()` and code analysis to evaluate options *before* submitting.

---

### DECIDE Step

During DECIDE, the agent reviews conversation summaries, analyzes the board, updates its memory, and submits orders.

```python
# root_prompt for DECIDE
root_prompt = (
    f"Phase: {phase}. DECIDE step. You have {time}s remaining.\n"
    f"conversation_results and unread_messages variables are available.\n"
    f"Review results, update memory, and call submit_orders() with your "
    f"final orders. When done, call FINAL('done')."
)
```

The agent might write:

```python
# Agent's REPL code during DECIDE
# Review conversation results
for s in conversation_results:
    print(f"Talked to {s['targets']}: {s['summary']}")

# Analyze and decide
analysis = llm_query(
    f"Based on these negotiations: {conversation_results}\n"
    f"And the board: {game_view.get_units()}\n"
    f"What orders should {game_view.power_name} submit?"
)
print(analysis)

# Submit orders
submit_orders(["A PAR - BUR", "A MAR - SPA", "F BRE - MAO"])

# Update memory
with open(memory_path, "a") as f:
    f.write(f"\n## {game_view.get_current_phase()}\n")
    f.write(f"- Allied with England, agreed to mutual support\n")
    f.write(f"- Ordered: PAR→BUR, MAR→SPA, BRE→MAO\n")
```

---

### Delivering Conversation Results

Between CONVERSE and DECIDE, the orchestrator injects results into the strategist's REPL as variables:

```python
def deliver_results(self, summaries: list[ConversationSummary], unread: list) -> None:
    env = self.rlm._persistent_env
    env.locals["conversation_results"] = [
        {
            "targets": s.targets,
            "summary": s.summary,        # The FINAL() return value
            "rounds_used": s.rounds_used,
        }
        for s in summaries
    ]
    env.locals["unread_messages"] = unread
```

The strategist sees two new variables in its REPL:
- `conversation_results` — `list[dict]` with keys `targets` (`list[str]`), `summary` (`str`), `rounds_used` (`int`). Summaries from each conversation agent (FINAL() return values).
- `unread_messages` — `list[dict]` with keys `sender` (`str`), `recipient` (`str`), `content` (`str`), `phase` (`str`). Messages received from powers not involved in any conversation (e.g., a power that sent a message but was declined or timed out).

The raw messages exchanged during conversations are also available in `game_view.get_messages()` since the router flushed them into the game — but the strategist is expected to rely primarily on the summaries.

---

### What the Orchestrator Reads

After each step, the orchestrator reads results from the strategist:

| After step | What's read | Fallback if empty |
|---|---|---|
| STRATEGIZE | `SPAWN_CONVERSATION` sentinel parsed from output | No conversations — skip CONVERSE |
| DECIDE | `get_submitted_orders()` → `list[str] \| None` | Default orders (HOLD/DISBAND/WAIVE) |

---

### Custom System Prompt

The strategist's `custom_system_prompt` replaces the default RLM system prompt entirely. It describes:

1. **Role**: "You are the strategic commander of {POWER} in a 7-player Diplomacy game."
2. **Available functions**: Precise signatures and descriptions of `game_view`, `memory_path`, `time_remaining()`, `submit_orders()`, `llm_query()`, `llm_query_batched()`
3. **Sentinels**: `FINAL('done')` to signal step completion, `SPAWN_CONVERSATION({...})` to request negotiations
4. **Game rules summary**: Phase types, order syntax, victory condition (18 supply centers)
5. **Memory instructions**: How to read/write the memory file via `open(memory_path)`
6. **Order syntax reference**: Movement, Support, Convoy, Hold, Retreat, Disband, Build, Waive
7. **`submit_orders()` constraint**: Once only — validate before submitting
8. **`SPAWN_CONVERSATION` format**: JSON dict with `{"POWER": "objective"}` pairs, written as text (not in a code block)
9. **Code execution**: Write Python in ` ```repl``` ` blocks, use `print()` to see output
10. **Completion**: Call `FINAL('done')` when finished, or `SPAWN_CONVERSATION({...})` during STRATEGIZE

---

### `root_prompt` vs System Prompt

The system prompt is set once at construction and describes the agent's overall capabilities and rules. The `root_prompt` changes every `completion()` call — it tells the agent what step it's in and how much time remains:

| Step | `root_prompt` content |
|---|---|
| Bootstrap | "Initialize: read memory, examine board, define helpers" |
| STRATEGIZE | "Analyze board, spawn conversations. {time}s remaining." |
| DECIDE | "Review summaries, submit orders. {time}s remaining." |

The `root_prompt` is passed to `completion()` and appears in the LLM's context for that call only. It does not persist across calls.

---

### Concurrency

All 7 strategists run in parallel via `ThreadPoolExecutor(max_workers=7)`. This is safe because:

1. Each `completion()` creates its own `LMHandler` socket server on an auto-assigned port — they don't share state
2. Each strategist reads from its own `GameView` (which reads the shared `Game` object, but reads are safe during agent execution because the orchestrator only writes between steps)
3. Each strategist writes only to its own memory file — no cross-power writes
4. `_submitted_orders` and `_conversation_requests` are per-strategist instance variables — no sharing

---

### Eliminated Powers

When a power is eliminated (loses all supply centers and units), its strategist is skipped via `_active_strategists()` (see Orchestrator → Eliminated Powers). The strategist's RLM is not closed — it's simply not called. Its REPL state and memory file remain intact.

---

### Why Persistent (Not Fresh Per Phase)?

A fresh RLM each phase would lose:
- Helper functions the agent defined during bootstrap
- Cached analysis results
- Working variables from previous phases
- The accumulated programming context that makes the agent more efficient over time

The persistent REPL is the agent's working memory. The memory file on disk is its long-term memory. Together they let the agent build up sophistication across the game without any system-level consolidation or summarization.

---

### Why Once-Only Order Submission?

Allowing revision (last-call-wins) would let the agent submit tentative orders, continue analyzing, and revise — but it adds complexity:
- The agent might submit, then run out of iterations before revising, leaving bad orders
- Multiple submissions make it harder to log and debug what happened
- It encourages a submit-first-think-later pattern

Once-only forces the agent to do its analysis first, commit when ready. The agent has `llm_query()`, code execution, and the full board state to work with — it should be able to make a good decision in one shot. If it can't, the problem is in the prompt or the agent's strategy, not the submission mechanism.


## Conversation Agent

### What It Does

A conversation agent is a diplomat. It is an **ephemeral RLM** — created for a single negotiation phase, destroyed when that phase ends. There is **one conversation agent per power**, handling all of that power's targets. It can send messages and read messages, but it cannot submit orders.

Conversation agents are spawned by the orchestrator based on `SPAWN_CONVERSATION` sentinel output from the strategist. All conversation agents run in parallel across all powers, communicating through the game's message system in synchronized rounds. New targets can be added mid-conversation when other powers initiate contact (via the incoming chat notification system — see Orchestrator section).

---

### Interface

```python
class ConversationAgent:
    def __init__(
        self,
        power_name: str,
        targets: list[str],
        objectives: dict[str, str],     # {target_power: objective_string}
        game: Game,
        memory_snapshot: str,
        router: MessageRouter,
        config: GameConfig,
    ): ...

    def bootstrap(self) -> None: ...
    def run_round(self, round_num: int) -> None: ...
    def add_target(self, power: str, objective: str) -> None: ...
    def force_finish(self) -> None: ...
    def get_summary(self) -> ConversationSummary: ...

    @property
    def is_finished(self) -> bool: ...

    def close(self) -> None: ...
```

---

### Lifecycle

```
1. __init__()       → Create RLM with persistent=True, custom_system_prompt
2. bootstrap()      → First completion() — creates REPL env, injects functions
3. run_round(1)     → completion() — agent reads messages, drafts and sends replies
   ★ orchestrator: router.flush()
   ★ orchestrator: check incoming chats → may call add_target()
   ★ orchestrator: check 60s target timeouts
4. run_round(2)     → completion() — agent reads new messages, continues conversation
   ★ orchestrator: router.flush(), incoming chats, timeouts
5. ...              → repeat until FINAL() or timer expires
6. get_summary()    → Return the FINAL() string as a ConversationSummary
7. close()          → Clean up RLM
```

The conversation agent uses `persistent=True` so its REPL state carries across rounds within the same conversation. Variables and analysis from round 1 are available in round 2. But unlike the strategist, the agent is destroyed at the end of the CONVERSE step — it does not persist across phases.

Targets can grow mid-conversation: when the orchestrator accepts an incoming chat (via the strategist's mini completion() callback), it calls `add_target()` on the existing conversation agent. The agent is notified in its next round's `root_prompt`.

---

### How It Ends: FINAL() Is the Summary

The conversation agent signals completion by calling `FINAL()` with its summary as the argument:

```
FINAL(Alliance confirmed with England. They agreed to support us into Belgium in exchange for our support into Norway.)
```

The `completion()` call returns an `RLMChatCompletion` whose `.response` field contains this summary string. The orchestrator reads it:

```python
result = agent.rlm.completion(prompt, root_prompt=round_prompt)
if result is not None:
    agent._summary = result.response
    agent._finished = True
```

This works because `FINAL()` is not a Python function — it's a text sentinel that the RLM framework parses from the model's output. Whatever text is inside the parentheses becomes the return value of `completion()`.

If the agent calls `FINAL()` during any round, it's done. If it doesn't call `FINAL()` by the time the converse timer expires, the orchestrator force-finishes it with a timeout summary.

---

### Function Injection

After `bootstrap()`, the orchestrator injects:

```python
env = agent.rlm._persistent_env

# Filtered game state (messages scoped to targets)
env.globals["game_view"] = filtered_game_view     # FilteredGameView instance

# Read-only copy of strategist's memory
env.globals["memory_snapshot"] = snapshot          # str

# Timer
env.globals["time_remaining"] = timer.remaining_fn()

# Message sending (queues to outbox)
env.globals["send_message"] = agent._send_message

# Per-target objectives from the strategist
env.globals["objectives"] = agent.objectives       # dict[str, str]: {target_power: objective_string}
```

The agent also has the default RLM functions: `llm_query()`, `llm_query_batched()`, `FINAL_VAR()`, `SHOW_VARS()`, plus the text sentinel `FINAL()` (written as plain text outside code blocks, not a Python function call).

**What's NOT injected:**
- `submit_orders()` — only the strategist can submit orders
- `SPAWN_CONVERSATION` — only the strategist can request conversations (via sentinel)
- `memory_path` — the conversation agent cannot write to the strategist's memory

---

### Filtered GameView

The conversation agent receives a **filtered GameView** where `get_messages()` is scoped to only show messages to and from its target powers. This prevents information leakage between concurrent conversations.

```python
class FilteredGameView(GameView):
    """GameView that filters messages to specific target powers."""

    def __init__(self, game: Game, power_name: str, targets: list[str]):
        super().__init__(game, power_name)
        self._targets = set(targets)

    def get_messages(self) -> dict:
        all_msgs = super().get_messages()  # already filtered to own power's visibility
        return {
            ts: msg for ts, msg in all_msgs.items()
            if (msg.sender in self._targets or msg.recipient in self._targets)
            and (msg.sender == self._power_name or msg.recipient == self._power_name)
            or msg.recipient == "GLOBAL"
        }
```

Board state, orders, and history are unfiltered — only messages are scoped. The conversation agent sees the full board (all units, centers, possible orders) but only the messages relevant to its conversation.

Example: France spawns a conversation agent targeting England and Italy. The agent's `FilteredGameView` shows:

- Messages between France and England
- Messages between France and Italy
- GLOBAL messages
- **Not** messages between England and Italy (France is not a party)
- **Not** messages between England and Russia (unrelated conversation)

---

### `send_message()` — Outbox Pattern

```python
def _send_message(self, recipient: str, content: str) -> str:
    """Queue a message for delivery. Called from agent REPL code.

    Args:
        recipient: Power name or "GLOBAL"
        content: Message text

    Returns:
        Confirmation string.
    """
```

Messages are not delivered immediately. They go into the `MessageRouter`'s outbox. The orchestrator flushes all outboxes atomically between rounds:

```
Round 1:
  France agent: send_message("ENGLAND", "Alliance?")  → outbox
  England agent: send_message("FRANCE", "Tell me more") → outbox
  ★ orchestrator: router.flush()  → both messages committed to game

Round 2:
  France agent: game_view.get_messages() → sees "Tell me more"
  England agent: game_view.get_messages() → sees "Alliance?"
```

Within a round, agents cannot see each other's new messages. This ensures round-based synchronization — no agent gets an unfair advantage from running slightly faster.

For multi-party conversations, the agent can send different messages to different targets:

```python
# Agent in a conversation with targets=["GERMANY", "RUSSIA"]
send_message("GERMANY", "Let's discuss the eastern border")
send_message("RUSSIA", "I'd like to propose a DMZ in Galicia")
```

---

### Round Flow

Each round is a single `completion()` call. The `root_prompt` tells the agent the round number and time remaining:

```python
root_prompt = (
    f"Round {round_num}. You have {time}s remaining.\n"
    f"Read messages, respond, and continue negotiating.\n"
    f"Call FINAL('your summary') when the conversation is done."
)
```

The agent might write:

```python
# Agent's REPL code during a round
msgs = game_view.get_messages()
for ts, msg in msgs.items():
    print(f"{msg.sender}: {msg.message}")

# Draft a response using llm_query
draft = llm_query(
    f"I am France's diplomat talking to England. "
    f"They said: {[m.message for m in msgs.values() if m.sender == 'ENGLAND']}. "
    f"My objective: {objectives['ENGLAND']}. Draft a response."
)

send_message("ENGLAND", draft)
```

When the agent decides the conversation is complete:

```
FINAL(England agreed to support our move to Belgium. They want us to support them into Norway in the fall. Seems trustworthy but watch for double-cross.)
```

---

### What the Agent Knows

The conversation agent is created with:

| Injected | Source | Purpose |
|---|---|---|
| `game_view` | `FilteredGameView(game, power, targets)` | Board state + target-filtered messages |
| `memory_snapshot` | `memory_manager.read_snapshot(power)` | Read-only copy of strategist's memory at time of creation |
| `send_message` | `ConversationAgent._send_message` | Queue messages to targets |
| `time_remaining` | `timer.remaining_fn()` | Check deadline |
| `llm_query` / `llm_query_batched` | RLM default | Sub-LM calls for drafting and analysis |

The agent also receives the strategist's **per-target objectives** in its system prompt. For example: "ENGLAND: Propose alliance against Germany. ITALY: Discuss Tyrolia DMZ."

**What the agent does NOT know:**
- What other conversations its power is in
- What conversations the target powers are in with others
- The strategist's full strategy beyond the objectives
- Messages from conversations it's not part of

---

### Force Finish

If the converse timer expires or `max_rounds` is reached while agents are still active, the orchestrator force-finishes them:

```python
def force_finish(self) -> None:
    """Mark agent as finished with a timeout summary."""
    self._finished = True
    self._summary = "Conversation ended by timeout — no summary provided."
```

The strategist receives this timeout message as the summary. It knows the conversation didn't complete naturally and can factor that into its decisions.

---

### Error Handling

Conversation agents use the same retry logic as strategists: up to `max_retries` (default 10) attempts per `completion()` call. If all retries fail:

- The conversation agent is force-finished with summary: `"Conversation agent crashed after {max_retries} retries."`
- The game does **not** halt — conversation failures are non-fatal. The strategist receives the error summary and proceeds to DECIDE.
- The error is logged to `game_log.jsonl`.

This differs from strategist crashes (which raise `GameHaltError`) because conversation failures are recoverable — the strategist can still submit orders based on other information.

---

### Per-Target Timeouts

When a conversation agent sends a message to a target and gets no response within 60 seconds (tracked across rounds by the orchestrator), the agent is notified in its next round's `root_prompt`:

```
ENGLAND timed out (60s, no response). They may be busy.
```

The timeout is per-target, per-power. It resets if a response arrives. The agent can continue with other targets or call `FINAL()`. See Orchestrator section for details on how timeouts are tracked.

---

### Multi-Party Conversations

When a strategist writes `SPAWN_CONVERSATION({"GERMANY": "...", "RUSSIA": "..."})`, one conversation agent is created with both targets. The agent:

- Sees messages from both Germany and Russia (via filtered GameView)
- Can send separate messages to each: `send_message("GERMANY", ...)` and `send_message("RUSSIA", ...)`
- Can send the same message to both powers individually
- Returns a single summary covering the entire multi-party conversation

The system prompt tells the agent its targets: "You are a diplomat representing FRANCE, negotiating with GERMANY and RUSSIA." Each target has its own objective from the strategist.

Multi-party agents are useful when the strategist wants coordinated negotiations — e.g., proposing a three-way alliance or mediating between two other powers.

---

### Memory: Read-Only Snapshot

The conversation agent receives `memory_snapshot` — a string copy of the strategist's memory file at the time the agent was created. It cannot modify the strategist's memory:

```python
# Conversation agent's REPL code
print(len(memory_snapshot))  # It's a string, not a file path

analysis = llm_query(
    f"Based on this strategic memory, what should I "
    f"propose to England?\n{memory_snapshot}"
)
```

This separation is deliberate: the diplomat negotiates with information available at deployment time, but only the strategist decides what to remember long-term.

---

### Custom System Prompt

The conversation agent's system prompt describes:

1. **Role**: "You are a diplomat representing {POWER}, negotiating with {TARGETS}."
2. **Objectives**: Per-target objectives from the strategist, listed individually (e.g., "ENGLAND: Propose alliance. ITALY: Discuss DMZ.").
3. **Available functions**: `game_view`, `memory_snapshot`, `time_remaining()`, `send_message()`, `llm_query()`, `llm_query_batched()`, `FINAL()`
4. **Constraints**: "You CANNOT submit orders. You can only negotiate. Promises made here are not binding — the strategist decides final orders."
5. **Workflow**: "Each round: read messages via game_view.get_messages(), use llm_query() to draft replies, send_message() to respond. Call FINAL('your summary') when the conversation is complete."
6. **Dynamic targets**: "New targets may be added between rounds. You will be notified in the root_prompt when this happens, along with the objective."
7. **Summary**: "When you call FINAL(), include a clear summary of what was agreed, what was refused, and your assessment of each target power's intentions."

---

### Concurrency

All conversation agents across all powers run in parallel within each round:

```
Round 1:
  France agent (→ENGLAND, →ITALY)  ┐
  England agent (→FRANCE, →RUSSIA)  ├── all run in parallel via ThreadPoolExecutor
  Germany agent (→AUSTRIA)          │
  ...                               ┘

  ★ router.flush()  → all outboxed messages committed atomically

Round 2:
  (agents that haven't called FINAL() run again)
```

This is safe because:
- Each agent has its own RLM instance with its own `LMHandler` socket server
- `send_message()` goes to a thread-safe outbox (protected by `threading.Lock`)
- No agent reads new messages until `router.flush()` commits them between rounds

---

### Why Ephemeral (Not Part of the Strategist)?

The conversation agent could be a function call within the strategist's REPL — but separate RLMs provide:

1. **Isolation**: Conversation agents can't access `submit_orders()`. This is enforced by not injecting it. No trust boundary within a single REPL.
2. **Parallelism**: Multiple conversations run simultaneously. If they were part of the strategist's RLM, they'd serialize.
3. **Cleanup**: Conversation state (drafts, analysis, message parsing) doesn't pollute the strategist's REPL namespace.
4. **Separation of concerns**: The diplomat follows objectives. The strategist makes the final call. This mirrors real Diplomacy where leaders brief diplomats but don't micromanage every word.

---

### Why Filtered GameView (Not a Custom read_messages)?

Two approaches for target-scoped messaging:
1. Inject a standalone `read_messages()` function that filters internally
2. Give the agent a `FilteredGameView` where `get_messages()` is already filtered

We use option 2 because the conversation agent uses the same `game_view` API as the strategist. The agent doesn't need to learn a different function for reading messages — it uses `game_view.get_messages()` and gets target-scoped results. The filtering is transparent.

This also means the conversation agent's system prompt can describe `game_view` identically to the strategist's, minus the message scope caveat.

---

### Why No Peer Awareness?

The conversation agent is not told what other conversations its counterpart is in. If France is talking to England, France's agent doesn't know that England is also talking to Russia.

This is realistic — in real Diplomacy, you don't know who else your counterpart is negotiating with (unless they tell you, which may be a lie). It also simplifies the system: the orchestrator doesn't need to compute and inject a peer map.

If the strategist wants the diplomat to know something about the broader diplomatic landscape, it can include that in the objective: "Propose alliance with England. Note: England is likely also talking to Russia. Be cautious about promises regarding Scandinavia."

---

## Tests

The full test plan lives in `tests/TESTS.md` — 452 tests across 24 sections. This section describes the testing philosophy, structure, and what makes testing this system different from a typical application.

### Why Testing Is Hard Here

The core challenge: the system runs **untrusted LLM-generated code** inside a REPL. Every agent is an adversary — not because we expect the LLM to be malicious, but because any prompt injection, hallucination, or creative coding attempt could accidentally (or intentionally) break isolation. The test suite must prove two things simultaneously:

1. **Capabilities work**: The game loop advances, messages route correctly, orders resolve, agents negotiate and submit.
2. **Constraints hold**: A compromised agent cannot read another power's messages, mutate game state, escape the sandbox, forge orders, or escalate privileges.

These two axes organize the entire test plan.

### No Real LLM Calls

Every test uses mock LLM backends with canned responses. The system under test is the harness — GameView, MessageRouter, Orchestrator, StrategistAgent, ConversationAgent, sentinel parsing, order validation, concurrency, and the trust boundaries between them. The LLM is a black box that produces text; we mock it to control exactly what text it produces, then verify the harness handles it correctly.

This means tests are fast, deterministic, and don't require API keys.

### Two Axes

**Axis 1 — Capabilities** (sections 1–15, 347 tests): Vendored engine correctness, data model types, GameView read methods, FilteredGameView scoping, MemoryManager file operations, MessageRouter thread safety and flush atomicity, sentinel parsing, strategist lifecycle (bootstrap → strategize → deliver results → decide → close), conversation agent lifecycle (create → rounds → FINAL → destroy), orchestrator game loop (phase progression, eliminated powers, three-step flow), order validation and engine integration, concurrency (7-way parallelism, port isolation, orphaned threads), RLM persistent environment and backend routing, snapshot save/restore, and game log observability.

**Axis 2 — Security** (sections 16–24, 105 tests): GameView mutation attacks (reaching `_game` via `__dict__`, `object.__getattribute__`, Power back-references), monkey-patching (class reassignment, function replacement), privilege separation (conversation agents can't submit orders; strategists can't send messages during DECIDE), REPL sandbox escapes (`os.system`, `subprocess`, `socket`, `ctypes`, `gc.get_objects()`), information leakage (cross-power message visibility, memory file enumeration, REPL variable isolation), temporal attacks (timer replacement, sleep-past-deadline), message router attacks (sender spoofing, closure-based premature flush), serialization attacks (malicious `__reduce__` in dill), and resource bounds (iteration limits, message floods).

### Priority Levels

| Priority | Count | Gate |
|----------|-------|------|
| P0 | 266 | Must pass before any game runs |
| P1 | 121 | Must pass before multi-agent games |
| P2 | 53 | Should pass before release |
| P3 | 12 | Nice to have |

P0 tests are pure unit tests — instantiate a real `Game`, wrap it in a `GameView`, run adversarial code, check that state didn't change. No threading, no mocked agents, no complex setup. P1 tests add integration: multiple agents in parallel, message routing across rounds, mock strategists with scripted behavior. P2 tests cover edge cases and hardening. P3 tests are observability (game log format) and defense-in-depth.

### Key Invariants Under Test

The test plan encodes these invariants, each verified by multiple tests:

1. **GameView is read-only**: No path from a GameView reference reaches a mutating method on the underlying Game. Tested via direct attribute access, `__dict__` traversal, `object.__getattribute__`, and Power object back-references.

2. **Round isolation**: Messages queued in round N are invisible until `router.flush()`. No agent can see another agent's outboxed message from the current round. Tested from both the router side (COM tests) and the agent side (CA tests).

3. **Once-only order submission**: `submit_orders()` accepts one call per phase. A second call returns an error and preserves the first submission. The lock resets between phases. Tested in both the strategist contract (SA tests) and the order validation pipeline (ORD tests).

4. **Privilege separation**: Conversation agents have `send_message` but not `submit_orders`. Strategists have `submit_orders` (during DECIDE only) but not `send_message`. Conversation agents get `memory_snapshot` (a string copy); strategists get `memory_path` (file access). Tested by checking NameError on the missing functions.

5. **Conversation agent crashes don't halt the game**: A conversation agent that fails after max retries is force-finished with a crash summary. The strategist receives this summary and proceeds to DECIDE. Only strategist failures raise `GameHaltError`.

6. **Flush atomicity**: `router.flush()` commits all pending messages from all outboxes in one operation. After flush, all outboxes are empty. The commit order is deterministic (`ALL_POWERS` order within each power's queue).

### Test Fixtures

Nine pytest fixtures cover the common setup patterns:

| Fixture | Description |
|---------|-------------|
| `fresh_game()` | New `Game()` at S1901M |
| `game_at_retreat()` | Game advanced to a retreat phase with a dislodged unit |
| `game_at_adjustment()` | Game advanced to W1901A with supply center changes |
| `mock_strategist(power)` | StrategistAgent with mock RLM, REPL initialized |
| `mock_conversation_agent(power, targets)` | ConversationAgent with mock RLM |
| `game_view(power)` | GameView wrapping a fresh game |
| `filtered_game_view(power, targets)` | FilteredGameView wrapping a fresh game |
| `memory_manager(tmp_dir)` | MemoryManager with a temp directory |
| `message_router(game)` | MessageRouter bound to a game |

### Dependencies

- `pytest` — test framework
- `threading` — concurrency tests (barriers, events, locks)
- `time` (monotonic) — timing assertions and ordering verification
- `dill` — snapshot serialization tests
- `tempfile` — isolated memory manager tests

No LLM API keys, no network access, no external services.

### Design Findings

The test plan analysis surfaced implementation concerns that need attention during development:

1. **FilteredGameView operator precedence**: The filter predicate `(sender == self or recipient == self) and (other_party in targets) or recipient == "GLOBAL"` relies on `and` binding tighter than `or`. GLOBAL messages bypass the power_name check entirely. This is likely intentional but should be parenthesized explicitly to prevent bugs during refactoring.

2. **`open()` and `__import__()` in the sandbox**: The spec allows both. This means agents can `import os`, `import socket`, etc. A module blocklist is required, and `open()` needs path restriction to prevent cross-power memory file reads.

3. **Live reference in GameView**: GameView holds a reference to the real Game object, not a copy. If the `_game` attribute is reachable, a compromised agent can call `set_orders()`, `process()`, or `add_message()` on the live game. Defense must happen at the attribute access level.

4. **FilteredGameView must override `get_message_history()`**: If only `get_messages()` is overridden, historical messages from non-target powers leak through `get_message_history()`.

5. **Dill deserialization as attack surface**: Tampered dill snapshot files can execute arbitrary code via `__reduce__`. Snapshot restoration is a trusted-input channel that needs validation or sandboxing.

---
