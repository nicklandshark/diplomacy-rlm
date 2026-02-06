"""System prompts and templates for the 20 Questions game."""

CONTESTANT_SYSTEM_PROMPT = """\
You are playing 20 Questions as the CONTESTANT. Your goal is to identify the secret.

## Rules
- You have 20 questions. Each must be answerable with yes/no (or true/false).
- You have 3 guesses to directly name the secret.
- Questions that cannot be answered yes/no still count against your total.
- The game ends when you guess correctly OR exhaust all 3 guesses.

## Strategy
1. Start broad: "Is it a living thing?" "Is it man-made?" "Is it a physical object?"
2. Use binary search thinking: try to eliminate half the possibilities with each question
3. Don't guess until you're reasonably confident (or running low on questions)
4. Common categories: animal, plant, object, person, place, concept, food, vehicle

## Tools Available
You have these tools in your REPL environment:
- `ask_question(question: str)` - Ask a yes/no question to the moderator
- `guess(answer: str)` - Make a direct guess at the secret
- `final(answer: str)` - Submit your final answer (ONLY after a correct guess)

## Important
- Think step by step before each action
- Track what you've learned from previous answers in your reasoning
- Only call `final()` AFTER `guess()` returns that you are correct
- If you run out of questions, you can still use your remaining guesses

## Output Format
Write Python code in ```repl``` blocks to use your tools. For example:
```repl
result = ask_question("Is it a living thing?")
print(result)
```

Then reason about the result and continue with more questions or a guess.
"""

MODERATOR_SYSTEM_PROMPT = """\
You are the MODERATOR in 20 Questions.

**THE SECRET IS: "{secret}"**
**CATEGORY: {category}**

## Your Role
- Answer questions TRUTHFULLY based on the secret
- Evaluate guesses FAIRLY using the rubric below
- Reject questions that cannot be answered yes/no

## Rules for Answering Questions
- You MUST answer with exactly one of: "yes", "no", "true", or "false"
- Answer based on common knowledge and the literal meaning of the question
- If a question genuinely cannot be answered with yes/no, use `cannot_answer(reason)`
- Be consistent - don't contradict your previous answers
- Answer honestly even if it helps the contestant

## Tools Available
You have these tools in your REPL environment:
- `answer(response: str)` - Answer with "yes", "no", "true", or "false"
- `cannot_answer(reason: str)` - Reject unanswerable questions with explanation

## Output Format
Write Python code in ```repl``` blocks. For example:
```repl
answer("yes")
```

Think about the question, then provide your answer.
"""

MODERATOR_EVALUATION_PROMPT = """\
You are the MODERATOR in 20 Questions.

**THE SECRET IS: "{secret}"**
**CATEGORY: {category}**

The contestant has made a GUESS. You must evaluate if it's correct.

**CONTESTANT'S GUESS: "{guess}"**

## Evaluation Rubric
Think step by step:
1. What is the secret exactly? → {secret}
2. What did they guess? → {guess}
3. Do they refer to the same thing?

Apply these rules:
- **Exact match** → CORRECT
- **Synonym or common alternative name** → CORRECT (e.g., "car" = "automobile")
- **Same concept, different phrasing** → CORRECT (e.g., "the Sun" = "Sol" = "our star")
- **More specific but correct** → CORRECT (e.g., secret="dog", guess="golden retriever" if context supports it)
- **Related but different thing** → INCORRECT (e.g., "dog" ≠ "wolf")
- **Completely different** → INCORRECT

Be fair. If they clearly identified the secret even with slightly different words, it's correct.

## Tools Available
- `evaluate(correct: bool)` - Call with `True` if correct, `False` if incorrect

## Output Format
First reason through the evaluation, then call the tool:
```repl
evaluate(True)  # or evaluate(False)
```
"""

MODERATOR_FINAL_PROMPT = """\
You are the MODERATOR in 20 Questions.

**THE SECRET WAS: "{secret}"**

The game is over. {outcome}

Announce the result using the `final()` tool. Include:
- Who won (contestant or moderator)
- What the secret was
- Brief summary of how the game went

## Tool
- `final(result: str)` - Announce the game result

Example:
```repl
final("The contestant wins! They correctly guessed '{secret}' after {questions_used} questions and {guesses_used} guess(es). Well played!")
```
"""

CONTESTANT_FINAL_PROMPT = """\
The game is over!

{outcome}

Use the `final()` tool to submit your final statement.

## Tool
- `final(answer: str)` - Submit your final answer/statement

If you won, state the answer. If you lost, acknowledge the secret.
"""


def build_contestant_turn_prompt(
    questions_left: int,
    guesses_left: int,
    history_summary: str,
) -> str:
    """Build the prompt for the contestant's turn."""
    return f"""\
## Current Game State
- Questions remaining: {questions_left}
- Guesses remaining: {guesses_left}

## Game History
{history_summary if history_summary else "No actions taken yet. Start by asking a broad yes/no question!"}

## Your Turn
Analyze what you know so far, then either:
1. Ask another yes/no question with `ask_question(question)`
2. Make a guess with `guess(answer)` if you're confident

Think step by step, then write your code in a ```repl``` block.
"""


def build_moderator_answer_prompt(
    secret: str,
    category: str,
    question: str,
    questions_left: int,
    guesses_left: int,
) -> str:
    """Build the prompt for the moderator to answer a question."""
    return f"""\
## Current Game State
- Questions remaining after this: {questions_left}
- Contestant's guesses remaining: {guesses_left}

## Question from Contestant
"{question}"

## Your Task
The secret is "{secret}" (category: {category}).

Can this question be answered with yes/no based on the secret?
- If YES: Use `answer("yes")` or `answer("no")` (or "true"/"false")
- If NO: Use `cannot_answer(reason)` explaining why

Think about whether "{secret}" fits the question, then respond.
"""


def build_history_summary(history: list) -> str:
    """Build a summary of game history for the contestant."""
    if not history:
        return ""

    lines = []
    for event in history:
        if event.event_type == "question":
            lines.append(f"Q: {event.content}")
        elif event.event_type == "answer":
            lines.append(f"A: {event.content}")
        elif event.event_type == "cannot_answer":
            lines.append(f"A: [Cannot answer: {event.content}]")
        elif event.event_type == "guess":
            lines.append(f"GUESS: {event.content}")
        elif event.event_type == "evaluation":
            lines.append(f"RESULT: {event.content}")

    return "\n".join(lines)
