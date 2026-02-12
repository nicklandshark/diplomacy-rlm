"""CLI entry point for running Diplomacy-RLM games."""

from __future__ import annotations

import argparse
import importlib
import json
import logging
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
from collections.abc import Sequence
from typing import Any

from .data_model import (
    ALL_POWERS,
    GameConfig,
    SUPPORTED_BACKENDS,
    SUPPORTED_ENVIRONMENTS,
    normalize_power_name,
    normalize_powers,
)
from .observability import (
    ConsoleEventLogger,
    NoopEmitter,
)
from .orchestrator import Orchestrator


def _parse_powers_arg(raw: str | None) -> list[str]:
    if raw is None:
        return list(ALL_POWERS)
    tokens = [token.strip() for token in raw.split(",")]
    return normalize_powers(tokens)


def _parse_power_model_overrides(entries: Sequence[str], selected_powers: list[str]) -> dict[str, str]:
    overrides: dict[str, str] = {}
    selected = set(selected_powers)
    for entry in entries:
        if "=" not in entry:
            raise ValueError(
                f"Invalid --power-model value: {entry!r}. Expected POWER=MODEL."
            )
        raw_power, raw_model = entry.split("=", 1)
        power = normalize_power_name(raw_power)
        model = raw_model.strip()
        if not power:
            raise ValueError(f"Invalid --power-model value: {entry!r}. Missing power name.")
        if not model:
            raise ValueError(f"Invalid --power-model value: {entry!r}. Missing model name.")
        if power in overrides:
            raise ValueError(f"Duplicate --power-model entry for {power}.")
        if power not in selected:
            raise ValueError(
                f"--power-model references {power}, but it is not in --powers."
            )
        overrides[power] = model
    return overrides


def _parse_power_backend_overrides(
    entries: Sequence[str],
    selected_powers: list[str],
) -> dict[str, str]:
    overrides: dict[str, str] = {}
    selected = set(selected_powers)
    for entry in entries:
        if "=" not in entry:
            raise ValueError(
                f"Invalid --power-backend value: {entry!r}. Expected POWER=BACKEND."
            )
        raw_power, raw_backend = entry.split("=", 1)
        power = normalize_power_name(raw_power)
        backend = raw_backend.strip()
        if not power:
            raise ValueError(f"Invalid --power-backend value: {entry!r}. Missing power name.")
        if not backend:
            raise ValueError(f"Invalid --power-backend value: {entry!r}. Missing backend.")
        if backend not in SUPPORTED_BACKENDS:
            raise ValueError(
                f"Invalid --power-backend backend {backend!r}. "
                f"Supported: {', '.join(SUPPORTED_BACKENDS)}"
            )
        if power in overrides:
            raise ValueError(f"Duplicate --power-backend entry for {power}.")
        if power not in selected:
            raise ValueError(
                f"--power-backend references {power}, but it is not in --powers."
            )
        overrides[power] = backend
    return overrides


def _coerce_value(raw_value: str) -> Any:
    candidate = raw_value.strip()
    if candidate == "":
        return ""
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return candidate


def _parse_kv_pairs(entries: Sequence[str], flag_name: str) -> dict[str, Any]:
    values: dict[str, Any] = {}
    for entry in entries:
        if "=" not in entry:
            raise ValueError(f"Invalid {flag_name} value: {entry!r}. Expected KEY=VALUE.")
        raw_key, raw_value = entry.split("=", 1)
        key = raw_key.strip()
        if not key:
            raise ValueError(f"Invalid {flag_name} value: {entry!r}. Missing key.")
        if key in values:
            raise ValueError(f"Duplicate {flag_name} key: {key}.")
        values[key] = _coerce_value(raw_value)
    return values


def _parse_backend_scoped_kv_pairs(
    entries: Sequence[str],
    flag_name: str,
) -> dict[str, dict[str, Any]]:
    values: dict[str, dict[str, Any]] = {}
    for entry in entries:
        if "=" not in entry:
            raise ValueError(f"Invalid {flag_name} value: {entry!r}. Expected BACKEND.KEY=VALUE.")
        raw_key, raw_value = entry.split("=", 1)
        key_part = raw_key.strip()
        if "." not in key_part:
            raise ValueError(
                f"Invalid {flag_name} value: {entry!r}. Expected BACKEND.KEY=VALUE."
            )
        raw_backend, raw_inner_key = key_part.split(".", 1)
        backend = raw_backend.strip().lower()
        inner_key = raw_inner_key.strip()
        if backend not in SUPPORTED_BACKENDS:
            raise ValueError(
                f"Invalid {flag_name} backend {backend!r}. Supported: {', '.join(SUPPORTED_BACKENDS)}"
            )
        if not inner_key:
            raise ValueError(f"Invalid {flag_name} value: {entry!r}. Missing key.")
        values.setdefault(backend, {})
        if inner_key in values[backend]:
            raise ValueError(f"Duplicate {flag_name} key for {backend}: {inner_key}.")
        values[backend][inner_key] = _coerce_value(raw_value)
    return values


def _parse_power_scoped_kv_pairs(
    entries: Sequence[str],
    selected_powers: list[str],
    flag_name: str,
) -> dict[str, dict[str, Any]]:
    values: dict[str, dict[str, Any]] = {}
    selected = set(selected_powers)
    for entry in entries:
        if "=" not in entry:
            raise ValueError(f"Invalid {flag_name} value: {entry!r}. Expected POWER.KEY=VALUE.")
        raw_key, raw_value = entry.split("=", 1)
        key_part = raw_key.strip()
        if "." not in key_part:
            raise ValueError(
                f"Invalid {flag_name} value: {entry!r}. Expected POWER.KEY=VALUE."
            )
        raw_power, raw_inner_key = key_part.split(".", 1)
        power = normalize_power_name(raw_power)
        inner_key = raw_inner_key.strip()
        if power not in selected:
            raise ValueError(
                f"{flag_name} references {power}, but it is not in --powers."
            )
        if not inner_key:
            raise ValueError(f"Invalid {flag_name} value: {entry!r}. Missing key.")
        values.setdefault(power, {})
        if inner_key in values[power]:
            raise ValueError(f"Duplicate {flag_name} key for {power}: {inner_key}.")
        values[power][inner_key] = _coerce_value(raw_value)
    return values


def _apply_anthropic_defaults(kwargs: dict[str, Any]) -> None:
    if "api_key" not in kwargs:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if api_key:
            kwargs["api_key"] = api_key
    if "model_name" not in kwargs:
        kwargs["model_name"] = "claude-opus-4-6"


def _find_open_port(start: int = 3100) -> int:
    """Find an open port starting from start."""
    for port in range(start, start + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("Could not find an open port")


def _ensure_modal_installed() -> None:
    importlib.import_module("modal")


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Run the Diplomacy-RLM orchestrator")
    parser.add_argument("--game-dir", default="./game_output")
    parser.add_argument("--max-year", type=int, default=1910)
    parser.add_argument(
        "--powers",
        help=(
            "Comma-separated powers to control (e.g. FRANCE,GERMANY,ITALY). "
            "Must contain at least two powers."
        ),
    )
    parser.add_argument(
        "--backend",
        choices=SUPPORTED_BACKENDS,
        default="anthropic",
        help="Root backend for strategist/conversation agents.",
    )
    parser.add_argument(
        "--model",
        help="Root model name (applies to all selected powers unless overridden).",
    )
    parser.add_argument(
        "--backend-arg",
        action="append",
        default=[],
        help="Additional backend kwargs as KEY=VALUE. Repeatable; VALUE accepts JSON literals.",
    )
    parser.add_argument(
        "--backend-arg-for",
        action="append",
        default=[],
        help=(
            "Backend-specific kwargs as BACKEND.KEY=VALUE. "
            "Repeatable; VALUE accepts JSON literals."
        ),
    )
    parser.add_argument(
        "--sub-backend",
        choices=SUPPORTED_BACKENDS,
        help="Optional secondary backend used by llm_query() inside the sandbox.",
    )
    parser.add_argument(
        "--sub-model",
        help="Optional model name for --sub-backend.",
    )
    parser.add_argument(
        "--sub-backend-arg",
        action="append",
        default=[],
        help="Additional sub-backend kwargs as KEY=VALUE. Repeatable; VALUE accepts JSON literals.",
    )
    parser.add_argument(
        "--power-model",
        action="append",
        default=[],
        help="Per-power model override in POWER=MODEL format. Repeatable.",
    )
    parser.add_argument(
        "--power-backend",
        action="append",
        default=[],
        help="Per-power backend override in POWER=BACKEND format. Repeatable.",
    )
    parser.add_argument(
        "--power-backend-arg",
        action="append",
        default=[],
        help=(
            "Per-power backend kwargs in POWER.KEY=VALUE format. "
            "Repeatable; VALUE accepts JSON literals."
        ),
    )
    parser.add_argument(
        "--sandbox",
        choices=SUPPORTED_ENVIRONMENTS,
        default="local",
        help="RLM environment sandbox to execute REPL code in.",
    )
    parser.add_argument(
        "--sandbox-arg",
        action="append",
        default=[],
        help="Additional sandbox kwargs as KEY=VALUE. Repeatable; VALUE accepts JSON literals.",
    )
    parser.add_argument(
        "--modal-app-name",
        default="rlm-sandbox",
        help="Modal app name (used when --sandbox modal).",
    )
    parser.add_argument(
        "--modal-timeout",
        type=int,
        default=600,
        help="Modal sandbox timeout in seconds (used when --sandbox modal).",
    )
    parser.add_argument(
        "--log-events",
        action="store_true",
        help="Print structured orchestration events directly to the console.",
    )
    parser.add_argument(
        "--log-prompts",
        action="store_true",
        help="Include full prompt text in emitted console events.",
    )
    parser.add_argument(
        "--log-repl",
        action="store_true",
        help="Include full REPL/completion response text in emitted console events.",
    )
    parser.add_argument(
        "--log-messages",
        action="store_true",
        help="Include raw diplomatic message content in emitted console events.",
    )
    parser.add_argument(
        "--log-memory-diff",
        action="store_true",
        help="Include memory unified diffs in emitted console events.",
    )
    parser.add_argument(
        "--serve-web",
        action="store_true",
        help="Start a web viewer for the game.",
    )
    parser.add_argument(
        "--serve-api",
        action="store_true",
        help="Start the SSE API sidecar only (no web viewer). Writes port to game_dir/.api_port.",
    )
    parser.add_argument(
        "--web-port",
        type=int,
        default=0,
        help="Port for the web viewer (0 = auto-find).",
    )
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.WARNING)
    if args.verbose:
        logging.getLogger("rlm_diplomacy").setLevel(logging.INFO)

    try:
        powers = _parse_powers_arg(args.powers)
        power_model_overrides = _parse_power_model_overrides(args.power_model, powers)
        power_backend_overrides = _parse_power_backend_overrides(args.power_backend, powers)
        backend_kwargs_by_backend = _parse_backend_scoped_kv_pairs(
            args.backend_arg_for,
            "--backend-arg-for",
        )
        power_backend_kwargs_overrides = _parse_power_scoped_kv_pairs(
            args.power_backend_arg,
            powers,
            "--power-backend-arg",
        )

        backend_kwargs = _parse_kv_pairs(args.backend_arg, "--backend-arg")
        if args.model:
            backend_kwargs["model_name"] = args.model
        used_backends = {args.backend, *power_backend_overrides.values()}
        if "anthropic" in used_backends:
            if args.backend == "anthropic":
                _apply_anthropic_defaults(backend_kwargs)
            else:
                anthropic_kwargs = backend_kwargs_by_backend.setdefault("anthropic", {})
                _apply_anthropic_defaults(anthropic_kwargs)

        if (args.sub_model or args.sub_backend_arg) and not args.sub_backend:
            raise ValueError("--sub-model/--sub-backend-arg require --sub-backend.")
        sub_backend_kwargs: dict[str, Any] | None = None
        if args.sub_backend:
            sub_backend_kwargs = _parse_kv_pairs(args.sub_backend_arg, "--sub-backend-arg")
            if args.sub_model:
                sub_backend_kwargs["model_name"] = args.sub_model
            if args.sub_backend == "anthropic" and "api_key" not in sub_backend_kwargs:
                api_key = os.environ.get("ANTHROPIC_API_KEY")
                if api_key:
                    sub_backend_kwargs["api_key"] = api_key

        if args.sandbox == "modal":
            _ensure_modal_installed()

        environment_kwargs = _parse_kv_pairs(args.sandbox_arg, "--sandbox-arg")
        if args.sandbox == "modal":
            environment_kwargs.setdefault("app_name", args.modal_app_name)
            environment_kwargs.setdefault("timeout", args.modal_timeout)

        if (
            args.log_prompts
            or args.log_repl
            or args.log_messages
            or args.log_memory_diff
        ) and not args.log_events:
            raise ValueError(
                "--log-prompts/--log-repl/--log-messages/--log-memory-diff require --log-events."
            )

        observe_prompts = bool(args.log_events and args.log_prompts)
        observe_repl = bool(args.log_events and args.log_repl)
        observe_messages = bool(args.log_events and args.log_messages)
        observe_memory_diffs = bool(args.log_events and args.log_memory_diff)
        config = GameConfig(
            backend=args.backend,
            backend_kwargs=backend_kwargs,
            sub_backend=args.sub_backend,
            sub_backend_kwargs=sub_backend_kwargs,
            power_model_overrides=power_model_overrides,
            power_backend_overrides=power_backend_overrides,
            backend_kwargs_by_backend=backend_kwargs_by_backend,
            power_backend_kwargs_overrides=power_backend_kwargs_overrides,
            game_dir=args.game_dir,
            max_year=args.max_year,
            verbose=args.verbose,
            powers=powers,
            environment=args.sandbox,
            environment_kwargs=environment_kwargs,
            observe_prompts=observe_prompts,
            observe_repl=observe_repl,
            observe_messages=observe_messages,
            observe_memory_diffs=observe_memory_diffs,
        )
        missing_model_powers = [
            power
            for power in config.powers
            if not str(config.backend_kwargs_for(power).get("model_name", "")).strip()
        ]
        if missing_model_powers:
            raise ValueError(
                "No model specified for powers: "
                f"{', '.join(missing_model_powers)}. Provide --model, --backend-arg "
                "model_name=..., --backend-arg-for BACKEND.model_name=..., or --power-model "
                "for each missing power."
            )

        # Early API key check — fail now instead of mid-game.
        _BACKEND_ENV_KEYS: dict[str, str] = {
            "anthropic": "ANTHROPIC_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
            "openai": "OPENAI_API_KEY",
            "gemini": "GEMINI_API_KEY",
            "azure_openai": "AZURE_OPENAI_API_KEY",
        }
        for backend_name in used_backends:
            env_var = _BACKEND_ENV_KEYS.get(backend_name)
            if not env_var:
                continue
            # Check if the key was provided via --backend-arg or env var
            bk = config.backend_kwargs_for(config.powers[0])
            if "api_key" not in bk and not os.environ.get(env_var):
                raise ValueError(
                    f"No API key found for backend '{backend_name}'. "
                    f"Set the {env_var} environment variable:\n\n"
                    f'  export {env_var}="your-key-here"\n\n'
                    f"Or pass it via --backend-arg api_key=..."
                )
    except (ImportError, ValueError) as exc:
        parser.error(str(exc))

    web_process = None
    start_sse = args.serve_web or args.serve_api
    if start_sse:
        from .observability import BufferedEventBus, TeeEmitter
        from .observability.api import app as api_app
        from .observability.api import configure as configure_api

        # Set up event bus for SSE
        sse_bus = BufferedEventBus()

        # Create tee emitter: sends to both console logger (if enabled) and SSE bus
        if args.log_events:
            emitter = TeeEmitter(ConsoleEventLogger(), sse_bus)
        else:
            emitter = TeeEmitter(sse_bus)

        # Find ports
        api_port = _find_open_port(3100)

        # Configure and start the FastAPI SSE server
        game_id = os.path.basename(os.path.abspath(args.game_dir))
        configure_api(sse_bus, game_id=game_id, game_dir=os.path.abspath(args.game_dir))

        import uvicorn

        def _run_api() -> None:
            uvicorn.run(api_app, host="127.0.0.1", port=api_port, log_level="warning")

        api_thread = threading.Thread(target=_run_api, daemon=True)
        api_thread.start()

        # Write API port, PID, and game metadata to game directory
        game_dir_abs = os.path.abspath(args.game_dir)
        os.makedirs(game_dir_abs, exist_ok=True)
        port_file = os.path.join(game_dir_abs, ".api_port")
        with open(port_file, "w") as f:
            f.write(str(api_port))
        pid_file = os.path.join(game_dir_abs, ".pid")
        with open(pid_file, "w") as f:
            f.write(str(os.getpid()))
        # Write backend/model metadata so the web viewer can use the same provider
        # and downstream rating systems can resolve per-power agent identities.
        power_meta = {}
        for power in config.powers:
            backend = config.backend_for(power)
            kwargs = config.backend_kwargs_for(power)
            power_meta[power] = {
                "backend": backend,
                "model": str(kwargs.get("model_name", "")),
            }
        root_model = str(
            config.backend_kwargs.get("model_name", "")
            or (config.backend_kwargs_for(config.powers[0]).get("model_name", "") if config.powers else "")
        )
        meta_file = os.path.join(game_dir_abs, ".game_meta.json")
        with open(meta_file, "w") as f:
            json.dump({
                "backend": config.backend,
                "model": root_model,
                "powers": power_meta,
            }, f)

        if args.serve_web:
            # Also start NextJS dev server
            web_port = args.web_port if args.web_port else _find_open_port(api_port + 1)
            web_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "web"
            )
            if not os.path.isdir(web_dir):
                web_dir = os.path.join(os.getcwd(), "web")

            if os.path.isdir(web_dir):
                web_env = {
                    **os.environ,
                    "GAMES_DIR": os.path.dirname(game_dir_abs),
                    "LIVE_API_URL": f"http://127.0.0.1:{api_port}",
                    "PORT": str(web_port),
                }
                # Detect JS runner: bun (preferred) → npx
                if shutil.which("bun"):
                    web_cmd = ["bun", "run", "dev", "--port", str(web_port)]
                elif shutil.which("npx"):
                    web_cmd = ["npx", "next", "dev", "--port", str(web_port)]
                else:
                    print(
                        "\nError: neither bun nor npm/npx found. "
                        "Install one of:\n"
                        "  bun  → https://bun.sh/\n"
                        "  npm  → https://nodejs.org/\n"
                    )
                    print(f"SSE API available at: http://127.0.0.1:{api_port}\n")
                    web_cmd = None

                if web_cmd:
                    web_process = subprocess.Popen(
                        web_cmd,
                        cwd=web_dir,
                        env=web_env,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
                    print(f"\nGame viewer: http://localhost:{web_port}/game/{game_id}\n")
            else:
                print(f"\nWarning: web/ directory not found, skipping web viewer.\n")
                print(f"SSE API available at: http://127.0.0.1:{api_port}\n")
        else:
            print(f"SSE API on port {api_port} (written to {port_file})")
    else:
        emitter = ConsoleEventLogger() if args.log_events else NoopEmitter()

    orchestrator = Orchestrator(config, event_emitter=emitter)
    try:
        orchestrator.run()
    finally:
        emitter.close()
        if start_sse:
            # Grace period: the SSE generator checks _bus._closed every 0.5s,
            # then sends an "event: close" message.  Give the daemon uvicorn
            # thread enough time to flush that final message to connected
            # clients before the process exits and kills all daemon threads.
            time.sleep(2)

            # Clean up port and PID files so stale markers don't confuse the
            # web viewer after the game process exits.
            game_dir_abs = os.path.abspath(args.game_dir)
            for marker in (".pid", ".api_port"):
                try:
                    os.unlink(os.path.join(game_dir_abs, marker))
                except OSError:
                    pass
        if web_process is not None:
            web_process.terminate()
            web_process.wait(timeout=5)


if __name__ == "__main__":
    main()
