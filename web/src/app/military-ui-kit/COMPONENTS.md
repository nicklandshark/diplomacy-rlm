# Military UI Kit - Component Mapping

This document shows the 1:1 mapping between main app components and their Military-themed equivalents.

## Component Mapping Table

| Main App Component | Military Component | Location | Status |
|-------------------|-------------------|----------|--------|
| `PowerBadge` | `MilitaryPowerBadge` | `/demo/page.tsx` | ✅ Complete |
| `PhaseControls` | `MilitaryPhaseControls` | `/demo/page.tsx` | ✅ Complete |
| `PhaseTimeline` | `MilitaryPhaseTimeline` | `/demo/page.tsx` | ✅ Complete |
| `MessageBubble` | `MilitaryMessageBubble` | `/demo/page.tsx` | ✅ Complete |
| `MessageList` | `MilitaryMessageList` | `/demo/page.tsx` | ✅ Complete |
| `ActivityFeed` | `MilitaryActivityFeed` | `/demo/page.tsx` | ✅ Complete |
| `ActivityItem` | `MilitaryActivityItem` | `/demo/page.tsx` | ✅ Complete |
| `MemoryViewer` | `MilitaryMemoryViewer` | `/demo/page.tsx` | ✅ Complete |
| Order display | `MilitaryOrderItem` | `/demo/page.tsx` | ✅ Complete |
| `DiplomacyMap` | `MilitaryMapPlaceholder` | `/demo/page.tsx` | ✅ Complete (placeholder) |

## Additional Military Components

These components are available in `/page.tsx` but not direct 1:1 mappings:

- `Rivet` - Decorative military hardware aesthetic element
- `TacticalPanel` - Container with military styling
- `CommandButton` - Military-styled button with variants
- `UnitCounter` - Display unit counts with icons
- `ProgressBar` - Military-themed progress indicator
- `AlertBanner` - Tactical alert display
- `PowerStatusCard` - Full power status panel
- `PhaseDisplay` - Current phase indicator
- `ActionLog` - Scrolling action history
- `TerritoryMarker` - Map territory indicator
- `NotificationToast` - Slide-in notification

## Pixel Art Icons

All available in `/icons/page.tsx`:

- `PixelArmyIcon` - Infantry unit
- `PixelFleetIcon` - Naval unit
- `PixelTankIcon` - Armor unit
- `PixelPlaneIcon` - Air unit
- `PixelArtilleryIcon` - Artillery unit
- `PixelCavalryIcon` - Cavalry unit
- `PixelSupplyIcon` - Supply crate

Plus group versions of each icon.

## Design System

The Military UI Kit uses a consistent design language:

### Colors
```css
--bg-deep: #0a0a0a       /* Darkest background */
--bg-dark: #1a1a1a       /* Panel background */
--bg-panel: #2a2a2a      /* Elevated panels */
--accent-amber: #ff9500  /* Primary accent (warning/active) */
--accent-red: #dc143c    /* Danger/failed */
--accent-green: #4a7c59  /* Success/completed */
--text-primary: #e0e0e0  /* Main text */
--text-dim: #808080      /* Secondary text */
--border-steel: #3a3a3a  /* Border color */
```

### Visual Elements
- **Rivets**: Industrial hardware aesthetic using `Rivet` component
- **Inset shadows**: All panels use `inset 0 2px 4px rgba(0,0,0,0.6)`
- **Border styling**: 2px solid borders with steel colors
- **No rounded corners**: Hard military angles
- **Pixel art**: All icons use `imageRendering: "pixelated"`

## Usage

### View the Demo
Visit `/military-ui-kit/demo` to see the full Military-themed version of the main app.

### Use Individual Components
Import and use military components from `/military-ui-kit/demo/page.tsx` or `/military-ui-kit/page.tsx`.

### Component Library Page
Visit `/military-ui-kit` to see all individual components with examples.

### Icon Library
Visit `/military-ui-kit/icons` to see all pixel art icons.

## Demo Page Features

The `/demo` page replicates the full main app layout:

1. **Top Navigation Bar**
   - Game ID display
   - Phase controls (prev/play/next)
   - Phase timeline (clickable phase boxes)
   - Live connection indicator

2. **Left Sidebar** (3 tabs)
   - Orders: List of unit orders with status
   - Messages: Diplomatic message history
   - Summary: Game statistics

3. **Center Panel**
   - Map placeholder (can be replaced with actual DiplomacyMap)

4. **Right Sidebar** (2 sections)
   - Activity Feed: Live event stream with power chips
   - Memory Viewer: Power-specific strategic notes

All components use the military aesthetic with rivets, steel borders, and tactical styling.
