# Skeuomorphic UI Retrofit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:dispatching-parallel-agents and superpowers:test-driven-development while executing this plan.

**Goal:** Deliver the approved skeuomorphic retrofit with reusable shader primitives, full FSB Intelligence tabs, live-first teletype activity, and CRT framing while preserving existing game behavior.

**Architecture:** Keep existing hook/data orchestration in `MilitaryGameView` and retrofit view internals incrementally. Build reusable shader/theme primitives first, then integrate panel-by-panel with unchanged data contracts.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Tailwind utility classes, WebGL (canvas shaders), Bun test runner (`bun:test`).

---

## Task 1: Shared Shader + Material Foundation

**Files:**
- Create: `web/src/app/military-ui-kit/shaders/GlassPane.tsx`
- Create: `web/src/app/military-ui-kit/shaders/MaterialSurface.tsx`
- Create: `web/src/app/military-ui-kit/shaders/types.ts`
- Modify: `web/src/app/military-ui-kit/components.tsx`
- Create: `web/public/materials/normals/leather-normal.jpg`
- Create: `web/public/materials/normals/brass-normal.jpg`
- Create: `web/public/materials/normals/steel-normal.jpg`
- Create: `web/public/materials/normals/README.md`

**Step 1: Write failing tests (pure helpers)**
- Add tests for shader preset/config helper behavior:
  - material preset lookup returns expected static coefficients
  - strict mode does not throw when WebGL is unavailable

**Step 2: Run tests and confirm failure**
- Run: `bun test web/src/app/military-ui-kit/shaders/*.test.ts`
- Expected: missing module/helper failures.

**Step 3: Implement minimal primitives**
- Add reusable `GlassPane` and `MaterialSurface` with strict WebGL behavior.
- Add preset helpers used by tests.
- Export primitives via `components.tsx`.

**Step 4: Run tests and confirm pass**
- Run: `bun test web/src/app/military-ui-kit/shaders/*.test.ts`

**Step 5: Add and document normal assets**
- Vendor approved normal maps into `web/public/materials/normals/`.
- Add source attribution + usage note.

## Task 2: Intelligence Factory Status Board (Orders, Messages, Summary)

**Files:**
- Create: `web/src/app/military-demo/components/intel/fsb-utils.ts`
- Create: `web/src/app/military-demo/components/intel/fsb-utils.test.ts`
- Modify: `web/src/app/military-demo/components/OrderPanel.tsx`
- Modify: `web/src/app/military-demo/components/MessagePanel.tsx`
- Modify: `web/src/app/military-demo/components/SummaryPanel.tsx`

**Step 1: Write failing tests for data shaping**
- Test deterministic row shaping for:
  - orders row extraction (`Power | Unit | Order | Result | Status`)
  - message thread summary rows
  - summary metric row formatting

**Step 2: Run tests and confirm failure**
- Run: `bun test web/src/app/military-demo/components/intel/fsb-utils.test.ts`

**Step 3: Implement helper shaping logic**
- Implement `fsb-utils.ts` until tests pass.

**Step 4: Retrofit panel UIs to FSB shell**
- Render table-based FSB views in Orders/Messages/Summary.
- Preserve current props and behaviors (hover, unread, live indicators, existing data fetch semantics).

**Step 5: Re-run tests**
- Run: `bun test web/src/app/military-demo/components/intel/fsb-utils.test.ts`

## Task 3: Teletype Activity (Live-First + Backlog)

**Files:**
- Create: `web/src/app/military-demo/components/activity/teletype-utils.ts`
- Create: `web/src/app/military-demo/components/activity/teletype-utils.test.ts`
- Modify: `web/src/app/military-demo/components/ActivityFeed.tsx`

**Step 1: Write failing tests for queue/format behavior**
- Validate:
  - backlog-first ordering
  - bounded buffer trimming
  - event -> printable line formatting

**Step 2: Run tests and confirm failure**
- Run: `bun test web/src/app/military-demo/components/activity/teletype-utils.test.ts`

**Step 3: Implement utils and teletype renderer**
- Build typing queue engine + line formatters.
- Wire gear/LED state to active queue.
- Preserve existing input props contract.

**Step 4: Run tests and confirm pass**
- Run: `bun test web/src/app/military-demo/components/activity/teletype-utils.test.ts`

## Task 4: Integration Wiring (Nav Glass + CRT Frame)

**Files:**
- Modify: `web/src/app/military-demo/components/MilitaryGameView.tsx`
- Modify: `web/src/app/military-demo/components/PhaseTimeline.tsx`
- Modify: `web/src/app/military-demo/components/CRTMap.tsx`

**Step 1: Integrate shared primitives**
- Apply `GlassPane` over phase strip.
- Apply material surfaces where needed for metallic continuity.

**Step 2: Add CRT physical frame shell**
- Keep map behavior unchanged, add monitor-style framing around current CRT map.

**Step 3: Validate responsive behavior**
- Check no overlap/clipping regressions on small and large breakpoints.

## Task 5: End-to-End Verification

**Files:**
- No new product files unless fixups are needed.

**Step 1: Run focused tests**
- `bun test web/src/app/military-ui-kit/shaders/*.test.ts`
- `bun test web/src/app/military-demo/components/intel/fsb-utils.test.ts`
- `bun test web/src/app/military-demo/components/activity/teletype-utils.test.ts`

**Step 2: Run build/type verification**
- `cd web && bun run build`

**Step 3: Manual parity checklist**
- Phase nav + timeline select
- Map interactions + CRT toggle
- Orders hover-to-map behavior
- Intelligence tabs + unread badge behavior
- Teletype backlog and live streaming behavior

**Step 4: Report evidence**
- Include exact command outcomes and any known residual risks.
