# Military Demo - Isolated Full-Featured Demo Design

**Date**: 2026-02-09
**Status**: Approved
**Purpose**: Create isolated military-themed demo with MSW mocks for testing before main app refactor

## Overview

Build a fully functional military-themed version of the Diplomacy game viewer at `/military-demo` that uses production-ready military UI components with MSW (Mock Service Worker) to simulate the full backend. This serves as a test bed - if successful, the main app will be refactored to use the military theme.

## Goals

1. **1:1 Feature Parity**: Every interaction, animation, and micro-detail from main GameView
2. **Use Production Components**: Leverage existing `/military-ui-kit/components.tsx` (not recreate)
3. **Complete Data Flow**: MSW mocks all APIs + SSE streams using real game fixture data
4. **Zero Backend**: Runs entirely in browser with mock data
5. **Testbed for Refactor**: Proves military theme can replace main app without regression

## Architecture

### Mock Service Worker (MSW) Setup

**Why MSW**: Intercepts fetch/SSE at network level, so all existing hooks work unchanged.

**Endpoints to Mock**:
- `/api/games/:gameId/phases/:phase/state` → game_state.json
- `/api/games/:gameId/phases/:phase/orders` → orders.json
- `/api/games/:gameId/phases/:phase/messages` → messages.json
- `/api/games/:gameId/phases/:phase/results` → results.json
- `/api/games/:gameId/memory/:power?phase=X` → power memory files
- `/api/games/:gameId/phases` → phase list
- `/api/games/:gameId/log` → game_log.jsonl
- `/api/games/:gameId/events` → SSE stream (special handler)

**Fixture Data Source**: Copy from `game_output/` (real game snapshots)

### File Structure

```
/app/military-demo/
├── page.tsx                      # Main demo page
├── layout.tsx                    # Enables MSW for this route
├── mocks/
│   ├── browser.ts                # MSW browser setup
│   ├── handlers.ts               # API endpoint handlers
│   ├── sse-handler.ts            # SSE event stream mock
│   └── fixtures/
│       ├── game-data.ts          # Fixture loader utility
│       ├── S1901M/               # Phase snapshots (copied from game_output)
│       ├── F1901M/
│       ├── ...
│       ├── game_log.jsonl        # Event stream data
│       └── memory/
│           ├── FRANCE_memory.md
│           └── ...
└── components/
    ├── MilitaryGameView.tsx      # Main layout (uses military components)
    ├── MilitaryDemoControls.tsx  # Simulation control panel
    └── ...
```

### Component Integration

**Use Existing Components** from `/app/military-ui-kit/components.tsx`:
- `Rivet` - Steel rivet decorations
- `TacticalPanel` - Container with rivets
- `CommandButton` - Military buttons
- `OrderItem` - Order display with status glows
- `MessageBubble` - Message display with rivets
- `PhaseTimeline` - Phase indicator boxes
- `ActionLog` - Activity feed

**Modify Components As Needed**:
If military components lack features from main app (hover handlers, animations, etc.), update them to support full parity.

### Data Flow

```
User Action → Component → Hook (useGameData, etc.)
    → fetch() → MSW Intercept → Fixture Data
    → Hook receives data → Component updates
```

SSE Flow:
```
useLiveEvents hook → EventSource('/api/games/demo/events')
    → MSW SSE Handler → Stream events from game_log.jsonl
    → Hook receives events → Components update
```

## Feature Checklist

### Navigation & Controls
- [x] Phase navigation (prev/next)
- [x] Phase timeline (clickable boxes)
- [ ] Playback mode (step-by-step order reveal)
- [x] Live connection indicator
- [ ] Auto-scroll to active order

### Tabs & Panels
- [x] Left sidebar with 3 tabs (orders/messages/summary)
- [ ] Unread message badge
- [ ] Tab transition animations

### Orders Panel
- [x] Order list with status colors
- [ ] Hover order → highlight on map
- [ ] Click order → focus on map
- [ ] Live order submission animation
- [ ] Sound effects

### Messages Panel
- [x] Message bubbles
- [ ] Message filtering
- [ ] Sound effect on new message
- [ ] Auto-scroll to latest

### Map Interactions
- [x] Unit display
- [ ] Territory hover tooltip
- [ ] Territory click → power info
- [ ] Order visualization (arrows, support lines)
- [ ] Unit transition animations

### Activity Feed
- [x] Event stream with power chips
- [ ] Power status dots with animations (thinking/talking/submitted)
- [ ] Click event → jump to tab
- [ ] Real-time updates

### Memory Viewer
- [x] Power selection
- [x] Markdown rendering
- [ ] Live memory update flash
- [ ] Memory diff view

### Sound Effects
- [ ] Phase complete
- [ ] Order submitted
- [ ] Message received
- [ ] Game halted

### Phase Transition
- [ ] Overlay animation
- [ ] Sound effect

## Simulation Controls

Demo control panel (TacticalPanel at top):

**Playback Speed**:
- 1x / 2x / 5x speed buttons

**Manual Event Triggers**:
- "Order Submitted" → Emit orders.submitted event
- "New Message" → Emit message.flushed event
- "Memory Update" → Emit memory.changed event
- "Phase Complete" → Emit phase.end + snapshot.saved events

**Reset**:
- Reset demo to initial state (S1901M)

## Implementation Plan

### Phase 1: Setup & Infrastructure
1. Install MSW (`bun add -D msw`)
2. Initialize MSW (`npx msw init public/ --save`)
3. Copy fixture data from `game_output/` to `app/military-demo/mocks/fixtures/`
4. Create MSW browser instance
5. Create API handlers (handlers.ts)
6. Create fixture loader utility (game-data.ts)
7. Create layout.tsx to enable MSW for `/military-demo` route

### Phase 2: Component Integration
1. Extract/organize military components for import
2. Build MilitaryGameView layout (3-column structure)
3. Wire up all hooks (useGameData, usePhases, useLiveEvents, etc.)
4. Implement left sidebar with tabs (orders/messages/summary)
5. Implement right sidebar (activity feed + memory viewer)
6. Implement top nav (phase controls + timeline)

### Phase 3: Missing Interactions
1. Order hover → map highlight
2. Power status animations (thinking/talking/submitted dots)
3. Message filtering UI
4. Memory update flash indicator
5. Tab transition animations
6. Auto-scroll behaviors
7. Sound effects integration
8. Phase transition overlay

### Phase 4: Live Features
1. SSE handler implementation (sse-handler.ts)
2. Event streaming from game_log.jsonl
3. Playback speed control
4. Manual event triggers
5. Demo control panel component

### Phase 5: Polish & Testing
1. All micro-interactions (hover states, click feedback)
2. Verify 1:1 parity with main app
3. Fix styling inconsistencies
4. Performance testing
5. Cross-browser testing

## Success Criteria

- [ ] Demo runs at `/military-demo` without Python backend
- [ ] All main app features work identically
- [ ] All hooks receive correct data from MSW
- [ ] SSE events stream properly
- [ ] Phase navigation works forward/backward
- [ ] Order playback animates smoothly
- [ ] All tabs functional
- [ ] Map interactions work
- [ ] Sound effects trigger correctly
- [ ] Demo controls allow manual event simulation
- [ ] Can "play through" entire game with realistic timing
- [ ] No visual regressions vs main app
- [ ] Military theme looks polished and production-ready

## Next Steps

1. Create git worktree for isolated development
2. Create detailed implementation plan (task breakdown)
3. Begin Phase 1 implementation
4. Iterate with user feedback after each phase

## Notes

- This is a **testbed for main app refactor** - if successful, main app gets military theme
- Must maintain 100% feature parity - no shortcuts
- Update military components as needed to support all interactions
- Focus on polish and micro-interactions - this is a showcase
