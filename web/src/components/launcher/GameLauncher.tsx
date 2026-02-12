"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { POWER_DISPLAY_COLORS } from "@/lib/constants";
import { Rivet } from "@/app/military-ui-kit/components";
import FlapSelect, { FlapCell } from "@/components/ui/FlapSelect";

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

/** NATO-style three-letter designators for the tactical look */
const POWER_SIGILS: Record<string, string> = {
  AUSTRIA: "AUS",
  ENGLAND: "ENG",
  FRANCE: "FRA",
  GERMANY: "GER",
  ITALY: "ITA",
  RUSSIA: "RUS",
  TURKEY: "TUR",
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
            className="group relative min-h-[128px] text-left border-2 px-5 py-4 transition-all duration-150 overflow-hidden"
            style={{
              borderColor: selectedPreset === preset.key ? "#ff9500" : "#3a3a3a",
              background: selectedPreset === preset.key
                ? "linear-gradient(145deg, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)"
                : "linear-gradient(145deg, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)",
              boxShadow: selectedPreset === preset.key
                ? "inset 0 2px 4px rgba(0,0,0,0.6), 0 0 12px rgba(255,149,0,0.2)"
                : "inset 0 2px 4px rgba(0,0,0,0.6)",
              cursor: launching ? "not-allowed" : "pointer",
              opacity: launching ? 0.5 : 1,
            }}
          >
            {/* Card rivets */}
            <Rivet size={5} style={{ left: "6px", top: "6px", opacity: 0.45 }} />
            <Rivet size={5} style={{ right: "6px", top: "6px", opacity: 0.45 }} />
            <Rivet size={5} style={{ left: "6px", bottom: "6px", opacity: 0.45 }} />
            <Rivet size={5} style={{ right: "6px", bottom: "6px", opacity: 0.45 }} />

            <div
              className="text-[31px] leading-none font-medium uppercase tracking-[0.03em] font-ui-panel"
              style={{
                color: selectedPreset === preset.key ? "#ff9500" : "#e0e0e0",
                textShadow: selectedPreset === preset.key ? "0 0 8px rgba(255,149,0,0.3)" : undefined,
              }}
            >
              {preset.label}
            </div>
            <div className="mt-2 text-[12px] leading-5 text-[#808080]">
              {preset.description}
            </div>
            <div className="mt-1 text-[12px] leading-5 text-[#5a5a5a]">
              {preset.key === "2player" && "Rapid bilateral setup"}
              {preset.key === "7player" && "Standard map, full board"}
              {preset.key === "custom" && "User defined parameters"}
            </div>
            <div
              className="absolute bottom-3 right-4 text-[18px] leading-none transition-colors"
              style={{ color: selectedPreset === preset.key ? "#ff9500" : "#3a3a3a" }}
            >
              {preset.key === "2player" && "A"}
              {preset.key === "7player" && "O"}
              {preset.key === "custom" && "H"}
            </div>
            {selectedPreset === preset.key && preset.key !== "custom" ? (
              <div
                className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#ff9500]"
                style={{ textShadow: "0 0 6px rgba(255,149,0,0.3)" }}
              >
                Press again to execute
              </div>
            ) : null}
          </button>
        ))}
      </div>

      {showForm && (
        <div
          className="mt-4 border-2 p-5 sm:p-6 relative"
          style={{
            borderColor: "#3a3a3a",
            background: "linear-gradient(145deg, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6)",
          }}
        >
          <Rivet size={5} style={{ left: "8px", top: "8px", opacity: 0.45 }} />
          <Rivet size={5} style={{ right: "8px", top: "8px", opacity: 0.45 }} />
          <Rivet size={5} style={{ left: "8px", bottom: "8px", opacity: 0.45 }} />
          <Rivet size={5} style={{ right: "8px", bottom: "8px", opacity: 0.45 }} />

          <div className="mb-4 flex items-center justify-between border-b border-[#3a3a3a] pb-2">
            <p
              className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#ff9500]"
              style={{ textShadow: "0 0 6px rgba(255,149,0,0.2)" }}
            >
              Manual Configuration
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#808080]">
              Runtime Parameters
            </p>
          </div>

          <div>
            <label className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-[#808080] font-bold">
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
                    className="group relative flex items-center gap-0 transition-all duration-100"
                    style={{
                      cursor: launching ? "not-allowed" : "pointer",
                      opacity: launching ? 0.5 : 1,
                    }}
                  >
                    {/* Flag + designator block */}
                    <div
                      className="flex items-center justify-center gap-1"
                      style={{
                        width: 52,
                        height: 32,
                        background: selected
                          ? `linear-gradient(180deg, ${color}30 0%, ${color}15 100%)`
                          : "linear-gradient(180deg, #1a1a1a 0%, #111111 48%, #0c0c0c 52%, #141414 100%)",
                        borderTop: `1px solid ${selected ? color + "55" : "#222"}`,
                        borderBottom: `1px solid ${selected ? color + "55" : "#222"}`,
                        borderLeft: `1px solid ${selected ? color + "55" : "#222"}`,
                        borderRight: "none",
                        borderRadius: "2px 0 0 2px",
                        boxShadow: selected
                          ? `inset 0 1px 2px rgba(0,0,0,0.5), 0 0 6px ${color}22`
                          : "inset 0 1px 2px rgba(0,0,0,0.7)",
                      }}
                    >
                      <span style={{ fontSize: 13, lineHeight: 1 }}>
                        {POWER_FLAGS[power]}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Courier New', 'Lucida Console', monospace",
                          fontSize: 9,
                          fontWeight: 900,
                          letterSpacing: "0.04em",
                          color: selected ? color : "#3a3a3a",
                          textShadow: selected ? `0 0 6px ${color}88` : "none",
                          lineHeight: 1,
                          textTransform: "uppercase",
                        }}
                      >
                        {POWER_SIGILS[power]}
                      </span>
                    </div>

                    {/* Power name label */}
                    <div
                      className="flex items-center gap-1.5"
                      style={{
                        height: 32,
                        padding: "0 10px",
                        background: selected
                          ? "linear-gradient(180deg, #1e1c18 0%, #17150f 48%, #12100c 52%, #161410 100%)"
                          : "linear-gradient(180deg, #1a1a1a 0%, #111111 48%, #0c0c0c 52%, #141414 100%)",
                        borderTop: `1px solid ${selected ? "#4a4530" : "#222"}`,
                        borderRight: `1px solid ${selected ? "#4a4530" : "#222"}`,
                        borderBottom: `1px solid ${selected ? "#4a4530" : "#222"}`,
                        borderLeft: `1px solid ${selected ? "#2a2520" : "#1a1a1a"}`,
                        borderRadius: "0 2px 2px 0",
                        boxShadow: selected
                          ? "inset 0 1px 2px rgba(0,0,0,0.5), 0 0 8px rgba(255,149,0,0.08)"
                          : "inset 0 1px 2px rgba(0,0,0,0.7)",
                      }}
                    >
                      {/* Tiny status dot */}
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: selected ? color : "#2a2a2a",
                          boxShadow: selected ? `0 0 4px ${color}88, 0 0 1px ${color}` : "none",
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "'Courier New', 'Lucida Console', monospace",
                          fontSize: 11,
                          fontWeight: selected ? 700 : 500,
                          letterSpacing: "0.08em",
                          color: selected ? "#ff9500" : "#606060",
                          textShadow: selected ? "0 0 6px rgba(255,149,0,0.4)" : "none",
                          lineHeight: 1,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {power}
                      </span>
                      {selected && (
                        <span
                          style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: 10,
                            color: "#ff9500",
                            lineHeight: 1,
                            marginLeft: 2,
                            opacity: 0.8,
                          }}
                        >
                          &#9656;
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {powers.size > 0 && powers.size < 2 && (
              <p className="mt-1.5 text-xs text-[#ff9500]">
                Select at least 2 powers
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-[#808080] font-bold">
                Backend
              </label>
              <FlapSelect
                options={BACKENDS}
                value={backend}
                onChange={(b) => {
                  setBackend(b);
                  setModel(defaultModelForBackend(b));
                }}
                disabled={launching}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-[#808080] font-bold">
                Model
              </label>
              <FlapSelect
                options={MODELS_BY_BACKEND[backend] || []}
                value={model}
                onChange={(m) => setModel(m)}
                disabled={launching}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-[#808080] font-bold">
                Max Year
              </label>
              <div
                className="w-full flex items-center rounded-[3px]"
                style={{
                  borderTop: "1px solid #1a1a1a",
                  borderBottom: "1px solid #1a1a1a",
                  borderLeft: "1px solid #1a1a1a",
                  borderRight: "1px solid #1a1a1a",
                  background: "linear-gradient(180deg, #1e1c18 0%, #141210 50%, #0e0d0b 100%)",
                  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.03), 0 1px 0 rgba(255,255,255,0.04)",
                  opacity: launching ? 0.5 : 1,
                  padding: "5px 0 5px 8px",
                }}
              >
                {/* Flipboard year digits */}
                <div className="flex items-center flex-1 min-w-0">
                  {String(maxYear).split("").map((digit, i) => (
                    <FlapCell key={i} target={digit} delay={i * 30} lit />
                  ))}
                </div>

                {/* Stepper buttons */}
                <div
                  className="flex flex-col flex-shrink-0 self-stretch"
                  style={{
                    width: 28,
                    marginLeft: 6,
                    borderLeft: "1px solid #1a1a1a",
                  }}
                >
                  <button
                    type="button"
                    disabled={launching || maxYear >= 1920}
                    onClick={() => setMaxYear((y) => Math.min(1920, y + 1))}
                    className="flex-1 flex items-center justify-center transition-colors hover:bg-[rgba(255,149,0,0.08)] active:bg-[rgba(255,149,0,0.15)] disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      borderBottom: "1px solid #1a1a1a",
                      color: "#ff9500",
                    }}
                  >
                    <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor">
                      <path d="M4 0 L8 5 L0 5 Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    disabled={launching || maxYear <= 1902}
                    onClick={() => setMaxYear((y) => Math.max(1902, y - 1))}
                    className="flex-1 flex items-center justify-center transition-colors hover:bg-[rgba(255,149,0,0.08)] active:bg-[rgba(255,149,0,0.15)] disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      color: "#ff9500",
                    }}
                  >
                    <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor">
                      <path d="M0 0 L8 0 L4 5 Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="mt-4 border-2 px-3 py-2 text-sm"
              style={{
                borderColor: "rgba(220,20,60,0.5)",
                background: "rgba(220,20,60,0.08)",
                color: "#dc143c",
              }}
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
            <button
              onClick={handleLaunch}
              disabled={!canLaunch}
              className="relative px-6 py-2.5 font-bold uppercase tracking-[0.16em] transition-all duration-150 overflow-hidden"
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 13,
                borderTop: `2px solid ${canLaunch ? "#4a4530" : "#2a2a2a"}`,
                borderBottom: `2px solid ${canLaunch ? "#2a2018" : "#1a1a1a"}`,
                borderLeft: `2px solid ${canLaunch ? "#3a3020" : "#222"}`,
                borderRight: `2px solid ${canLaunch ? "#3a3020" : "#222"}`,
                background: canLaunch
                  ? "linear-gradient(180deg, #1e1c18 0%, #16140e 40%, #12100c 100%)"
                  : "linear-gradient(180deg, #1a1a1a 0%, #141414 100%)",
                color: canLaunch ? "#ff9500" : "#3a3a3a",
                boxShadow: canLaunch
                  ? "inset 0 1px 0 rgba(255,149,0,0.06), inset 0 -1px 2px rgba(0,0,0,0.4), 0 0 16px rgba(255,149,0,0.12)"
                  : "inset 0 2px 4px rgba(0,0,0,0.6)",
                cursor: canLaunch ? "pointer" : "not-allowed",
                opacity: canLaunch ? 1 : 0.5,
                textShadow: canLaunch ? "0 0 8px rgba(255,149,0,0.4)" : undefined,
              }}
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
                  Executing
                </span>
              ) : (
                <>&#9654; Launch Sequence</>
              )}
            </button>

            {!launching && powers.size >= 2 && (
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                {/* Power count badge */}
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] font-bold"
                  style={{
                    fontFamily: "'Courier New', monospace",
                    background: "linear-gradient(180deg, #1e1c18 0%, #14120e 100%)",
                    borderTop: "1px solid #3a3020",
                    borderBottom: "1px solid #2a2018",
                    borderLeft: "1px solid #302818",
                    borderRight: "1px solid #302818",
                    color: "#ff9500",
                    textShadow: "0 0 6px rgba(255,149,0,0.25)",
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff9500", display: "inline-block", boxShadow: "0 0 4px rgba(255,149,0,0.6)" }} />
                  {powers.size} powers
                </span>
                {/* Model badge */}
                <span
                  className="inline-flex items-center px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] font-bold"
                  style={{
                    fontFamily: "'Courier New', monospace",
                    background: "linear-gradient(180deg, #1e1c18 0%, #14120e 100%)",
                    borderTop: "1px solid #3a3020",
                    borderBottom: "1px solid #2a2018",
                    borderLeft: "1px solid #302818",
                    borderRight: "1px solid #302818",
                    color: "#d8c183",
                    textShadow: "0 0 4px rgba(216,193,131,0.15)",
                  }}
                >
                  {model || "no model"}
                </span>
                {/* Backend badge */}
                <span
                  className="inline-flex items-center px-2.5 py-1 text-[10px] uppercase tracking-[0.1em]"
                  style={{
                    fontFamily: "'Courier New', monospace",
                    background: "linear-gradient(180deg, #1a1a1a 0%, #121212 100%)",
                    borderTop: "1px solid #2a2a2a",
                    borderBottom: "1px solid #1a1a1a",
                    borderLeft: "1px solid #222",
                    borderRight: "1px solid #222",
                    color: "#808080",
                  }}
                >
                  via {BACKENDS.find((b) => b.value === backend)?.label}
                </span>
                {/* Year badge */}
                <span
                  className="inline-flex items-center px-2.5 py-1 text-[10px] uppercase tracking-[0.1em]"
                  style={{
                    fontFamily: "'Courier New', monospace",
                    background: "linear-gradient(180deg, #1a1a1a 0%, #121212 100%)",
                    borderTop: "1px solid #2a2a2a",
                    borderBottom: "1px solid #1a1a1a",
                    borderLeft: "1px solid #222",
                    borderRight: "1px solid #222",
                    color: "#808080",
                  }}
                >
                  until {maxYear}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
