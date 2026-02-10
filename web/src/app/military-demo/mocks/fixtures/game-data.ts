// web/src/app/military-demo/mocks/fixtures/game-data.ts
import type { GameState, PhaseOrders, PhaseResults, PhaseMessages } from "@/lib/types";

// Import snapshot data (we'll use dynamic imports for now)
const PHASES = ["S1901M", "F1901M", "S1902M", "F1902M", "S1902R", "F1902R", "S1903M", "F1903M", "S1903R", "F1903R", "S1904M", "F1904M", "S1905M", "F1905M"];

class FixtureLoader {
  async getState(phase: string): Promise<GameState | null> {
    try {
      const data = await import(`./snapshots/${phase}/game_state.json`);
      return data.default || data;
    } catch {
      return null;
    }
  }

  async getOrders(phase: string): Promise<PhaseOrders | null> {
    try {
      const data = await import(`./snapshots/${phase}/orders.json`);
      return data.default || data;
    } catch {
      return null;
    }
  }

  async getResults(phase: string): Promise<PhaseResults | null> {
    try {
      const data = await import(`./snapshots/${phase}/results.json`);
      return data.default || data;
    } catch {
      return null;
    }
  }

  async getMessages(phase: string): Promise<PhaseMessages | null> {
    try {
      const data = await import(`./snapshots/${phase}/messages.json`);
      return data.default || data;
    } catch {
      return null;
    }
  }

  async getMemory(power: string, phase?: string): Promise<string | null> {
    // Use the latest phase if no phase specified
    const targetPhase = phase || PHASES[PHASES.length - 1];

    try {
      const res = await fetch(`/military-demo/mocks/fixtures/snapshots/${targetPhase}/memory/${power}_memory.md`);
      return res.ok ? await res.text() : null;
    } catch {
      return null;
    }
  }

  getPhases(): string[] {
    return PHASES;
  }

  async getGameLog() {
    try {
      const res = await fetch("/military-demo/mocks/fixtures/game_log.jsonl");
      if (!res.ok) return [];
      const text = await res.text();
      return text.split("\n").filter(Boolean).map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }
}

export const fixtures = new FixtureLoader();
