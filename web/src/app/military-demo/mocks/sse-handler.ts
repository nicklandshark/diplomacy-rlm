import { http, HttpResponse } from 'msw';
import type { LiveEvent } from '@/lib/types';

let eventId = 0;

const POWERS = ['AUSTRIA', 'ENGLAND', 'FRANCE', 'GERMANY', 'ITALY', 'RUSSIA', 'TURKEY'];
const ACTIVITY_EVENTS = [
  { type: 'power.status.thinking', powers: ['FRANCE', 'GERMANY'] },
  { type: 'power.status.talking', powers: ['FRANCE', 'GERMANY'] },
  { type: 'conversation.started', powers: ['FRANCE', 'GERMANY'] },
  { type: 'message.sent', powers: ['FRANCE', 'GERMANY'] },
  { type: 'power.status.thinking', powers: ['RUSSIA', 'TURKEY'] },
  { type: 'power.status.talking', powers: ['RUSSIA', 'TURKEY'] },
  { type: 'conversation.started', powers: ['RUSSIA', 'TURKEY'] },
  { type: 'message.sent', powers: ['RUSSIA', 'TURKEY'] },
  { type: 'power.status.submitted', powers: ['FRANCE'] },
  { type: 'power.orders.submitted', powers: ['FRANCE'] },
  { type: 'power.status.submitted', powers: ['GERMANY'] },
  { type: 'power.orders.submitted', powers: ['GERMANY'] },
  { type: 'power.status.submitted', powers: ['AUSTRIA'] },
  { type: 'power.orders.submitted', powers: ['AUSTRIA'] },
];

export function createSSEHandler() {
  return http.get('/api/games/:gameId/events', async () => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection event
        const connectionEvent: LiveEvent = {
          event_id: eventId++,
          event_type: "connection.established",
          priority: 0,
          ts_wall: Date.now() * 1000,
          phase: "F1905M",
          step: "STRATEGIZE",
          power: null,
          payload: {},
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectionEvent)}\n\n`));

        // Send simulated activity events in sequence
        let activityIndex = 0;
        const activityInterval = setInterval(() => {
          if (activityIndex < ACTIVITY_EVENTS.length) {
            const activity = ACTIVITY_EVENTS[activityIndex];
            for (const power of activity.powers) {
              const event: LiveEvent = {
                event_id: eventId++,
                event_type: activity.type,
                priority: 1,
                ts_wall: Date.now() * 1000,
                phase: "F1905M",
                step: "STRATEGIZE",
                power,
                payload: activity.type.includes('message') ? {
                  sender: power,
                  recipient: activity.powers.find(p => p !== power) || 'AUSTRIA',
                } : {},
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
            activityIndex++;
          }
        }, 3000); // Send activity every 3 seconds

        // Keep connection open with heartbeats
        const heartbeatInterval = setInterval(() => {
          const heartbeat = `data: ${JSON.stringify({
            event_id: eventId++,
            event_type: "heartbeat",
            priority: 0,
            ts_wall: Date.now() * 1000,
            phase: "F1905M",
            step: "STRATEGIZE",
            power: null,
            payload: {},
          })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        }, 30000);

        return () => {
          clearInterval(activityInterval);
          clearInterval(heartbeatInterval);
        };
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
