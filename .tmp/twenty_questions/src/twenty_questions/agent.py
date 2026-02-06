"""RLM-style agents for the 20 Questions game using Anthropic API."""

import re
from typing import Any, Callable
from dataclasses import dataclass

import anthropic

from twenty_questions import display


@dataclass
class ToolCall:
    """Represents a tool call extracted from agent response."""
    name: str
    args: dict[str, Any]


@dataclass
class AgentResponse:
    """Response from an agent turn."""
    reasoning: str
    tool_call: ToolCall | None
    raw_response: str
    tokens_in: int = 0
    tokens_out: int = 0


class GameAgent:
    """
    An RLM-style agent that uses Claude to play 20 Questions.

    The agent writes Python code in ```repl``` blocks to call tools.
    Tools are phase-restricted - only available tools work in each phase.
    """

    def __init__(
        self,
        role: str,  # "contestant" or "moderator"
        model: str = "claude-sonnet-4-5-20250929",
        api_key: str | None = None,
        max_retries: int = 10,
    ):
        self.role = role
        self.model = model
        self.max_retries = max_retries
        self.client = anthropic.Anthropic(api_key=api_key)

        # Tools will be registered by the game orchestrator
        self._tools: dict[str, Callable] = {}
        self._allowed_tools: set[str] = set()

        # Conversation history for multi-turn
        self._messages: list[dict] = []
        self._system_prompt: str = ""

    def set_system_prompt(self, prompt: str) -> None:
        """Set the system prompt for this agent."""
        self._system_prompt = prompt

    def register_tool(self, name: str, func: Callable) -> None:
        """Register a tool function."""
        self._tools[name] = func

    def set_allowed_tools(self, tools: set[str]) -> None:
        """Set which tools are currently allowed."""
        self._allowed_tools = tools

    def clear_history(self) -> None:
        """Clear conversation history."""
        self._messages = []

    def take_turn(self, user_prompt: str, depth: int = 0) -> AgentResponse:
        """
        Execute one turn of the agent.

        Returns the agent's response including any tool call.
        Retries on malformed output up to max_retries times.
        """
        display.print_agent_turn(self.role, depth)

        # Add user message
        self._messages.append({"role": "user", "content": user_prompt})

        for attempt in range(1, self.max_retries + 1):
            try:
                response = self._call_llm(depth)

                # Extract tool call from response
                tool_call = self._extract_tool_call(response.raw_response)

                if tool_call:
                    # Validate tool is allowed
                    if tool_call.name not in self._allowed_tools:
                        error_msg = f"Tool '{tool_call.name}' is not available in the current phase. Allowed: {self._allowed_tools}"
                        display.print_error(error_msg, depth)
                        self._messages.append({
                            "role": "assistant",
                            "content": response.raw_response,
                        })
                        self._messages.append({
                            "role": "user",
                            "content": f"ERROR: {error_msg}\n\nPlease use one of the allowed tools: {self._allowed_tools}",
                        })
                        display.print_retry(attempt, self.max_retries)
                        continue

                    display.print_tool_call(self.role, tool_call.name, str(tool_call.args), depth)
                    response.tool_call = tool_call

                # Add assistant response to history
                self._messages.append({
                    "role": "assistant",
                    "content": response.raw_response,
                })

                return response

            except Exception as e:
                display.print_error(f"Attempt {attempt} failed: {e}", depth)
                if attempt < self.max_retries:
                    display.print_retry(attempt, self.max_retries)
                else:
                    # Final failure
                    return AgentResponse(
                        reasoning=f"Failed after {self.max_retries} attempts: {e}",
                        tool_call=None,
                        raw_response=str(e),
                    )

        # Should not reach here, but just in case
        return AgentResponse(
            reasoning="Max retries exceeded",
            tool_call=None,
            raw_response="ERROR: Max retries exceeded",
        )

    def _call_llm(self, depth: int) -> AgentResponse:
        """Make the actual LLM API call."""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=self._system_prompt,
            messages=self._messages,  # type: ignore[arg-type]
        )

        # Extract text from content blocks
        content_block = response.content[0]
        content = content_block.text if hasattr(content_block, "text") else str(content_block)
        tokens_in = response.usage.input_tokens
        tokens_out = response.usage.output_tokens

        display.print_llm_call(self.model, depth, tokens_in, tokens_out)

        # Show reasoning (first part before code block)
        reasoning = self._extract_reasoning(content)
        if reasoning:
            display.print_thinking(self.role, reasoning, depth)

        return AgentResponse(
            reasoning=reasoning,
            tool_call=None,
            raw_response=content,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
        )

    def _extract_reasoning(self, content: str) -> str:
        """Extract reasoning text before any code blocks."""
        # Find first code block
        match = re.search(r"```repl", content)
        if match:
            return content[:match.start()].strip()
        return content.strip()

    def _extract_tool_call(self, content: str) -> ToolCall | None:
        """
        Extract tool call from ```repl``` code block.

        Looks for patterns like:
        - ask_question("Is it alive?")
        - answer("yes")
        - guess("elephant")
        - evaluate(True)
        - cannot_answer("reason")
        - final("result")
        """
        # Find code blocks
        code_blocks = re.findall(r"```repl\s*(.*?)```", content, re.DOTALL)

        if not code_blocks:
            # Also try ```python blocks
            code_blocks = re.findall(r"```python\s*(.*?)```", content, re.DOTALL)

        if not code_blocks:
            return None

        # Parse the last code block for tool calls
        code = code_blocks[-1].strip()

        # Tool patterns
        patterns = [
            (r'ask_question\s*\(\s*["\'](.+?)["\']\s*\)', "ask_question", lambda m: {"question": m.group(1)}),
            (r'ask_question\s*\(\s*f?["\'](.+?)["\']\s*\)', "ask_question", lambda m: {"question": m.group(1)}),
            (r'guess\s*\(\s*["\'](.+?)["\']\s*\)', "guess", lambda m: {"answer": m.group(1)}),
            (r'answer\s*\(\s*["\'](.+?)["\']\s*\)', "answer", lambda m: {"response": m.group(1).lower()}),
            (r'cannot_answer\s*\(\s*["\'](.+?)["\']\s*\)', "cannot_answer", lambda m: {"reason": m.group(1)}),
            (r'evaluate\s*\(\s*(True|False|true|false)\s*\)', "evaluate", lambda m: {"correct": m.group(1).lower() == "true"}),
            (r'final\s*\(\s*["\'](.+?)["\']\s*\)', "final", lambda m: {"result": m.group(1)}),
            (r'final\s*\(\s*f?["\'](.+?)["\']\s*\)', "final", lambda m: {"result": m.group(1)}),
        ]

        for pattern, tool_name, args_extractor in patterns:
            match = re.search(pattern, code, re.DOTALL)
            if match:
                try:
                    args = args_extractor(match)
                    return ToolCall(name=tool_name, args=args)
                except Exception:
                    continue

        return None

    def add_tool_result(self, result: str) -> None:
        """Add a tool result to the conversation."""
        self._messages.append({
            "role": "user",
            "content": f"Tool result:\n{result}",
        })
