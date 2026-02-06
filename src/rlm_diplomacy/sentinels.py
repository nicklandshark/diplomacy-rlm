"""Sentinel parsing helpers for FINAL and SPAWN_CONVERSATION."""

from __future__ import annotations

import contextlib
import json
import logging
import re
from collections.abc import Callable, Iterator
from typing import Any

logger = logging.getLogger(__name__)

SPAWN_PREFIX = "__SPAWN__:"

FINAL_VAR_PATTERN = re.compile(r"^\s*FINAL_VAR\((.*?)\)", re.MULTILINE | re.DOTALL)
FINAL_PATTERN = re.compile(r"^\s*FINAL\((.*)\)\s*$", re.MULTILINE | re.DOTALL)
SPAWN_PATTERN = re.compile(r"^\s*SPAWN_CONVERSATION\((.*)\)\s*$", re.MULTILINE)


def find_spawn_conversation(text: str) -> dict[str, str] | None:
    """Return parsed SPAWN_CONVERSATION JSON dict if present and valid."""
    match = SPAWN_PATTERN.search(text)
    if not match:
        return None

    try:
        parsed = json.loads(match.group(1))
    except json.JSONDecodeError:
        logger.warning("Malformed SPAWN_CONVERSATION JSON; ignoring sentinel.")
        return None

    if not isinstance(parsed, dict):
        logger.warning("SPAWN_CONVERSATION payload must be a dict; ignoring sentinel.")
        return None

    normalized: dict[str, str] = {}
    for key, value in parsed.items():
        if not isinstance(key, str) or not isinstance(value, str):
            logger.warning("SPAWN_CONVERSATION payload must map strings to strings.")
            return None
        normalized[key.upper()] = value

    return normalized


def parse_spawn_completion(response: str) -> dict[str, str] | None:
    """Parse a completion response for the internal __SPAWN__: payload format."""
    if not response.startswith(SPAWN_PREFIX):
        return None

    payload = response[len(SPAWN_PREFIX) :]
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        logger.warning("Invalid __SPAWN__ payload; treating as no-conversation.")
        return None

    if not isinstance(parsed, dict):
        return None
    return {str(k).upper(): str(v) for k, v in parsed.items()}


def patch_find_final_answer(
    patch_target: Any,
    spawn_finder: Callable[[str], dict[str, str] | None] = find_spawn_conversation,
) -> Callable[[str, Any], str | None]:
    """Create a patched ``find_final_answer`` callable with spawn support."""

    def custom_find_final_answer(text: str, environment: Any | None = None) -> str | None:
        spawn = spawn_finder(text)
        if spawn is not None:
            return f"{SPAWN_PREFIX}{json.dumps(spawn)}"
        return patch_target(text, environment=environment)

    return custom_find_final_answer


@contextlib.contextmanager
def patched_rlm_parser() -> Iterator[None]:
    """Temporarily patch ``rlm.utils.parsing.find_final_answer`` if available."""
    try:
        from rlm.utils import parsing as rlm_parsing  # type: ignore
    except Exception:
        yield
        return

    original = rlm_parsing.find_final_answer
    rlm_parsing.find_final_answer = patch_find_final_answer(original)
    try:
        yield
    finally:
        rlm_parsing.find_final_answer = original
