// web/src/app/military-demo/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { fixtures } from './fixtures/game-data';

export const handlers = [
  // Phases list
  http.get('/api/games/:gameId/phases', () => {
    return HttpResponse.json(fixtures.getPhases());
  }),

  // Phase state
  http.get('/api/games/:gameId/phases/:phase/state', async ({ params }) => {
    const state = await fixtures.getState(params.phase as string);
    return state ? HttpResponse.json(state) : new HttpResponse(null, { status: 404 });
  }),

  // Phase orders
  http.get('/api/games/:gameId/phases/:phase/orders', async ({ params }) => {
    const orders = await fixtures.getOrders(params.phase as string);
    return orders ? HttpResponse.json(orders) : new HttpResponse(null, { status: 404 });
  }),

  // Phase results
  http.get('/api/games/:gameId/phases/:phase/results', async ({ params }) => {
    const results = await fixtures.getResults(params.phase as string);
    return results ? HttpResponse.json(results) : new HttpResponse(null, { status: 404 });
  }),

  // Phase messages
  http.get('/api/games/:gameId/phases/:phase/messages', async ({ params }) => {
    const messages = await fixtures.getMessages(params.phase as string);
    return messages ? HttpResponse.json(messages) : new HttpResponse(null, { status: 404 });
  }),

  // Memory
  http.get('/api/games/:gameId/memory/:power', async ({ params, request }) => {
    const url = new URL(request.url);
    const phase = url.searchParams.get('phase') || undefined;
    const content = await fixtures.getMemory(params.power as string, phase);
    return HttpResponse.json({ content });
  }),

  // Game log
  http.get('/api/games/:gameId/log', async () => {
    const log = await fixtures.getGameLog();
    return HttpResponse.json(log);
  }),

  // All messages (used by useAllMessages)
  http.get('/api/games/:gameId/messages', async () => {
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
];
