import { http, HttpResponse, passthrough } from 'msw';
import type { LiveEvent } from '@/lib/types';

let eventId = 0;

const POWERS = ['AUSTRIA', 'ENGLAND', 'FRANCE', 'GERMANY', 'ITALY', 'RUSSIA', 'TURKEY'];
const ACTIVITY_EVENTS = [
  { type: 'step.start', powers: ['FRANCE', 'GERMANY'], step: 'STRATEGIZE' },
  { type: 'conversation.agent.start', powers: ['FRANCE', 'GERMANY'] },
  { type: 'conversation.started', powers: ['FRANCE', 'GERMANY'] },
  { type: 'message.sent', powers: ['FRANCE', 'GERMANY'] },
  { type: 'step.start', powers: ['RUSSIA', 'TURKEY'], step: 'STRATEGIZE' },
  { type: 'conversation.agent.start', powers: ['RUSSIA', 'TURKEY'] },
  { type: 'conversation.started', powers: ['RUSSIA', 'TURKEY'] },
  { type: 'message.sent', powers: ['RUSSIA', 'TURKEY'] },
  { type: 'orders.submitted', powers: ['FRANCE'] },
  { type: 'orders.submitted', powers: ['GERMANY'] },
  { type: 'orders.submitted', powers: ['AUSTRIA'] },
];

export function createSSEHandler() {
  return http.get('*/api/games/:gameId/events', async ({ params }) => {
    if (params.gameId !== "demo") return passthrough();
    const encoder = new TextEncoder();
    const sendEvent = (event: LiveEvent) => `event: game_event\ndata: ${JSON.stringify(event)}\n\n`;

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

        controller.enqueue(encoder.encode(sendEvent(connectionEvent)));

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
                step: (activity as any).step || "STRATEGIZE",
                power,
                payload: activity.type === 'step.start'
                  ? { step: (activity as any).step }
                  : activity.type === 'message.sent'
                  ? {
                      sender: power,
                      recipient: activity.powers.find(p => p !== power) || 'AUSTRIA',
                    }
                  : {},
              };
              controller.enqueue(encoder.encode(sendEvent(event)));
            }
            activityIndex++;
          }
        }, 3000); // Send activity every 3 seconds

        // Keep connection open with heartbeats
        const heartbeatInterval = setInterval(() => {
          const heartbeat = sendEvent({
            event_id: eventId++,
            event_type: "heartbeat",
            priority: 0,
            ts_wall: Date.now() * 1000,
            phase: "F1905M",
            step: "STRATEGIZE",
            power: null,
            payload: {},
          });
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
