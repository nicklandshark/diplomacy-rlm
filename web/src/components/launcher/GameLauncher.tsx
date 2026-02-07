"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { POWER_DISPLAY_COLORS } from "@/lib/constants";

const ALL_POWERS = [
  "AUSTRIA", "ENGLAND", "FRANCE", "GERMANY", "ITALY", "RUSSIA", "TURKEY",
] as const;

const POWER_FLAGS: Record<string, string> = {
  AUSTRIA: "\u{1F1E6}\u{1F1F9}",
  ENGLAND: "\u{1F1EC}\u{1F1E7}",
  FRANCE: "\u{1F1EB}\u{1F1F7}",
  GERMANY: "\u{1F1E9}\u{1F1EA}",
  ITALY: "\u{1F1EE}\u{1F1F9}",
  RUSSIA: "\u{1F1F7}\u{1F1FA}",
  TURKEY: "\u{1F1F9}\u{1F1F7}",
};

const BACKENDS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "litellm", label: "LiteLLM" },
  { value: "azure_openai", label: "Azure OpenAI" },
  { value: "portkey", label: "Portkey" },
  { value: "vercel", label: "Vercel" },
  { value: "vllm", label: "vLLM" },
];

const MODELS_BY_BACKEND: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "o3-mini", label: "o3-mini" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  ],
  gemini: [
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
  openrouter: [
    { value: "anthropic/claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "openai/gpt-4o", label: "GPT-4o" },
    { value: "openai/gpt-4.1", label: "GPT-4.1" },
    { value: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
    { value: "deepseek/deepseek-r1", label: "DeepSeek R1" },
  ],
  azure_openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  litellm: [
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
  portkey: [
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "gpt-4o", label: "GPT-4o" },
  ],
  vercel: [
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "gpt-4o", label: "GPT-4o" },
  ],
  vllm: [
    { value: "meta-llama/Llama-4-Maverick-17B-128E", label: "Llama 4 Maverick" },
  ],
};

function defaultModelForBackend(backend: string): string {
  const models = MODELS_BY_BACKEND[backend];
  return models?.[0]?.value || "";
}

type PresetKey = "2player" | "7player" | "custom" | null;

interface Preset {
  key: PresetKey;
  label: string;
  description: string;
  powers: string[];
  model: string;
  backend: string;
  maxYear: number;
}

const PRESETS: Preset[] = [
  {
    key: "2player",
    label: "2-Player Quick",
    description: "France vs Germany, ends 1903",
    powers: ["FRANCE", "GERMANY"],
    model: "claude-opus-4-6",
    backend: "anthropic",
    maxYear: 1903,
  },
  {
    key: "7player",
    label: "7-Player Full",
    description: "All powers, ends 1910",
    powers: [...ALL_POWERS],
    model: "claude-opus-4-6",
    backend: "anthropic",
    maxYear: 1910,
  },
  {
    key: "custom",
    label: "Custom",
    description: "Configure your own game",
    powers: [],
    model: "claude-opus-4-6",
    backend: "anthropic",
    maxYear: 1905,
  },
];

export default function GameLauncher() {
  const router = useRouter();

  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(null);
  const [powers, setPowers] = useState<Set<string>>(new Set());
  const [model, setModel] = useState("claude-opus-4-6");
  const [backend, setBackend] = useState("anthropic");
  const [maxYear, setMaxYear] = useState(1905);
  const [showForm, setShowForm] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePower = useCallback((power: string) => {
    setPowers((prev) => {
      const next = new Set(prev);
      if (next.has(power)) {
        next.delete(power);
      } else {
        next.add(power);
      }
      return next;
    });
  }, []);

  const applyPreset = useCallback(
    (preset: Preset) => {
      setPowers(new Set(preset.powers));
      setModel(preset.model);
      setBackend(preset.backend);
      setMaxYear(preset.maxYear);
    },
    []
  );

  const handlePresetClick = useCallback(
    (preset: Preset) => {
      if (preset.key === "custom") {
        setSelectedPreset("custom");
        setShowForm(true);
        return;
      }

      if (selectedPreset === preset.key) {
        // Second click = launch immediately
        launchGame(preset.powers, preset.model, preset.backend, preset.maxYear);
      } else {
        setSelectedPreset(preset.key);
        applyPreset(preset);
        setShowForm(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPreset, applyPreset]
  );

  const launchGame = async (
    gamePowers: string[],
    gameModel: string,
    gameBackend: string,
    gameMaxYear: number
  ) => {
    if (gamePowers.length < 2) {
      setError("Select at least 2 powers");
      return;
    }

    setLaunching(true);
    setError(null);

    try {
      const res = await fetch("/api/games/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          powers: gamePowers,
          model: gameModel,
          backend: gameBackend,
          maxYear: gameMaxYear,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to launch game");
        setLaunching(false);
        return;
      }

      // Short delay to let the process start and create initial files
      setTimeout(() => {
        router.push(`/game/${data.gameId}`);
      }, 1500);
    } catch (err) {
      setError("Network error - failed to launch game");
      setLaunching(false);
    }
  };

  const handleLaunch = () => {
    launchGame(Array.from(powers), model, backend, maxYear);
  };

  const canLaunch = powers.size >= 2 && !launching;

  return (
    <div className="mb-10">
      {/* Presets Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() => handlePresetClick(preset)}
            disabled={launching}
            className={`
              relative text-left p-4 rounded-lg border transition-all duration-150
              ${
                selectedPreset === preset.key
                  ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                  : "border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800/80"
              }
              ${launching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <div className="font-semibold text-sm text-gray-100">
              {preset.label}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {preset.description}
            </div>
            {selectedPreset === preset.key && preset.key !== "custom" && (
              <div className="text-[10px] text-blue-400 mt-2 font-medium">
                Click again to launch instantly
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Expanded Form */}
      {showForm && (
        <div className="border border-gray-800 rounded-lg bg-gray-900/50 p-5 space-y-5">
          {/* Powers Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Powers
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_POWERS.map((power) => {
                const selected = powers.has(power);
                const color = POWER_DISPLAY_COLORS[power];
                return (
                  <button
                    key={power}
                    onClick={() => togglePower(power)}
                    disabled={launching}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                      border transition-all duration-100
                      ${launching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    style={
                      selected
                        ? {
                            backgroundColor: color + "20",
                            borderColor: color + "66",
                            color: color,
                          }
                        : {
                            backgroundColor: "transparent",
                            borderColor: "#374151",
                            color: "#6b7280",
                          }
                    }
                  >
                    <span className="text-base">{POWER_FLAGS[power]}</span>
                    <span>
                      {power.charAt(0) + power.slice(1).toLowerCase()}
                    </span>
                    {selected && (
                      <svg
                        className="w-3.5 h-3.5 ml-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            {powers.size > 0 && powers.size < 2 && (
              <p className="text-xs text-amber-400 mt-1.5">
                Select at least 2 powers
              </p>
            )}
          </div>

          {/* Backend, Model & Max Year Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Backend
              </label>
              <select
                value={backend}
                onChange={(e) => {
                  const b = e.target.value;
                  setBackend(b);
                  setModel(defaultModelForBackend(b));
                }}
                disabled={launching}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200
                           focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                           disabled:opacity-50"
              >
                {BACKENDS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={launching}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200
                           focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                           disabled:opacity-50"
              >
                {(MODELS_BY_BACKEND[backend] || []).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Max Year
              </label>
              <input
                type="number"
                value={maxYear}
                onChange={(e) =>
                  setMaxYear(
                    Math.min(1920, Math.max(1902, parseInt(e.target.value) || 1905))
                  )
                }
                min={1902}
                max={1920}
                disabled={launching}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200
                           focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                           disabled:opacity-50"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Launch Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLaunch}
              disabled={!canLaunch}
              className={`
                px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150
                ${
                  canLaunch
                    ? "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg shadow-blue-600/20"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              {launching ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Launching...
                </span>
              ) : (
                "Launch Game"
              )}
            </button>

            {!launching && powers.size >= 2 && (
              <span className="text-xs text-gray-500">
                {powers.size} power{powers.size !== 1 ? "s" : ""} selected
                &middot; {model || "no model"} via {BACKENDS.find((b) => b.value === backend)?.label}
                &middot; until {maxYear}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
