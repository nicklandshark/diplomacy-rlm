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
    <div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() => handlePresetClick(preset)}
            disabled={launching}
            className={`
              group relative min-h-[128px] text-left border px-5 py-4 transition-all duration-150
              ${
                selectedPreset === preset.key
                  ? "border-[#dda52a] bg-[linear-gradient(160deg,#121923_0%,#0e141d_100%)] shadow-[0_0_0_1px_rgba(221,165,42,0.3)]"
                  : "border-[#2f394a] bg-[linear-gradient(160deg,#0f141d_0%,#0b1017_100%)] hover:border-[#46526a]"
              }
              ${launching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <span className="absolute left-2 top-2 h-2 w-2 rounded-full border border-[#3d495d] bg-[#161d28]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-[#3d495d] bg-[#161d28]" />
            <span className="absolute left-2 bottom-2 h-2 w-2 rounded-full border border-[#3d495d] bg-[#161d28]" />
            <span className="absolute right-2 bottom-2 h-2 w-2 rounded-full border border-[#3d495d] bg-[#161d28]" />
            <div className="text-[31px] leading-none font-medium uppercase tracking-[0.03em] text-[#d7d2be] [font-family:'MD_System_Condensed_Trial',monospace]">
              {preset.label}
            </div>
            <div className="mt-2 text-[12px] leading-5 text-[#808b9f]">
              {preset.description}
            </div>
            <div className="mt-1 text-[12px] leading-5 text-[#667287]">
              {preset.key === "2player" && "Rapid bilateral setup"}
              {preset.key === "7player" && "Standard map, full board"}
              {preset.key === "custom" && "User defined parameters"}
            </div>
            <div className="absolute bottom-3 right-4 text-[18px] leading-none text-[#39465f] transition-colors group-hover:text-[#5c6e8e]">
              {preset.key === "2player" && "A"}
              {preset.key === "7player" && "O"}
              {preset.key === "custom" && "H"}
            </div>
            {selectedPreset === preset.key && preset.key !== "custom" ? (
              <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#ffbf55]">
                Press again to execute
              </div>
            ) : null}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="mt-4 border border-[#2d3746] bg-[linear-gradient(145deg,#101722_0%,#0c1118_100%)] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-[#263142] pb-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#c2c9d6]">
              Manual Configuration
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#71809a]">
              Runtime Parameters
            </p>
          </div>

          <div>
            <label className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-[#a7b1c0]">
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
                      flex items-center gap-1.5 border px-2.5 py-1.5 text-sm font-medium transition-all duration-100
                      ${launching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    style={
                      selected
                        ? {
                            backgroundColor: color + "12",
                            borderColor: color + "88",
                            color: color,
                          }
                        : {
                            backgroundColor: "transparent",
                            borderColor: "#344052",
                            color: "#748096",
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
              <p className="mt-1.5 text-xs text-amber-400">
                Select at least 2 powers
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-[#a7b1c0]">
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
                className="w-full border border-[#344052] bg-[#111925] px-3 py-2 text-sm text-[#d5dbe7]
                           focus:outline-none focus:ring-1 focus:ring-[#53688c] focus:border-[#53688c]
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
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-[#a7b1c0]">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={launching}
                className="w-full border border-[#344052] bg-[#111925] px-3 py-2 text-sm text-[#d5dbe7]
                           focus:outline-none focus:ring-1 focus:ring-[#53688c] focus:border-[#53688c]
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
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-[#a7b1c0]">
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
                className="w-full border border-[#344052] bg-[#111925] px-3 py-2 text-sm text-[#d5dbe7]
                           focus:outline-none focus:ring-1 focus:ring-[#53688c] focus:border-[#53688c]
                           disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <div className="border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleLaunch}
              disabled={!canLaunch}
              className={`
                border px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition-all duration-150
                ${
                  canLaunch
                    ? "border-[#d89e24] bg-[#2a2010] text-[#f0ca75] hover:bg-[#3b2c16] cursor-pointer"
                    : "border-[#3a465a] bg-[#1d2432] text-[#69788f] cursor-not-allowed"
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
                  Launching
                </span>
              ) : (
                "Launch Sequence"
              )}
            </button>

            {!launching && powers.size >= 2 && (
              <span className="text-xs text-[#7f8ba0]">
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
