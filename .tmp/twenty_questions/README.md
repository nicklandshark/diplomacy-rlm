# 20 Questions: RLM Agent Battle

Two Claude-powered RLM (Recursive Language Model) agents play 20 Questions against each other.

## How It Works

- **Contestant Agent**: Asks yes/no questions and makes guesses to identify the secret
- **Moderator Agent**: Holds the secret, answers questions truthfully, evaluates guesses

## Game Rules

- Contestant has **20 questions** (must be answerable with yes/no)
- Contestant has **3 guesses** to directly name the secret
- Questions that can't be answered yes/no still count against the total
- Game ends when contestant guesses correctly OR exhausts all 3 guesses

## Installation

```bash
cd twenty_questions
uv sync
```

## Usage

```bash
# Set your API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Run with random secret
uv run twenty-questions

# Run with specific secret
uv run twenty-questions --secret "elephant"

# List available secrets
uv run twenty-questions --list-secrets

# Use a different model
uv run twenty-questions --model "claude-sonnet-4-5-20250514"
```

## Available Secrets

The game includes 10 diverse secrets across categories:

1. **elephant** (animal)
2. **telescope** (object)
3. **sushi** (food)
4. **Cleopatra** (historical_figure)
5. **Eiffel Tower** (landmark)
6. **gravity** (concept)
7. **submarine** (vehicle)
8. **saxophone** (musical_instrument)
9. **aurora borealis** (natural_phenomenon)
10. **Sherlock Holmes** (fictional_character)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GameOrchestrator                           │
│  - Manages game state (questions_left, guesses_left, history)   │
│  - Routes tool calls between agents                             │
│  - Enforces rules and turn order                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌────────────────────────┐        ┌────────────────────────┐
│    Contestant Agent    │        │     Moderator Agent    │
│                        │        │                        │
│  Tools (phase-locked): │        │  Tools (phase-locked): │
│  - ask_question(str)   │        │  - answer(enum)        │
│  - guess(str)          │        │  - cannot_answer(str)  │
│  - final(str)          │        │  - evaluate(bool)      │
│                        │        │  - final(str)          │
└────────────────────────┘        └────────────────────────┘
```

## Tool Restrictions

Tools are **phase-locked** - agents can only use specific tools during their designated phases:

| Phase | Agent | Allowed Tools |
|-------|-------|---------------|
| Contestant Turn | Contestant | `ask_question`, `guess` |
| Awaiting Answer | Moderator | `answer`, `cannot_answer` |
| Awaiting Evaluation | Moderator | `evaluate` |
| Game Over | Both | `final` |

## Display

The game shows real-time colorful output including:
- Current game state (turn, questions left, guesses left)
- Agent turns with depth indicator
- Tool calls and results
- LLM API call stats (tokens in/out)
- Final game summary

## Error Handling

- Malformed agent output is retried up to 10 times (configurable with `--max-retries`)
- After 10 failed attempts, the game ends with an error state
- Both agents get a chance to provide a final statement

## Based On

This implementation is inspired by the [Recursive Language Models](https://arxiv.org/abs/2512.24601) paper from MIT CSAIL, which treats long prompts as external environment data that LLMs can programmatically explore.
