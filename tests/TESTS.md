# Diplomacy-RLM Test Coverage Plan

Organized along two axes: **Capabilities** (proving the system works) and **Security** (proving constraints hold against adversarial agents).

## Priority Definitions

| Priority | Meaning | Gate |
|----------|---------|------|
| **P0** | Game integrity or full security bypass. Failure = broken system. | Must pass before any game runs |
| **P1** | Important behavior or significant security gap. Failure = degraded trust model. | Must pass before multi-agent games |
| **P2** | Edge cases, hardening, graceful degradation. Failure = uncommon issues. | Should pass before release |
| **P3** | Defense-in-depth, observability, degenerate inputs. | Nice to have |

## Mock Strategy

All tests use mock LLM backends (canned responses). No real API calls needed. Use `ThreadPoolExecutor` for concurrency tests, `threading.Barrier` for synchronization, monotonic timestamps for ordering assertions.

---

# AXIS 1: CAPABILITIES

---

## 1. Vendored Diplomacy Engine (10 tests)

Verifies the vendored v1.1.2 engine works with zero external dependencies.

### 1.1 Engine instantiation and starting state

| ID | Test | Priority |
|----|------|----------|
| ENG-001 | `Game()` instantiation succeeds with no diplomacy extras installed (no bcrypt, ujson, coloredlogs, pytz) | P0 |
| ENG-002 | Starting phase is `S1901M` | P0 |
| ENG-003 | 7 powers exist with correct starting units (3 each, Russia has 4) | P0 |
| ENG-004 | France starting units: `{A PAR, A MAR, F BRE}` | P0 |
| ENG-005 | Map loads correctly; 34 supply centers including PAR, LON, BER, VIE, CON | P0 |
| ENG-006 | `get_all_possible_orders()` returns valid structure; `A PAR H` and `A PAR - BUR` in `possible["PAR"]` | P0 |

### 1.2 Patch verification

| ID | Test | Priority |
|----|------|----------|
| ENG-007 | No `import bcrypt` in vendored `utils/common.py` | P0 |
| ENG-008 | `import json` (not ujson) in vendored `utils/jsonable.py` | P0 |
| ENG-009 | No `coloredlogs`, `Connection`, `Server` in vendored `__init__.py` | P0 |
| ENG-010 | No `pytz` import in vendored `utils/__init__.py` | P0 |

---

## 2. Data Model & Configuration (28 tests)

Unit tests for shared types and GameConfig defaults.

### 2.1 ALL_POWERS

| ID | Test | Priority |
|----|------|----------|
| DM-001 | `ALL_POWERS` has exactly 7 entries | P0 |
| DM-002 | Contains AUSTRIA, ENGLAND, FRANCE, GERMANY, ITALY, RUSSIA, TURKEY in that order | P0 |
| DM-003 | All entries are uppercase strings | P2 |

### 2.2 ConversationRequest / ConversationSummary / PendingMessage

| ID | Test | Priority |
|----|------|----------|
| DM-004 | `ConversationRequest(power="FRANCE", objectives={"ENGLAND": "..."})` constructs correctly | P0 |
| DM-005 | ConversationRequest with multiple targets | P1 |
| DM-006 | ConversationRequest with empty objectives does not raise | P2 |
| DM-007 | `ConversationSummary` construction with all fields | P0 |
| DM-008 | ConversationSummary with multiple targets | P1 |
| DM-009 | `PendingMessage` construction with power recipient | P0 |
| DM-010 | PendingMessage with GLOBAL recipient | P0 |

### 2.3 GameHaltError

| ID | Test | Priority |
|----|------|----------|
| DM-011 | GameHaltError is an Exception subclass | P0 |
| DM-012 | Can be raised and caught with message | P0 |
| DM-013 | Catchable as base Exception | P2 |

### 2.4 GameConfig defaults

| ID | Test | Priority |
|----|------|----------|
| DM-014 | Default backend is `"anthropic"` | P0 |
| DM-015 | Default backend_kwargs uses `claude-sonnet-4-5-20250929` | P1 |
| DM-016 | Default timeouts: strategize=120, converse=180, decide=120 | P0 |
| DM-017 | Default converse settings: max_rounds=5, target_response_timeout=60 | P1 |
| DM-018 | Default game settings: max_year=1910, game_dir="./game_output" | P1 |
| DM-019 | Default RLM settings: max_iterations=15, max_retries=10 | P1 |
| DM-020 | Default sub_backend is None | P1 |
| DM-021 | Default verbose is False | P2 |
| DM-022 | Override works (e.g., max_year=1920) without affecting other defaults | P1 |
| DM-023 | backend_kwargs default factory returns fresh dict (no shared reference) | P2 |

### 2.5 PhaseTimer

| ID | Test | Priority |
|----|------|----------|
| DM-024 | Construction starts countdown; `expired` is False, `remaining() > 0` | P0 |
| DM-025 | `expired` returns True after timeout (10ms timer, sleep 50ms) | P0 |
| DM-026 | `remaining()` returns 0.0 after expiry (clamped, not negative) | P0 |
| DM-027 | `remaining()` decreases over time | P0 |
| DM-028 | `remaining_fn()` returns zero-argument callable returning live float | P0 |

---

## 3. GameView (38 tests)

Read-only wrapper around the live Game object.

### 3.1 Board state methods

| ID | Test | Priority |
|----|------|----------|
| GV-001 | `get_units()` returns dict with 7 keys, correct starting positions | P0 |
| GV-002 | `get_units("FRANCE")` returns list `[A PAR, A MAR, F BRE]` | P0 |
| GV-003 | `get_units("ENGLAND")` is visible to France's GameView (public info) | P0 |
| GV-004 | `get_centers()` returns dict; France has `{PAR, MAR, BRE}` | P0 |
| GV-005 | `get_centers("GERMANY")` returns `[MUN, BER, KIE]` | P1 |
| GV-006 | `get_all_possible_orders()` non-empty at S1901M; identical across GameViews | P0 |
| GV-007 | `get_orderable_locations()` returns own power's unit locations | P0 |
| GV-008 | `get_orderable_locations("ENGLAND")` returns England's locations | P1 |

### 3.2 Phase info

| ID | Test | Priority |
|----|------|----------|
| GV-009 | `get_current_phase()` returns `S1901M` at start | P0 |
| GV-010 | `phase_type` returns `M` for movement, `R` for retreat, `A` for adjustment | P0 |
| GV-011 | `is_game_done` is False at start | P0 |

### 3.3 Message filtering

| ID | Test | Priority |
|----|------|----------|
| GV-012 | GLOBAL messages visible to all powers | P0 |
| GV-013 | Private message visible to sender | P0 |
| GV-014 | Private message visible to recipient | P0 |
| GV-015 | Private message excluded for third party | P0 |
| GV-016 | Mixed visibility: FRANCE sees own messages + GLOBAL, not ENGLAND->RUSSIA | P0 |
| GV-017 | `get_message_history()` filters past-phase messages by visibility | P0 |
| GV-018 | `get_messages()` returns empty dict when no messages exist | P1 |

### 3.4 Read-only enforcement

| ID | Test | Priority |
|----|------|----------|
| GV-019 | `set_orders` not exposed | P0 |
| GV-020 | `process` not exposed | P0 |
| GV-021 | `add_message` not exposed | P0 |
| GV-022 | `clear_orders` not exposed | P0 |
| GV-023 | `set_current_phase` not exposed | P0 |
| GV-024 | `set_status` not exposed | P0 |

### 3.5 Live reference behavior

| ID | Test | Priority |
|----|------|----------|
| GV-025 | GameView reflects game state changes after `process()` | P0 |
| GV-026 | GameView reflects newly added messages | P0 |
| GV-027 | Multiple GameViews share live game but have distinct `power_name` | P1 |

### 3.6 History and map

| ID | Test | Priority |
|----|------|----------|
| GV-028 | `get_order_history()` after one phase contains all 7 powers' orders | P1 |
| GV-029 | `get_result_history()` after one phase has result entries | P1 |
| GV-030 | `get_phase_history()` returns non-empty list after processing | P1 |
| GV-031 | `map.abuts('A', 'PAR', '-', 'BUR')` returns True (valid move) | P1 |
| GV-032 | `map.abuts('A', 'PAR', '-', 'LON')` returns False (invalid move) | P1 |

### 3.7 Phase-dependent orderable locations

| ID | Test | Priority |
|----|------|----------|
| GV-033 | Movement phase: orderable locations = all unit locations | P0 |
| GV-034 | Retreat phase: orderable locations = dislodged unit locations only | P1 |
| GV-035 | Adjustment build: orderable locations include empty home centers | P1 |
| GV-036 | Adjustment disband: orderable locations include unit locations | P1 |
| GV-037 | Retreat phase: power with no dislodgements gets empty list | P2 |
| GV-038 | `powers` property returns dict of 7 Power objects | P2 |

---

## 4. FilteredGameView (13 tests)

Target-scoped message filter for conversation agents.

| ID | Test | Priority |
|----|------|----------|
| FGV-001 | Shows messages where self is sender/recipient AND other party is a target | P0 |
| FGV-002 | Hides messages from non-target powers (even if self is recipient) | P0 |
| FGV-003 | GLOBAL messages always pass through regardless of targets | P0 |
| FGV-004 | Excludes messages between two targets where self is neither sender nor recipient | P0 |
| FGV-005 | Multiple targets: shows messages to/from each target | P0 |
| FGV-006 | Board state (`get_units`, `get_centers`, `get_all_possible_orders`) is unfiltered | P1 |
| FGV-007 | Order history and phase history are unfiltered | P1 |
| FGV-008 | Empty targets list shows only GLOBAL messages | P2 |
| FGV-009 | `add_target()` makes new target's messages visible (including pre-existing ones) | P0 |
| FGV-010 | `add_target()` does not affect other powers' FilteredGameView | P1 |
| FGV-011 | `add_target()` for existing target is idempotent | P2 |
| FGV-012 | `get_message_history()` applies same target filter as `get_messages()` | P1 |
| FGV-013 | **Operator precedence bug**: Verify spec's filter predicate `(A and B) or C` is intentional -- GLOBAL messages bypass power_name check | P0 |

---

## 5. MemoryManager (12 tests)

### 5.1 Initialization

| ID | Test | Priority |
|----|------|----------|
| MEM-001 | `memory_path("FRANCE")` returns `"{game_dir}/FRANCE_memory.md"` | P0 |
| MEM-002 | `memory_path()` for all 7 powers follows naming convention, all distinct | P1 |
| MEM-003 | `initialize("FRANCE")` creates file with header `"# FRANCE -- Strategic Memory\n\n"` | P0 |
| MEM-004 | `initialize()` is idempotent -- does not overwrite existing content | P1 |
| MEM-005 | `initialize_all()` creates all 7 memory files with correct headers | P0 |

### 5.2 Read/write

| ID | Test | Priority |
|----|------|----------|
| MEM-006 | `read_snapshot()` returns exact file contents | P0 |
| MEM-007 | `read_snapshot()` of freshly initialized file returns header only | P0 |
| MEM-008 | `read_snapshot()` returns a string copy, not a live reference | P0 |
| MEM-009 | Strategist can read/append/overwrite via `open(memory_path, ...)` | P1 |
| MEM-010 | Conversation agent's `memory_snapshot` variable mutation does not affect disk | P0 |
| MEM-011 | Concurrent reads from 7 different powers do not interfere | P1 |
| MEM-012 | Memory file growth is unbounded (no system truncation) | P2 |

---

## 6. MessageRouter & Communication (47 tests)

Thread-safe message queuing with atomic flush.

### 6.1 queue_message thread safety

| ID | Test | Priority |
|----|------|----------|
| COM-001 | 7 concurrent writers: all 7 messages present, no loss/duplication | P0 |
| COM-002 | 50 messages from same power across 10 threads: all present, in-thread order preserved | P0 |
| COM-003 | Two powers writing 100 messages each concurrently: correct isolation | P1 |
| COM-004 | 700 messages (100/power, 10 threads/power): stress test, no exceptions | P1 |

### 6.2 flush atomicity and ordering

| ID | Test | Priority |
|----|------|----------|
| COM-005 | `flush()` commits all outboxed messages to the game | P0 |
| COM-006 | Flush preserves send order within a power | P0 |
| COM-007 | Flush processes powers in `ALL_POWERS` order | P1 |
| COM-008 | All outboxes empty after flush; second flush returns empty | P0 |
| COM-009 | Flush is idempotent on empty outboxes | P2 |
| COM-010 | Flush under concurrent queue_message raises no errors | P1 |

### 6.3 get_unread

| ID | Test | Priority |
|----|------|----------|
| COM-011 | Returns messages to powers not in any conversation | P0 |
| COM-012 | Excludes messages to powers in conversations | P0 |
| COM-013 | Includes GLOBAL messages for uninvolved powers | P1 |
| COM-014 | Returns correct dict structure (`sender`, `recipient`, `content`, `phase`) | P1 |

### 6.4 Round synchronization

| ID | Test | Priority |
|----|------|----------|
| COM-015 | Messages queued in round N invisible until flush | P0 |
| COM-016 | Bidirectional same-round messages arrive simultaneously after flush | P0 |
| COM-017 | Agent cannot read own outboxed message before flush | P0 |
| COM-018 | Messages from round N visible in round N+1 | P0 |
| COM-019 | Multiple flushes accumulate messages in game | P1 |

### 6.5 GLOBAL messages

| ID | Test | Priority |
|----|------|----------|
| COM-020 | GLOBAL message visible to all 7 powers | P0 |
| COM-021 | Only 1 Message object in game (not 7 copies) | P0 |
| COM-022 | Multiple GLOBAL messages from different powers visible to uninvolved power | P1 |

### 6.6 Incoming chat notifications

| ID | Test | Priority |
|----|------|----------|
| COM-023 | Incoming chat detected for non-targeted power after flush | P0 |
| COM-024 | Triggers strategist mini-completion callback with message content | P0 |
| COM-025 | `accept_chat` adds target to conversation agent and updates FilteredGameView | P0 |
| COM-026 | `decline_chat` leaves conversation agent unchanged; message in `unread_messages` | P1 |
| COM-027 | Incoming chat timing is after flush (not detected before flush) | P0 |
| COM-028 | Multiple incoming chats in one round handled independently | P1 |
| COM-029 | Message from already-targeted power is not a notification | P1 |

### 6.7 Per-target 60-second timeout

| ID | Test | Priority |
|----|------|----------|
| COM-030 | Timeout triggers after 60s of silence from target | P0 |
| COM-031 | Timeout resets when target responds | P0 |
| COM-032 | Timeout is per-target independent | P0 |
| COM-033 | Timeout notification does not end conversation | P1 |
| COM-034 | Timeout tracking starts from first message sent | P1 |
| COM-035 | Per-(sender, target) pair independence across powers | P2 |

### 6.8 Message integrity

| ID | Test | Priority |
|----|------|----------|
| COM-036 | Content preserved through queue-flush-read cycle (character-exact) | P0 |
| COM-037 | Metadata preserved (sender, recipient, phase) | P0 |
| COM-038 | Unicode content preserved | P1 |
| COM-039 | Empty string content does not crash | P2 |
| COM-040 | Very long content (10KB) not truncated | P2 |
| COM-041 | Diplomacy order syntax in message content not interpreted | P1 |

### 6.9 send_message edge cases

| ID | Test | Priority |
|----|------|----------|
| COM-042 | `send_message("GLOBAL", ...)` creates single GLOBAL message | P0 |
| COM-043 | Multiple send_message calls in one round all queued in order | P0 |
| COM-044 | send_message to non-target power: behavior is defined and consistent | P1 |
| COM-045 | send_message to eliminated power does not crash | P1 |
| COM-046 | send_message return value is confirmation string | P1 |
| COM-047 | send_message to invalid power name returns error, not queued | P2 |

---

## 7. Sentinel Parsing (13 tests)

Regex-based parsing of FINAL, FINAL_VAR, and SPAWN_CONVERSATION.

| ID | Test | Priority |
|----|------|----------|
| SNT-001 | `FINAL(answer)` matches at line start | P0 |
| SNT-002 | `FINAL` not at line start (mid-line) does not match | P0 |
| SNT-003 | `FINAL` with leading whitespace matches | P1 |
| SNT-004 | `FINAL(result (with parens) inside)` -- greedy capture works | P0 |
| SNT-005 | `FINAL_VAR(my_result)` checked before `FINAL`; resolves from REPL locals | P0 |
| SNT-006 | `SPAWN_CONVERSATION({"ENGLAND": "..."})` valid single-target JSON | P0 |
| SNT-007 | `SPAWN_CONVERSATION` with multiple targets parsed correctly | P0 |
| SNT-008 | `SPAWN_CONVERSATION` multi-line JSON does not match (single-line only) | P0 |
| SNT-009 | Malformed JSON inside `SPAWN_CONVERSATION` returns None; treated as FINAL("done") | P0 |
| SNT-010 | `SPAWN_CONVERSATION` takes priority over `FINAL` when both present | P0 |
| SNT-011 | `SPAWN_CONVERSATION` with empty dict `{}` treated as no conversations | P2 |
| SNT-012 | Custom `__SPAWN__:` prefix is detectable and parseable by harness | P0 |
| SNT-013 | Monkey-patched `find_final_answer` restored after strategize (try/finally) | P0 |

---

## 8. Strategist Agent Lifecycle (41 tests)

Persistent RLM that lives the entire game.

### 8.1 Construction

| ID | Test | Priority |
|----|------|----------|
| SA-001 | Creates persistent RLM with custom system prompt | P0 |
| SA-002 | Custom system prompt contains power name, all injected function docs, order syntax, REPL instructions | P0 |
| SA-003 | 7 distinct strategists have unique power_name and GameView identity | P1 |

### 8.2 Bootstrap

| ID | Test | Priority |
|----|------|----------|
| SA-004 | Creates persistent REPL environment (`_persistent_env` not None) | P0 |
| SA-005 | Variables defined during bootstrap persist in REPL locals | P0 |
| SA-006 | Bootstrap prompt is `""` with root_prompt containing power name and phase | P1 |
| SA-007 | Runs `completion()` exactly once | P1 |
| SA-008 | All 7 bootstraps in parallel: no port conflicts, all succeed | P1 |

### 8.3 Inject

| ID | Test | Priority |
|----|------|----------|
| SA-009 | `inject(timer)` updates `time_remaining` in REPL globals | P0 |
| SA-010 | Inject preserves existing REPL variables | P0 |
| SA-011 | After inject: `game_view` (GameView), `memory_path` (str) always present; `submit_orders` (callable) injected before DECIDE only | P0 |
| SA-012 | `send_message` NOT in strategist REPL | P1 |
| SA-013 | `objectives` and `memory_snapshot` NOT in strategist REPL | P2 |

### 8.4 Strategize

| ID | Test | Priority |
|----|------|----------|
| SA-014 | Calls `completion()` with STRATEGIZE root_prompt containing phase and time | P0 |
| SA-015 | `SPAWN_CONVERSATION` output creates ConversationRequest with correct targets/objectives | P0 |
| SA-016 | `FINAL("done")` output results in no conversation request | P0 |
| SA-017 | Previous phase's conversation_requests cleared | P1 |

### 8.5 Deliver results

| ID | Test | Priority |
|----|------|----------|
| SA-018 | Injects `conversation_results` into REPL locals (list of dicts with targets/summary/rounds_used) | P0 |
| SA-019 | Injects `unread_messages` into REPL locals | P0 |
| SA-020 | Empty summaries and empty unread both inject as `[]` | P1 |

### 8.6 Decide

| ID | Test | Priority |
|----|------|----------|
| SA-021 | Calls `completion()` with DECIDE root_prompt mentioning conversation_results and submit_orders | P0 |
| SA-022 | Agent submits valid orders via `submit_orders()` -> retrievable via `get_submitted_orders()` | P0 |
| SA-023 | Agent does not call `submit_orders()` -> returns None -> orchestrator applies defaults | P0 |
| SA-024 | `_submitted_orders` resets between phases | P1 |

### 8.7 Close and persistence

| ID | Test | Priority |
|----|------|----------|
| SA-025 | `close()` cleans up RLM resources | P1 |
| SA-026 | `close()` safe to call multiple times or on never-bootstrapped agent | P2 |
| SA-027 | REPL variables persist across strategize and decide calls | P0 |
| SA-028 | REPL functions persist across multiple phases | P0 |
| SA-029 | `game_view` reflects updated game state between phases (live reference) | P0 |
| SA-030 | REPL state survives across 3+ full phases (counter test) | P0 |

### 8.8 submit_orders contract

| ID | Test | Priority |
|----|------|----------|
| SA-031 | Valid orders accepted; return string says "Accepted N" | P0 |
| SA-032 | Invalid orders rejected, valid ones kept; return string shows both | P0 |
| SA-033 | All-invalid orders result in empty accepted list (not None) | P1 |
| SA-034 | Empty list `[]` accepted; once-only lock engaged | P1 |

### 8.9 Error handling and retries

| ID | Test | Priority |
|----|------|----------|
| SA-035 | Transient API error retries and succeeds | P0 |
| SA-036 | All retries exhausted raises GameHaltError with retry count and chained cause | P0 |
| SA-037 | REPL survives across retries (persistent env not destroyed) | P0 |
| SA-038 | Agent code exception in REPL: traceback fed back to LLM, recovery in next iteration | P0 |
| SA-039 | `max_iterations` reached without FINAL: returns default answer, no infinite loop | P1 |

### 8.10 Notification callback

| ID | Test | Priority |
|----|------|----------|
| SA-040 | Mini-completion receives `accept_chat`/`decline_chat`; removed after callback | P1 |
| SA-041 | REPL state preserved before and after callback | P1 |

---

## 9. Conversation Agent Lifecycle (43 tests)

Ephemeral RLM diplomat for a single phase.

### 9.1 Construction and bootstrap

| ID | Test | Priority |
|----|------|----------|
| CA-001 | Construction with valid params: power_name, targets, objectives, is_finished=False | P0 |
| CA-002 | RLM created with `persistent=True` | P0 |
| CA-003 | System prompt contains power name, targets, `send_message`, `game_view`, `FINAL()` -- NOT `submit_orders` | P1 |
| CA-004 | Bootstrap creates REPL with `game_view` (FilteredGameView), `memory_snapshot` (str), `send_message` (callable), `time_remaining` (callable), `objectives` (dict) | P0 |
| CA-005 | Bootstrap does NOT inject `submit_orders` or `memory_path` | P0 |

### 9.2 Ephemeral nature

| ID | Test | Priority |
|----|------|----------|
| CA-006 | REPL state persists across rounds within a phase | P0 |
| CA-007 | Agent destroyed after phase (`close()` cleans up); no state carries to next phase | P0 |
| CA-008 | Fresh agent each phase has no variables from prior agent | P1 |

### 9.3 send_message outbox pattern

| ID | Test | Priority |
|----|------|----------|
| CA-009 | `send_message` queues to outbox, not game directly | P0 |
| CA-010 | Messages not visible to other agents until flush | P0 |
| CA-011 | Messages visible after `router.flush()` | P0 |
| CA-012 | Multiple messages to different targets in same round all queued | P0 |
| CA-013 | PendingMessage has correct phase field from current game phase | P2 |

### 9.4 FINAL as summary

| ID | Test | Priority |
|----|------|----------|
| CA-014 | FINAL text becomes conversation summary in ConversationSummary | P0 |
| CA-015 | Summary includes power, targets, rounds_used | P0 |
| CA-016 | FINAL in round 1 ends agent immediately | P0 |
| CA-017 | FINAL in later round: summary reflects accumulated information | P1 |
| CA-018 | Empty summary string does not crash | P1 |

### 9.5 run_round

| ID | Test | Priority |
|----|------|----------|
| CA-019 | `run_round(N)` calls `completion()` with "Round N" in root_prompt | P1 |
| CA-020 | `run_round()` does nothing if agent already finished | P0 |
| CA-021 | New target notification appears in root_prompt after `add_target()` | P1 |
| CA-022 | Target timeout notification appears in root_prompt after 60s silence | P1 |
| CA-023 | `rounds_used` counter increments correctly | P1 |

### 9.6 add_target

| ID | Test | Priority |
|----|------|----------|
| CA-024 | Expands targets list and objectives dict | P0 |
| CA-025 | Updates FilteredGameView scope (new target's messages become visible) | P0 |
| CA-026 | Idempotent for existing target | P2 |
| CA-027 | On finished agent: no crash, agent stays finished | P2 |

### 9.7 force_finish

| ID | Test | Priority |
|----|------|----------|
| CA-028 | Marks agent as finished | P0 |
| CA-029 | Sets timeout summary: "Conversation ended by timeout -- no summary provided." | P0 |
| CA-030 | Does not overwrite genuine FINAL summary if agent already finished | P1 |

### 9.8 Memory snapshot

| ID | Test | Priority |
|----|------|----------|
| CA-031 | `memory_snapshot` is exact string from creation time (not a file path) | P0 |
| CA-032 | Modifying `memory_snapshot` variable does not affect disk file | P0 |
| CA-033 | Snapshot reflects creation-time state (not live view of strategist's file) | P0 |

### 9.9 Error handling

| ID | Test | Priority |
|----|------|----------|
| CA-034 | Retry on transient completion failure | P0 |
| CA-035 | All retries exhausted: force-finished with crash summary, NOT GameHaltError | P0 |
| CA-036 | Crash logged; strategist receives crash summary and proceeds to DECIDE | P0 |
| CA-037 | REPL state preserved across retries | P1 |

### 9.10 Multi-party and lifecycle integration

| ID | Test | Priority |
|----|------|----------|
| CA-038 | Agent with two targets sends separate messages, sees messages from both | P0 |
| CA-039 | Single summary covers all targets | P0 |
| CA-040 | Full happy-path lifecycle: create, bootstrap, rounds with flush, FINAL, close | P0 |
| CA-041 | Lifecycle with force_finish due to max_rounds or timer expiry | P0 |
| CA-042 | 4 agents running in parallel in one round: no cross-contamination | P0 |
| CA-043 | Agent targeting eliminated power: no crash, timeout fires | P2 |

---

## 10. Orchestrator & Game Loop (39 tests)

Top-level game lifecycle.

### 10.1 Main loop

| ID | Test | Priority |
|----|------|----------|
| ORC-001 | Basic loop advances through phases; `game.process()` called once per phase | P0 |
| ORC-002 | Loop terminates on victory (18 supply centers) | P0 |
| ORC-003 | `close()` called on all 7 strategists in finally block | P2 |
| ORC-004 | `close()` called even after GameHaltError | P2 |
| ORC-005 | Movement phase dispatches STRATEGIZE -> CONVERSE -> DECIDE | P0 |
| ORC-006 | Retreat phase dispatches DECIDE-only | P0 |
| ORC-007 | Adjustment phase dispatches DECIDE-only | P0 |

### 10.2 Phase progression

| ID | Test | Priority |
|----|------|----------|
| ORC-008 | max_year boundary: loop breaks when next phase year > max_year | P0 |
| ORC-009 | Year exactly equals max_year is processed (not skipped) | P0 |
| ORC-010 | Retreat phase skipped when no dislodged units | P0 |
| ORC-011 | Phase string year parsing correct for multi-digit years (e.g., 1910) | P0 |

### 10.3 Bootstrap

| ID | Test | Priority |
|----|------|----------|
| ORC-012 | All 7 strategists bootstrap in parallel (ThreadPoolExecutor) | P0 |
| ORC-013 | Bootstrap failure in one strategist propagates as exception | P0 |
| ORC-014 | Bootstrap injects game_view and memory_path into REPL | P0 |

### 10.4 Eliminated power handling

| ID | Test | Priority |
|----|------|----------|
| ORC-015 | Eliminated power skipped in STRATEGIZE | P0 |
| ORC-016 | Eliminated power skipped in DECIDE | P0 |
| ORC-017 | Eliminated power skipped in CONVERSE | P0 |
| ORC-018 | Eliminated power's strategist not closed prematurely (only at game end) | P2 |
| ORC-019 | Eliminated power's memory file preserved | P2 |
| ORC-020 | Power eliminated mid-game transitions from active to skipped | P0 |

### 10.5 Three-step flow details

| ID | Test | Priority |
|----|------|----------|
| ORC-021 | STRATEGIZE collects SPAWN_CONVERSATION requests from all active powers | P0 |
| ORC-022 | CONVERSE creates one conversation agent per power with SPAWN_CONVERSATION | P0 |
| ORC-023 | CONVERSE skipped if no power spawned conversations | P2 |
| ORC-024 | DECIDE receives conversation_results and unread_messages | P0 |
| ORC-025 | DECIDE applies submitted orders; applies default HOLD when None | P0 |
| ORC-026 | Default DISBAND for retreat timeout; default WAIVE for adjustment timeout | P0 |
| ORC-027 | Three steps execute sequentially (no overlap) | P0 |

### 10.6 Conversation management

| ID | Test | Priority |
|----|------|----------|
| ORC-028 | Conversation agent created with correct FilteredGameView | P1 |
| ORC-029 | Conversation agent receives read-only memory snapshot | P1 |
| ORC-030 | Round loop respects max_rounds; exits early when all agents FINAL | P0 |
| ORC-031 | Conversation agent destroyed after each phase | P0 |

### 10.7 GameHaltError

| ID | Test | Priority |
|----|------|----------|
| ORC-032 | Raised after max_retries exhausted (original exception chained) | P0 |
| ORC-033 | Triggers snapshot save before propagation | P0 |
| ORC-034 | Conversation agent crash: force-finished, NOT GameHaltError, game continues | P0 |

### 10.8 Early termination

| ID | Test | Priority |
|----|------|----------|
| ORC-035 | STRATEGIZE returns immediately when all agents finish fast | P2 |
| ORC-036 | DECIDE returns immediately when all agents finish fast | P2 |
| ORC-037 | Mixed: fast agents collected, slow agent timed out with defaults | P2 |

### 10.9 Timer integration

| ID | Test | Priority |
|----|------|----------|
| ORC-038 | Each step gets its own independent timer (unused time does not carry over) | P0 |
| ORC-039 | `time_remaining` injected into REPL before each completion() | P0 |

---

## 11. Order Integrity & Engine Integration (38 tests)

Order validation, phase-specific logic, and pipeline.

### 11.1 submit_orders validation

| ID | Test | Priority |
|----|------|----------|
| ORD-001 | All valid movement orders accepted | P0 |
| ORD-002 | Valid HOLD orders accepted | P0 |
| ORD-003 | Valid support orders accepted | P0 |
| ORD-004 | Valid convoy orders accepted | P1 |
| ORD-005 | Completely invalid order rejected | P0 |
| ORD-006 | Order for non-existent location rejected | P0 |
| ORD-007 | Order for unit power does not own rejected | P0 |
| ORD-008 | Mixed valid/invalid: valid kept, invalid rejected | P0 |
| ORD-009 | Second call returns error; first preserved | P0 |
| ORD-010 | Once-only resets between phases | P1 |
| ORD-011 | Every accepted order is in `get_all_possible_orders()` | P0 |
| ORD-012 | Every rejected order is NOT in possible orders for the power | P0 |

### 11.2 Phase-specific orders

| ID | Test | Priority |
|----|------|----------|
| ORD-013 | Movement phase rejects retreat-type and build orders | P0 |
| ORD-014 | Retreat phase accepts disband; rejects movement orders | P0 |
| ORD-015 | Adjustment phase accepts build/waive/disband; rejects movement | P0 |

### 11.3 Default order generation

| ID | Test | Priority |
|----|------|----------|
| ORD-016 | Movement timeout: all HOLD orders | P0 |
| ORD-017 | Retreat timeout: all DISBAND | P0 |
| ORD-018 | Adjustment build timeout: all WAIVE | P0 |
| ORD-019 | Adjustment disband: farthest unit from home supply centers disbanded first | P1 |
| ORD-020 | Default orders produce exactly the right number of orders per unit | P1 |

### 11.4 Order-to-game pipeline

| ID | Test | Priority |
|----|------|----------|
| ORD-021 | `get_submitted_orders()` returns None before submission, list after | P0 |
| ORD-022 | Orchestrator calls `game.set_orders()` with submitted orders | P0 |
| ORD-023 | `game.process()` resolves orders and advances phase | P0 |
| ORD-024 | Processed orders appear in `get_order_history()` | P0 |
| ORD-025 | Full pipeline: submit -> set -> process -> history for all 7 powers | P0 |

### 11.5 Cross-power isolation

| ID | Test | Priority |
|----|------|----------|
| ORD-026 | France cannot submit orders for England's units (wrong orderable locations) | P0 |
| ORD-027 | `get_orderable_locations()` returns only own power's locations | P0 |
| ORD-028 | Parallel submit_orders for different powers do not interfere | P1 |

### 11.6 Coast, convoy, and special orders

| ID | Test | Priority |
|----|------|----------|
| ORD-029 | Fleet build on STP requires coast specification (STP/NC or STP/SC) | P1 |
| ORD-030 | Fleet move to BUL specifies coast | P1 |
| ORD-031 | Army move to coastal province ignores coasts | P2 |
| ORD-032 | Simple one-fleet convoy: both orders valid, army reaches destination | P1 |
| ORD-033 | Convoy fails when fleet is dislodged | P2 |
| ORD-034 | Self-bounce: two own units to same province, both bounce | P1 |
| ORD-035 | Own units cannot cut own support | P2 |

### 11.7 Multi-phase integration

| ID | Test | Priority |
|----|------|----------|
| ORD-036 | Full S1901M through F1901M pipeline: correct phase advancement | P0 |
| ORD-037 | Order history accumulates across phases | P1 |
| ORD-038 | Skipped retreat phase: S1901M jumps to F1901M | P1 |

---

## 12. Concurrency & Thread Safety (30 tests)

### 12.1 Thread safety fundamentals

| ID | Test | Priority |
|----|------|----------|
| THR-001 | 7 parallel GameView reads during STRATEGIZE: consistent data, no corruption | P0 |
| THR-002 | 7 parallel GameView reads during DECIDE (history, orders, results, messages) | P0 |
| THR-003 | No Game writes during agent execution window (set_orders, process, add_message counters = 0) | P0 |
| THR-004 | Memory file isolation under parallel strategist writes (7 files, 100 lines each) | P0 |
| THR-005 | MessageRouter lock contention: 2800 messages across 14 threads, no loss, under 5s | P1 |

### 12.2 Read/write separation

| ID | Test | Priority |
|----|------|----------|
| THR-006 | Reads during STRATEGIZE, writes only after (timestamp ordering) | P0 |
| THR-007 | Reads during CONVERSE rounds, flush only between rounds (timestamp ordering) | P0 |
| THR-008 | `process()` only called after all DECIDE agents return | P0 |
| THR-009 | `set_orders()` happens after all agents finish, before process | P0 |
| THR-010 | Router flush only runs between rounds, never during agent execution | P1 |

### 12.3 Port isolation

| ID | Test | Priority |
|----|------|----------|
| THR-011 | Single LMHandler auto-assigns port (positive int, not 0) | P0 |
| THR-012 | Two concurrent LMHandlers get different ports | P0 |
| THR-013 | 14 concurrent LMHandlers: all unique ports, all respond | P0 |
| THR-014 | Port released after handler stop | P1 |
| THR-015 | Persistent RLM creates new LMHandler per completion call | P0 |

### 12.4 Orphaned threads

| ID | Test | Priority |
|----|------|----------|
| THR-016 | Timed-out completion continues in background without corrupting persistent env | P0 |
| THR-017 | Orphaned thread's LMHandler isolated from new completion's handler | P0 |
| THR-018 | `max_iterations` bounds orphaned thread runtime | P0 |
| THR-019 | Orchestrator applies default orders for timed-out agent | P0 |
| THR-020 | Orphaned thread does not corrupt REPL for next step | P1 |

### 12.5 Wait semantics

| ID | Test | Priority |
|----|------|----------|
| THR-021 | `wait()` returns immediately when all futures done | P0 |
| THR-022 | `wait()` returns done/not_done split on timeout | P0 |
| THR-023 | Early termination: all agents finish before timeout | P0 |
| THR-024 | Timeout with partial completion: 5 done, 2 timed out with defaults | P0 |
| THR-025 | `wait()` with exception in one future: error accessible via `.result()` | P1 |

### 12.6 Concurrent notification callbacks

| ID | Test | Priority |
|----|------|----------|
| THR-026 | Strategist notification callbacks are sequential (non-overlapping timestamps) | P0 |
| THR-027 | Notification callback injects `accept_chat`/`decline_chat` (removed after) | P0 |
| THR-028 | Multiple notifications to same strategist are serialized | P1 |
| THR-029 | Notification callbacks do not block conversation round progress (by design) | P2 |
| THR-030 | `game.process()` never called during agent execution (concurrency invariant) | P0 |

---

## 13. RLM Integration & Backend Routing (14 tests)

### 13.1 Persistent environment

| ID | Test | Priority |
|----|------|----------|
| RLM-001 | Persistent mode preserves REPL variables across completion calls | P0 |
| RLM-002 | `_persistent_env` created on first completion, same object reused | P0 |
| RLM-003 | Globals injection (e.g., `game_view`) accessible inside REPL | P0 |
| RLM-004 | `custom_system_prompt` replaces default entirely | P0 |
| RLM-005 | `root_prompt` changes per call; does not persist | P0 |
| RLM-006 | Context versioning: context_0, context_1, context_2 across calls | P1 |
| RLM-007 | Persistent env survives across retries | P1 |
| RLM-008 | `close()` sets `_persistent_env` to None | P1 |

### 13.2 Backend routing

| ID | Test | Priority |
|----|------|----------|
| RLM-009 | `depth=0` uses default client | P0 |
| RLM-010 | `depth=1` uses sub_backend client | P0 |
| RLM-011 | `depth=1` falls back to default when no sub_backend | P0 |
| RLM-012 | `llm_query` in REPL routes to depth=1 | P0 |
| RLM-013 | `sub_backend=None` means same model for both depths | P1 |
| RLM-014 | Batched `llm_query` routes through same depth | P1 |

---

## 14. Snapshot Save/Restore (14 tests)

### 14.1 Snapshot saving

| ID | Test | Priority |
|----|------|----------|
| SNAP-001 | Directory structure: `snapshots/{phase}/game_state.json`, `orders.json`, `results.json`, `messages.json`, `memory/`, `repl_state/` | P3 |
| SNAP-002 | Snapshots saved only for movement phases (not retreat/adjustment) | P3 |
| SNAP-003 | `game_state.json` is restorable to a new Game object with matching state | P0 |
| SNAP-004 | Memory files in snapshot match current memory state | P3 |
| SNAP-005 | Dill serialization captures agent-defined REPL variables | P0 |
| SNAP-006 | Dill serialization skips injected system functions (game_view, submit_orders, time_remaining) | P0 |
| SNAP-007 | Dill serialization handles non-serializable values gracefully (skip, no crash) | P2 |

### 14.2 Snapshot restore

| ID | Test | Priority |
|----|------|----------|
| SNAP-008 | `from_snapshot` restores game state correctly | P0 |
| SNAP-009 | `from_snapshot` restores memory files to game_dir | P0 |
| SNAP-010 | `from_snapshot` bootstraps fresh strategists with restored dill state | P0 |
| SNAP-011 | System functions re-injected after dill restore | P0 |
| SNAP-012 | Restored orchestrator can resume `run()` and continue game | P0 |
| SNAP-013 | Missing dill file for one power: bootstrapped with clean REPL, no crash | P2 |
| SNAP-014 | GameHaltError triggers snapshot save before propagation | P0 |

---

## 15. Game Log (7 tests)

`game_log.jsonl` observability.

| ID | Test | Priority |
|----|------|----------|
| LOG-001 | Strategize complete event logged with conversation request counts | P3 |
| LOG-002 | Converse complete event logged with rounds, agents, messages | P3 |
| LOG-003 | Decide complete event logged with order counts (including defaults) | P3 |
| LOG-004 | Phase processed event logged with duration_seconds | P3 |
| LOG-005 | Skipped phase event logged with reason | P3 |
| LOG-006 | `game_log.jsonl` is valid JSONL (one JSON per line) | P3 |
| LOG-007 | GameHaltError logged before propagation | P3 |

---

# AXIS 2: SECURITY

All security tests assume the LLM-generated REPL code is **untrusted**. The agent may attempt to escape its sandbox, read other powers' data, mutate game state, or escalate privileges.

---

## 16. GameView Mutation Attacks (10 tests)

| ID | Test | Priority |
|----|------|----------|
| SEC-001 | `game_view._game.set_orders(...)` blocked or inaccessible; game state unchanged | P0 |
| SEC-002 | `game_view._game.process()` blocked; phase unchanged | P0 |
| SEC-003 | `game_view._game.add_message(...)` blocked; no forged messages | P0 |
| SEC-004 | `game_view._game.clear_orders(...)` blocked; orders intact | P0 |
| SEC-005 | `game_view._game.set_current_phase(...)` blocked; no time travel | P0 |
| SEC-006 | Nested traversal paths (`__dict__`, `object.__getattribute__`, Power back-references) all fail | P1 |
| SEC-007 | `game_view.powers["ENGLAND"].units = []` does not affect real game state | P1 |
| SEC-008 | Mutating return value of `get_units()` does not propagate to game | P2 |
| SEC-009 | Mutating return value of `get_all_possible_orders()` does not propagate | P2 |
| SEC-010 | `dir(game_view)` does not reveal `_game`; or accessing it returns safe proxy | P1 |

---

## 17. Attribute Inspection & Monkey-Patching (6 tests)

| ID | Test | Priority |
|----|------|----------|
| SEC-011 | `__dict__` on GameView: either blocked, sanitized, or `_game` entry is non-functional proxy | P1 |
| SEC-012 | `__class__` reassignment does not bypass GameView restrictions | P1 |
| SEC-013 | Monkey-patching `GameView.get_messages` to call `self._game.messages`: `_game` still inaccessible | P1 |
| SEC-014 | Monkey-patching `submit_orders` in namespace does not affect orchestrator's record | P1 |
| SEC-015 | Agent persists trojan `game_view.get_messages` replacement; orchestrator re-injects fresh `game_view` each phase | P1 |
| SEC-016 | `inspect.currentframe()` traversal does not expose orchestrator variables | P2 |

---

## 18. Privilege Separation (8 tests)

| ID | Test | Priority |
|----|------|----------|
| SEC-017 | Conversation agent: `submit_orders` raises NameError | P0 |
| SEC-018 | Conversation agent: `memory_path` raises NameError (has `memory_snapshot` instead) | P0 |
| SEC-019 | Conversation agent: `SPAWN_CONVERSATION` sentinel ignored (only FINAL recognized) | P0 |
| SEC-020 | Conversation agent: `accept_chat`/`decline_chat` raise NameError | P2 |
| SEC-021 | Strategist: `send_message` raises NameError during DECIDE | P1 |
| SEC-022 | `submit_orders` not available during STRATEGIZE (only during DECIDE) | P0 |
| SEC-023 | `submit_orders` not available during bootstrap | P1 |
| SEC-024 | Conversation agent guesses memory path: `open(guessed_path, "w")` fails or is sandboxed | P1 |

---

## 19. REPL Sandbox Escapes (14 tests)

`open()` and `__import__()` are available per spec; these tests probe the resulting attack surface.

| ID | Test | Priority |
|----|------|----------|
| SEC-025 | `import os; os.system(...)` blocked | P0 |
| SEC-026 | `import subprocess; subprocess.run(...)` blocked | P0 |
| SEC-027 | `import socket; socket.connect(...)` blocked | P0 |
| SEC-028 | `open("game_output/ENGLAND_memory.md")` read blocked for France agent | P0 |
| SEC-029 | `open("game_output/ENGLAND_memory.md", "w")` write blocked for France agent | P0 |
| SEC-030 | `open("/etc/passwd")` read blocked | P0 |
| SEC-031 | `import threading; Thread(target=backdoor).start()` background mutation prevented | P1 |
| SEC-032 | `import ctypes; ctypes.pythonapi` access blocked | P1 |
| SEC-033 | `__import__("os")` dangerous modules blocklisted | P1 |
| SEC-034 | `import builtins; builtins.__dict__["exec"]` cannot restore sandboxed functions | P1 |
| SEC-035 | `import multiprocessing; Process(target=steal).start()` blocked | P2 |
| SEC-036 | Code object construction via `types.CodeType` prevented | P2 |
| SEC-037 | Pickle deserialization attack via `__reduce__` blocked | P2 |
| SEC-038 | `import gc; gc.get_objects()` Game discovery blocked | P2 |

---

## 20. Information Leakage (10 tests)

| ID | Test | Priority |
|----|------|----------|
| SEC-039 | France GameView: ENGLAND->RUSSIA private messages invisible | P0 |
| SEC-040 | Historical message filtering: past-phase private messages also filtered | P0 |
| SEC-041 | FilteredGameView: non-target sender's messages to self invisible | P0 |
| SEC-042 | Conversation agent: historical GERMANY->RUSSIA messages invisible | P1 |
| SEC-043 | REPL variable isolation: France's `secret_plan` not in England's REPL | P1 |
| SEC-044 | Submitted orders not visible to other agents before `game.set_orders()` | P1 |
| SEC-045 | Cross-agent memory file enumeration via `glob.glob` blocked | P1 |
| SEC-046 | `sys.modules` traversal does not expose Game instance | P2 |
| SEC-047 | Memory file path traversal (`../../etc/passwd`) blocked | P1 |
| SEC-048 | `FINAL_VAR` return values are from agent's own filtered view only (not a broader data channel) | P3 |

---

## 21. Temporal Attacks (5 tests)

| ID | Test | Priority |
|----|------|----------|
| SEC-049 | Agent replacing `time_remaining` in namespace does not affect orchestrator's timer | P1 |
| SEC-050 | Agent sleeping to outlast timer: force-finished, cannot affect game after DECIDE | P2 |
| SEC-051 | Pre-flush message read: round isolation holds (messages invisible before flush) | P1 |
| SEC-052 | Closure inspection of `time_remaining.__closure__`: timer object unmodifiable | P2 |
| SEC-053 | Rapid `time_remaining()` calls: monotonic decrease, no info about other agents | P3 |

---

## 22. Message Router Attacks (4 tests)

| ID | Test | Priority |
|----|------|----------|
| SEC-054 | Sender spoofing: `send_message` hardcodes sender to agent's power_name | P0 |
| SEC-055 | Direct router access via `send_message.__closure__`: premature flush does not break round isolation | P1 |
| SEC-056 | Message tagged with current phase, not agent-specified phase | P2 |
| SEC-057 | Self-messaging: either rejected or no information leakage | P2 |

---

## 23. Snapshot & Serialization Attacks (3 tests)

| ID | Test | Priority |
|----|------|----------|
| SEC-058 | Tampered dill file with malicious `__reduce__`: no arbitrary code execution on restore | P1 |
| SEC-059 | Agent stores object with malicious `__reduce__` in REPL: `dill.dumps` either sandboxed or accepted risk documented | P2 |
| SEC-060 | Agent discovers other LMHandler ports via port scanning: either socket blocked or no meaningful interference | P2 |

---

## 24. Resource & Liveness Bounds (5 tests)

| ID | Test | Priority |
|----|------|----------|
| RES-001 | `max_iterations=15` terminates completion (mock never produces FINAL) | P0 |
| RES-002 | `max_iterations=1` still produces an answer | P1 |
| RES-003 | Message flood (10,000 messages) does not crash MessageRouter flush | P1 |
| RES-004 | Memory file 1MB growth: `read_snapshot()` returns full content | P2 |
| RES-005 | Large `conversation_results` injection (~500KB): REPL handles without MemoryError | P2 |

---

# SUMMARY

## Test Count by Section

| # | Section | Tests | P0 | P1 | P2 | P3 |
|---|---------|-------|----|----|----|----|
| 1 | Vendored Engine | 10 | 10 | 0 | 0 | 0 |
| 2 | Data Model & Config | 28 | 15 | 8 | 5 | 0 |
| 3 | GameView | 38 | 24 | 12 | 2 | 0 |
| 4 | FilteredGameView | 13 | 7 | 4 | 2 | 0 |
| 5 | MemoryManager | 12 | 7 | 4 | 1 | 0 |
| 6 | MessageRouter & Comm | 47 | 24 | 18 | 5 | 0 |
| 7 | Sentinel Parsing | 13 | 11 | 1 | 1 | 0 |
| 8 | Strategist Agent | 41 | 25 | 14 | 2 | 0 |
| 9 | Conversation Agent | 43 | 29 | 10 | 4 | 0 |
| 10 | Orchestrator | 39 | 29 | 2 | 8 | 0 |
| 11 | Order Integrity | 38 | 24 | 11 | 3 | 0 |
| 12 | Concurrency | 30 | 23 | 6 | 1 | 0 |
| 13 | RLM Integration | 14 | 9 | 5 | 0 | 0 |
| 14 | Snapshot & Recovery | 14 | 9 | 0 | 2 | 3 |
| 15 | Game Log | 7 | 0 | 0 | 0 | 7 |
| 16 | GameView Mutation | 10 | 5 | 3 | 2 | 0 |
| 17 | Monkey-Patching | 6 | 0 | 5 | 1 | 0 |
| 18 | Privilege Separation | 8 | 4 | 3 | 1 | 0 |
| 19 | Sandbox Escapes | 14 | 6 | 4 | 4 | 0 |
| 20 | Information Leakage | 10 | 3 | 5 | 1 | 1 |
| 21 | Temporal Attacks | 5 | 0 | 2 | 2 | 1 |
| 22 | Router Attacks | 4 | 1 | 1 | 2 | 0 |
| 23 | Serialization Attacks | 3 | 0 | 1 | 2 | 0 |
| 24 | Resource Bounds | 5 | 1 | 2 | 2 | 0 |
| | **TOTAL** | **452** | **266** | **121** | **53** | **12** |

## Priority Distribution

| Priority | Count | Percentage |
|----------|-------|------------|
| P0 | 266 | 59% |
| P1 | 121 | 27% |
| P2 | 53 | 12% |
| P3 | 12 | 3% |

## Test Execution Strategy

1. **P0 tests first** (266 tests): Unit tests with no LLM calls. Create real Game/GameView instances, execute adversarial code directly, validate order pipelines. Must pass before any game runs.

2. **P1 tests** (121 tests): Integration tests. Some require simulated multi-agent scenarios (parallel threads, message routing). Use mock agents with scripted behavior.

3. **P2 tests** (53 tests): Hardening and edge cases. May require complex setup (snapshot manipulation, timing instrumentation, adversarial pickle payloads).

4. **P3 tests** (12 tests): Observability and defense-in-depth. Lower urgency but document accepted risks.

## Key Findings from Analysis

1. **FilteredGameView operator precedence (FGV-013)**: The spec shows a filter predicate where `and` binds tighter than `or`, making GLOBAL messages bypass the power_name check. Verify this is intentional and parenthesize explicitly.

2. **`open()` and `__import__()` available in sandbox**: The spec explicitly allows these. This creates a large attack surface (SEC-025 through SEC-038). A module blocklist and path-restricted `open()` wrapper are critical.

3. **GameView holds a live reference**: Not a snapshot. If `_game` is reachable, one compromised agent can affect all agents. Defense must be at the GameView level via attribute access control.

4. **FilteredGameView must override `get_message_history()`**: If only `get_messages()` is overridden, historical messages leak through `get_message_history()`.

5. **Dill deserialization is a trusted-input channel**: Tampered dill files can execute arbitrary code on load. Snapshot restoration needs validation or sandboxing.

6. **Conversation agent crash should NOT raise GameHaltError**: Force-finish with crash summary and continue to DECIDE. Only strategist failures after max_retries should halt the game.

## Implementation Notes

### Required Test Fixtures

1. **`fresh_game()`**: New `Game()` at S1901M
2. **`game_at_retreat()`**: Game advanced to retreat phase with dislodged unit
3. **`game_at_adjustment()`**: Game advanced to W1901A with supply center changes
4. **`mock_strategist(power)`**: StrategistAgent with mock RLM, REPL initialized
5. **`mock_conversation_agent(power, targets)`**: ConversationAgent with mock RLM
6. **`game_view(power)`**: GameView wrapping fresh game
7. **`filtered_game_view(power, targets)`**: FilteredGameView wrapping fresh game
8. **`memory_manager(tmp_dir)`**: MemoryManager with temp directory
9. **`message_router(game)`**: MessageRouter bound to game

### Dependencies

- `pytest` for test framework
- `threading` for concurrency tests (barriers, events)
- `time` (monotonic) for timing assertions
- `dill` for snapshot tests
- `tempfile` for memory manager tests
- No real LLM API calls needed
