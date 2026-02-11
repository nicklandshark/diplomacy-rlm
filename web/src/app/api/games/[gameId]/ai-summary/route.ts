import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  listPhases,
  readPhaseState,
  readPhaseOrders,
  readPhaseResults,
  readPhaseMessages,
  readGameSummary,
  getGameDir,
} from "@/lib/game-data";

// --- Backend routing ---

interface GameMeta {
  backend: string;
  model: string;
}

interface CompletionResult {
  text: string;
}

function readGameMeta(gameId: string): GameMeta | null {
  const metaPath = path.join(getGameDir(gameId), ".game_meta.json");
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } catch {
    return null;
  }
}

/** Pick the cheapest model available on the same provider for summaries. */
function summaryModel(backend: string, gameModel: string): string {
  switch (backend) {
    case "anthropic":
      return "claude-haiku-4-5-20251001";
    case "openrouter":
      return "anthropic/claude-haiku-4-5";
    case "openai":
      return "gpt-4o-mini";
    case "gemini":
      return "gemini-2.0-flash";
    default:
      // For unknown backends, use the game's own model
      return gameModel;
  }
}

/** Resolve the API key env var name for a given backend. */
function apiKeyForBackend(backend: string): string | undefined {
  switch (backend) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "openrouter":
      return process.env.OPENROUTER_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "gemini":
      return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    case "azure_openai":
      return process.env.AZURE_OPENAI_API_KEY;
    default:
      // Try common env vars
      return (
        process.env.ANTHROPIC_API_KEY ||
        process.env.OPENROUTER_API_KEY ||
        process.env.OPENAI_API_KEY
      );
  }
}

function apiKeyEnvName(backend: string): string {
  switch (backend) {
    case "anthropic": return "ANTHROPIC_API_KEY";
    case "openrouter": return "OPENROUTER_API_KEY";
    case "openai": return "OPENAI_API_KEY";
    case "gemini": return "GOOGLE_API_KEY";
    case "azure_openai": return "AZURE_OPENAI_API_KEY";
    default: return "ANTHROPIC_API_KEY";
  }
}

/** Call the Anthropic Messages API. */
async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  userMessage: string,
): Promise<CompletionResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 150,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }
  const data = await res.json();
  return { text: data.content?.[0]?.text || "" };
}

/** Call an OpenAI-compatible Chat Completions API (OpenAI, OpenRouter, etc.). */
async function callOpenAICompatible(
  apiKey: string,
  model: string,
  system: string,
  userMessage: string,
  baseUrl: string,
  extraHeaders?: Record<string, string>,
): Promise<CompletionResult> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      max_tokens: 150,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content || "" };
}

/** Call the Gemini API via its OpenAI-compatible endpoint. */
async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  userMessage: string,
): Promise<CompletionResult> {
  return callOpenAICompatible(
    apiKey,
    model,
    system,
    userMessage,
    "https://generativelanguage.googleapis.com/v1beta/openai",
  );
}

/** Route a completion to the appropriate backend. */
async function generateCompletion(
  backend: string,
  apiKey: string,
  model: string,
  system: string,
  userMessage: string,
): Promise<CompletionResult> {
  switch (backend) {
    case "anthropic":
      return callAnthropic(apiKey, model, system, userMessage);
    case "openrouter":
      return callOpenAICompatible(apiKey, model, system, userMessage, "https://openrouter.ai/api/v1");
    case "openai":
      return callOpenAICompatible(apiKey, model, system, userMessage, "https://api.openai.com/v1");
    case "gemini":
      return callGemini(apiKey, model, system, userMessage);
    case "azure_openai": {
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
      const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";
      return callOpenAICompatible(
        apiKey, model, system, userMessage,
        `${endpoint}/openai/deployments/${model}?api-version=${apiVersion}`,
        { "api-key": apiKey },
      );
    }
    default:
      // Fallback: try OpenAI-compatible (works for litellm, vllm, portkey, vercel proxies)
      return callOpenAICompatible(apiKey, model, system, userMessage, "https://api.openai.com/v1");
  }
}

// --- Cache ---

function getCachePath(gameId: string, phase: string): string {
  return path.join(getGameDir(gameId), "snapshots", phase, "ai_summary.md");
}

function readCached(gameId: string, phase: string): string | null {
  const p = getCachePath(gameId, phase);
  if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8");
  return null;
}

function writeCache(gameId: string, phase: string, content: string): void {
  const p = getCachePath(gameId, phase);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, content, "utf-8");
}

// --- Prompt builder ---

function buildPromptContext(gameId: string, phase: string): string {
  const phases = listPhases(gameId);
  const phaseIdx = phases.indexOf(phase);
  const currentState = readPhaseState(gameId, phase);
  const currentOrders = readPhaseOrders(gameId, phase);
  const currentResults = readPhaseResults(gameId, phase);
  const summary = readGameSummary(gameId);

  if (!currentState) return "";

  const sections: string[] = [];

  sections.push(`# Game: ${gameId}`);
  sections.push(`## Current Phase: ${phase} (phase ${phaseIdx + 1} of ${phases.length})`);

  if (currentState.centers) {
    sections.push("\n## Supply Center Ownership");
    const sorted = Object.entries(currentState.centers)
      .map(([power, locs]) => ({ power, count: locs.length, locs }))
      .sort((a, b) => b.count - a.count);
    for (const { power, count, locs } of sorted) {
      sections.push(`- **${power}**: ${count} SCs (${locs.join(", ")})`);
    }
  }

  if (currentState.units) {
    sections.push("\n## Unit Positions");
    for (const [power, units] of Object.entries(currentState.units)) {
      if ((units as string[]).length > 0) {
        sections.push(`- **${power}**: ${(units as string[]).join(", ")}`);
      }
    }
  }

  if (currentOrders) {
    sections.push("\n## Orders This Phase");
    for (const [power, orderList] of Object.entries(currentOrders)) {
      if ((orderList as string[]).length > 0) {
        sections.push(`**${power}**:`);
        for (const order of orderList as string[]) {
          sections.push(`  - ${order}`);
        }
      }
    }
  }

  if (currentResults) {
    sections.push("\n## Results This Phase");
    for (const [unit, resultList] of Object.entries(currentResults)) {
      if ((resultList as string[]).length > 0) {
        sections.push(`- ${unit}: ${(resultList as string[]).join(", ")}`);
      }
    }
  }

  if (summary) {
    sections.push("\n## SC Progression Over Time");
    sections.push("Power | " + phases.slice(0, phaseIdx + 1).join(" | "));
    sections.push("--- | " + phases.slice(0, phaseIdx + 1).map(() => "---").join(" | "));
    for (const [power, counts] of Object.entries(summary.scHistory)) {
      const row = counts.slice(0, phaseIdx + 1).map(c => String(c));
      sections.push(`${power} | ${row.join(" | ")}`);
    }

    if (summary.eliminated.length > 0) {
      sections.push("\n## Eliminated Powers");
      for (const e of summary.eliminated) {
        sections.push(`- **${e.power}** eliminated in ${e.phase}`);
      }
    }
  }

  const recentMovementPhases = phases
    .slice(0, phaseIdx + 1)
    .filter(p => p.includes("M"))
    .slice(-2);
  const recentMessages: string[] = [];
  for (const p of recentMovementPhases) {
    const msgs = readPhaseMessages(gameId, p);
    if (msgs) {
      for (const msg of Object.values(msgs)) {
        recentMessages.push(`[${msg.phase}] ${msg.sender} → ${msg.recipient}: "${msg.message}"`);
      }
    }
  }
  if (recentMessages.length > 0) {
    sections.push("\n## Recent Diplomatic Messages");
    for (const m of recentMessages.slice(-30)) {
      sections.push(m);
    }
  }

  return sections.join("\n");
}

// --- Route handler ---

const SYSTEM_PROMPT = `You are an expert Diplomacy game analyst. Write a punchy 2-3 sentence summary of this phase.

Rules:
- Max 60 words. Be ruthlessly concise.
- Lead with the single most important development
- Name the key powers and what they did
- Use present tense, no bullet points, no preamble`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const url = new URL(request.url);
  const phase = url.searchParams.get("phase");
  const force = url.searchParams.get("force") === "true";

  if (!phase) {
    return NextResponse.json({ error: "phase query param required" }, { status: 400 });
  }

  // Check cache first (unless force refresh)
  if (!force) {
    const cached = readCached(gameId, phase);
    if (cached) {
      return NextResponse.json({ phase, summary: cached, cached: true });
    }
  }

  // Determine backend from game metadata, fall back to anthropic
  const meta = readGameMeta(gameId);
  const backend = meta?.backend || "anthropic";
  const model = summaryModel(backend, meta?.model || "");

  // Check for API key
  const apiKey = apiKeyForBackend(backend);
  if (!apiKey) {
    const envVar = apiKeyEnvName(backend);
    return NextResponse.json(
      { error: `${envVar} not set. Set it in your environment to enable AI summaries.` },
      { status: 500 }
    );
  }

  // Build context
  const context = buildPromptContext(gameId, phase);
  if (!context) {
    return NextResponse.json({ error: "Could not build game context for this phase" }, { status: 404 });
  }

  const userPrompt = `Analyze this Diplomacy game state and write a compelling narrative summary:\n\n${context}`;

  try {
    const result = await generateCompletion(backend, apiKey, model, SYSTEM_PROMPT, userPrompt);
    const summaryText = result.text || "No summary generated.";

    writeCache(gameId, phase, summaryText);

    return NextResponse.json({ phase, summary: summaryText, cached: false, backend, model });
  } catch (err) {
    console.error("AI summary generation failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to generate summary";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
