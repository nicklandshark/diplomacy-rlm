"use client";

import { useState } from "react";

// Design System CSS Variables
const cssVariables = `
:root {
  --bg-deep: #0a0a0a;
  --bg-dark: #1a1a1a;
  --bg-panel: #2a2a2a;
  --accent-amber: #ff9500;
  --accent-red: #dc143c;
  --accent-green: #4a7c59;
  --text-primary: #e0e0e0;
  --text-dim: #808080;
  --border-steel: #3a3a3a;
  --rivet-silver: #5a5a5a;
  --shadow-deep: rgba(0, 0, 0, 0.8);
}

/* Steel texture noise pattern */
@keyframes grain {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-5%, -10%); }
  20% { transform: translate(-15%, 5%); }
  30% { transform: translate(7%, -25%); }
  40% { transform: translate(-5%, 25%); }
  50% { transform: translate(-15%, 10%); }
  60% { transform: translate(15%, 0%); }
  70% { transform: translate(0%, 15%); }
  80% { transform: translate(3%, 35%); }
  90% { transform: translate(-10%, 10%); }
}

/* Pulse animation for notifications */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 10px var(--glow-color, #ff9500); }
  50% { box-shadow: 0 0 20px var(--glow-color, #ff9500), 0 0 30px var(--glow-color, #ff9500); }
}

/* Slide in from right */
@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Fade and scale in */
@keyframes fade-scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Shimmer effect */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

// Enhanced Pixel Art Icons for Units - More detail and depth
const PixelArmyIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Helmet - more detail */}
    <rect x="5" y="2" width="6" height="1" fill={color} />
    <rect x="4" y="3" width="8" height="1" fill={color} />
    <rect x="4" y="4" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="11" y="4" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="5" y="4" width="6" height="1" fill={color} />
    {/* Helmet highlight */}
    <rect x="6" y="2" width="2" height="1" fill="#ffffff" opacity="0.4" />
    {/* Face/Head */}
    <rect x="6" y="5" width="4" height="2" fill="#d4a574" />
    <rect x="7" y="5" width="1" height="1" fill="#e8c4a0" opacity="0.5" />
    {/* Eyes */}
    <rect x="6" y="6" width="1" height="1" fill="#3a3a3a" />
    <rect x="9" y="6" width="1" height="1" fill="#3a3a3a" />
    {/* Body/Armor - detailed */}
    <rect x="5" y="7" width="6" height="5" fill={color} />
    <rect x="6" y="8" width="4" height="1" fill={color} opacity="0.5" />
    <rect x="7" y="9" width="2" height="2" fill={color} opacity="0.7" />
    {/* Chest plate highlight */}
    <rect x="6" y="7" width="1" height="2" fill="#ffffff" opacity="0.3" />
    {/* Belt */}
    <rect x="5" y="10" width="6" height="1" fill="#8b4513" />
    <rect x="7" y="10" width="2" height="1" fill="#d4a574" opacity="0.5" />
    {/* Arms with detail */}
    <rect x="3" y="8" width="2" height="4" fill={color} />
    <rect x="11" y="8" width="2" height="4" fill={color} />
    <rect x="3" y="9" width="1" height="1" fill={color} opacity="0.6" />
    <rect x="12" y="9" width="1" height="1" fill={color} opacity="0.6" />
    {/* Hands */}
    <rect x="3" y="11" width="2" height="1" fill="#d4a574" />
    <rect x="11" y="11" width="2" height="1" fill="#d4a574" />
    {/* Legs with shading */}
    <rect x="5" y="12" width="2" height="3" fill={color} />
    <rect x="9" y="12" width="2" height="3" fill={color} />
    <rect x="6" y="12" width="1" height="2" fill={color} opacity="0.6" />
    <rect x="9" y="12" width="1" height="2" fill={color} opacity="0.6" />
    {/* Weapon - detailed rifle */}
    <rect x="1" y="7" width="2" height="1" fill="#3a3a3a" />
    <rect x="2" y="8" width="1" height="3" fill="#5a5a5a" />
    <rect x="2" y="11" width="1" height="1" fill="#8b4513" />
    {/* Weapon highlight */}
    <rect x="2" y="8" width="1" height="1" fill="#808080" />
  </svg>
);

const PixelFleetIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Flag */}
    <rect x="7" y="1" width="3" height="2" fill="#dc143c" />
    <rect x="8" y="1" width="1" height="1" fill="#ff4444" opacity="0.6" />
    {/* Mast with detail */}
    <rect x="7" y="2" width="2" height="9" fill="#8b4513" />
    <rect x="7" y="3" width="1" height="7" fill="#a0522d" opacity="0.5" />
    {/* Crow's nest */}
    <rect x="6" y="5" width="4" height="1" fill="#6b3410" />
    {/* Main sail */}
    <rect x="9" y="3" width="5" height="6" fill={color} />
    <rect x="10" y="4" width="3" height="4" fill={color} opacity="0.5" />
    <rect x="11" y="5" width="2" height="2" fill={color} opacity="0.7" />
    {/* Sail highlights */}
    <rect x="9" y="3" width="1" height="4" fill="#ffffff" opacity="0.3" />
    {/* Small front sail */}
    <rect x="3" y="6" width="3" height="3" fill={color} />
    <rect x="4" y="7" width="1" height="1" fill={color} opacity="0.5" />
    {/* Hull with shading */}
    <rect x="3" y="10" width="10" height="4" fill={color} />
    <rect x="4" y="9" width="8" height="1" fill={color} />
    <rect x="5" y="11" width="7" height="1" fill={color} opacity="0.5" />
    <rect x="6" y="12" width="5" height="1" fill={color} opacity="0.7" />
    {/* Hull detail */}
    <rect x="5" y="10" width="6" height="1" fill="#ffffff" opacity="0.2" />
    {/* Portholes */}
    <rect x="5" y="11" width="1" height="1" fill="#3a3a3a" />
    <rect x="7" y="11" width="1" height="1" fill="#3a3a3a" />
    <rect x="9" y="11" width="1" height="1" fill="#3a3a3a" />
    {/* Bow and stern */}
    <rect x="2" y="11" width="1" height="3" fill={color} />
    <rect x="13" y="11" width="1" height="3" fill={color} />
    <rect x="2" y="12" width="1" height="1" fill={color} opacity="0.6" />
    {/* Water with waves */}
    <rect x="1" y="14" width="14" height="1" fill="#2a5a7a" opacity="0.4" />
    <rect x="2" y="13" width="2" height="1" fill="#4a7c9f" opacity="0.3" />
    <rect x="6" y="13" width="2" height="1" fill="#4a7c9f" opacity="0.3" />
    <rect x="10" y="13" width="2" height="1" fill="#4a7c9f" opacity="0.3" />
  </svg>
);

const PixelTankIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Turret with detail */}
    <rect x="6" y="4" width="5" height="4" fill={color} />
    <rect x="7" y="5" width="3" height="2" fill={color} opacity="0.5" />
    <rect x="8" y="6" width="1" height="1" fill={color} opacity="0.7" />
    {/* Turret highlights */}
    <rect x="6" y="4" width="2" height="1" fill="#ffffff" opacity="0.3" />
    {/* Hatch */}
    <rect x="7" y="5" width="2" height="1" fill="#3a3a3a" />
    {/* Gun barrel with detail */}
    <rect x="11" y="5" width="3" height="2" fill={color} />
    <rect x="11" y="6" width="3" height="1" fill={color} opacity="0.6" />
    {/* Barrel muzzle */}
    <rect x="14" y="5" width="1" height="2" fill="#3a3a3a" />
    {/* Barrel highlight */}
    <rect x="11" y="5" width="2" height="1" fill="#ffffff" opacity="0.2" />
    {/* Hull with armor plates */}
    <rect x="4" y="8" width="9" height="4" fill={color} />
    <rect x="5" y="9" width="7" height="2" fill={color} opacity="0.5" />
    <rect x="6" y="10" width="5" height="1" fill={color} opacity="0.7" />
    {/* Hull panels */}
    <rect x="5" y="8" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="8" y="8" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="11" y="8" width="1" height="3" fill={color} opacity="0.3" />
    {/* Tracks with wheels */}
    <rect x="3" y="12" width="11" height="3" fill="#2a2a2a" />
    <rect x="3" y="12" width="11" height="1" fill="#3a3a3a" />
    {/* Track wheels */}
    <rect x="4" y="12" width="2" height="2" fill="#4a4a4a" />
    <rect x="7" y="12" width="2" height="2" fill="#4a4a4a" />
    <rect x="10" y="12" width="2" height="2" fill="#4a4a4a" />
    {/* Wheel centers */}
    <rect x="5" y="13" width="1" height="1" fill="#606060" />
    <rect x="8" y="13" width="1" height="1" fill="#606060" />
    <rect x="11" y="13" width="1" height="1" fill="#606060" />
    {/* Front and rear armor */}
    <rect x="2" y="10" width="2" height="2" fill={color} />
    <rect x="13" y="9" width="1" height="3" fill={color} />
  </svg>
);

const PixelPlaneIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Propeller blades */}
    <rect x="5" y="1" width="6" height="1" fill="#606060" />
    <rect x="7" y="0" width="2" height="3" fill="#606060" />
    {/* Propeller center */}
    <rect x="7" y="2" width="2" height="1" fill="#3a3a3a" />
    {/* Nose cone */}
    <rect x="7" y="3" width="2" height="2" fill={color} />
    <rect x="7" y="3" width="1" height="1" fill="#ffffff" opacity="0.3" />
    {/* Fuselage with panels */}
    <rect x="7" y="5" width="2" height="7" fill={color} />
    <rect x="7" y="6" width="2" height="1" fill={color} opacity="0.5" />
    <rect x="7" y="9" width="2" height="1" fill={color} opacity="0.5" />
    {/* Cockpit canopy */}
    <rect x="6" y="6" width="4" height="3" fill="#4a7c9f" opacity="0.7" />
    <rect x="7" y="6" width="2" height="2" fill="#6a9cbf" opacity="0.4" />
    {/* Cockpit frame */}
    <rect x="6" y="6" width="1" height="3" fill={color} />
    <rect x="9" y="6" width="1" height="3" fill={color} />
    {/* Main wings with detail */}
    <rect x="1" y="8" width="14" height="3" fill={color} />
    <rect x="2" y="9" width="12" height="1" fill={color} opacity="0.5" />
    <rect x="3" y="10" width="10" height="1" fill={color} opacity="0.7" />
    {/* Wing highlights */}
    <rect x="2" y="8" width="2" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="12" y="8" width="2" height="1" fill="#ffffff" opacity="0.2" />
    {/* Ailerons */}
    <rect x="1" y="9" width="1" height="1" fill={color} opacity="0.8" />
    <rect x="14" y="9" width="1" height="1" fill={color} opacity="0.8" />
    {/* Vertical stabilizer */}
    <rect x="7" y="11" width="2" height="1" fill={color} />
    <rect x="6" y="12" width="4" height="2" fill={color} />
    <rect x="7" y="12" width="2" height="1" fill={color} opacity="0.5" />
    {/* Horizontal stabilizers */}
    <rect x="4" y="13" width="8" height="1" fill={color} />
    <rect x="5" y="13" width="6" height="1" fill={color} opacity="0.6" />
    {/* Fuselage highlight */}
    <rect x="7" y="5" width="1" height="5" fill="#ffffff" opacity="0.2" />
  </svg>
);

const PixelArtilleryIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Barrel with detail */}
    <rect x="4" y="5" width="9" height="3" fill={color} />
    <rect x="5" y="6" width="7" height="1" fill={color} opacity="0.5" />
    <rect x="6" y="6" width="5" height="1" fill={color} opacity="0.7" />
    {/* Barrel bands */}
    <rect x="6" y="5" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="9" y="5" width="1" height="3" fill={color} opacity="0.3" />
    {/* Muzzle */}
    <rect x="13" y="5" width="2" height="3" fill={color} />
    <rect x="14" y="6" width="1" height="1" fill="#3a3a3a" />
    {/* Barrel highlight */}
    <rect x="5" y="5" width="3" height="1" fill="#ffffff" opacity="0.2" />
    {/* Recoil mechanism */}
    <rect x="5" y="8" width="3" height="1" fill={color} opacity="0.7" />
    {/* Mounting bracket */}
    <rect x="6" y="8" width="5" height="2" fill={color} opacity="0.8" />
    <rect x="7" y="9" width="3" height="1" fill={color} opacity="0.5" />
    {/* Shield */}
    <rect x="3" y="7" width="3" height="3" fill={color} />
    <rect x="4" y="8" width="1" height="1" fill={color} opacity="0.5" />
    {/* Base/Trail */}
    <rect x="4" y="10" width="9" height="2" fill={color} />
    <rect x="5" y="11" width="7" height="1" fill={color} opacity="0.5" />
    <rect x="6" y="11" width="5" height="1" fill={color} opacity="0.7" />
    {/* Trail detail */}
    <rect x="5" y="10" width="1" height="1" fill="#ffffff" opacity="0.2" />
    {/* Wheels with spokes */}
    <rect x="5" y="12" width="3" height="3" fill="#3a3a3a" />
    <rect x="9" y="12" width="3" height="3" fill="#3a3a3a" />
    {/* Wheel rims */}
    <rect x="5" y="12" width="3" height="1" fill="#4a4a4a" />
    <rect x="9" y="12" width="3" height="1" fill="#4a4a4a" />
    {/* Wheel hubs */}
    <rect x="6" y="13" width="1" height="1" fill="#606060" />
    <rect x="10" y="13" width="1" height="1" fill="#606060" />
    {/* Spokes */}
    <rect x="6" y="12" width="1" height="3" fill="#4a4a4a" opacity="0.5" />
    <rect x="10" y="12" width="1" height="3" fill="#4a4a4a" opacity="0.5" />
  </svg>
);

const PixelCavalryIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Rider helmet with plume */}
    <rect x="9" y="2" width="3" height="1" fill="#dc143c" />
    <rect x="10" y="1" width="1" height="1" fill="#dc143c" />
    <rect x="9" y="3" width="3" height="2" fill={color} />
    <rect x="10" y="3" width="1" height="1" fill="#ffffff" opacity="0.3" />
    {/* Rider face */}
    <rect x="10" y="4" width="1" height="1" fill="#d4a574" />
    {/* Rider body/armor */}
    <rect x="8" y="5" width="4" height="4" fill={color} />
    <rect x="9" y="6" width="2" height="2" fill={color} opacity="0.5" />
    <rect x="10" y="7" width="1" height="1" fill={color} opacity="0.7" />
    {/* Chest plate detail */}
    <rect x="9" y="5" width="1" height="2" fill="#ffffff" opacity="0.2" />
    {/* Shoulder guard */}
    <rect x="8" y="5" width="1" height="2" fill={color} opacity="0.7" />
    {/* Sword/saber */}
    <rect x="12" y="4" width="2" height="1" fill="#c0c0c0" />
    <rect x="13" y="5" width="1" height="1" fill="#8b4513" />
    {/* Rider legs in stirrups */}
    <rect x="7" y="9" width="2" height="2" fill={color} />
    <rect x="11" y="9" width="2" height="2" fill={color} />
    <rect x="8" y="9" width="1" height="1" fill={color} opacity="0.6" />
    {/* Boots */}
    <rect x="7" y="10" width="2" height="1" fill="#3a3a3a" />
    <rect x="11" y="10" width="2" height="1" fill="#3a3a3a" />
    {/* Horse head with detail */}
    <rect x="3" y="5" width="4" height="4" fill="#8b4513" />
    <rect x="2" y="6" width="1" height="2" fill="#8b4513" />
    <rect x="4" y="6" width="2" height="2" fill="#a0522d" opacity="0.5" />
    {/* Horse eye */}
    <rect x="4" y="6" width="1" height="1" fill="#3a3a3a" />
    {/* Mane */}
    <rect x="5" y="5" width="2" height="1" fill="#6b3410" />
    <rect x="6" y="4" width="1" height="1" fill="#6b3410" />
    {/* Bridle */}
    <rect x="3" y="7" width="3" height="1" fill="#5a5a5a" />
    {/* Horse body with shading */}
    <rect x="6" y="8" width="5" height="3" fill="#8b4513" />
    <rect x="7" y="9" width="3" height="1" fill="#a0522d" opacity="0.4" />
    <rect x="8" y="9" width="2" height="1" fill="#a0522d" opacity="0.6" />
    {/* Saddle */}
    <rect x="7" y="7" width="4" height="2" fill="#6b3410" />
    <rect x="8" y="7" width="2" height="1" fill="#8b4513" opacity="0.4" />
    {/* Horse legs with detail */}
    <rect x="6" y="11" width="1" height="3" fill="#8b4513" />
    <rect x="9" y="11" width="1" height="3" fill="#8b4513" />
    <rect x="7" y="12" width="1" height="2" fill="#8b4513" />
    <rect x="10" y="12" width="1" height="2" fill="#8b4513" />
    {/* Hooves */}
    <rect x="6" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="7" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="9" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="10" y="13" width="1" height="1" fill="#3a3a3a" />
    {/* Tail */}
    <rect x="11" y="9" width="1" height="2" fill="#6b3410" />
    <rect x="12" y="10" width="1" height="2" fill="#6b3410" />
  </svg>
);

const PixelSupplyIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Top crate with detail */}
    <rect x="6" y="3" width="5" height="5" fill={color} />
    <rect x="7" y="4" width="3" height="3" fill={color} opacity="0.5" />
    <rect x="8" y="5" width="1" height="1" fill={color} opacity="0.7" />
    {/* Top crate highlights */}
    <rect x="6" y="3" width="2" height="1" fill="#ffffff" opacity="0.2" />
    {/* Top crate panels */}
    <rect x="7" y="4" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="9" y="4" width="1" height="3" fill={color} opacity="0.3" />
    {/* Straps on top crate */}
    <rect x="6" y="5" width="5" height="1" fill="#3a3a3a" />
    <rect x="8" y="3" width="1" height="5" fill="#3a3a3a" />
    {/* Warning markings */}
    <rect x="7" y="4" width="1" height="1" fill="#ff9500" opacity="0.6" />
    <rect x="9" y="6" width="1" height="1" fill="#ff9500" opacity="0.6" />

    {/* Bottom left crate */}
    <rect x="2" y="8" width="5" height="5" fill={color} />
    <rect x="3" y="9" width="3" height="3" fill={color} opacity="0.5" />
    <rect x="4" y="10" width="1" height="1" fill={color} opacity="0.7" />
    {/* Crate highlights */}
    <rect x="2" y="8" width="2" height="1" fill="#ffffff" opacity="0.2" />
    {/* Crate panels */}
    <rect x="3" y="9" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="5" y="9" width="1" height="3" fill={color} opacity="0.3" />
    {/* Straps */}
    <rect x="2" y="10" width="5" height="1" fill="#3a3a3a" />
    <rect x="4" y="8" width="1" height="5" fill="#3a3a3a" />

    {/* Bottom right crate */}
    <rect x="9" y="8" width="5" height="5" fill={color} />
    <rect x="10" y="9" width="3" height="3" fill={color} opacity="0.5" />
    <rect x="11" y="10" width="1" height="1" fill={color} opacity="0.7" />
    {/* Crate highlights */}
    <rect x="9" y="8" width="2" height="1" fill="#ffffff" opacity="0.2" />
    {/* Crate panels */}
    <rect x="10" y="9" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="12" y="9" width="1" height="3" fill={color} opacity="0.3" />
    {/* Straps */}
    <rect x="9" y="10" width="5" height="1" fill="#3a3a3a" />
    <rect x="11" y="8" width="1" height="5" fill="#3a3a3a" />

    {/* Stenciled text/numbers */}
    <rect x="3" y="9" width="2" height="1" fill="#3a3a3a" />
    <rect x="10" y="11" width="2" height="1" fill="#3a3a3a" />

    {/* Ground/shadow */}
    <rect x="1" y="13" width="14" height="1" fill="#2a2a2a" opacity="0.5" />
    <rect x="2" y="13" width="5" height="1" fill="#1a1a1a" opacity="0.3" />
    <rect x="9" y="13" width="5" height="1" fill="#1a1a1a" opacity="0.3" />
  </svg>
);

// Reusable Components - Steel rivets with visible depth
const Rivet = ({ x, y, size = 8, style }: { x?: number; y?: number; size?: number; style?: React.CSSProperties }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: x !== undefined ? `${x}px` : undefined,
      top: y !== undefined ? `${y}px` : undefined,
      width: `${size}px`,
      height: `${size}px`,
      background: "radial-gradient(circle at 35% 35%, #5a5a5a, #3a3a3a 50%, #2a2a2a)",
      boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.8), 0 2px 3px rgba(0,0,0,0.6)",
      border: "1px solid #1a1a1a",
      opacity: 1,
      zIndex: 5,
      ...style
    }}
  >
    {/* Cross slot detail */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-[60%] h-[1.5px] bg-[#0a0a0a]" style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.1)" }} />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-[60%] w-[1.5px] bg-[#0a0a0a]" style={{ boxShadow: "1px 0 0 rgba(255,255,255,0.1)" }} />
    </div>
  </div>
);

const TacticalPanel = ({ children, title, className = "" }: any) => (
  <div className={`relative bg-[#2a2a2a] border-4 overflow-hidden ${className}`}
    style={{
      borderColor: "#1a1a1a",
      boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6), inset 0 -1px 3px rgba(255,255,255,0.05), 0 6px 12px rgba(0,0,0,0.4)",
      background: "linear-gradient(135deg, #2a2a2a 0%, #252525 50%, #2a2a2a 100%)"
    }}>
    {/* Corner Rivets */}
    <Rivet style={{ left: "12px", top: "12px" }} />
    <Rivet style={{ right: "12px", top: "12px" }} />
    <Rivet style={{ left: "12px", bottom: "12px" }} />
    <Rivet style={{ right: "12px", bottom: "12px" }} />

    {/* Edge Rivets - Top & Bottom */}
    {[25, 50, 75].map((percent) => (
      <div key={`top-${percent}`}>
        <Rivet style={{ left: `${percent}%`, top: "12px", transform: "translateX(-50%)" }} />
        <Rivet style={{ left: `${percent}%`, bottom: "12px", transform: "translateX(-50%)" }} />
      </div>
    ))}

    {/* Edge Rivets - Left & Right */}
    {[33, 66].map((percent) => (
      <div key={`side-${percent}`}>
        <Rivet style={{ left: "12px", top: `${percent}%`, transform: "translateY(-50%)" }} />
        <Rivet style={{ right: "12px", top: `${percent}%`, transform: "translateY(-50%)" }} />
      </div>
    ))}

    {title && (
      <div className="relative border-b-2 border-[#3a3a3a] bg-[#1a1a1a] px-4 py-2 z-10">
        <div className="font-bold text-[#ff9500] uppercase tracking-wider text-sm">
          {title}
        </div>
      </div>
    )}

    <div className="relative p-6 z-10">
      {children}
    </div>
  </div>
);

const CommandButton = ({ children, variant = "primary", disabled = false, onClick }: any) => {
  const variants = {
    primary: {
      bg: "linear-gradient(180deg, #3f3f3f 0%, #2a2a2a 40%, #252525 100%)",
      border: "#ff9500",
      text: "#ff9500",
      glow: "rgba(255, 149, 0, 0.4)",
      innerGlow: "rgba(255, 149, 0, 0.08)"
    },
    secondary: {
      bg: "linear-gradient(180deg, #2f2f2f 0%, #1f1f1f 40%, #1a1a1a 100%)",
      border: "#808080",
      text: "#e0e0e0",
      glow: "rgba(128, 128, 128, 0.25)",
      innerGlow: "rgba(128, 128, 128, 0.05)"
    },
    danger: {
      bg: "linear-gradient(180deg, #3f1f1f 0%, #2a0f0f 40%, #200a0a 100%)",
      border: "#dc143c",
      text: "#dc143c",
      glow: "rgba(220, 20, 60, 0.4)",
      innerGlow: "rgba(220, 20, 60, 0.08)"
    },
    success: {
      bg: "linear-gradient(180deg, #1f3f2f 0%, #0f2a1a 40%, #0a2015 100%)",
      border: "#4a7c59",
      text: "#4a7c59",
      glow: "rgba(74, 124, 89, 0.4)",
      innerGlow: "rgba(74, 124, 89, 0.08)"
    }
  };

  const style = variants[variant as keyof typeof variants];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative px-6 md:px-8 py-3 md:py-4 border-3 font-bold uppercase tracking-widest text-xs md:text-sm transition-all duration-200 group overflow-hidden ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:translate-y-[-3px] hover:shadow-2xl active:translate-y-[1px] active:shadow-lg"
      }`}
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.text,
        boxShadow: `0 6px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.6), 0 0 25px ${style.glow}`,
        borderWidth: "3px",
        borderStyle: "solid",
        textShadow: `0 0 10px ${style.glow}, 0 2px 4px rgba(0,0,0,0.8)`,
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)"
      }}
    >
      {/* Inner glow accent */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at center, ${style.innerGlow} 0%, transparent 60%)`,
        opacity: disabled ? 0.3 : 1
      }} />

      {/* Corner accent bars - clean and integrated */}
      <div className="absolute top-0 left-0 w-1 h-6 opacity-50" style={{ background: style.border }} />
      <div className="absolute top-0 left-0 h-1 w-6 opacity-50" style={{ background: style.border }} />
      <div className="absolute bottom-0 right-0 w-1 h-6 opacity-50" style={{ background: style.border }} />
      <div className="absolute bottom-0 right-0 h-1 w-6 opacity-50" style={{ background: style.border }} />

      {/* Button text with proper z-index */}
      <span className="relative z-10">{children}</span>
    </button>
  );
};

const UnitCounter = ({ type, count, icon }: any) => (
  <div className="relative flex items-center gap-3 bg-[#1a1a1a] border-3 px-5 py-3 overflow-hidden"
    style={{
      borderColor: "#3a3a3a",
      borderWidth: "3px",
      borderStyle: "solid",
      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 2px rgba(255,255,255,0.05), 0 4px 8px rgba(0,0,0,0.3)",
      background: "linear-gradient(135deg, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)"
    }}>
    {/* Corner rivets */}
    <Rivet size={6} style={{ left: "8px", top: "8px" }} />
    <Rivet size={6} style={{ right: "8px", top: "8px" }} />

    {/* Corner accent bars */}
    <div className="absolute top-0 right-0 w-1 h-4 bg-[#ff9500] opacity-30" />
    <div className="absolute top-0 right-0 h-1 w-4 bg-[#ff9500] opacity-30" />

    {/* Icon badge with depth */}
    <div className="relative w-10 h-10 bg-[#2a2a2a] border-2 border-[#ff9500] flex items-center justify-center font-bold text-[#ff9500] flex-shrink-0 z-10"
      style={{
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3), 0 0 8px rgba(255, 149, 0, 0.2)",
        background: "radial-gradient(circle at 30% 30%, #2f2f2f, #2a2a2a 50%, #1f1f1f)"
      }}>
      <div style={{ textShadow: "0 0 4px rgba(255, 149, 0, 0.5)" }}>
        {icon}
      </div>
    </div>

    <div className="relative flex-1 z-10">
      <div className="text-xs text-[#808080] uppercase tracking-wider">{type}</div>
      <div className="text-xl font-bold text-[#e0e0e0] tabular-nums" style={{
        textShadow: "0 1px 2px rgba(0,0,0,0.8)"
      }}>{count}</div>
    </div>
  </div>
);

const ProgressBar = ({ value, label, color = "#ff9500" }: any) => (
  <div>
    {label && <div className="text-xs text-[#808080] uppercase mb-2 tracking-wider font-bold">{label}</div>}
    <div className="relative h-8 bg-[#1a1a1a] border-3 overflow-hidden"
      style={{
        borderColor: "#3a3a3a",
        borderWidth: "3px",
        borderStyle: "solid",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8), inset 0 -1px 2px rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.3)",
        background: "linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)"
      }}>
      {/* Corner rivets */}
      <Rivet size={5} style={{ left: "6px", top: "6px" }} />
      <Rivet size={5} style={{ right: "6px", top: "6px" }} />

      {/* Progress fill */}
      <div
        className="absolute inset-y-0 left-0 transition-all duration-300 z-[1]"
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, ${color} 0%, ${color}dd 50%, ${color} 100%)`,
          boxShadow: `inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -1px 2px rgba(0,0,0,0.5), 0 0 15px ${color}60`
        }}
      />

      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <span className="text-xs font-bold text-[#e0e0e0] tracking-wider" style={{
          textShadow: "0 0 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,1)"
        }}>{value}%</span>
      </div>

      {/* Scan line effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 pointer-events-none z-[2]"
        style={{ animation: "scan 2s linear infinite" }} />
    </div>
  </div>
);

const AlertBanner = ({ type = "warning", children }: any) => {
  const types = {
    warning: { bg: "#3a2a1a", border: "#ff9500", text: "#ff9500", glow: "rgba(255, 149, 0, 0.25)" },
    danger: { bg: "#3a1a1a", border: "#dc143c", text: "#dc143c", glow: "rgba(220, 20, 60, 0.25)" },
    success: { bg: "#1a3a2a", border: "#4a7c59", text: "#4a7c59", glow: "rgba(74, 124, 89, 0.25)" }
  };
  const style = types[type as keyof typeof types];

  return (
    <div className="relative border-l-[6px] border-t-2 border-b-2 border-r-2 px-6 py-4 font-bold uppercase tracking-wide text-sm"
      style={{
        backgroundColor: style.bg,
        borderLeftColor: style.border,
        borderTopColor: "#2a2a2a",
        borderBottomColor: "#2a2a2a",
        borderRightColor: "#2a2a2a",
        color: style.text,
        boxShadow: `inset 0 1px 3px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3), -4px 0 20px ${style.glow}`,
        background: `linear-gradient(90deg, ${style.bg} 0%, ${style.bg}ee 100%)`
      }}>
      {/* Left edge rivets */}
      <Rivet size={6} style={{ left: "-2px", top: "10px" }} />
      <Rivet size={6} style={{ left: "-2px", bottom: "10px" }} />

      {/* Status indicator */}
      <span className="inline-flex items-center mr-4">
        <span className="relative inline-block w-3 h-3 rounded-full bg-current animate-pulse">
          <span className="absolute inset-0 rounded-full bg-current opacity-50"
            style={{
              boxShadow: `0 0 8px ${style.border}, 0 0 12px ${style.border}`
            }} />
        </span>
      </span>

      {/* Content */}
      <span style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
        {children}
      </span>

      {/* Right corner accent */}
      <div className="absolute top-0 right-0 w-0 h-0"
        style={{
          borderTop: `8px solid ${style.border}`,
          borderLeft: "8px solid transparent",
          opacity: 0.3
        }} />
    </div>
  );
};

// Diplomacy-specific components
const PowerStatusCard = ({ power, units, supplyCount, ordersSubmitted, color }: any) => (
  <div className="relative bg-[#1a1a1a] border-3 p-5 overflow-hidden"
    style={{
      borderColor: color,
      borderWidth: "3px",
      borderStyle: "solid",
      boxShadow: `inset 0 2px 6px rgba(0,0,0,0.6), inset 0 -1px 3px rgba(255,255,255,0.05), 0 6px 12px rgba(0,0,0,0.4), 0 0 20px ${color}40`,
      background: "linear-gradient(135deg, #1a1a1a 0%, #171717 50%, #1a1a1a 100%)"
    }}>

    {/* Corner rivets */}
    <Rivet size={7} style={{ left: "10px", top: "10px" }} />
    <Rivet size={7} style={{ right: "10px", top: "10px" }} />
    <Rivet size={7} style={{ left: "10px", bottom: "10px" }} />
    <Rivet size={7} style={{ right: "10px", bottom: "10px" }} />

    {/* Power header with flag/emblem area */}
    <div className="relative flex items-center gap-4 mb-4 pb-4 border-b-2 z-10" style={{ borderColor: color }}>
      <div className="w-14 h-14 border-3 flex items-center justify-center flex-shrink-0"
        style={{
          borderColor: color,
          background: `linear-gradient(135deg, ${color}20, ${color}05)`,
          boxShadow: `inset 0 1px 2px rgba(0,0,0,0.5), 0 0 15px ${color}30`
        }}>
        <div className="text-2xl font-black" style={{ color, textShadow: `0 0 8px ${color}80` }}>
          {power.slice(0, 2)}
        </div>
      </div>
      <div className="flex-1">
        <div className="text-xl font-bold uppercase tracking-wide" style={{ color, textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
          {power}
        </div>
        <div className="text-xs text-[#808080] uppercase tracking-wider mt-1">
          {ordersSubmitted ? (
            <span className="text-[#4a7c59]">● ORDERS SUBMITTED</span>
          ) : (
            <span className="text-[#ff9500]">○ AWAITING ORDERS</span>
          )}
        </div>
      </div>
    </div>

    {/* Stats grid */}
    <div className="relative space-y-3 z-10">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#808080] uppercase tracking-wider">Supply Centers</span>
        <span className="text-2xl font-bold tabular-nums" style={{ color, textShadow: `0 0 8px ${color}60` }}>
          {supplyCount}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#808080] uppercase tracking-wider">Units</span>
        <span className="text-lg font-bold text-[#e0e0e0] tabular-nums">{units.armies + units.fleets}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <PixelArmyIcon color="#808080" size={16} />
          <span className="text-[#e0e0e0] tabular-nums">{units.armies}A</span>
        </div>
        <div className="flex items-center gap-2">
          <PixelFleetIcon color="#808080" size={16} />
          <span className="text-[#e0e0e0] tabular-nums">{units.fleets}F</span>
        </div>
      </div>
    </div>
  </div>
);

const OrderItem = ({ territory, unitType, order, status }: any) => {
  const iconColor = status === 'success' ? '#4a7c59' : status === 'failed' ? '#dc143c' : '#808080';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#2a2a2a] last:border-0">
      <div className={`w-8 h-8 border-2 flex items-center justify-center flex-shrink-0 bg-[#0a0a0a] ${
        status === 'success' ? 'border-[#4a7c59]' : status === 'failed' ? 'border-[#dc143c]' : 'border-[#808080]'
      }`}>
        {unitType === 'army' ? (
          <PixelArmyIcon color={iconColor} size={16} />
        ) : (
          <PixelFleetIcon color={iconColor} size={16} />
        )}
      </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-bold text-[#e0e0e0] uppercase">{territory}</div>
      <div className="text-xs text-[#808080]">{order}</div>
    </div>
    {status && (
      <div className={`text-xs uppercase tracking-wide font-bold ${
        status === 'success' ? 'text-[#4a7c59]' : status === 'failed' ? 'text-[#dc143c]' : 'text-[#808080]'
      }`}>
        {status}
      </div>
    )}
    </div>
  );
};

const MessageBubble = ({ from, to, content, timestamp }: any) => (
  <div className="relative bg-[#1a1a1a] border-2 border-[#3a3a3a] p-4 mb-3">

    <Rivet size={5} style={{ left: "8px", top: "8px" }} />
    <Rivet size={5} style={{ right: "8px", top: "8px" }} />

    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold text-[#ff9500] uppercase">{from}</span>
        <span className="text-xs text-[#808080]">→</span>
        <span className="text-sm font-bold text-[#4a7c9f] uppercase">{to}</span>
        <span className="text-xs text-[#606060] ml-auto">{timestamp}</span>
      </div>
      <div className="text-sm text-[#e0e0e0] leading-relaxed">{content}</div>
    </div>
  </div>
);

const PhaseDisplay = ({ season, year, phase }: any) => (
  <div className="flex items-center gap-4 px-6 py-4 bg-[#1a1a1a] border-3 border-[#ff9500]"
    style={{
      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6), 0 0 20px rgba(255, 149, 0, 0.3)"
    }}>
    <Rivet size={6} style={{ left: "10px", top: "50%", transform: "translateY(-50%)" }} />
    <Rivet size={6} style={{ right: "10px", top: "50%", transform: "translateY(-50%)" }} />

    <div className="flex-1 text-center">
      <div className="text-3xl font-black uppercase tracking-wider text-[#ff9500]"
        style={{ textShadow: "0 0 10px rgba(255, 149, 0, 0.5), 0 2px 4px rgba(0,0,0,0.8)" }}>
        {season} {year}
      </div>
      <div className="text-sm text-[#808080] uppercase tracking-widest mt-1">{phase} PHASE</div>
    </div>
  </div>
);

const PhaseTimeline = ({ phases, currentIndex }: any) => (
  <div className="relative bg-[#1a1a1a] border-2 border-[#3a3a3a] p-6 overflow-hidden">

    <Rivet size={6} style={{ left: "10px", top: "10px" }} />
    <Rivet size={6} style={{ right: "10px", top: "10px" }} />

    <div className="relative z-10">
      <div className="text-xs text-[#808080] uppercase tracking-[0.15em] mb-4 font-bold">GAME TIMELINE</div>
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {phases.map((phase: any, idx: number) => (
          <div key={idx} className="flex items-center gap-3 flex-shrink-0">
            <div className={`relative w-12 h-12 border-2 flex items-center justify-center transition-all ${
              idx === currentIndex
                ? 'border-[#ff9500] bg-[#ff9500]/10'
                : idx < currentIndex
                  ? 'border-[#4a7c59] bg-[#4a7c59]/5'
                  : 'border-[#3a3a3a] bg-[#1a1a1a]'
            }`}
            style={{
              boxShadow: idx === currentIndex
                ? '0 0 16px rgba(255, 149, 0, 0.3), inset 0 2px 4px rgba(0,0,0,0.6)'
                : idx < currentIndex
                  ? 'inset 0 2px 4px rgba(0,0,0,0.6)'
                  : 'inset 0 2px 4px rgba(0,0,0,0.8)'
            }}>
              <div className={`text-[11px] font-bold tracking-wide ${
                idx === currentIndex ? 'text-[#ff9500]' : idx < currentIndex ? 'text-[#4a7c59]' : 'text-[#808080]'
              }`}>
                {phase.short}
              </div>
            </div>
            {idx < phases.length - 1 && (
              <div className={`w-10 h-[2px] transition-colors relative ${
                idx < currentIndex ? 'bg-[#4a7c59]' : 'bg-[#3a3a3a]'
              }`}
              style={{
                boxShadow: idx < currentIndex ? '0 0 4px rgba(74, 124, 89, 0.5)' : 'none'
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ActionLog = ({ actions }: any) => (
  <div className="relative bg-[#1a1a1a] border-2 border-[#3a3a3a] overflow-hidden">

    <Rivet size={6} style={{ left: "10px", top: "10px" }} />
    <Rivet size={6} style={{ right: "10px", top: "10px" }} />

    <div className="relative z-10 p-4 border-b-2 border-[#3a3a3a] bg-[#1a1a1a]">
      <div className="text-xs text-[#808080] uppercase tracking-wider font-bold">ACTION LOG</div>
    </div>

    <div className="relative z-10 max-h-64 overflow-y-auto">
      {actions.map((action: any, idx: number) => (
        <div
          key={idx}
          className="border-b border-[#2a2a2a] p-3 hover:bg-[#2a2a2a] transition-colors"
          style={{
            animation: idx === 0 ? 'fade-scale-in 0.3s ease-out' : 'none'
          }}
        >
          <div className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
              action.type === 'move' ? 'bg-[#ff9500]' :
              action.type === 'support' ? 'bg-[#4a7c59]' :
              action.type === 'convoy' ? 'bg-[#4a7c9f]' :
              'bg-[#808080]'
            }`}
            style={{
              boxShadow: `0 0 8px ${
                action.type === 'move' ? '#ff9500' :
                action.type === 'support' ? '#4a7c59' :
                action.type === 'convoy' ? '#4a7c9f' : '#808080'
              }`
            }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[#e0e0e0]">{action.text}</div>
              <div className="text-[10px] text-[#606060] mt-1">{action.timestamp}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TerritoryMarker = ({ name, owner, contested = false }: any) => (
  <div className="relative inline-flex items-center gap-2 bg-[#1a1a1a] border-2 px-3 py-2"
    style={{
      borderColor: contested ? '#dc143c' : owner?.color || '#3a3a3a',
      boxShadow: contested
        ? 'inset 0 2px 4px rgba(0,0,0,0.6), 0 0 15px rgba(220, 20, 60, 0.4)'
        : 'inset 0 2px 4px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.3)',
      animation: contested ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
      '--glow-color': '#dc143c'
    } as any}>

    <Rivet size={5} style={{ left: "6px", top: "6px" }} />
    <Rivet size={5} style={{ right: "6px", bottom: "6px" }} />

    {owner && (
      <div className="w-6 h-6 border-2 flex items-center justify-center flex-shrink-0 relative z-10"
        style={{
          borderColor: owner.color,
          background: `linear-gradient(135deg, ${owner.color}20, ${owner.color}05)`,
          boxShadow: `inset 0 1px 2px rgba(0,0,0,0.5), 0 0 10px ${owner.color}30`
        }}>
        <span className="text-[10px] font-bold" style={{ color: owner.color }}>{owner.initial}</span>
      </div>
    )}

    <div className="relative z-10">
      <div className="text-xs font-bold text-[#e0e0e0] uppercase whitespace-nowrap">{name}</div>
      {contested && (
        <div className="text-[10px] text-[#dc143c] uppercase tracking-wide">CONTESTED</div>
      )}
    </div>
  </div>
);

const NotificationToast = ({ type = "info", message, onClose }: any) => {
  const types = {
    info: { bg: "#3a3a3a", border: "#ff9500", icon: "ℹ", color: "#ff9500" },
    success: { bg: "#1a3a2a", border: "#4a7c59", icon: "✓", color: "#4a7c59" },
    warning: { bg: "#3a2a1a", border: "#ff9500", icon: "⚠", color: "#ff9500" },
    danger: { bg: "#3a1a1a", border: "#dc143c", icon: "✕", color: "#dc143c" }
  };
  const style = types[type as keyof typeof types];

  return (
    <div
      className="relative bg-[#1a1a1a] border-2 p-3 md:p-4 w-full md:min-w-[300px] md:max-w-md overflow-hidden shadow-2xl"
      style={{
        borderColor: style.border,
        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.6), 0 6px 20px rgba(0,0,0,0.5), 0 0 20px ${style.color}40`,
        animation: 'slide-in-right 0.3s ease-out'
      }}>

      <Rivet size={5} style={{ left: "8px", top: "8px" }} />
      <Rivet size={5} style={{ right: "8px", top: "8px" }} />

      <div className="relative z-10 flex items-start gap-3">
        <div className="w-8 h-8 border-2 flex items-center justify-center flex-shrink-0"
          style={{
            borderColor: style.border,
            background: `linear-gradient(135deg, ${style.color}20, ${style.color}05)`,
            boxShadow: `inset 0 1px 2px rgba(0,0,0,0.5), 0 0 10px ${style.color}30`
          }}>
          <span style={{ color: style.color, textShadow: `0 0 8px ${style.color}80` }}>{style.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[#e0e0e0] leading-relaxed">{message}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#808080] hover:text-[#e0e0e0] transition-colors flex-shrink-0"
          >
            <span className="text-lg">×</span>
          </button>
        )}
      </div>

      {/* Progress bar for auto-dismiss */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0a0a0a]">
        <div
          className="h-full transition-all"
          style={{
            background: style.border,
            animation: 'shimmer 5s linear forwards',
            width: '100%'
          }}
        />
      </div>
    </div>
  );
};

export default function MilitaryUIKitPage() {
  const [activeTab, setActiveTab] = useState<"buttons" | "panels" | "status" | "diplomacy" | "advanced">("diplomacy");
  const [demoProgress, setDemoProgress] = useState(67);
  const [notifications, setNotifications] = useState<any[]>([]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0]">
      <style dangerouslySetInnerHTML={{ __html: cssVariables + `
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />

      {/* Header */}
      <header className="bg-[#1a1a1a] border-b-2 border-[#ff9500] sticky top-0 z-50"
        style={{ boxShadow: "0 0 20px rgba(255, 149, 0, 0.3)" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center gap-3 md:gap-4 mb-4">
            <div className="w-1 h-10 md:h-12 bg-[#ff9500]" style={{ boxShadow: "0 0 10px rgba(255, 149, 0, 0.5)" }} />
            <div>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-wider text-[#ff9500]">
                MILITARY COMMAND UI
              </h1>
              <p className="text-[#808080] text-xs md:text-sm uppercase tracking-wide">
                Industrial Tactical Design System
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex gap-3 mb-4">
            <a href="/military-ui-kit/icons"
              className="px-4 py-2 bg-[#2a2a2a] border-2 border-[#ff9500] text-[#ff9500] hover:bg-[#3a3a3a] transition-all uppercase text-xs font-bold tracking-wider flex items-center gap-2"
              style={{ boxShadow: "0 0 15px rgba(255, 149, 0, 0.3)" }}>
              <span>⚔</span> PIXEL ARSENAL
            </a>
            <a href="/military-ui-kit/demo"
              className="px-4 py-2 bg-[#2a2a2a] border-2 border-[#4a7c59] text-[#4a7c59] hover:bg-[#3a3a3a] transition-all uppercase text-xs font-bold tracking-wider flex items-center gap-2"
              style={{ boxShadow: "0 0 15px rgba(74, 124, 89, 0.3)" }}>
              <span>🎮</span> FULL DEMO
            </a>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2">
            {[
              { id: "diplomacy", label: "DIPLOMACY" },
              { id: "advanced", label: "ADVANCED" },
              { id: "buttons", label: "BUTTONS" },
              { id: "panels", label: "PANELS" },
              { id: "status", label: "STATUS" }
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`px-4 md:px-6 py-2 border-2 font-bold uppercase tracking-wider text-xs transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === id
                    ? "bg-[#3a3a3a] border-[#ff9500] text-[#ff9500]"
                    : "bg-transparent border-[#3a3a3a] text-[#808080] hover:border-[#808080]"
                }`}
                style={{
                  clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)"
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-16">
        {activeTab === "buttons" && (
          <div className="space-y-12">
            <TacticalPanel title="Command Buttons">
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  <CommandButton variant="primary">DEPLOY FORCES</CommandButton>
                  <CommandButton variant="secondary">RECON MISSION</CommandButton>
                  <CommandButton variant="danger">ABORT OPERATION</CommandButton>
                  <CommandButton variant="success">CONFIRM ORDER</CommandButton>
                  <CommandButton variant="primary" disabled>DISABLED</CommandButton>
                </div>

                <details className="mt-6">
                  <summary className="cursor-pointer text-[#ff9500] font-bold uppercase text-sm mb-3">
                    → View Implementation
                  </summary>
                  <pre className="bg-[#0a0a0a] p-4 text-xs overflow-x-auto border border-[#3a3a3a] text-[#808080]">
{`<CommandButton variant="primary">DEPLOY FORCES</CommandButton>
<CommandButton variant="danger">ABORT OPERATION</CommandButton>`}
                  </pre>
                </details>
              </div>
            </TacticalPanel>

            <TacticalPanel title="Button States">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-[#808080] uppercase mb-2">Primary</div>
                  <CommandButton variant="primary">ACTION</CommandButton>
                </div>
                <div>
                  <div className="text-xs text-[#808080] uppercase mb-2">Secondary</div>
                  <CommandButton variant="secondary">ACTION</CommandButton>
                </div>
                <div>
                  <div className="text-xs text-[#808080] uppercase mb-2">Danger</div>
                  <CommandButton variant="danger">ACTION</CommandButton>
                </div>
                <div>
                  <div className="text-xs text-[#808080] uppercase mb-2">Success</div>
                  <CommandButton variant="success">ACTION</CommandButton>
                </div>
              </div>
            </TacticalPanel>
          </div>
        )}

        {activeTab === "panels" && (
          <div className="space-y-12">
            <TacticalPanel title="Tactical Panels">
              <p className="text-[#808080] mb-6">
                Heavy-bordered panels with riveted corners. Use for grouping related information or actions.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TacticalPanel title="SECTOR ALPHA">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#808080]">STATUS:</span>
                      <span className="text-[#4a7c59] font-bold">SECURED</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#808080]">UNITS:</span>
                      <span className="text-[#e0e0e0] font-bold">42</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#808080]">THREAT:</span>
                      <span className="text-[#ff9500] font-bold">MODERATE</span>
                    </div>
                  </div>
                </TacticalPanel>

                <TacticalPanel title="SECTOR BRAVO">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#808080]">STATUS:</span>
                      <span className="text-[#dc143c] font-bold">HOSTILE</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#808080]">UNITS:</span>
                      <span className="text-[#e0e0e0] font-bold">18</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#808080]">THREAT:</span>
                      <span className="text-[#dc143c] font-bold">CRITICAL</span>
                    </div>
                  </div>
                </TacticalPanel>
              </div>
            </TacticalPanel>

            <TacticalPanel title="Nested Layout Example">
              <div className="space-y-4">
                <TacticalPanel title="MISSION BRIEFING">
                  <p className="text-sm text-[#e0e0e0] leading-relaxed">
                    Intelligence reports indicate enemy forces massing at grid coordinates
                    <span className="text-[#ff9500] font-bold"> ECHO-7-NINER</span>.
                    Deploy reinforcements to secure the perimeter.
                  </p>
                </TacticalPanel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <UnitCounter type="Infantry" count={245} icon={<PixelArmyIcon color="#ff9500" size={20} />} />
                  <UnitCounter type="Armor" count={32} icon={<PixelTankIcon color="#ff9500" size={20} />} />
                  <UnitCounter type="Air" count={8} icon={<PixelPlaneIcon color="#ff9500" size={20} />} />
                </div>
              </div>
            </TacticalPanel>
          </div>
        )}

        {activeTab === "status" && (
          <div className="space-y-12">
            <TacticalPanel title="Status Indicators">
              <div className="space-y-6">
                <AlertBanner type="warning">RECONNAISSANCE IN PROGRESS</AlertBanner>
                <AlertBanner type="danger">HOSTILE FORCES DETECTED</AlertBanner>
                <AlertBanner type="success">OBJECTIVE SECURED</AlertBanner>
              </div>
            </TacticalPanel>

            <TacticalPanel title="Progress Meters">
              <div className="space-y-4">
                <ProgressBar value={demoProgress} label="Deployment Status" color="#ff9500" />
                <ProgressBar value={85} label="Supply Lines" color="#4a7c59" />
                <ProgressBar value={34} label="Threat Level" color="#dc143c" />
                <div className="pt-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={demoProgress}
                    onChange={(e) => setDemoProgress(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-[#808080] text-center mt-2">
                    Adjust demo progress: {demoProgress}%
                  </div>
                </div>
              </div>
            </TacticalPanel>

            <TacticalPanel title="Unit Counters">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <UnitCounter type="Infantry" count={1245} icon={<PixelArmyIcon color="#ff9500" size={24} />} />
                <UnitCounter type="Cavalry" count={187} icon={<PixelCavalryIcon color="#ff9500" size={24} />} />
                <UnitCounter type="Artillery" count={42} icon={<PixelArtilleryIcon color="#ff9500" size={24} />} />
                <UnitCounter type="Armor" count={89} icon={<PixelTankIcon color="#ff9500" size={24} />} />
                <UnitCounter type="Air Support" count={23} icon={<PixelPlaneIcon color="#ff9500" size={24} />} />
                <UnitCounter type="Naval" count={15} icon={<PixelFleetIcon color="#ff9500" size={24} />} />
              </div>
            </TacticalPanel>
          </div>
        )}

        {activeTab === "diplomacy" && (
          <div className="space-y-12">
            {/* Current Phase */}
            <PhaseDisplay season="SPRING" year="1901" phase="MOVEMENT" />

            {/* Power Status Cards */}
            <TacticalPanel title="Power Status">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <PowerStatusCard
                  power="FRANCE"
                  units={{ armies: 2, fleets: 1 }}
                  supplyCount={5}
                  ordersSubmitted={true}
                  color="#4a7c9f"
                />
                <PowerStatusCard
                  power="GERMANY"
                  units={{ armies: 2, fleets: 1 }}
                  supplyCount={5}
                  ordersSubmitted={false}
                  color="#808080"
                />
                <PowerStatusCard
                  power="ENGLAND"
                  units={{ armies: 1, fleets: 2 }}
                  supplyCount={5}
                  ordersSubmitted={true}
                  color="#dc143c"
                />
              </div>
            </TacticalPanel>

            {/* Orders Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TacticalPanel title="FRANCE - Submitted Orders">
                <div className="space-y-2">
                  <OrderItem
                    territory="PARIS"
                    unitType="army"
                    order="HOLD"
                    status="success"
                  />
                  <OrderItem
                    territory="MARSEILLES"
                    unitType="army"
                    order="→ BURGUNDY"
                    status="success"
                  />
                  <OrderItem
                    territory="BREST"
                    unitType="fleet"
                    order="→ ENGLISH CHANNEL"
                    status="failed"
                  />
                </div>
              </TacticalPanel>

              <TacticalPanel title="GERMANY - Pending Orders">
                <div className="space-y-2">
                  <OrderItem
                    territory="BERLIN"
                    unitType="army"
                    order="→ SILESIA"
                  />
                  <OrderItem
                    territory="MUNICH"
                    unitType="army"
                    order="SUPPORT BERLIN → SILESIA"
                  />
                  <OrderItem
                    territory="KIEL"
                    unitType="fleet"
                    order="→ DENMARK"
                  />
                </div>
                <div className="mt-6 pt-4 border-t-2 border-[#3a3a3a]">
                  <CommandButton variant="primary">SUBMIT ORDERS</CommandButton>
                </div>
              </TacticalPanel>
            </div>

            {/* Message Thread */}
            <TacticalPanel title="Diplomatic Messages">
              <MessageBubble
                from="FRANCE"
                to="GERMANY"
                content="I propose a demilitarized zone in Burgundy. This would ensure peace between our nations and allow us both to focus on our eastern neighbors."
                timestamp="10:23"
              />
              <MessageBubble
                from="GERMANY"
                to="FRANCE"
                content="Your proposal is noted. However, I must maintain strategic flexibility in that region. Perhaps we can discuss alternative arrangements?"
                timestamp="10:31"
              />
              <MessageBubble
                from="FRANCE"
                to="ENGLAND"
                content="The Channel situation requires immediate attention. I suggest we coordinate our naval movements to prevent Italian expansion."
                timestamp="10:45"
              />
            </TacticalPanel>
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="space-y-12">
            {/* Phase Timeline */}
            <TacticalPanel title="Phase Timeline">
              <PhaseTimeline
                phases={[
                  { short: "S01" },
                  { short: "F01" },
                  { short: "W01" },
                  { short: "S02" },
                  { short: "F02" },
                  { short: "W02" }
                ]}
                currentIndex={3}
              />
            </TacticalPanel>

            {/* Action Log and Territory Markers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActionLog
                actions={[
                  { type: "move", text: "FRANCE: Army Paris → Burgundy", timestamp: "10:23:45" },
                  { type: "support", text: "GERMANY: Army Munich supports Berlin → Silesia", timestamp: "10:22:18" },
                  { type: "move", text: "ENGLAND: Fleet London → English Channel", timestamp: "10:21:03" },
                  { type: "convoy", text: "ITALY: Fleet Naples convoys Army Rome → Tunis", timestamp: "10:19:47" },
                  { type: "move", text: "AUSTRIA: Army Vienna → Galicia", timestamp: "10:18:22" },
                  { type: "support", text: "RUSSIA: Army Warsaw supports Austria Vienna → Galicia", timestamp: "10:17:05" },
                  { type: "move", text: "TURKEY: Fleet Ankara → Black Sea", timestamp: "10:15:38" }
                ]}
              />

              <TacticalPanel title="Territory Markers">
                <div className="space-y-3">
                  <div className="text-xs text-[#808080] uppercase mb-4">Map overlay elements</div>
                  <div className="flex flex-wrap gap-3">
                    <TerritoryMarker
                      name="PARIS"
                      owner={{ color: "#4a7c9f", initial: "F" }}
                    />
                    <TerritoryMarker
                      name="BERLIN"
                      owner={{ color: "#808080", initial: "G" }}
                    />
                    <TerritoryMarker
                      name="BURGUNDY"
                      contested={true}
                    />
                    <TerritoryMarker
                      name="MUNICH"
                      owner={{ color: "#808080", initial: "G" }}
                    />
                    <TerritoryMarker
                      name="LONDON"
                      owner={{ color: "#dc143c", initial: "E" }}
                    />
                  </div>
                </div>
              </TacticalPanel>
            </div>

            {/* Notification System */}
            <TacticalPanel title="Notification System">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <CommandButton
                    variant="primary"
                    onClick={() => setNotifications([...notifications, {
                      id: Date.now(),
                      type: "info",
                      message: "Orders submitted successfully for Spring 1901"
                    }])}
                  >
                    SHOW INFO
                  </CommandButton>
                  <CommandButton
                    variant="success"
                    onClick={() => setNotifications([...notifications, {
                      id: Date.now(),
                      type: "success",
                      message: "Movement phase completed - all orders resolved"
                    }])}
                  >
                    SHOW SUCCESS
                  </CommandButton>
                  <CommandButton
                    variant="danger"
                    onClick={() => setNotifications([...notifications, {
                      id: Date.now(),
                      type: "danger",
                      message: "Order failed: Unit cannot reach that territory"
                    }])}
                  >
                    SHOW DANGER
                  </CommandButton>
                  <CommandButton
                    variant="secondary"
                    onClick={() => setNotifications([...notifications, {
                      id: Date.now(),
                      type: "warning",
                      message: "New diplomatic message from Germany"
                    }])}
                  >
                    SHOW WARNING
                  </CommandButton>
                </div>

                <div className="mt-6 p-4 bg-[#0a0a0a] border border-[#3a3a3a] rounded">
                  <div className="text-xs text-[#808080] uppercase mb-2">Live Preview (click buttons above)</div>
                  {notifications.length === 0 && (
                    <div className="text-sm text-[#606060] italic">No notifications to display</div>
                  )}
                </div>
              </div>
            </TacticalPanel>

            {/* Interactive Elements */}
            <TacticalPanel title="Interactive Elements & Animations">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-[#808080] uppercase mb-4">Hover States</div>
                  <div className="space-y-3">
                    <div className="p-4 bg-[#1a1a1a] border-2 border-[#3a3a3a] cursor-pointer transition-all hover:border-[#ff9500] hover:shadow-lg hover:scale-105"
                      style={{
                        transitionDuration: "0.2s",
                        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)"
                      }}>
                      <div className="text-sm text-[#e0e0e0]">Hover for highlight effect</div>
                    </div>
                    <div className="p-4 bg-[#1a1a1a] border-2 border-[#3a3a3a] cursor-pointer transition-all hover:bg-[#2a2a2a] hover:border-[#ff9500]">
                      <div className="text-sm text-[#e0e0e0]">Hover for background change</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-[#808080] uppercase mb-4">Loading States</div>
                  <div className="space-y-3">
                    <div className="relative p-4 bg-[#1a1a1a] border-2 border-[#ff9500] overflow-hidden">
                      <div className="text-sm text-[#e0e0e0] mb-2">Processing orders...</div>
                      <div className="h-1 bg-[#3a3a3a]">
                        <div className="h-full bg-[#ff9500]" style={{
                          width: "60%",
                          boxShadow: "0 0 10px #ff9500",
                          animation: "shimmer 1.5s ease-in-out infinite"
                        }} />
                      </div>
                    </div>
                    <div className="relative p-4 bg-[#1a1a1a] border-2 border-[#4a7c59]">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-[#4a7c59] animate-pulse"
                          style={{ boxShadow: "0 0 10px #4a7c59" }} />
                        <div className="text-sm text-[#e0e0e0]">Connected to game server</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TacticalPanel>

            {/* Pixel Art Icons Showcase */}
            <TacticalPanel title="Pixel Art Unit Icons">
              <div className="space-y-6">
                <div className="text-sm text-[#808080] mb-4">
                  Custom pixel art icons for military units. Each icon scales cleanly and maintains the industrial aesthetic.
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[
                    { name: "Army", icon: <PixelArmyIcon color="#ff9500" size={32} />, desc: "Infantry units" },
                    { name: "Fleet", icon: <PixelFleetIcon color="#4a7c9f" size={32} />, desc: "Naval forces" },
                    { name: "Tank", icon: <PixelTankIcon color="#808080" size={32} />, desc: "Armored units" },
                    { name: "Plane", icon: <PixelPlaneIcon color="#e0e0e0" size={32} />, desc: "Air support" },
                    { name: "Artillery", icon: <PixelArtilleryIcon color="#dc143c" size={32} />, desc: "Heavy weapons" },
                    { name: "Cavalry", icon: <PixelCavalryIcon color="#d4a574" size={32} />, desc: "Mobile forces" },
                    { name: "Supply", icon: <PixelSupplyIcon color="#4a7c59" size={32} />, desc: "Resources" }
                  ].map(({ name, icon, desc }) => (
                    <div key={name} className="relative bg-[#1a1a1a] border-2 border-[#3a3a3a] p-4 text-center hover:border-[#ff9500] transition-all">
                      <Rivet size={5} style={{ left: "6px", top: "6px" }} />
                      <Rivet size={5} style={{ right: "6px", bottom: "6px" }} />
                      <div className="relative z-10">
                        <div className="flex justify-center mb-3 p-2 bg-[#0a0a0a] border border-[#2a2a2a]">
                          {icon}
                        </div>
                        <div className="text-xs font-bold text-[#e0e0e0] uppercase mb-1">{name}</div>
                        <div className="text-[10px] text-[#606060]">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TacticalPanel>

            {/* Responsive Design Demo */}
            <TacticalPanel title="Responsive Design">
              <div className="space-y-4">
                <div className="text-sm text-[#808080] mb-4">
                  All components are fully responsive. Resize your browser window to see layouts adapt.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <UnitCounter type="Mobile" count={1} icon="📱" />
                  <UnitCounter type="Tablet" count={2} icon="💻" />
                  <UnitCounter type="Desktop" count={3} icon="🖥" />
                </div>
              </div>
            </TacticalPanel>
          </div>
        )}
      </div>

      {/* Notification Container - Fixed position */}
      <div className="fixed top-2 md:top-4 right-2 md:right-4 left-2 md:left-auto z-50 space-y-2 md:space-y-3 max-w-md">
        {notifications.map((notif) => (
          <NotificationToast
            key={notif.id}
            type={notif.type}
            message={notif.message}
            onClose={() => setNotifications(notifications.filter(n => n.id !== notif.id))}
          />
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-32 py-12 bg-[#1a1a1a] border-t-2 border-[#3a3a3a]">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <div className="text-[#808080] text-sm uppercase tracking-wide mb-4">
            Military Command UI Kit • Dark Industrial Design System
          </div>
          <div className="flex gap-8 justify-center text-xs">
            <a href="/military-demo" className="text-[#ff9500] hover:text-[#ffaa20]">
              Open Military Demo →
            </a>
            <a href="/" className="text-[#808080] hover:text-[#e0e0e0]">
              ← Diplomacy Viewer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
