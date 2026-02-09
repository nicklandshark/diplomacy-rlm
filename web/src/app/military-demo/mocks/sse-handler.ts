import { http, HttpResponse } from 'msw';
import type { LiveEvent } from '@/lib/types';

let eventId = 0;

export function createSSEHandler() {
  return http.get('/api/games/:gameId/events', async () => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection event
        const event: LiveEvent = {
          event_id: eventId++,
          event_type: "connection.established",
          priority: 0,
          ts_wall: Date.now() * 1000,
          phase: null,
          step: null,
          power: null,
          payload: {},
        };

        const message = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(message));

        // Keep connection open with heartbeats
        const interval = setInterval(() => {
          const heartbeat = `data: ${JSON.stringify({
            event_id: eventId++,
            event_type: "heartbeat",
            priority: 0,
            ts_wall: Date.now() * 1000,
            phase: null,
            step: null,
            power: null,
            payload: {},
          })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        }, 30000);

        return () => clearInterval(interval);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  });
}
