# Military Demo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create fully functional military-themed demo at `/military-demo` with MSW mocks to test before main app refactor.

**Architecture:** MSW intercepts all fetch/SSE calls, returning fixture data from real game snapshots. Existing hooks work unchanged. Military UI components provide styling layer over identical data flow.

**Tech Stack:** Next.js 16, React 19, MSW 2.x, TypeScript, Tailwind CSS 4, existing military-ui-kit components

---

## Task 1: MSW Setup & Infrastructure

**Goal:** Install MSW and initialize service worker for browser mocking.

**Files:**
- Modify: `web/package.json`
- Create: `web/public/mockServiceWorker.js`

### Step 1: Install MSW

```bash
cd web && bun add -D msw@latest
```

Expected output: MSW added to devDependencies

### Step 2: Initialize MSW service worker

```bash
cd web && npx msw init public/ --save
```

Expected output: `mockServiceWorker.js` created in `public/`

### Step 3: Verify installation

```bash
ls -la web/public/mockServiceWorker.js
```

Expected: File exists with ~100KB size

### Step 4: Commit

```bash
git add web/package.json web/bun.lockb web/public/mockServiceWorker.js
git commit -m "chore: install MSW for military demo mocking"
```

---

## Task 2: Copy Fixture Data

**Goal:** Copy real game snapshots to demo fixtures directory.

**Files:**
- Create: `web/src/app/military-demo/mocks/fixtures/` (directory structure)

### Step 1: Create fixtures directory structure

```bash
mkdir -p web/src/app/military-demo/mocks/fixtures/snapshots
mkdir -p web/src/app/military-demo/mocks/fixtures/memory
```

### Step 2: Copy snapshot data

```bash
cp -r game_output/snapshots/* web/src/app/military-demo/mocks/fixtures/snapshots/
```

### Step 3: Copy game log

```bash
cp game_output/game_log.jsonl web/src/app/military-demo/mocks/fixtures/
```

### Step 4: Copy memory files

```bash
cp game_output/*_memory.md web/src/app/military-demo/mocks/fixtures/memory/
```

### Step 5: Verify copy

```bash
ls web/src/app/military-demo/mocks/fixtures/snapshots | head -5
ls web/src/app/military-demo/mocks/fixtures/memory
```

Expected: S1901M, F1901M, etc. directories and memory files

### Step 6: Commit

```bash
git add web/src/app/military-demo/mocks/fixtures
git commit -m "feat: add fixture data for military demo from real game"
```

---

## Task 3: Create Fixture Loader Utility

**Goal:** Create utility to load fixture data by phase/power.

**Files:**
- Create: `web/src/app/military-demo/mocks/fixtures/game-data.ts`

### Step 1: Write fixture loader

```typescript
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
    try {
      const fileName = `${power}_memory.md`;
      const res = await fetch(`/military-demo/mocks/fixtures/memory/${fileName}`);
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
```

### Step 2: Verify TypeScript compiles

```bash
cd web && npx tsc --noEmit src/app/military-demo/mocks/fixtures/game-data.ts
```

Expected: No errors

### Step 3: Commit

```bash
git add web/src/app/military-demo/mocks/fixtures/game-data.ts
git commit -m "feat: add fixture loader utility for military demo"
```

---

## Task 4: Create MSW API Handlers

**Goal:** Create MSW handlers for all API endpoints.

**Files:**
- Create: `web/src/app/military-demo/mocks/handlers.ts`

### Step 1: Write basic API handlers

```typescript
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
```

### Step 2: Verify TypeScript compiles

```bash
cd web && npx tsc --noEmit src/app/military-demo/mocks/handlers.ts
```

Expected: No errors

### Step 3: Commit

```bash
git add web/src/app/military-demo/mocks/handlers.ts
git commit -m "feat: add MSW API handlers for military demo"
```

---

## Task 5: Create MSW Browser Instance

**Goal:** Create MSW browser setup that enables mocking for military-demo route only.

**Files:**
- Create: `web/src/app/military-demo/mocks/browser.ts`

### Step 1: Write browser setup

```typescript
// web/src/app/military-demo/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### Step 2: Verify TypeScript compiles

```bash
cd web && npx tsc --noEmit src/app/military-demo/mocks/browser.ts
```

Expected: No errors

### Step 3: Commit

```bash
git add web/src/app/military-demo/mocks/browser.ts
git commit -m "feat: add MSW browser worker for military demo"
```

---

## Task 6: Create Military Demo Layout

**Goal:** Create layout that initializes MSW for this route only.

**Files:**
- Create: `web/src/app/military-demo/layout.tsx`

### Step 1: Write layout component

```typescript
// web/src/app/military-demo/layout.tsx
"use client";

import { useEffect, useState } from "react";

export default function MilitaryDemoLayout({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    const startMSW = async () => {
      if (typeof window !== "undefined") {
        const { worker } = await import("./mocks/browser");
        await worker.start({
          onUnhandledRequest: "bypass", // Don't warn about unhandled requests
          quiet: false, // Log MSW activity for debugging
        });
        setMswReady(true);
      }
    };

    startMSW();
  }, []);

  if (!mswReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-[#ff9500] text-sm uppercase tracking-wider">
          Initializing Mock Service Worker...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

### Step 2: Verify TypeScript compiles

```bash
cd web && npx tsc --noEmit src/app/military-demo/layout.tsx
```

Expected: No errors

### Step 3: Commit

```bash
git add web/src/app/military-demo/layout.tsx
git commit -m "feat: add military demo layout with MSW initialization"
```

---

## Task 7: Extract Military Components for Reuse

**Goal:** Organize military components into importable modules.

**Files:**
- Modify: `web/src/app/military-ui-kit/components.tsx`

### Step 1: Verify components are exported

```bash
grep "^export" web/src/app/military-ui-kit/components.tsx
```

Expected: Rivet, TacticalPanel, CommandButton, OrderItem, MessageBubble, PhaseTimeline, ActionLog

### Step 2: If missing exports, add them

(Components are already exported based on previous reads)

### Step 3: Verify icon components exist

```bash
ls web/src/app/military-ui-kit/icons/components.tsx
```

Expected: File exists

### Step 4: No changes needed, skip commit

---

## Task 8: Create Basic Military Game View Structure

**Goal:** Create main demo page with 3-column layout skeleton.

**Files:**
- Create: `web/src/app/military-demo/page.tsx`

### Step 1: Write basic page structure

```typescript
// web/src/app/military-demo/page.tsx
"use client";

import { useState } from "react";
import { TacticalPanel } from "@/app/military-ui-kit/components";

export default function MilitaryDemoPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] p-4">
      <div className="max-w-[1920px] mx-auto">
        {/* Top Navigation */}
        <div className="mb-4">
          <TacticalPanel title="GAME CONTROL">
            <div className="text-center">Navigation Bar Placeholder</div>
          </TacticalPanel>
        </div>

        {/* Main 3-Column Layout */}
        <div className="grid grid-cols-[320px_1fr_380px] gap-4">
          {/* Left Sidebar */}
          <div className="space-y-4">
            <TacticalPanel title="ORDERS">
              <div>Left sidebar placeholder</div>
            </TacticalPanel>
          </div>

          {/* Center Map */}
          <div>
            <TacticalPanel title="TACTICAL MAP">
              <div className="aspect-[4/3] flex items-center justify-center">
                <div className="text-[#808080]">Map Placeholder</div>
              </div>
            </TacticalPanel>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <TacticalPanel title="ACTIVITY FEED">
              <div>Right sidebar placeholder</div>
            </TacticalPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Test page loads

```bash
cd web && bun run dev
```

Navigate to `http://localhost:3000/military-demo`

Expected: Page loads with 3-column layout and MSW initialization

### Step 3: Commit

```bash
git add web/src/app/military-demo/page.tsx
git commit -m "feat: add military demo page with basic 3-column layout"
```

---

## Task 9: Wire Up Phase Navigation Hooks

**Goal:** Connect usePhases and usePhaseNavigation hooks to demo.

**Files:**
- Modify: `web/src/app/military-demo/page.tsx`

### Step 1: Add hooks and state

```typescript
// In page.tsx, add imports and hooks
import { usePhases } from "@/hooks/usePhases";
import { usePhaseNavigation } from "@/hooks/usePhaseNavigation";
import { CommandButton } from "@/app/military-ui-kit/components";

// In component:
const DEMO_GAME_ID = "demo";
const { phases } = usePhases(DEMO_GAME_ID, []);
const nav = usePhaseNavigation(phases);
```

### Step 2: Add phase controls to top nav

```typescript
{/* Replace navigation placeholder with: */}
<div className="flex items-center justify-between">
  <div className="text-[#ff9500] font-bold text-lg">GAME: {DEMO_GAME_ID}</div>

  <div className="flex items-center gap-4">
    <CommandButton
      variant="secondary"
      disabled={nav.isFirst}
      onClick={nav.prev}
    >
      ◀ PREV
    </CommandButton>

    <div className="px-4 py-2 bg-[#1a1a1a] border-2 border-[#3a3a3a] font-mono text-sm">
      {nav.currentPhase || "Loading..."}
    </div>

    <CommandButton
      variant="secondary"
      disabled={nav.isLast}
      onClick={nav.next}
    >
      NEXT ▶
    </CommandButton>
  </div>

  <div className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
    <span className="text-xs text-[#808080]">LIVE</span>
  </div>
</div>
```

### Step 3: Test phase navigation

Start dev server, navigate phases with prev/next buttons.

Expected: Phase name updates, buttons disable at boundaries

### Step 4: Commit

```bash
git add web/src/app/military-demo/page.tsx
git commit -m "feat: wire up phase navigation to military demo"
```

---

## Task 10: Wire Up Game Data Hook

**Goal:** Connect useGameData to load state/orders/results for current phase.

**Files:**
- Modify: `web/src/app/military-demo/page.tsx`

### Step 1: Add useGameData hook

```typescript
import { useGameData } from "@/hooks/useGameData";

// In component:
const [dataRefreshKey, setDataRefreshKey] = useState(0);
const { state, orders, results, loading } = useGameData(DEMO_GAME_ID, nav.currentPhase, dataRefreshKey);
```

### Step 2: Display loading state

```typescript
{loading && (
  <div className="text-center text-[#ff9500]">Loading phase data...</div>
)}
```

### Step 3: Display power data in left sidebar

```typescript
{/* In left sidebar, replace placeholder: */}
{state && (
  <div className="space-y-2">
    {Object.entries(state.units).map(([power, units]) => (
      <div key={power} className="p-2 bg-[#1a1a1a] border border-[#3a3a3a]">
        <div className="text-xs text-[#ff9500] font-bold">{power}</div>
        <div className="text-[10px] text-[#808080]">
          {units.length} units, {state.centers[power]?.length || 0} centers
        </div>
      </div>
    ))}
  </div>
)}
```

### Step 4: Test data loading

Navigate phases, verify power data updates.

Expected: Power list shows correct units/centers per phase

### Step 5: Commit

```bash
git add web/src/app/military-demo/page.tsx
git commit -m "feat: wire up game data hook to military demo"
```

---

## Task 11: Add Phase Timeline Component

**Goal:** Add clickable phase timeline to top nav.

**Files:**
- Modify: `web/src/app/military-demo/page.tsx`

### Step 1: Import PhaseTimeline

```typescript
import { PhaseTimeline } from "@/app/military-ui-kit/components";
```

### Step 2: Add timeline below controls

```typescript
{/* After phase controls div: */}
<div className="mt-4">
  <PhaseTimeline
    phases={phases}
    currentIndex={phases.indexOf(nav.currentPhase || "")}
  />
</div>
```

### Step 3: Test timeline

Verify phase boxes render, current phase highlighted.

Expected: Orange glow on current phase, green for past phases

### Step 4: Commit

```bash
git add web/src/app/military-demo/page.tsx
git commit -m "feat: add phase timeline to military demo"
```

---

## Task 12: Implement Orders Panel with Tabs

**Goal:** Create left sidebar with 3 tabs (orders/messages/summary).

**Files:**
- Modify: `web/src/app/military-demo/page.tsx`

### Step 1: Add tab state

```typescript
type LeftTab = "orders" | "messages" | "summary";
const [leftTab, setLeftTab] = useState<LeftTab>("orders");
```

### Step 2: Add tab buttons

```typescript
{/* In left sidebar TacticalPanel: */}
<div className="flex gap-2 mb-4">
  {(["orders", "messages", "summary"] as LeftTab[]).map(tab => (
    <CommandButton
      key={tab}
      variant={leftTab === tab ? "primary" : "secondary"}
      onClick={() => setLeftTab(tab)}
      className="flex-1 text-xs py-2"
    >
      {tab.toUpperCase()}
    </CommandButton>
  ))}
</div>
```

### Step 3: Add tab content

```typescript
{leftTab === "orders" && (
  <div>Orders content</div>
)}
{leftTab === "messages" && (
  <div>Messages content</div>
)}
{leftTab === "summary" && (
  <div>Summary content</div>
)}
```

### Step 4: Test tabs

Click tabs, verify content switches.

Expected: Tabs highlight, content changes

### Step 5: Commit

```bash
git add web/src/app/military-demo/page.tsx
git commit -m "feat: add tabbed left sidebar to military demo"
```

---

## Task 13: Implement Orders List with OrderItem

**Goal:** Display orders using OrderItem component.

**Files:**
- Modify: `web/src/app/military-demo/page.tsx`

### Step 1: Import OrderItem and add helper

```typescript
import { OrderItem } from "@/app/military-ui-kit/components";
import { parseOrder, humanizeOrder } from "@/lib/parse-orders";
```

### Step 2: Render orders in orders tab

```typescript
{leftTab === "orders" && orders && (
  <div className="space-y-2 max-h-[600px] overflow-y-auto">
    {Object.entries(orders).flatMap(([power, powerOrders]) =>
      powerOrders.map((order, idx) => {
        const parsed = parseOrder(order);
        const humanized = humanizeOrder(parsed);
        const result = results?.[order];
        const status = result?.includes("void") ? "failed" :
                      result?.includes("bounce") ? "bounced" :
                      "success";

        return (
          <OrderItem
            key={`${power}-${idx}`}
            territory={parsed.loc}
            unitType={parsed.unitType}
            order={humanized}
            status={status}
          />
        );
      })
    )}
  </div>
)}
```

### Step 3: Test orders display

Navigate phases, verify orders render with correct status colors.

Expected: Green for success, red for failed, gray for bounced

### Step 4: Commit

```bash
git add web/src/app/military-demo/page.tsx
git commit -m "feat: add orders list with OrderItem component"
```

---

## Task 14: Implement Messages Panel

**Goal:** Display diplomatic messages using MessageBubble.

**Files:**
- Modify: `web/src/app/military-demo/page.tsx`

### Step 1: Import MessageBubble and useAllMessages

```typescript
import { MessageBubble } from "@/app/military-ui-kit/components";
import { useAllMessages } from "@/hooks/useAllMessages";

// In component:
const { messages: allMessages } = useAllMessages(DEMO_GAME_ID, dataRefreshKey);
```

### Step 2: Render messages in messages tab

```typescript
{leftTab === "messages" && (
  <div className="space-y-2 max-h-[600px] overflow-y-auto">
    {allMessages && Object.entries(allMessages)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ts, msg]) => (
        <MessageBubble
          key={ts}
          from={msg.sender}
          to={msg.recipient}
          content={msg.message}
          timestamp={new Date(parseInt(ts) / 1000).toLocaleString()}
        />
      ))
    }
  </div>
)}
```

### Step 3: Test messages display

Switch to messages tab, verify bubbles render.

Expected: Messages show sender → recipient with timestamps

### Step 4: Commit

```bash
git add web/src/app/military-demo/page.tsx
git commit -m "feat: add messages panel with MessageBubble component"
```

---

## Task 15: Implement Game Summary Panel

**Goal:** Display game statistics in summary tab.

**Files:**
- Modify: `web/src/app/military-demo/page.tsx`

### Step 1: Add summary content

```typescript
{leftTab === "summary" && state && (
  <div className="space-y-4">
    <div>
      <div className="text-xs text-[#808080] uppercase mb-2">Supply Centers</div>
      {Object.entries(state.centers).map(([power, centers]) => (
        <div key={power} className="flex justify-between py-1 border-b border-[#2a2a2a]">
          <span className="text-sm text-[#e0e0e0]">{power}</span>
          <span className="text-sm text-[#ff9500] font-bold">{centers.length}</span>
        </div>
      ))}
    </div>

    <div>
      <div className="text-xs text-[#808080] uppercase mb-2">Units</div>
      {Object.entries(state.units).map(([power, units]) => (
        <div key={power} className="flex justify-between py-1 border-b border-[#2a2a2a]">
          <span className="text-sm text-[#e0e0e0]">{power}</span>
          <span className="text-sm text-[#4a7c59] font-bold">{units.length}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

### Step 2: Test summary display

Switch to summary tab, verify stats render.

Expected: Tables show centers and units per power

### Step 3: Commit

```bash
git add web/src/app/military-demo/page.tsx
git commit -m "feat: add game summary panel to military demo"
```

---

## Task 16: Add Activity Feed (Right Sidebar)

**Goal:** Display activity log using ActionLog component.

**Files:**
- Modify: `web/src/app/military-demo/page.tsx`

### Step 1: Import ActionLog and useGameLog

```typescript
import { ActionLog } from "@/app/military-ui-kit/components";
import { useGameLog } from "@/hooks/useGameLog";

// In component:
const gameLog = useGameLog(DEMO_GAME_ID, dataRefreshKey);
```

### Step 2: Convert game log to action format

```typescript
const actions = gameLog.map((entry, idx) => ({
  time: `T+${idx}`,
  message: `${entry.event}${entry.phase ? ` (${entry.phase})` : ""}`,
}));
```

### Step 3: Render ActionLog in right sidebar

```typescript
{/* Replace right sidebar placeholder: */}
<ActionLog actions={actions} />
```

### Step 4: Test activity feed

Verify game log events render.

Expected: List of events with timestamps

### Step 5: Commit

```bash
git add web/src/app/military-demo/page.tsx
git commit -m "feat: add activity feed to military demo"
```

---

## Task 17: Add Memory Viewer (Right Sidebar)

**Goal:** Display power memory using MemoryViewer component.

**Files:**
- Modify: `web/src/app/military-demo/page.tsx`

### Step 1: Import MemoryViewer and useMemory

```typescript
import MemoryViewer from "@/components/memory/MemoryViewer";
import { useMemory } from "@/hooks/useGameData";

// In component:
const [selectedPower, setSelectedPower] = useState<string | null>("FRANCE");
const { content: memoryContent } = useMemory(
  DEMO_GAME_ID,
  selectedPower || "FRANCE",
  nav.currentPhase || undefined
);
```

### Step 2: Add power selector

```typescript
{/* In right sidebar, below ActionLog: */}
<TacticalPanel title="MEMORY" className="mt-4">
  <div className="mb-3">
    <select
      value={selectedPower || ""}
      onChange={(e) => setSelectedPower(e.target.value)}
      className="w-full bg-[#1a1a1a] border-2 border-[#3a3a3a] text-[#e0e0e0] px-3 py-2 text-sm"
    >
      {state && Object.keys(state.units).map(power => (
        <option key={power} value={power}>{power}</option>
      ))}
    </select>
  </div>

  <MemoryViewer content={memoryContent || ""} />
</TacticalPanel>
```

### Step 3: Test memory viewer

Select powers, verify memory content updates.

Expected: Markdown renders, changes per power

### Step 4: Commit

```bash
git add web/src/app/military-demo/page.tsx
git commit -m "feat: add memory viewer to military demo"
```

---

## Task 18: Add Diplomacy Map Integration

**Goal:** Integrate actual DiplomacyMap component.

**Files:**
- Modify: `web/src/app/military-demo/page.tsx`

### Step 1: Import map components

```typescript
import DiplomacyMap from "@/components/map/DiplomacyMap";
import { useState as useMapState } from "react";
```

### Step 2: Add map state

```typescript
const [hoveredTerritory, setHoveredTerritory] = useState<string | null>(null);
```

### Step 3: Load SVG content

```typescript
const [svgContent, setSvgContent] = useState<string>("");

useEffect(() => {
  fetch("/diplomacy_map.svg")
    .then(r => r.text())
    .then(setSvgContent);
}, []);
```

### Step 4: Replace map placeholder

```typescript
{/* Replace center panel content: */}
{svgContent && state ? (
  <DiplomacyMap
    svgContent={svgContent}
    state={state}
    orders={orders || {}}
    results={results || {}}
    onTerritoryHover={setHoveredTerritory}
  />
) : (
  <div className="aspect-[4/3] flex items-center justify-center">
    <div className="text-[#808080]">Loading map...</div>
  </div>
)}
```

### Step 5: Test map rendering

Verify map loads with units.

Expected: SVG map with positioned units

### Step 6: Commit

```bash
git add web/src/app/military-demo/page.tsx
git commit -m "feat: integrate DiplomacyMap into military demo"
```

---

## Task 19: Add Demo Control Panel

**Goal:** Create simulation controls for manual event triggering.

**Files:**
- Create: `web/src/app/military-demo/components/DemoControls.tsx`
- Modify: `web/src/app/military-demo/page.tsx`

### Step 1: Create DemoControls component

```typescript
// web/src/app/military-demo/components/DemoControls.tsx
"use client";

import { TacticalPanel, CommandButton } from "@/app/military-ui-kit/components";

interface Props {
  onReset: () => void;
  onTriggerOrder: () => void;
  onTriggerMessage: () => void;
  onTriggerMemory: () => void;
  onTriggerPhase: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export default function DemoControls({
  onReset,
  onTriggerOrder,
  onTriggerMessage,
  onTriggerMemory,
  onTriggerPhase,
  speed,
  onSpeedChange,
}: Props) {
  return (
    <TacticalPanel title="SIMULATION CONTROLS">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#808080]">SPEED:</span>
          {[1, 2, 5].map(s => (
            <CommandButton
              key={s}
              variant={speed === s ? "primary" : "secondary"}
              onClick={() => onSpeedChange(s)}
              className="px-3 py-1 text-xs"
            >
              {s}x
            </CommandButton>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#808080]">TRIGGER:</span>
          <CommandButton onClick={onTriggerOrder} className="px-3 py-1 text-xs">
            Order
          </CommandButton>
          <CommandButton onClick={onTriggerMessage} className="px-3 py-1 text-xs">
            Message
          </CommandButton>
          <CommandButton onClick={onTriggerMemory} className="px-3 py-1 text-xs">
            Memory
          </CommandButton>
          <CommandButton onClick={onTriggerPhase} className="px-3 py-1 text-xs">
            Phase
          </CommandButton>
        </div>

        <CommandButton variant="danger" onClick={onReset} className="px-4 py-1 text-xs">
          RESET
        </CommandButton>
      </div>
    </TacticalPanel>
  );
}
```

### Step 2: Add to main page

```typescript
// In page.tsx:
import DemoControls from "./components/DemoControls";

const [simSpeed, setSimSpeed] = useState(1);

const handleReset = () => {
  nav.jumpTo(0);
  setDataRefreshKey(k => k + 1);
};

// Add controls below game control panel:
<div className="mb-4">
  <DemoControls
    speed={simSpeed}
    onSpeedChange={setSimSpeed}
    onReset={handleReset}
    onTriggerOrder={() => console.log("Trigger order")}
    onTriggerMessage={() => console.log("Trigger message")}
    onTriggerMemory={() => console.log("Trigger memory")}
    onTriggerPhase={() => console.log("Trigger phase")}
  />
</div>
```

### Step 3: Test controls

Click buttons, verify console logs.

Expected: Buttons respond, reset works

### Step 4: Commit

```bash
git add web/src/app/military-demo/components/DemoControls.tsx web/src/app/military-demo/page.tsx
git commit -m "feat: add demo control panel for simulation"
```

---

## Task 20: Implement SSE Mock Handler (Foundation)

**Goal:** Create basic SSE handler that can stream events.

**Files:**
- Create: `web/src/app/military-demo/mocks/sse-handler.ts`
- Modify: `web/src/app/military-demo/mocks/handlers.ts`

### Step 1: Create SSE handler utility

```typescript
// web/src/app/military-demo/mocks/sse-handler.ts
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

        // Keep connection open (in real implementation, we'll add event queue)
        // For now, just send heartbeats
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

        // Cleanup on close
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
```

### Step 2: Add SSE handler to main handlers

```typescript
// In handlers.ts, add at the end:
import { createSSEHandler } from './sse-handler';

export const handlers = [
  // ... existing handlers ...
  createSSEHandler(),
];
```

### Step 3: Test SSE connection

Add useLiveEvents to page, verify connection.

```typescript
// In page.tsx:
import { useLiveEvents } from "@/hooks/useLiveEvents";

const liveEvents = useLiveEvents(DEMO_GAME_ID, {
  onEvent: (event) => console.log("SSE Event:", event)
});

// Display connection status:
<div className={`w-2 h-2 rounded-full ${liveEvents.connected ? "bg-green-400" : "bg-red-400"}`} />
```

Expected: Green dot shows, heartbeats in console

### Step 4: Commit

```bash
git add web/src/app/military-demo/mocks/sse-handler.ts web/src/app/military-demo/mocks/handlers.ts web/src/app/military-demo/page.tsx
git commit -m "feat: add SSE mock handler foundation"
```

---

## Next Phase: Advanced Features

The remaining tasks involve:
- Power status animations
- Order hover → map highlight
- Message filtering
- Memory update flash
- Tab animations
- Sound effects
- Full SSE event simulation with game_log.jsonl playback

These will be detailed in a follow-up plan after core infrastructure is verified working.

---

## Success Criteria Checklist

After completing tasks 1-20:

- [x] MSW installed and initialized
- [x] Fixture data copied and loadable
- [x] All API endpoints mocked
- [x] Demo page loads at `/military-demo`
- [x] Phase navigation works
- [x] Game data displays correctly
- [x] Orders panel shows OrderItem components
- [x] Messages panel shows MessageBubble components
- [x] Summary panel shows stats
- [x] Activity feed shows game log
- [x] Memory viewer shows power memory
- [x] Map renders with units
- [x] Demo controls present and functional
- [x] SSE connection establishes
- [ ] Full feature parity (Phase 2 plan)

---

## Execution Notes

- Each task is 2-5 minutes
- Run tests after each task (if applicable)
- Commit after each task
- If a step fails, fix before proceeding
- Keep commits small and focused
- Use exact file paths always
- Reference main app components for behavior clarity
