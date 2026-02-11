// web/src/app/military-demo/mocks/handlers.ts
import { http, HttpResponse, passthrough } from 'msw';
import { fixtures } from './fixtures/game-data';
import { createSSEHandler } from './sse-handler';

function shouldMock(gameId?: string) {
  return gameId === "demo";
}

async function buildSummary() {
  const phases = fixtures.getPhases();
  const scHistory: Record<string, number[]> = {};
  const finalStandings: Array<{ power: string; scs: number; units: number }> = [];
  const eliminated: Array<{ power: string; phase: string }> = [];
  const seenPowers = new Set<string>();

  for (const phase of phases) {
    const state = await fixtures.getState(phase);
    if (!state) continue;
    const centers = (state.centers ?? {}) as Record<string, string[]>;
    const units = (state.units ?? {}) as Record<string, string[]>;

    for (const power of Object.keys({ ...centers, ...units })) {
      seenPowers.add(power);
      if (!scHistory[power]) scHistory[power] = [];
      scHistory[power].push((centers[power] ?? []).length);
    }
  }

  const lastPhase = phases[phases.length - 1];
  const finalState = (await fixtures.getState(lastPhase)) ?? ({ centers: {}, units: {} } as any);
  const finalCenters = (finalState.centers ?? {}) as Record<string, string[]>;
  const finalUnits = (finalState.units ?? {}) as Record<string, string[]>;

  for (const power of seenPowers) {
    const scs = (finalCenters[power] ?? []).length;
    const units = (finalUnits[power] ?? []).length;
    finalStandings.push({ power, scs, units });

    if (scs === 0) {
      const history = scHistory[power] ?? [];
      let eliminatedPhase = phases[phases.length - 1];
      for (let i = 0; i < history.length; i += 1) {
        if (history[i] === 0) {
          eliminatedPhase = phases[i];
          break;
        }
      }
      eliminated.push({ power, phase: eliminatedPhase });
    }
  }

  finalStandings.sort((a, b) => b.scs - a.scs || b.units - a.units || a.power.localeCompare(b.power));

  return {
    phases,
    scHistory,
    finalStandings,
    eliminated,
    gameOver: false,
  };
}

export const handlers = [
  // Phases list
  http.get('*/api/games/:gameId/phases', ({ params }) => {
    if (!shouldMock(params.gameId as string)) return passthrough();
    return HttpResponse.json(fixtures.getPhases());
  }),

  // Phase state
  http.get('*/api/games/:gameId/phases/:phase/state', async ({ params }) => {
    if (!shouldMock(params.gameId as string)) return passthrough();
    const state = await fixtures.getState(params.phase as string);
    return state ? HttpResponse.json(state) : passthrough();
  }),

  // Phase orders
  http.get('*/api/games/:gameId/phases/:phase/orders', async ({ params }) => {
    if (!shouldMock(params.gameId as string)) return passthrough();
    const orders = await fixtures.getOrders(params.phase as string);
    return orders ? HttpResponse.json(orders) : passthrough();
  }),

  // Phase results
  http.get('*/api/games/:gameId/phases/:phase/results', async ({ params }) => {
    if (!shouldMock(params.gameId as string)) return passthrough();
    const results = await fixtures.getResults(params.phase as string);
    return results ? HttpResponse.json(results) : passthrough();
  }),

  // Phase messages
  http.get('*/api/games/:gameId/phases/:phase/messages', async ({ params }) => {
    if (!shouldMock(params.gameId as string)) return passthrough();
    const messages = await fixtures.getMessages(params.phase as string);
    return messages ? HttpResponse.json(messages) : passthrough();
  }),

  // Memory
  http.get('*/api/games/:gameId/memory/:power', async ({ params, request }) => {
    if (!shouldMock(params.gameId as string)) return passthrough();
    const url = new URL(request.url);
    const phase = url.searchParams.get('phase') || undefined;
    const content = await fixtures.getMemory(params.power as string, phase);
    return HttpResponse.json({ content });
  }),

  // Game log
  http.get('*/api/games/:gameId/log', async ({ params }) => {
    if (!shouldMock(params.gameId as string)) return passthrough();
    const log = await fixtures.getGameLog();
    return HttpResponse.json(log);
  }),

  // Summary
  http.get('*/api/games/:gameId/summary', async ({ params }) => {
    if (!shouldMock(params.gameId as string)) return passthrough();
    return HttpResponse.json(await buildSummary());
  }),

  // Export replay bundle
  http.get('*/api/games/:gameId/export', async ({ params }) => {
    if (!shouldMock(params.gameId as string)) return passthrough();
    const gameId = params.gameId as string;
    const phases = fixtures.getPhases();
    const phaseData = [];
    for (const phase of phases) {
      phaseData.push({
        phase,
        state: await fixtures.getState(phase),
        orders: await fixtures.getOrders(phase),
        results: await fixtures.getResults(phase),
        messages: await fixtures.getMessages(phase),
      });
    }
    const payload = {
      gameId,
      exportedAt: new Date().toISOString(),
      phases: phaseData,
      summary: await buildSummary(),
      log: await fixtures.getGameLog(),
      memories: {},
    };
    return new HttpResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${gameId}-replay.json"`,
      },
    });
  }),

  // All messages (used by useAllMessages)
  http.get('*/api/games/:gameId/messages', async ({ params }) => {
    if (!shouldMock(params.gameId as string)) return passthrough();
    // Aggregate all messages from all phases
    const phases = fixtures.getPhases();
    const allMessages: Record<string, any> = {};

    for (const phase of phases) {
      const messages = await fixtures.getMessages(phase);
      if (messages) {
        Object.assign(allMessages, messages);
      }
    }

    return HttpResponse.json(allMessages);
  }),

  // SSE event stream
  createSSEHandler(),
];
