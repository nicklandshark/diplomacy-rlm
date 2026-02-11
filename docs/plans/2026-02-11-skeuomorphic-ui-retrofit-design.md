# Military Demo - Skeuomorphic Retrofit Design

**Date**: 2026-02-11  
**Status**: Approved  
**Purpose**: Retrofit the existing military demo UI with polished skeuomorphic surfaces, reusable glass/material shaders, and integrated activity/intelligence experiences without changing core game behavior.

## Scope Decisions (Locked)

1. Intelligence uses **Factory Status Board (FSB)** styling for all tabs.
2. Orders layout: `Power | Unit | Order | Result | Status` table rows.
3. Keep existing three tabs in Intelligence: `Orders`, `Messages`, `Summary`.
4. Teletype activity mode: **live-first + backlog** (preload recent items, then stream live).
5. Reusable glass effect via shader (`GlassPane`) with **strict shader-only behavior** (no fallback layer).
6. Reusable material-surface shader with normal maps for leather/brass/steel.
7. Material lighting is **static** (no animated sweeps).
8. Normal-map assets are stored in-repo (not loaded from external URLs at runtime).

## Goals

1. Preserve all existing gameplay/data behavior in `MilitaryGameView`.
2. Improve visual fidelity with coherent steel/brass/leather treatment.
3. Make shader effects reusable across multiple UI regions.
4. Keep performance stable while adding visual depth.
5. Maintain responsive behavior across current breakpoints.

## Non-Goals

1. No rewrite of data hooks or backend API contracts.
2. No change to CRT map interaction model.
3. No animation-heavy physically based rendering system.
4. No fallback glass/material look-alikes when shader init fails.

## Architecture

### Strategy: Incremental Retrofit + Theme Foundation

- Keep existing page/component orchestration in:
  - `web/src/app/military-demo/components/MilitaryGameView.tsx`
- Add shared visual primitives first, then swap view internals.
- Reuse existing hook-driven data flow and tab state.

### New/Reworked Shared UI Primitives

1. `GlassPane`
   - Reusable wrapper for shader-based glass distortion/highlight.
   - Configurable options (distortion, gloss, edge tint).
   - Strict mode: if shader initialization fails, no effect layer is rendered.

2. `MaterialSurface`
   - Reusable normal-mapped surface shader with static lighting.
   - Material presets:
     - `steel`: cool, higher specular response.
     - `brass`: warm tint, tighter highlights.
     - `leather`: low specular, soft rough surface response.

3. Theme Tokens
   - Centralized metallic/brass/paper/glow colors and gradients.
   - Shared shell patterns for panels, rails, plates, and frame trims.

### Primary Integration Targets

1. Top navigation phase strip:
   - Wrap scroller with `GlassPane` to get "under glass" feel.
2. Intelligence panel:
   - Replace visual internals with FSB table views for all tabs.
3. Activity panel:
   - Replace current event list internals with teletype rendering engine.
4. CRT map region:
   - Keep map behavior; add monitor-style frame shell.

## Data Flow

Core data flow is unchanged:

`hooks -> MilitaryGameView props/state -> child panels`

### Teletype Data Flow

1. Build initial queue from existing game-log/live event inputs.
2. Print backlog entries character-by-character into paper viewport.
3. Subscribe to live events and enqueue newly arriving entries.
4. Transition hardware states:
   - Queue active: faster gear + active receive indicator.
   - Queue idle: steady receive indicator + slow gear.
5. Trim old printed entries based on bounded buffer size.

### Intelligence FSB Data Flow

1. Orders tab reads existing merged order/result data.
2. Messages tab reads existing thread/live message data.
3. Summary tab reads existing summary/statistics data.
4. Existing tab selection and unread count logic remain in `MilitaryGameView`.

## Assets

Normal maps will be vendored under:

- `web/public/materials/normals/leather-normal.jpg`
- `web/public/materials/normals/brass-normal.jpg`
- `web/public/materials/normals/steel-normal.jpg`

Attribution/source notes will be stored with the assets in a short README.

## Error Handling

1. Shader initialization failures:
   - Do not crash layout or block interaction.
   - Skip rendering the failed shader layer.
   - Emit console warning in development.

2. Missing/failed normal-map assets:
   - Skip material shader layer for affected surface.
   - Preserve base CSS panel styling.

3. Event stream irregularities:
   - Teletype queue ignores malformed entries safely.
   - Keep renderer alive even if single entry parse fails.

## Performance Constraints

1. Keep shader scope narrow (only intended surfaces).
2. Reuse render loops; avoid multiple redundant animation loops.
3. Keep teletype typing cadence bounded to avoid long blocking bursts.
4. Bound printed log DOM size to prevent unbounded growth.

## Testing and Verification

### Functional Parity

1. Phase nav previous/next/select still works.
2. Map interactions (hover/focus/zoom/pan/click) still work.
3. Orders hover still drives map focus as before.
4. Tab switching and unread counts still update correctly.
5. Live events update activity and panel states.

### Visual Validation

1. Phase strip reads as beneath curved glass.
2. Steel/brass/leather treatment is consistent across major shells.
3. CRT map appears inside framed monitor surface without clipping regressions.
4. Teletype paper/readability remains strong in motion and idle states.

### Resilience Validation

1. Disable WebGL and confirm app remains usable without shader layers.
2. Simulate missing material texture and confirm graceful degradation.

### Performance Validation

1. Verify no major frame drops during active teletype printing.
2. Validate scrolling and input responsiveness under live updates.

## Execution Order

1. Add theme tokens + shared steel/brass/leather shell utilities.
2. Add shader primitives (`GlassPane`, `MaterialSurface`) and local normal assets.
3. Integrate `GlassPane` into phase strip.
4. Retrofit Intelligence tab internals to FSB rows/tables.
5. Retrofit Activity panel into teletype backlog+live printer.
6. Add CRT frame shell around existing map component.
7. Run parity/perf/resilience validation and polish.

## Acceptance Criteria

1. All locked scope decisions are visible in UI behavior.
2. Existing data interactions remain correct.
3. No blocker regressions in navigation/map/live updates.
4. Shader-based glass/material system is reusable and used in the intended first targets.
5. UI feels materially cohesive (metal/brass/leather/paper) without changing game logic.
