"use client";

import { useState } from "react";

// Import the icon components from parent
// We'll duplicate them here for the showcase
const PixelArmyIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Enhanced Army icon - same as parent */}
    <rect x="5" y="2" width="6" height="1" fill={color} />
    <rect x="4" y="3" width="8" height="1" fill={color} />
    <rect x="4" y="4" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="11" y="4" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="5" y="4" width="6" height="1" fill={color} />
    <rect x="6" y="2" width="2" height="1" fill="#ffffff" opacity="0.4" />
    <rect x="6" y="5" width="4" height="2" fill="#d4a574" />
    <rect x="7" y="5" width="1" height="1" fill="#e8c4a0" opacity="0.5" />
    <rect x="6" y="6" width="1" height="1" fill="#3a3a3a" />
    <rect x="9" y="6" width="1" height="1" fill="#3a3a3a" />
    <rect x="5" y="7" width="6" height="5" fill={color} />
    <rect x="6" y="8" width="4" height="1" fill={color} opacity="0.5" />
    <rect x="7" y="9" width="2" height="2" fill={color} opacity="0.7" />
    <rect x="6" y="7" width="1" height="2" fill="#ffffff" opacity="0.3" />
    <rect x="5" y="10" width="6" height="1" fill="#8b4513" />
    <rect x="7" y="10" width="2" height="1" fill="#d4a574" opacity="0.5" />
    <rect x="3" y="8" width="2" height="4" fill={color} />
    <rect x="11" y="8" width="2" height="4" fill={color} />
    <rect x="3" y="9" width="1" height="1" fill={color} opacity="0.6" />
    <rect x="12" y="9" width="1" height="1" fill={color} opacity="0.6" />
    <rect x="3" y="11" width="2" height="1" fill="#d4a574" />
    <rect x="11" y="11" width="2" height="1" fill="#d4a574" />
    <rect x="5" y="12" width="2" height="3" fill={color} />
    <rect x="9" y="12" width="2" height="3" fill={color} />
    <rect x="6" y="12" width="1" height="2" fill={color} opacity="0.6" />
    <rect x="9" y="12" width="1" height="2" fill={color} opacity="0.6" />
    <rect x="1" y="7" width="2" height="1" fill="#3a3a3a" />
    <rect x="2" y="8" width="1" height="3" fill="#5a5a5a" />
    <rect x="2" y="11" width="1" height="1" fill="#8b4513" />
    <rect x="2" y="8" width="1" height="1" fill="#808080" />
  </svg>
);

const PixelFleetIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="7" y="1" width="3" height="2" fill="#dc143c" />
    <rect x="8" y="1" width="1" height="1" fill="#ff4444" opacity="0.6" />
    <rect x="7" y="2" width="2" height="9" fill="#8b4513" />
    <rect x="7" y="3" width="1" height="7" fill="#a0522d" opacity="0.5" />
    <rect x="6" y="5" width="4" height="1" fill="#6b3410" />
    <rect x="9" y="3" width="5" height="6" fill={color} />
    <rect x="10" y="4" width="3" height="4" fill={color} opacity="0.5" />
    <rect x="11" y="5" width="2" height="2" fill={color} opacity="0.7" />
    <rect x="9" y="3" width="1" height="4" fill="#ffffff" opacity="0.3" />
    <rect x="3" y="6" width="3" height="3" fill={color} />
    <rect x="4" y="7" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="3" y="10" width="10" height="4" fill={color} />
    <rect x="4" y="9" width="8" height="1" fill={color} />
    <rect x="5" y="11" width="7" height="1" fill={color} opacity="0.5" />
    <rect x="6" y="12" width="5" height="1" fill={color} opacity="0.7" />
    <rect x="5" y="10" width="6" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="5" y="11" width="1" height="1" fill="#3a3a3a" />
    <rect x="7" y="11" width="1" height="1" fill="#3a3a3a" />
    <rect x="9" y="11" width="1" height="1" fill="#3a3a3a" />
    <rect x="2" y="11" width="1" height="3" fill={color} />
    <rect x="13" y="11" width="1" height="3" fill={color} />
    <rect x="2" y="12" width="1" height="1" fill={color} opacity="0.6" />
    <rect x="1" y="14" width="14" height="1" fill="#2a5a7a" opacity="0.4" />
    <rect x="2" y="13" width="2" height="1" fill="#4a7c9f" opacity="0.3" />
    <rect x="6" y="13" width="2" height="1" fill="#4a7c9f" opacity="0.3" />
    <rect x="10" y="13" width="2" height="1" fill="#4a7c9f" opacity="0.3" />
  </svg>
);

const PixelTankIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="6" y="4" width="5" height="4" fill={color} />
    <rect x="7" y="5" width="3" height="2" fill={color} opacity="0.5" />
    <rect x="8" y="6" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="6" y="4" width="2" height="1" fill="#ffffff" opacity="0.3" />
    <rect x="7" y="5" width="2" height="1" fill="#3a3a3a" />
    <rect x="11" y="5" width="3" height="2" fill={color} />
    <rect x="11" y="6" width="3" height="1" fill={color} opacity="0.6" />
    <rect x="14" y="5" width="1" height="2" fill="#3a3a3a" />
    <rect x="11" y="5" width="2" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="4" y="8" width="9" height="4" fill={color} />
    <rect x="5" y="9" width="7" height="2" fill={color} opacity="0.5" />
    <rect x="6" y="10" width="5" height="1" fill={color} opacity="0.7" />
    <rect x="5" y="8" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="8" y="8" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="11" y="8" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="3" y="12" width="11" height="3" fill="#2a2a2a" />
    <rect x="3" y="12" width="11" height="1" fill="#3a3a3a" />
    <rect x="4" y="12" width="2" height="2" fill="#4a4a4a" />
    <rect x="7" y="12" width="2" height="2" fill="#4a4a4a" />
    <rect x="10" y="12" width="2" height="2" fill="#4a4a4a" />
    <rect x="5" y="13" width="1" height="1" fill="#606060" />
    <rect x="8" y="13" width="1" height="1" fill="#606060" />
    <rect x="11" y="13" width="1" height="1" fill="#606060" />
    <rect x="2" y="10" width="2" height="2" fill={color} />
    <rect x="13" y="9" width="1" height="3" fill={color} />
  </svg>
);

const PixelPlaneIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="5" y="1" width="6" height="1" fill="#606060" />
    <rect x="7" y="0" width="2" height="3" fill="#606060" />
    <rect x="7" y="2" width="2" height="1" fill="#3a3a3a" />
    <rect x="7" y="3" width="2" height="2" fill={color} />
    <rect x="7" y="3" width="1" height="1" fill="#ffffff" opacity="0.3" />
    <rect x="7" y="5" width="2" height="7" fill={color} />
    <rect x="7" y="6" width="2" height="1" fill={color} opacity="0.5" />
    <rect x="7" y="9" width="2" height="1" fill={color} opacity="0.5" />
    <rect x="6" y="6" width="4" height="3" fill="#4a7c9f" opacity="0.7" />
    <rect x="7" y="6" width="2" height="2" fill="#6a9cbf" opacity="0.4" />
    <rect x="6" y="6" width="1" height="3" fill={color} />
    <rect x="9" y="6" width="1" height="3" fill={color} />
    <rect x="1" y="8" width="14" height="3" fill={color} />
    <rect x="2" y="9" width="12" height="1" fill={color} opacity="0.5" />
    <rect x="3" y="10" width="10" height="1" fill={color} opacity="0.7" />
    <rect x="2" y="8" width="2" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="12" y="8" width="2" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="1" y="9" width="1" height="1" fill={color} opacity="0.8" />
    <rect x="14" y="9" width="1" height="1" fill={color} opacity="0.8" />
    <rect x="7" y="11" width="2" height="1" fill={color} />
    <rect x="6" y="12" width="4" height="2" fill={color} />
    <rect x="7" y="12" width="2" height="1" fill={color} opacity="0.5" />
    <rect x="4" y="13" width="8" height="1" fill={color} />
    <rect x="5" y="13" width="6" height="1" fill={color} opacity="0.6" />
    <rect x="7" y="5" width="1" height="5" fill="#ffffff" opacity="0.2" />
  </svg>
);

const PixelArtilleryIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="4" y="5" width="9" height="3" fill={color} />
    <rect x="5" y="6" width="7" height="1" fill={color} opacity="0.5" />
    <rect x="6" y="6" width="5" height="1" fill={color} opacity="0.7" />
    <rect x="6" y="5" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="9" y="5" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="13" y="5" width="2" height="3" fill={color} />
    <rect x="14" y="6" width="1" height="1" fill="#3a3a3a" />
    <rect x="5" y="5" width="3" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="5" y="8" width="3" height="1" fill={color} opacity="0.7" />
    <rect x="6" y="8" width="5" height="2" fill={color} opacity="0.8" />
    <rect x="7" y="9" width="3" height="1" fill={color} opacity="0.5" />
    <rect x="3" y="7" width="3" height="3" fill={color} />
    <rect x="4" y="8" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="4" y="10" width="9" height="2" fill={color} />
    <rect x="5" y="11" width="7" height="1" fill={color} opacity="0.5" />
    <rect x="6" y="11" width="5" height="1" fill={color} opacity="0.7" />
    <rect x="5" y="10" width="1" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="5" y="12" width="3" height="3" fill="#3a3a3a" />
    <rect x="9" y="12" width="3" height="3" fill="#3a3a3a" />
    <rect x="5" y="12" width="3" height="1" fill="#4a4a4a" />
    <rect x="9" y="12" width="3" height="1" fill="#4a4a4a" />
    <rect x="6" y="13" width="1" height="1" fill="#606060" />
    <rect x="10" y="13" width="1" height="1" fill="#606060" />
    <rect x="6" y="12" width="1" height="3" fill="#4a4a4a" opacity="0.5" />
    <rect x="10" y="12" width="1" height="3" fill="#4a4a4a" opacity="0.5" />
  </svg>
);

const PixelCavalryIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="9" y="2" width="3" height="1" fill="#dc143c" />
    <rect x="10" y="1" width="1" height="1" fill="#dc143c" />
    <rect x="9" y="3" width="3" height="2" fill={color} />
    <rect x="10" y="3" width="1" height="1" fill="#ffffff" opacity="0.3" />
    <rect x="10" y="4" width="1" height="1" fill="#d4a574" />
    <rect x="8" y="5" width="4" height="4" fill={color} />
    <rect x="9" y="6" width="2" height="2" fill={color} opacity="0.5" />
    <rect x="10" y="7" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="9" y="5" width="1" height="2" fill="#ffffff" opacity="0.2" />
    <rect x="8" y="5" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="12" y="4" width="2" height="1" fill="#c0c0c0" />
    <rect x="13" y="5" width="1" height="1" fill="#8b4513" />
    <rect x="7" y="9" width="2" height="2" fill={color} />
    <rect x="11" y="9" width="2" height="2" fill={color} />
    <rect x="8" y="9" width="1" height="1" fill={color} opacity="0.6" />
    <rect x="7" y="10" width="2" height="1" fill="#3a3a3a" />
    <rect x="11" y="10" width="2" height="1" fill="#3a3a3a" />
    <rect x="3" y="5" width="4" height="4" fill="#8b4513" />
    <rect x="2" y="6" width="1" height="2" fill="#8b4513" />
    <rect x="4" y="6" width="2" height="2" fill="#a0522d" opacity="0.5" />
    <rect x="4" y="6" width="1" height="1" fill="#3a3a3a" />
    <rect x="5" y="5" width="2" height="1" fill="#6b3410" />
    <rect x="6" y="4" width="1" height="1" fill="#6b3410" />
    <rect x="3" y="7" width="3" height="1" fill="#5a5a5a" />
    <rect x="6" y="8" width="5" height="3" fill="#8b4513" />
    <rect x="7" y="9" width="3" height="1" fill="#a0522d" opacity="0.4" />
    <rect x="8" y="9" width="2" height="1" fill="#a0522d" opacity="0.6" />
    <rect x="7" y="7" width="4" height="2" fill="#6b3410" />
    <rect x="8" y="7" width="2" height="1" fill="#8b4513" opacity="0.4" />
    <rect x="6" y="11" width="1" height="3" fill="#8b4513" />
    <rect x="9" y="11" width="1" height="3" fill="#8b4513" />
    <rect x="7" y="12" width="1" height="2" fill="#8b4513" />
    <rect x="10" y="12" width="1" height="2" fill="#8b4513" />
    <rect x="6" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="7" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="9" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="10" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="11" y="9" width="1" height="2" fill="#6b3410" />
    <rect x="12" y="10" width="1" height="2" fill="#6b3410" />
  </svg>
);

// GROUP VERSIONS - Enhanced formations with more detail
const PixelArmyGroupIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Ground shadows for depth */}
    <rect x="6" y="14" width="4" height="1" fill="#000000" opacity="0.15" />
    <rect x="1" y="11" width="4" height="1" fill="#000000" opacity="0.1" />
    <rect x="11" y="11" width="4" height="1" fill="#000000" opacity="0.1" />
    <rect x="6" y="8" width="4" height="1" fill="#000000" opacity="0.08" />

    {/* Front soldier - detailed with equipment */}
    <rect x="6" y="7" width="4" height="1" fill={color} />
    <rect x="7" y="7" width="2" height="1" fill="#ffffff" opacity="0.25" />
    <rect x="6" y="8" width="1" height="1" fill="#d4a574" />
    <rect x="9" y="8" width="1" height="1" fill="#d4a574" />
    <rect x="7" y="8" width="1" height="1" fill="#3a3a3a" />
    <rect x="6" y="9" width="4" height="3" fill={color} />
    <rect x="7" y="10" width="2" height="1" fill={color} opacity="0.6" />
    <rect x="7" y="9" width="2" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="8" y="10" width="1" height="1" fill="#8b4513" />
    <rect x="5" y="10" width="1" height="2" fill={color} />
    <rect x="10" y="10" width="1" height="2" fill={color} />
    <rect x="5" y="11" width="1" height="1" fill="#d4a574" />
    <rect x="6" y="12" width="1" height="2" fill={color} />
    <rect x="9" y="12" width="1" height="2" fill={color} />
    {/* Front weapon - rifle with detail */}
    <rect x="4" y="9" width="1" height="2" fill="#5a5a5a" />
    <rect x="3" y="9" width="1" height="1" fill="#3a3a3a" />
    <rect x="4" y="10" width="1" height="1" fill="#808080" />

    {/* Back left soldier - enhanced pose */}
    <rect x="2" y="4" width="3" height="1" fill={color} opacity="0.7" />
    <rect x="2" y="4" width="1" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="2" y="5" width="1" height="1" fill="#d4a574" opacity="0.7" />
    <rect x="2" y="6" width="3" height="3" fill={color} opacity="0.7" />
    <rect x="3" y="6" width="1" height="2" fill="#ffffff" opacity="0.15" />
    <rect x="3" y="7" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="1" y="7" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="4" y="7" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="1" y="8" width="1" height="1" fill="#d4a574" opacity="0.6" />
    <rect x="2" y="9" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="4" y="9" width="1" height="2" fill={color} opacity="0.7" />
    {/* Left soldier weapon */}
    <rect x="0" y="7" width="1" height="1" fill="#5a5a5a" opacity="0.7" />

    {/* Back right soldier - enhanced pose */}
    <rect x="11" y="4" width="3" height="1" fill={color} opacity="0.7" />
    <rect x="13" y="4" width="1" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="13" y="5" width="1" height="1" fill="#d4a574" opacity="0.7" />
    <rect x="11" y="6" width="3" height="3" fill={color} opacity="0.7" />
    <rect x="12" y="6" width="1" height="2" fill="#ffffff" opacity="0.15" />
    <rect x="12" y="7" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="10" y="7" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="13" y="7" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="13" y="8" width="1" height="1" fill="#d4a574" opacity="0.6" />
    <rect x="11" y="9" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="13" y="9" width="1" height="2" fill={color} opacity="0.7" />
    {/* Right soldier weapon */}
    <rect x="15" y="7" width="1" height="1" fill="#5a5a5a" opacity="0.7" />

    {/* Back center soldier - command pose */}
    <rect x="7" y="2" width="2" height="1" fill={color} opacity="0.5" />
    <rect x="7" y="2" width="1" height="1" fill="#ffffff" opacity="0.08" />
    <rect x="7" y="3" width="2" height="3" fill={color} opacity="0.5" />
    <rect x="8" y="3" width="1" height="2" fill="#ffffff" opacity="0.1" />
    <rect x="7" y="4" width="1" height="1" fill={color} opacity="0.35" />
    <rect x="6" y="4" width="1" height="2" fill={color} opacity="0.5" />
    <rect x="9" y="4" width="1" height="2" fill={color} opacity="0.5" />
    <rect x="7" y="6" width="1" height="2" fill={color} opacity="0.5" />
    <rect x="8" y="6" width="1" height="2" fill={color} opacity="0.5" />
  </svg>
);

const PixelFleetGroupIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Front ship - flagship with enhanced detail */}
    <rect x="7" y="7" width="1" height="1" fill="#dc143c" />
    <rect x="7" y="6" width="1" height="1" fill="#ff4444" opacity="0.5" />
    <rect x="7" y="8" width="1" height="5" fill="#8b4513" />
    <rect x="7" y="8" width="1" height="2" fill="#a0522d" opacity="0.4" />
    <rect x="6" y="10" width="1" height="1" fill="#6b3410" />
    <rect x="8" y="9" width="4" height="3" fill={color} />
    <rect x="9" y="10" width="2" height="1" fill={color} opacity="0.5" />
    <rect x="8" y="9" width="1" height="2" fill="#ffffff" opacity="0.2" />
    <rect x="10" y="10" width="1" height="1" fill="#3a3a3a" />
    <rect x="5" y="12" width="6" height="2" fill={color} />
    <rect x="6" y="12" width="4" height="1" fill="#ffffff" opacity="0.15" />
    <rect x="7" y="13" width="2" height="1" fill={color} opacity="0.6" />
    <rect x="6" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="8" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="10" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="4" y="13" width="1" height="1" fill={color} />
    <rect x="11" y="13" width="1" height="1" fill={color} />
    <rect x="4" y="14" width="1" height="1" fill={color} opacity="0.4" />
    <rect x="11" y="14" width="1" height="1" fill={color} opacity="0.4" />

    {/* Back left ship - escort with enhanced detail */}
    <rect x="1" y="4" width="1" height="1" fill="#dc143c" opacity="0.6" />
    <rect x="1" y="5" width="1" height="4" fill="#8b4513" opacity="0.7" />
    <rect x="1" y="5" width="1" height="2" fill="#a0522d" opacity="0.3" />
    <rect x="2" y="6" width="3" height="2" fill={color} opacity="0.7" />
    <rect x="2" y="6" width="1" height="1" fill="#ffffff" opacity="0.15" />
    <rect x="3" y="7" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="0" y="9" width="5" height="2" fill={color} opacity="0.7" />
    <rect x="1" y="9" width="3" height="1" fill="#ffffff" opacity="0.1" />
    <rect x="2" y="10" width="2" height="1" fill={color} opacity="0.5" />
    <rect x="1" y="10" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="3" y="10" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="0" y="11" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="4" y="11" width="1" height="1" fill={color} opacity="0.7" />

    {/* Back right ship - escort with enhanced detail */}
    <rect x="13" y="3" width="1" height="1" fill="#dc143c" opacity="0.6" />
    <rect x="13" y="4" width="1" height="4" fill="#8b4513" opacity="0.7" />
    <rect x="13" y="4" width="1" height="2" fill="#a0522d" opacity="0.3" />
    <rect x="11" y="5" width="3" height="2" fill={color} opacity="0.7" />
    <rect x="13" y="5" width="1" height="1" fill="#ffffff" opacity="0.15" />
    <rect x="12" y="6" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="11" y="7" width="5" height="2" fill={color} opacity="0.7" />
    <rect x="12" y="7" width="3" height="1" fill="#ffffff" opacity="0.1" />
    <rect x="12" y="8" width="2" height="1" fill={color} opacity="0.5" />
    <rect x="12" y="8" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="14" y="8" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="11" y="9" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="15" y="9" width="1" height="1" fill={color} opacity="0.7" />

    {/* Water line with waves and reflections */}
    <rect x="0" y="14" width="16" height="1" fill="#2a5a7a" opacity="0.4" />
    <rect x="1" y="11" width="2" height="1" fill="#4a7c9f" opacity="0.3" />
    <rect x="5" y="14" width="2" height="1" fill="#4a7c9f" opacity="0.3" />
    <rect x="7" y="15" width="2" height="1" fill="#4a7c9f" opacity="0.25" />
    <rect x="9" y="14" width="2" height="1" fill="#4a7c9f" opacity="0.3" />
    <rect x="12" y="9" width="2" height="1" fill="#4a7c9f" opacity="0.3" />
  </svg>
);

const PixelTankGroupIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Dust clouds from movement */}
    <rect x="3" y="15" width="2" height="1" fill="#8b7355" opacity="0.2" />
    <rect x="7" y="15" width="3" height="1" fill="#8b7355" opacity="0.25" />
    <rect x="13" y="15" width="2" height="1" fill="#8b7355" opacity="0.2" />
    <rect x="1" y="12" width="1" height="1" fill="#8b7355" opacity="0.15" />
    <rect x="15" y="11" width="1" height="1" fill="#8b7355" opacity="0.15" />

    {/* Front tank - lead with enhanced detail */}
    <rect x="6" y="7" width="5" height="3" fill={color} />
    <rect x="7" y="8" width="3" height="1" fill={color} opacity="0.5" />
    <rect x="8" y="9" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="7" y="7" width="2" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="7" y="8" width="1" height="1" fill="#3a3a3a" />
    <rect x="8" y="8" width="1" height="1" fill="#5a5a5a" />
    {/* Gun barrel with muzzle brake */}
    <rect x="11" y="8" width="4" height="2" fill={color} />
    <rect x="12" y="8" width="2" height="1" fill="#ffffff" opacity="0.15" />
    <rect x="11" y="9" width="3" height="1" fill={color} opacity="0.6" />
    <rect x="14" y="8" width="1" height="2" fill="#3a3a3a" />
    <rect x="13" y="8" width="1" height="2" fill="#5a5a5a" />
    {/* Hull with panel lines */}
    <rect x="5" y="10" width="7" height="3" fill={color} />
    <rect x="6" y="11" width="5" height="1" fill={color} opacity="0.5" />
    <rect x="7" y="12" width="3" height="1" fill={color} opacity="0.7" />
    <rect x="6" y="10" width="4" height="1" fill="#ffffff" opacity="0.15" />
    <rect x="8" y="10" width="1" height="2" fill={color} opacity="0.4" />
    {/* Tracks with detailed wheels */}
    <rect x="4" y="13" width="9" height="2" fill="#2a2a2a" />
    <rect x="4" y="13" width="9" height="1" fill="#3a3a3a" />
    <rect x="5" y="13" width="2" height="2" fill="#4a4a4a" />
    <rect x="8" y="13" width="2" height="2" fill="#4a4a4a" />
    <rect x="11" y="13" width="2" height="2" fill="#4a4a4a" />
    <rect x="6" y="14" width="1" height="1" fill="#606060" />
    <rect x="9" y="14" width="1" height="1" fill="#606060" />
    <rect x="12" y="14" width="1" height="1" fill="#606060" />
    <rect x="5" y="14" width="1" height="1" fill="#3a3a3a" />
    <rect x="11" y="14" width="1" height="1" fill="#3a3a3a" />
    {/* Front armor with details */}
    <rect x="3" y="11" width="2" height="2" fill={color} />
    <rect x="4" y="11" width="1" height="1" fill="#ffffff" opacity="0.15" />
    <rect x="3" y="12" width="1" height="1" fill={color} opacity="0.6" />

    {/* Back left tank - flanking position */}
    <rect x="1" y="4" width="4" height="3" fill={color} opacity="0.7" />
    <rect x="2" y="5" width="2" height="1" fill={color} opacity="0.4" />
    <rect x="2" y="4" width="1" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="2" y="5" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="3" y="5" width="1" height="1" fill="#5a5a5a" opacity="0.6" />
    {/* Gun barrel */}
    <rect x="5" y="5" width="2" height="1" fill={color} opacity="0.7" />
    <rect x="6" y="5" width="1" height="1" fill="#3a3a3a" opacity="0.6" />
    {/* Hull with panels */}
    <rect x="0" y="7" width="5" height="3" fill={color} opacity="0.7" />
    <rect x="1" y="8" width="3" height="1" fill={color} opacity="0.4" />
    <rect x="1" y="7" width="2" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="2" y="7" width="1" height="2" fill={color} opacity="0.35" />
    {/* Tracks with wheels */}
    <rect x="0" y="10" width="6" height="2" fill="#2a2a2a" opacity="0.7" />
    <rect x="0" y="10" width="6" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="1" y="10" width="1" height="2" fill="#4a4a4a" opacity="0.7" />
    <rect x="3" y="10" width="1" height="2" fill="#4a4a4a" opacity="0.7" />
    <rect x="5" y="10" width="1" height="2" fill="#4a4a4a" opacity="0.7" />
    <rect x="2" y="11" width="1" height="1" fill="#606060" opacity="0.7" />
    <rect x="4" y="11" width="1" height="1" fill="#606060" opacity="0.7" />

    {/* Back right tank - flanking position */}
    <rect x="11" y="3" width="4" height="3" fill={color} opacity="0.7" />
    <rect x="12" y="4" width="2" height="1" fill={color} opacity="0.4" />
    <rect x="13" y="3" width="1" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="12" y="4" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="13" y="4" width="1" height="1" fill="#5a5a5a" opacity="0.6" />
    {/* Gun barrel */}
    <rect x="9" y="4" width="2" height="1" fill={color} opacity="0.7" />
    <rect x="9" y="4" width="1" height="1" fill="#3a3a3a" opacity="0.6" />
    {/* Hull with panels */}
    <rect x="10" y="6" width="6" height="3" fill={color} opacity="0.7" />
    <rect x="11" y="7" width="4" height="1" fill={color} opacity="0.4" />
    <rect x="13" y="6" width="2" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="13" y="6" width="1" height="2" fill={color} opacity="0.35" />
    {/* Tracks with wheels */}
    <rect x="10" y="9" width="6" height="2" fill="#2a2a2a" opacity="0.7" />
    <rect x="10" y="9" width="6" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="11" y="9" width="1" height="2" fill="#4a4a4a" opacity="0.7" />
    <rect x="13" y="9" width="1" height="2" fill="#4a4a4a" opacity="0.7" />
    <rect x="15" y="9" width="1" height="2" fill="#4a4a4a" opacity="0.7" />
    <rect x="12" y="10" width="1" height="1" fill="#606060" opacity="0.7" />
    <rect x="14" y="10" width="1" height="1" fill="#606060" opacity="0.7" />
  </svg>
);

const PixelPlaneGroupIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* V-formation - 3 planes */}
    {/* Lead plane (front, highly detailed) */}
    {/* Cockpit with windows */}
    <rect x="7" y="8" width="2" height="1" fill={color} />
    <rect x="7" y="9" width="2" height="1" fill="#4a7c9f" opacity="0.8" />
    <rect x="8" y="9" width="1" height="1" fill="#6a9cbf" opacity="0.6" />
    {/* Fuselage with highlights */}
    <rect x="7" y="10" width="2" height="2" fill={color} />
    <rect x="7" y="10" width="1" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="8" y="11" width="1" height="1" fill={color} opacity="0.6" />
    {/* Main wings with panel lines */}
    <rect x="4" y="11" width="8" height="2" fill={color} />
    <rect x="5" y="11" width="6" height="1" fill="#ffffff" opacity="0.15" />
    <rect x="5" y="12" width="6" height="1" fill={color} opacity="0.5" />
    <rect x="7" y="11" width="1" height="2" fill={color} opacity="0.4" />
    <rect x="8" y="11" width="1" height="2" fill={color} opacity="0.4" />
    {/* Engine details */}
    <rect x="6" y="12" width="1" height="1" fill="#3a3a3a" />
    <rect x="9" y="12" width="1" height="1" fill="#3a3a3a" />
    {/* Propeller */}
    <rect x="7" y="7" width="2" height="1" fill="#5a5a5a" opacity="0.7" />
    {/* Landing gear */}
    <rect x="6" y="13" width="1" height="1" fill={color} />
    <rect x="9" y="13" width="1" height="1" fill={color} />
    <rect x="6" y="14" width="1" height="1" fill="#3a3a3a" />
    <rect x="9" y="14" width="1" height="1" fill="#3a3a3a" />
    {/* Tail stabilizer */}
    <rect x="7" y="13" width="2" height="1" fill={color} />
    <rect x="8" y="13" width="1" height="1" fill={color} opacity="0.6" />

    {/* Left wing plane - more detail (opacity 0.7 for mid-depth) */}
    {/* Cockpit */}
    <rect x="2" y="2" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="2" y="3" width="1" height="1" fill="#4a7c9f" opacity="0.6" />
    {/* Fuselage */}
    <rect x="2" y="4" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="2" y="4" width="1" height="1" fill="#ffffff" opacity="0.12" />
    {/* Main wings with panels */}
    <rect x="0" y="5" width="5" height="2" fill={color} opacity="0.7" />
    <rect x="1" y="5" width="3" height="1" fill="#ffffff" opacity="0.1" />
    <rect x="1" y="6" width="3" height="1" fill={color} opacity="0.4" />
    <rect x="2" y="5" width="1" height="2" fill={color} opacity="0.35" />
    {/* Engine details */}
    <rect x="1" y="6" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="3" y="6" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    {/* Propeller */}
    <rect x="2" y="1" width="1" height="1" fill="#5a5a5a" opacity="0.6" />
    {/* Landing gear */}
    <rect x="1" y="7" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="3" y="7" width="1" height="1" fill={color} opacity="0.7" />
    {/* Tail */}
    <rect x="1" y="8" width="2" height="1" fill={color} opacity="0.5" />

    {/* Right wing plane - more detail (opacity 0.7 for mid-depth) */}
    {/* Cockpit */}
    <rect x="13" y="2" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="13" y="3" width="1" height="1" fill="#4a7c9f" opacity="0.6" />
    {/* Fuselage */}
    <rect x="13" y="4" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="13" y="4" width="1" height="1" fill="#ffffff" opacity="0.12" />
    {/* Main wings with panels */}
    <rect x="11" y="5" width="5" height="2" fill={color} opacity="0.7" />
    <rect x="12" y="5" width="3" height="1" fill="#ffffff" opacity="0.1" />
    <rect x="12" y="6" width="3" height="1" fill={color} opacity="0.4" />
    <rect x="13" y="5" width="1" height="2" fill={color} opacity="0.35" />
    {/* Engine details */}
    <rect x="12" y="6" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="14" y="6" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    {/* Propeller */}
    <rect x="13" y="1" width="1" height="1" fill="#5a5a5a" opacity="0.6" />
    {/* Landing gear */}
    <rect x="12" y="7" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="14" y="7" width="1" height="1" fill={color} opacity="0.7" />
    {/* Tail */}
    <rect x="13" y="8" width="2" height="1" fill={color} opacity="0.5" />
  </svg>
);

const PixelArtilleryGroupIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Front cannon - highly detailed */}
    {/* Barrel with bands and muzzle */}
    <rect x="11" y="9" width="4" height="2" fill={color} />
    <rect x="12" y="9" width="2" height="1" fill="#ffffff" opacity="0.15" />
    <rect x="11" y="10" width="3" height="1" fill={color} opacity="0.6" />
    <rect x="13" y="9" width="1" height="2" fill={color} opacity="0.4" />
    <rect x="15" y="9" width="1" height="2" fill="#3a3a3a" />
    {/* Barrel bands for reinforcement */}
    <rect x="12" y="9" width="1" height="2" fill="#5a5a5a" />
    <rect x="14" y="9" width="1" height="2" fill="#5a5a5a" />
    {/* Breech and recoil mechanism */}
    <rect x="5" y="9" width="6" height="2" fill={color} />
    <rect x="6" y="9" width="4" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="6" y="10" width="4" height="1" fill={color} opacity="0.5" />
    <rect x="8" y="9" width="1" height="2" fill={color} opacity="0.4" />
    <rect x="10" y="10" width="1" height="1" fill="#3a3a3a" />
    {/* Shield plate with highlights */}
    <rect x="4" y="11" width="8" height="2" fill={color} />
    <rect x="5" y="11" width="6" height="1" fill="#ffffff" opacity="0.15" />
    <rect x="5" y="12" width="6" height="1" fill={color} opacity="0.5" />
    <rect x="7" y="11" width="1" height="2" fill={color} opacity="0.4" />
    <rect x="9" y="11" width="1" height="2" fill={color} opacity="0.4" />
    {/* Ammunition stack */}
    <rect x="12" y="11" width="2" height="2" fill="#d4a574" />
    <rect x="12" y="11" width="1" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="13" y="12" width="1" height="1" fill="#8b7355" />
    {/* Wheels with spokes */}
    <rect x="5" y="13" width="2" height="2" fill="#3a3a3a" />
    <rect x="9" y="13" width="2" height="2" fill="#3a3a3a" />
    <rect x="6" y="14" width="1" height="1" fill="#606060" />
    <rect x="10" y="14" width="1" height="1" fill="#606060" />
    <rect x="5" y="14" width="1" height="1" fill="#5a5a5a" />
    <rect x="7" y="13" width="1" height="1" fill="#5a5a5a" />
    <rect x="9" y="14" width="1" height="1" fill="#5a5a5a" />
    <rect x="11" y="13" width="1" height="1" fill="#5a5a5a" />

    {/* Back left cannon - more detail (opacity 0.7 for mid-depth) */}
    {/* Barrel */}
    <rect x="5" y="4" width="2" height="2" fill={color} opacity="0.7" />
    <rect x="5" y="4" width="1" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="6" y="5" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="5" y="5" width="1" height="1" fill="#5a5a5a" opacity="0.7" />
    {/* Breech */}
    <rect x="1" y="4" width="4" height="2" fill={color} opacity="0.7" />
    <rect x="2" y="4" width="2" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="2" y="5" width="2" height="1" fill={color} opacity="0.4" />
    <rect x="3" y="4" width="1" height="2" fill={color} opacity="0.35" />
    {/* Shield */}
    <rect x="0" y="6" width="6" height="2" fill={color} opacity="0.7" />
    <rect x="1" y="6" width="4" height="1" fill="#ffffff" opacity="0.1" />
    <rect x="1" y="7" width="4" height="1" fill={color} opacity="0.4" />
    <rect x="2" y="6" width="1" height="2" fill={color} opacity="0.35" />
    {/* Wheels */}
    <rect x="1" y="8" width="2" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="4" y="8" width="2" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="2" y="8" width="1" height="1" fill="#606060" opacity="0.7" />
    <rect x="5" y="8" width="1" height="1" fill="#606060" opacity="0.7" />

    {/* Back right cannon - more detail (opacity 0.7 for mid-depth) */}
    {/* Barrel */}
    <rect x="9" y="3" width="2" height="2" fill={color} opacity="0.7" />
    <rect x="10" y="3" width="1" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="9" y="4" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="10" y="4" width="1" height="1" fill="#5a5a5a" opacity="0.7" />
    {/* Breech */}
    <rect x="10" y="3" width="4" height="2" fill={color} opacity="0.7" />
    <rect x="11" y="3" width="2" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="11" y="4" width="2" height="1" fill={color} opacity="0.4" />
    <rect x="12" y="3" width="1" height="2" fill={color} opacity="0.35" />
    {/* Shield */}
    <rect x="9" y="5" width="6" height="2" fill={color} opacity="0.7" />
    <rect x="10" y="5" width="4" height="1" fill="#ffffff" opacity="0.1" />
    <rect x="10" y="6" width="4" height="1" fill={color} opacity="0.4" />
    <rect x="12" y="5" width="1" height="2" fill={color} opacity="0.35" />
    {/* Wheels */}
    <rect x="10" y="7" width="2" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="13" y="7" width="2" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="11" y="7" width="1" height="1" fill="#606060" opacity="0.7" />
    <rect x="14" y="7" width="1" height="1" fill="#606060" opacity="0.7" />
  </svg>
);

const PixelCavalryGroupIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Front rider - highly detailed */}
    {/* Rider helmet and head */}
    <rect x="8" y="8" width="2" height="1" fill={color} />
    <rect x="8" y="8" width="1" height="1" fill="#ffffff" opacity="0.2" />
    {/* Rider body with uniform details */}
    <rect x="8" y="9" width="3" height="2" fill={color} />
    <rect x="8" y="9" width="2" height="1" fill="#ffffff" opacity="0.15" />
    <rect x="9" y="10" width="1" height="1" fill={color} opacity="0.5" />
    {/* Rider arms and legs */}
    <rect x="7" y="11" width="1" height="2" fill={color} />
    <rect x="11" y="11" width="1" height="2" fill={color} />
    <rect x="7" y="11" width="1" height="1" fill="#ffffff" opacity="0.12" />
    <rect x="11" y="11" width="1" height="1" fill={color} opacity="0.6" />
    {/* Weapon (saber) */}
    <rect x="11" y="8" width="2" height="1" fill="#c0c0c0" />
    <rect x="12" y="8" width="1" height="1" fill="#ffffff" opacity="0.3" />
    <rect x="11" y="9" width="1" height="1" fill="#8b4513" />
    {/* Banner/flag */}
    <rect x="11" y="7" width="1" height="1" fill="#dc143c" />
    <rect x="12" y="7" width="1" height="1" fill="#dc143c" opacity="0.7" />
    <rect x="11" y="6" width="1" height="1" fill="#5a5a5a" />

    {/* Horse body - detailed musculature */}
    <rect x="5" y="10" width="3" height="2" fill="#8b4513" />
    <rect x="5" y="10" width="2" height="1" fill="#a0522d" opacity="0.4" />
    <rect x="6" y="11" width="1" height="1" fill="#6b3410" />
    <rect x="4" y="11" width="1" height="1" fill="#8b4513" />
    {/* Horse head with detail */}
    <rect x="8" y="10" width="1" height="1" fill="#8b4513" />
    <rect x="9" y="11" width="1" height="1" fill="#8b4513" />
    {/* Saddle and equipment */}
    <rect x="7" y="9" width="3" height="2" fill="#6b3410" />
    <rect x="7" y="9" width="2" height="1" fill="#8b4513" opacity="0.5" />
    <rect x="8" y="10" width="1" height="1" fill="#3a3a3a" />
    {/* Bridle and reins */}
    <rect x="9" y="10" width="1" height="1" fill="#5a5a5a" />
    {/* Horse legs - front with detail */}
    <rect x="5" y="12" width="1" height="2" fill="#8b4513" />
    <rect x="7" y="12" width="1" height="2" fill="#8b4513" />
    <rect x="5" y="12" width="1" height="1" fill="#a0522d" opacity="0.3" />
    <rect x="7" y="12" width="1" height="1" fill="#a0522d" opacity="0.3" />
    {/* Hooves */}
    <rect x="5" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="7" y="13" width="1" height="1" fill="#3a3a3a" />
    <rect x="5" y="14" width="1" height="1" fill="#2a2a2a" />
    <rect x="7" y="14" width="1" height="1" fill="#2a2a2a" />

    {/* Back left rider - detailed (opacity 0.7 for mid-depth) */}
    {/* Rider helmet */}
    <rect x="1" y="4" width="2" height="1" fill={color} opacity="0.7" />
    <rect x="1" y="4" width="1" height="1" fill="#ffffff" opacity="0.12" />
    {/* Rider body */}
    <rect x="1" y="5" width="2" height="2" fill={color} opacity="0.7" />
    <rect x="1" y="5" width="1" height="1" fill="#ffffff" opacity="0.1" />
    <rect x="2" y="6" width="1" height="1" fill={color} opacity="0.4" />
    {/* Rider arms and legs */}
    <rect x="0" y="7" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="2" y="7" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="0" y="7" width="1" height="1" fill="#ffffff" opacity="0.08" />
    {/* Weapon */}
    <rect x="3" y="5" width="1" height="1" fill="#c0c0c0" opacity="0.7" />
    <rect x="3" y="6" width="1" height="1" fill="#8b4513" opacity="0.7" />
    {/* Horse body */}
    <rect x="0" y="6" width="3" height="2" fill="#8b4513" opacity="0.7" />
    <rect x="0" y="6" width="2" height="1" fill="#a0522d" opacity="0.3" />
    <rect x="1" y="7" width="1" height="1" fill="#6b3410" opacity="0.7" />
    {/* Saddle */}
    <rect x="1" y="6" width="2" height="1" fill="#6b3410" opacity="0.7" />
    <rect x="2" y="6" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    {/* Horse legs */}
    <rect x="0" y="8" width="1" height="2" fill="#8b4513" opacity="0.7" />
    <rect x="2" y="8" width="1" height="2" fill="#8b4513" opacity="0.7" />
    <rect x="0" y="8" width="1" height="1" fill="#a0522d" opacity="0.25" />
    <rect x="2" y="8" width="1" height="1" fill="#a0522d" opacity="0.25" />
    {/* Hooves */}
    <rect x="0" y="9" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="2" y="9" width="1" height="1" fill="#3a3a3a" opacity="0.7" />

    {/* Back right rider - detailed (opacity 0.7 for mid-depth) */}
    {/* Rider helmet */}
    <rect x="13" y="3" width="2" height="1" fill={color} opacity="0.7" />
    <rect x="14" y="3" width="1" height="1" fill="#ffffff" opacity="0.12" />
    {/* Rider body */}
    <rect x="13" y="4" width="2" height="2" fill={color} opacity="0.7" />
    <rect x="14" y="4" width="1" height="1" fill="#ffffff" opacity="0.1" />
    <rect x="13" y="5" width="1" height="1" fill={color} opacity="0.4" />
    {/* Rider arms and legs */}
    <rect x="12" y="6" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="14" y="6" width="1" height="2" fill={color} opacity="0.7" />
    <rect x="14" y="6" width="1" height="1" fill="#ffffff" opacity="0.08" />
    {/* Weapon */}
    <rect x="15" y="4" width="1" height="1" fill="#c0c0c0" opacity="0.7" />
    <rect x="15" y="5" width="1" height="1" fill="#8b4513" opacity="0.7" />
    {/* Horse body */}
    <rect x="12" y="5" width="3" height="2" fill="#8b4513" opacity="0.7" />
    <rect x="13" y="5" width="2" height="1" fill="#a0522d" opacity="0.3" />
    <rect x="13" y="6" width="1" height="1" fill="#6b3410" opacity="0.7" />
    {/* Saddle */}
    <rect x="13" y="5" width="2" height="1" fill="#6b3410" opacity="0.7" />
    <rect x="13" y="5" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    {/* Horse legs */}
    <rect x="12" y="7" width="1" height="2" fill="#8b4513" opacity="0.7" />
    <rect x="14" y="7" width="1" height="2" fill="#8b4513" opacity="0.7" />
    <rect x="12" y="7" width="1" height="1" fill="#a0522d" opacity="0.25" />
    <rect x="14" y="7" width="1" height="1" fill="#a0522d" opacity="0.25" />
    {/* Hooves */}
    <rect x="12" y="8" width="1" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="14" y="8" width="1" height="1" fill="#3a3a3a" opacity="0.7" />

    {/* Back center rider - more visible (opacity 0.5 for back depth) */}
    {/* Rider helmet */}
    <rect x="7" y="1" width="2" height="1" fill={color} opacity="0.5" />
    {/* Rider body */}
    <rect x="7" y="2" width="2" height="2" fill={color} opacity="0.5" />
    <rect x="7" y="2" width="1" height="1" fill="#ffffff" opacity="0.08" />
    {/* Rider legs */}
    <rect x="6" y="4" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="8" y="4" width="1" height="1" fill={color} opacity="0.5" />
    {/* Horse body */}
    <rect x="6" y="3" width="4" height="2" fill="#8b4513" opacity="0.5" />
    <rect x="7" y="3" width="2" height="1" fill="#a0522d" opacity="0.2" />
    {/* Saddle */}
    <rect x="7" y="3" width="2" height="1" fill="#6b3410" opacity="0.5" />
    {/* Horse legs */}
    <rect x="6" y="5" width="1" height="2" fill="#8b4513" opacity="0.5" />
    <rect x="8" y="5" width="1" height="2" fill="#8b4513" opacity="0.5" />
  </svg>
);

const PixelSupplyGroupIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Front crate (full opacity) */}
    <rect x="6" y="9" width="5" height="5" fill={color} />
    <rect x="7" y="10" width="3" height="3" fill={color} opacity="0.5" />
    <rect x="8" y="11" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="6" y="9" width="2" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="7" y="10" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="9" y="10" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="6" y="11" width="5" height="1" fill="#3a3a3a" />
    <rect x="8" y="9" width="1" height="5" fill="#3a3a3a" />
    <rect x="7" y="10" width="1" height="1" fill="#ff9500" opacity="0.6" />
    <rect x="9" y="12" width="1" height="1" fill="#ff9500" opacity="0.6" />

    {/* Left crate (0.7 opacity) */}
    <rect x="0" y="5" width="5" height="5" fill={color} opacity="0.7" />
    <rect x="1" y="6" width="3" height="3" fill={color} opacity="0.35" />
    <rect x="2" y="7" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="0" y="5" width="2" height="1" fill="#ffffff" opacity="0.14" />
    <rect x="1" y="6" width="1" height="3" fill={color} opacity="0.2" />
    <rect x="3" y="6" width="1" height="3" fill={color} opacity="0.2" />
    <rect x="0" y="7" width="5" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="2" y="5" width="1" height="5" fill="#3a3a3a" opacity="0.7" />

    {/* Right crate (0.7 opacity) */}
    <rect x="11" y="4" width="5" height="5" fill={color} opacity="0.7" />
    <rect x="12" y="5" width="3" height="3" fill={color} opacity="0.35" />
    <rect x="13" y="6" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="11" y="4" width="2" height="1" fill="#ffffff" opacity="0.14" />
    <rect x="12" y="5" width="1" height="3" fill={color} opacity="0.2" />
    <rect x="14" y="5" width="1" height="3" fill={color} opacity="0.2" />
    <rect x="11" y="6" width="5" height="1" fill="#3a3a3a" opacity="0.7" />
    <rect x="13" y="4" width="1" height="5" fill="#3a3a3a" opacity="0.7" />

    {/* Back center crate (0.5 opacity) */}
    <rect x="6" y="2" width="5" height="5" fill={color} opacity="0.5" />
    <rect x="7" y="3" width="3" height="3" fill={color} opacity="0.25" />
    <rect x="8" y="4" width="1" height="1" fill={color} opacity="0.35" />
    <rect x="6" y="2" width="2" height="1" fill="#ffffff" opacity="0.1" />
    <rect x="7" y="3" width="1" height="3" fill={color} opacity="0.15" />
    <rect x="9" y="3" width="1" height="3" fill={color} opacity="0.15" />
    <rect x="6" y="4" width="5" height="1" fill="#3a3a3a" opacity="0.5" />
    <rect x="8" y="2" width="1" height="5" fill="#3a3a3a" opacity="0.5" />
  </svg>
);

const PixelSupplyIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="6" y="3" width="5" height="5" fill={color} />
    <rect x="7" y="4" width="3" height="3" fill={color} opacity="0.5" />
    <rect x="8" y="5" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="6" y="3" width="2" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="7" y="4" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="9" y="4" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="6" y="5" width="5" height="1" fill="#3a3a3a" />
    <rect x="8" y="3" width="1" height="5" fill="#3a3a3a" />
    <rect x="7" y="4" width="1" height="1" fill="#ff9500" opacity="0.6" />
    <rect x="9" y="6" width="1" height="1" fill="#ff9500" opacity="0.6" />
    <rect x="2" y="8" width="5" height="5" fill={color} />
    <rect x="3" y="9" width="3" height="3" fill={color} opacity="0.5" />
    <rect x="4" y="10" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="2" y="8" width="2" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="3" y="9" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="5" y="9" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="2" y="10" width="5" height="1" fill="#3a3a3a" />
    <rect x="4" y="8" width="1" height="5" fill="#3a3a3a" />
    <rect x="9" y="8" width="5" height="5" fill={color} />
    <rect x="10" y="9" width="3" height="3" fill={color} opacity="0.5" />
    <rect x="11" y="10" width="1" height="1" fill={color} opacity="0.7" />
    <rect x="9" y="8" width="2" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="10" y="9" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="12" y="9" width="1" height="3" fill={color} opacity="0.3" />
    <rect x="9" y="10" width="5" height="1" fill="#3a3a3a" />
    <rect x="11" y="8" width="1" height="5" fill="#3a3a3a" />
    <rect x="3" y="9" width="2" height="1" fill="#3a3a3a" />
    <rect x="10" y="11" width="2" height="1" fill="#3a3a3a" />
    <rect x="1" y="13" width="14" height="1" fill="#2a2a2a" opacity="0.5" />
    <rect x="2" y="13" width="5" height="1" fill="#1a1a1a" opacity="0.3" />
    <rect x="9" y="13" width="5" height="1" fill="#1a1a1a" opacity="0.3" />
  </svg>
);

// DIPLOMACY POWER FLAGS - 16x16 pixel flags
const AustriaFlag = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="0" y="0" width="16" height="5" fill="#ed2939" />
    <rect x="0" y="5" width="16" height="6" fill="#ffffff" />
    <rect x="0" y="11" width="16" height="5" fill="#ed2939" />
  </svg>
);

const EnglandFlag = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="0" y="0" width="16" height="16" fill="#ffffff" />
    <rect x="7" y="0" width="2" height="16" fill="#ed2939" />
    <rect x="0" y="7" width="16" height="2" fill="#ed2939" />
  </svg>
);

const FranceFlag = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="0" y="0" width="5" height="16" fill="#002395" />
    <rect x="5" y="0" width="6" height="16" fill="#ffffff" />
    <rect x="11" y="0" width="5" height="16" fill="#ed2939" />
  </svg>
);

const GermanyFlag = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="0" y="0" width="16" height="5" fill="#000000" />
    <rect x="0" y="5" width="16" height="6" fill="#dd0000" />
    <rect x="0" y="11" width="16" height="5" fill="#ffce00" />
  </svg>
);

const ItalyFlag = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="0" y="0" width="5" height="16" fill="#009246" />
    <rect x="5" y="0" width="6" height="16" fill="#ffffff" />
    <rect x="11" y="0" width="5" height="16" fill="#ce2b37" />
  </svg>
);

const RussiaFlag = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="0" y="0" width="16" height="5" fill="#ffffff" />
    <rect x="0" y="5" width="16" height="6" fill="#0039a6" />
    <rect x="0" y="11" width="16" height="5" fill="#d52b1e" />
  </svg>
);

const TurkeyFlag = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="0" y="0" width="16" height="16" fill="#e30a17" />
    {/* Crescent */}
    <rect x="5" y="5" width="1" height="6" fill="#ffffff" />
    <rect x="6" y="4" width="1" height="8" fill="#ffffff" />
    <rect x="7" y="3" width="1" height="10" fill="#ffffff" />
    <rect x="8" y="4" width="1" height="8" fill="#ffffff" />
    <rect x="9" y="5" width="1" height="6" fill="#ffffff" />
    {/* Inner circle (red) to create crescent shape */}
    <rect x="6" y="6" width="1" height="4" fill="#e30a17" />
    <rect x="7" y="5" width="1" height="6" fill="#e30a17" />
    <rect x="8" y="6" width="1" height="4" fill="#e30a17" />
    {/* Star */}
    <rect x="11" y="7" width="1" height="2" fill="#ffffff" />
    <rect x="10" y="8" width="1" height="1" fill="#ffffff" />
    <rect x="12" y="8" width="1" height="1" fill="#ffffff" />
  </svg>
);

// STATUS INDICATOR BADGES - Enhanced 14x14 pixel badges with premium design
const CheckmarkBadge = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Outer ring */}
    <rect x="4" y="1" width="6" height="1" fill="#2a4539" />
    <rect x="3" y="2" width="8" height="1" fill="#2a4539" />
    <rect x="2" y="3" width="10" height="1" fill="#2a4539" />
    <rect x="1" y="4" width="12" height="6" fill="#2a4539" />
    <rect x="2" y="10" width="10" height="1" fill="#2a4539" />
    <rect x="3" y="11" width="8" height="1" fill="#2a4539" />
    <rect x="4" y="12" width="6" height="1" fill="#2a4539" />

    {/* Main circle */}
    <rect x="4" y="2" width="6" height="1" fill="#4a7c59" />
    <rect x="3" y="3" width="8" height="1" fill="#4a7c59" />
    <rect x="2" y="4" width="10" height="6" fill="#4a7c59" />
    <rect x="3" y="10" width="8" height="1" fill="#4a7c59" />
    <rect x="4" y="11" width="6" height="1" fill="#4a7c59" />

    {/* Inner shadow */}
    <rect x="4" y="3" width="6" height="1" fill="#3a6549" />
    <rect x="3" y="4" width="1" height="6" fill="#3a6549" />
    <rect x="2" y="5" width="1" height="4" fill="#3a6549" />

    {/* Highlight */}
    <rect x="5" y="2" width="4" height="1" fill="#6a9c79" />
    <rect x="4" y="3" width="1" height="2" fill="#6a9c79" />
    <rect x="3" y="4" width="1" height="3" fill="#5a8c69" />

    {/* Checkmark icon - thicker and clearer */}
    <rect x="9" y="5" width="2" height="1" fill="#ffffff" />
    <rect x="8" y="6" width="2" height="1" fill="#ffffff" />
    <rect x="7" y="7" width="2" height="1" fill="#ffffff" />
    <rect x="6" y="8" width="1" height="1" fill="#ffffff" />
    <rect x="5" y="7" width="2" height="1" fill="#ffffff" />
    <rect x="4" y="6" width="2" height="1" fill="#ffffff" />
    {/* Checkmark shadow */}
    <rect x="9" y="6" width="1" height="1" fill="#d0d0d0" />
    <rect x="5" y="8" width="1" height="1" fill="#d0d0d0" />
  </svg>
);

const XBadge = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Outer ring */}
    <rect x="4" y="1" width="6" height="1" fill="#8c0a1c" />
    <rect x="3" y="2" width="8" height="1" fill="#8c0a1c" />
    <rect x="2" y="3" width="10" height="1" fill="#8c0a1c" />
    <rect x="1" y="4" width="12" height="6" fill="#8c0a1c" />
    <rect x="2" y="10" width="10" height="1" fill="#8c0a1c" />
    <rect x="3" y="11" width="8" height="1" fill="#8c0a1c" />
    <rect x="4" y="12" width="6" height="1" fill="#8c0a1c" />

    {/* Main circle */}
    <rect x="4" y="2" width="6" height="1" fill="#dc143c" />
    <rect x="3" y="3" width="8" height="1" fill="#dc143c" />
    <rect x="2" y="4" width="10" height="6" fill="#dc143c" />
    <rect x="3" y="10" width="8" height="1" fill="#dc143c" />
    <rect x="4" y="11" width="6" height="1" fill="#dc143c" />

    {/* Inner shadow */}
    <rect x="4" y="3" width="6" height="1" fill="#bc123c" />
    <rect x="3" y="4" width="1" height="6" fill="#bc123c" />
    <rect x="2" y="5" width="1" height="4" fill="#ac102c" />

    {/* Highlight */}
    <rect x="5" y="2" width="4" height="1" fill="#fc345c" />
    <rect x="4" y="3" width="1" height="2" fill="#fc345c" />
    <rect x="3" y="4" width="1" height="3" fill="#ec244c" />

    {/* X icon - thicker and clearer */}
    <rect x="5" y="5" width="1" height="1" fill="#ffffff" />
    <rect x="8" y="5" width="1" height="1" fill="#ffffff" />
    <rect x="6" y="6" width="1" height="1" fill="#ffffff" />
    <rect x="7" y="6" width="1" height="1" fill="#ffffff" />
    <rect x="6" y="7" width="2" height="1" fill="#ffffff" />
    <rect x="6" y="8" width="1" height="1" fill="#ffffff" />
    <rect x="7" y="8" width="1" height="1" fill="#ffffff" />
    <rect x="5" y="9" width="1" height="1" fill="#ffffff" />
    <rect x="8" y="9" width="1" height="1" fill="#ffffff" />
    {/* X shadow */}
    <rect x="5" y="6" width="1" height="1" fill="#d0d0d0" />
    <rect x="8" y="8" width="1" height="1" fill="#d0d0d0" />
  </svg>
);

const ClockBadge = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Outer ring */}
    <rect x="4" y="1" width="6" height="1" fill="#bf6500" />
    <rect x="3" y="2" width="8" height="1" fill="#bf6500" />
    <rect x="2" y="3" width="10" height="1" fill="#bf6500" />
    <rect x="1" y="4" width="12" height="6" fill="#bf6500" />
    <rect x="2" y="10" width="10" height="1" fill="#bf6500" />
    <rect x="3" y="11" width="8" height="1" fill="#bf6500" />
    <rect x="4" y="12" width="6" height="1" fill="#bf6500" />

    {/* Main circle */}
    <rect x="4" y="2" width="6" height="1" fill="#ff9500" />
    <rect x="3" y="3" width="8" height="1" fill="#ff9500" />
    <rect x="2" y="4" width="10" height="6" fill="#ff9500" />
    <rect x="3" y="10" width="8" height="1" fill="#ff9500" />
    <rect x="4" y="11" width="6" height="1" fill="#ff9500" />

    {/* Inner shadow */}
    <rect x="4" y="3" width="6" height="1" fill="#df8500" />
    <rect x="3" y="4" width="1" height="6" fill="#df8500" />
    <rect x="2" y="5" width="1" height="4" fill="#cf7500" />

    {/* Highlight */}
    <rect x="5" y="2" width="4" height="1" fill="#ffb530" />
    <rect x="4" y="3" width="1" height="2" fill="#ffb530" />
    <rect x="3" y="4" width="1" height="3" fill="#ffa520" />

    {/* Clock face */}
    <rect x="5" y="5" width="4" height="1" fill="#ffffff" />
    <rect x="4" y="6" width="6" height="2" fill="#ffffff" />
    <rect x="5" y="8" width="4" height="1" fill="#ffffff" />
    {/* Clock rim */}
    <rect x="5" y="5" width="4" height="1" fill="#e0e0e0" opacity="0.5" />
    <rect x="4" y="6" width="1" height="2" fill="#e0e0e0" opacity="0.5" />

    {/* Clock hands */}
    <rect x="7" y="6" width="1" height="2" fill="#3a3a3a" />
    <rect x="8" y="7" width="1" height="1" fill="#3a3a3a" />
    <rect x="7" y="7" width="1" height="1" fill="#5a5a5a" />
  </svg>
);

const ArrowBadge = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ imageRendering: "pixelated" }}>
    {/* Outer ring */}
    <rect x="4" y="1" width="6" height="1" fill="#2a4c6f" />
    <rect x="3" y="2" width="8" height="1" fill="#2a4c6f" />
    <rect x="2" y="3" width="10" height="1" fill="#2a4c6f" />
    <rect x="1" y="4" width="12" height="6" fill="#2a4c6f" />
    <rect x="2" y="10" width="10" height="1" fill="#2a4c6f" />
    <rect x="3" y="11" width="8" height="1" fill="#2a4c6f" />
    <rect x="4" y="12" width="6" height="1" fill="#2a4c6f" />

    {/* Main circle */}
    <rect x="4" y="2" width="6" height="1" fill="#4a7c9f" />
    <rect x="3" y="3" width="8" height="1" fill="#4a7c9f" />
    <rect x="2" y="4" width="10" height="6" fill="#4a7c9f" />
    <rect x="3" y="10" width="8" height="1" fill="#4a7c9f" />
    <rect x="4" y="11" width="6" height="1" fill="#4a7c9f" />

    {/* Inner shadow */}
    <rect x="4" y="3" width="6" height="1" fill="#3a6c8f" />
    <rect x="3" y="4" width="1" height="6" fill="#3a6c8f" />
    <rect x="2" y="5" width="1" height="4" fill="#3a6c8f" />

    {/* Highlight */}
    <rect x="5" y="2" width="4" height="1" fill="#6a9cbf" />
    <rect x="4" y="3" width="1" height="2" fill="#6a9cbf" />
    <rect x="3" y="4" width="1" height="3" fill="#5a8caf" />

    {/* Arrow - diagonal movement */}
    <rect x="8" y="5" width="2" height="1" fill="#ffffff" />
    <rect x="9" y="6" width="1" height="1" fill="#ffffff" />
    <rect x="8" y="7" width="1" height="1" fill="#ffffff" />
    <rect x="7" y="8" width="1" height="1" fill="#ffffff" />
    <rect x="6" y="9" width="1" height="1" fill="#ffffff" />
    <rect x="5" y="9" width="1" height="1" fill="#ffffff" />
    {/* Arrow head */}
    <rect x="9" y="5" width="1" height="2" fill="#ffffff" />
    <rect x="8" y="6" width="2" height="1" fill="#ffffff" />
    {/* Arrow shadow */}
    <rect x="8" y="8" width="1" height="1" fill="#d0d0d0" />
  </svg>
);

// BADGE WRAPPER - Adds status indicators to any icon
const IconWithBadge = ({
  children,
  status,
  selected = false,
  size = 16
}: {
  children: React.ReactNode;
  status?: "success" | "failed" | "pending" | "active";
  selected?: boolean;
  size?: number;
}) => {
  const statusColors = {
    success: { border: "#4a7c59", glow: "rgba(74, 124, 89, 0.5)", bg: "rgba(74, 124, 89, 0.1)" },
    failed: { border: "#dc143c", glow: "rgba(220, 20, 60, 0.5)", bg: "rgba(220, 20, 60, 0.1)" },
    pending: { border: "#ff9500", glow: "rgba(255, 149, 0, 0.5)", bg: "rgba(255, 149, 0, 0.1)" },
    active: { border: "#4a7c9f", glow: "rgba(74, 124, 159, 0.5)", bg: "rgba(74, 124, 159, 0.1)" }
  };

  const colorSet = status ? statusColors[status] : { border: "#3a3a3a", glow: "transparent", bg: "transparent" };
  const selectedStyle = selected
    ? { border: "#ff9500", glow: "rgba(255, 149, 0, 0.6)", bg: "rgba(255, 149, 0, 0.15)" }
    : colorSet;

  // Status badge mapping
  const statusBadges = {
    success: <CheckmarkBadge />,
    failed: <XBadge />,
    pending: <ClockBadge />,
    active: <ArrowBadge />
  };

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{
        width: size + 16,
        height: size + 16,
        border: `2px solid ${selectedStyle.border}`,
        backgroundColor: selectedStyle.bg,
        boxShadow: `0 0 12px ${selectedStyle.glow}, inset 0 2px 4px rgba(0,0,0,0.6)`,
        animation: selected ? "pulse-glow 2s ease-in-out infinite" : status === "active" ? "pulse-glow 1.5s ease-in-out infinite" : "none"
      }}
    >
      {children}

      {/* Status badge in bottom-right corner */}
      {status && (
        <div
          className="absolute"
          style={{
            bottom: -3,
            right: -3,
            width: 14,
            height: 14,
            boxShadow: `0 0 12px ${selectedStyle.glow}, 0 2px 6px rgba(0,0,0,0.9)`,
            animation: status === "active" || status === "pending" ? "pulse-glow 1s ease-in-out infinite" : "none"
          }}
        >
          {statusBadges[status]}
        </div>
      )}

      {/* Selection corner brackets */}
      {selected && (
        <>
          <div className="absolute top-0 left-0 w-2 h-4 border-l-2 border-t-2 border-[#ff9500]" />
          <div className="absolute top-0 right-0 w-2 h-4 border-r-2 border-t-2 border-[#ff9500]" />
          <div className="absolute bottom-0 left-0 w-2 h-4 border-l-2 border-b-2 border-[#ff9500]" />
          <div className="absolute bottom-0 right-0 w-2 h-4 border-r-2 border-b-2 border-[#ff9500]" />
        </>
      )}
    </div>
  );
};

// Design System
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

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes rotate-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes glow-pulse {
  0%, 100% { filter: drop-shadow(0 0 10px currentColor) drop-shadow(0 0 20px currentColor); }
  50% { filter: drop-shadow(0 0 20px currentColor) drop-shadow(0 0 40px currentColor); }
}

@keyframes scan-line {
  from { transform: translateY(-100%); }
  to { transform: translateY(100%); }
}
`;

const Rivet = ({ x, y, size = 8 }: { x: number; y: number; size?: number }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size}px`,
      background: "radial-gradient(circle at 35% 35%, #5a5a5a, #3a3a3a 50%, #2a2a2a)",
      boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.8), 0 2px 3px rgba(0,0,0,0.6)",
      border: "1px solid #1a1a1a",
      opacity: 1,
      zIndex: 5,
    }}
  >
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-[60%] h-[1.5px] bg-[#0a0a0a]" style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.1)" }} />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-[60%] w-[1.5px] bg-[#0a0a0a]" style={{ boxShadow: "1px 0 0 rgba(255,255,255,0.1)" }} />
    </div>
  </div>
);

export default function IconsPage() {
  const [selectedIcon, setSelectedIcon] = useState<string>("army");
  const [selectedSize, setSelectedSize] = useState<number>(64);
  const [selectedColor, setSelectedColor] = useState<string>("#ff9500");
  const [selectedMode, setSelectedMode] = useState<"single" | "group">("single");
  const [selectedStatus, setSelectedStatus] = useState<"none" | "success" | "failed" | "pending" | "active">("none");
  const [showSelection, setShowSelection] = useState<boolean>(false);

  const icons = [
    {
      id: "army",
      name: "Army",
      single: PixelArmyIcon,
      group: PixelArmyGroupIcon,
      desc: "Infantry soldier with helmet, armor, rifle",
      groupDesc: "Infantry formation - 4 soldiers in tactical spread"
    },
    {
      id: "fleet",
      name: "Fleet",
      single: PixelFleetIcon,
      group: PixelFleetGroupIcon,
      desc: "Sailing warship with masts, sails, hull",
      groupDesc: "Naval squadron - 3 warships in line formation"
    },
    {
      id: "tank",
      name: "Tank",
      single: PixelTankIcon,
      group: PixelTankGroupIcon,
      desc: "Armored tank with turret, gun, tracks",
      groupDesc: "Armored column - 3 tanks in staggered formation"
    },
    {
      id: "plane",
      name: "Plane",
      single: PixelPlaneIcon,
      group: PixelPlaneGroupIcon,
      desc: "Fighter aircraft with wings, propeller",
      groupDesc: "Air squadron - 3 planes in V-formation"
    },
    {
      id: "artillery",
      name: "Artillery",
      single: PixelArtilleryIcon,
      group: PixelArtilleryGroupIcon,
      desc: "Heavy cannon with wheels, shield",
      groupDesc: "Artillery battery - 3 cannons positioned for fire"
    },
    {
      id: "cavalry",
      name: "Cavalry",
      single: PixelCavalryIcon,
      group: PixelCavalryGroupIcon,
      desc: "Mounted soldier on horseback with saber",
      groupDesc: "Cavalry charge - 3 riders in assault formation"
    },
    {
      id: "supply",
      name: "Supply",
      single: PixelSupplyIcon,
      group: PixelSupplyGroupIcon,
      desc: "Stacked crates with straps, markings",
      groupDesc: "Supply depot - Multiple crate stacks"
    },
    {
      id: "austria",
      name: "Austria",
      single: AustriaFlag,
      group: AustriaFlag,
      desc: "Red-White-Red horizontal stripes"
    },
    {
      id: "england",
      name: "England",
      single: EnglandFlag,
      group: EnglandFlag,
      desc: "St. George's Cross - Red cross on white"
    },
    {
      id: "france",
      name: "France",
      single: FranceFlag,
      group: FranceFlag,
      desc: "Blue-White-Red vertical tricolor"
    },
    {
      id: "germany",
      name: "Germany",
      single: GermanyFlag,
      group: GermanyFlag,
      desc: "Black-Red-Gold horizontal stripes"
    },
    {
      id: "italy",
      name: "Italy",
      single: ItalyFlag,
      group: ItalyFlag,
      desc: "Green-White-Red vertical tricolor"
    },
    {
      id: "russia",
      name: "Russia",
      single: RussiaFlag,
      group: RussiaFlag,
      desc: "White-Blue-Red horizontal stripes"
    },
    {
      id: "turkey",
      name: "Turkey",
      single: TurkeyFlag,
      group: TurkeyFlag,
      desc: "Red field with white crescent and star"
    }
  ];

  const powerColors = [
    { name: "Amber", color: "#ff9500" },
    { name: "Red", color: "#dc143c" },
    { name: "Blue", color: "#4a7c9f" },
    { name: "Green", color: "#4a7c59" },
    { name: "Gray", color: "#808080" },
    { name: "White", color: "#e0e0e0" },
    { name: "Gold", color: "#d4a574" },
    { name: "Purple", color: "#9b59b6" }
  ];

  const selectedIconData = icons.find(i => i.id === selectedIcon);
  const IconComponent = selectedMode === "single" ? selectedIconData?.single : selectedIconData?.group;
  const description = selectedMode === "single" ? selectedIconData?.desc : selectedIconData?.groupDesc;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0]">
      <style dangerouslySetInnerHTML={{ __html: cssVariables }} />

      {/* Header */}
      <header className="bg-[#1a1a1a] border-b-4 border-[#ff9500] sticky top-0 z-50"
        style={{ boxShadow: "0 0 30px rgba(255, 149, 0, 0.4)" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-2 h-16 bg-[#ff9500]" style={{ boxShadow: "0 0 15px rgba(255, 149, 0, 0.6)" }} />
            <div>
              <h1 className="text-5xl font-black uppercase tracking-wider text-[#ff9500]"
                style={{ textShadow: "0 0 20px rgba(255, 149, 0, 0.6), 0 4px 8px rgba(0,0,0,0.8)" }}>
                PIXEL ARSENAL
              </h1>
              <p className="text-[#808080] text-sm uppercase tracking-widest mt-1">
                Military Unit Icon System • 16×16 Pixel Art
              </p>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <a href="/military-ui-kit"
              className="px-4 py-2 border-2 border-[#3a3a3a] text-[#808080] hover:border-[#ff9500] hover:text-[#ff9500] transition-all uppercase text-xs font-bold tracking-wider">
              ← Back to UI Kit
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {/* Interactive Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Large Preview */}
          <div className="lg:col-span-2 relative bg-[#1a1a1a] border-4 border-[#ff9500] p-12 overflow-hidden"
            style={{
              boxShadow: "inset 0 4px 12px rgba(0,0,0,0.8), 0 0 40px rgba(255, 149, 0, 0.3)"
            }}>
            {/* Steel texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              animation: "grain 8s steps(10) infinite"
            }} />

            {/* Corner rivets */}
            <Rivet x={16} y={16} size={10} />
            <Rivet x={16} y={16} size={10} />

            {/* Scan line effect */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#ff9500] to-transparent"
                style={{ animation: "scan-line 3s linear infinite" }} />
            </div>

            {/* Icon preview */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[400px]">
              <div className="mb-8"
                style={{
                  animation: "float 3s ease-in-out infinite",
                  color: selectedColor
                }}>
                {IconComponent && (selectedStatus !== "none" || showSelection) ? (
                  <IconWithBadge
                    status={selectedStatus !== "none" ? selectedStatus : undefined}
                    selected={showSelection}
                    size={selectedSize}
                  >
                    <IconComponent color={selectedColor} size={selectedSize} />
                  </IconWithBadge>
                ) : IconComponent ? (
                  <IconComponent color={selectedColor} size={selectedSize} />
                ) : null}
              </div>

              <div className="text-center">
                <div className="text-4xl font-black uppercase tracking-wider mb-2"
                  style={{ color: selectedColor, textShadow: `0 0 20px ${selectedColor}80` }}>
                  {selectedIconData?.name}
                </div>
                <div className="text-sm text-[#808080] uppercase tracking-widest mb-2">
                  {description}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#2a2a2a] border border-[#3a3a3a]">
                  <span className="text-xs text-[#606060] uppercase">Mode:</span>
                  <span className="text-xs font-bold uppercase"
                    style={{ color: selectedColor }}>
                    {selectedMode}
                  </span>
                </div>
                <div className="mt-4 text-xs text-[#606060] font-mono">
                  16×16 BASE • {selectedSize}px RENDER • {selectedColor.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Mode Toggle */}
            <div className="relative bg-[#1a1a1a] border-3 border-[#3a3a3a] p-6"
              style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }}>
              <Rivet x={10} y={10} size={6} />
              <Rivet x={10} y={10} size={6} />

              <div className="relative z-10">
                <div className="text-xs text-[#808080] uppercase tracking-wider font-bold mb-4">FORMATION MODE</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedMode("single")}
                    className={`relative px-4 py-3 border-2 font-bold uppercase text-xs transition-all ${
                      selectedMode === "single"
                        ? 'border-[#ff9500] bg-[#ff9500]20 text-[#ff9500]'
                        : 'border-[#3a3a3a] bg-[#0a0a0a] text-[#808080] hover:border-[#808080]'
                    }`}
                    style={{
                      boxShadow: selectedMode === "single"
                        ? '0 0 15px rgba(255, 149, 0, 0.3), inset 0 2px 4px rgba(0,0,0,0.5)'
                        : 'inset 0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                    SINGLE
                  </button>
                  <button
                    onClick={() => setSelectedMode("group")}
                    className={`relative px-4 py-3 border-2 font-bold uppercase text-xs transition-all ${
                      selectedMode === "group"
                        ? 'border-[#ff9500] bg-[#ff9500]20 text-[#ff9500]'
                        : 'border-[#3a3a3a] bg-[#0a0a0a] text-[#808080] hover:border-[#808080]'
                    }`}
                    style={{
                      boxShadow: selectedMode === "group"
                        ? '0 0 15px rgba(255, 149, 0, 0.3), inset 0 2px 4px rgba(0,0,0,0.5)'
                        : 'inset 0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                    GROUP
                  </button>
                </div>
              </div>
            </div>

            {/* Status Badge Control */}
            <div className="relative bg-[#1a1a1a] border-3 border-[#3a3a3a] p-6"
              style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }}>
              <Rivet x={10} y={10} size={6} />
              <Rivet x={10} y={10} size={6} />

              <div className="relative z-10">
                <div className="text-xs text-[#808080] uppercase tracking-wider font-bold mb-4">STATUS BADGE</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { id: "none", label: "None", color: "#606060" },
                    { id: "success", label: "✓", color: "#4a7c59" },
                    { id: "failed", label: "✕", color: "#dc143c" },
                    { id: "pending", label: "⏰", color: "#ff9500" },
                    { id: "active", label: "↗", color: "#4a7c9f" }
                  ].map(({ id, label, color }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedStatus(id as any)}
                      className={`relative px-2 py-2 border-2 font-bold text-xs transition-all ${
                        selectedStatus === id
                          ? 'border-[#ff9500] scale-105'
                          : 'border-[#3a3a3a] bg-[#0a0a0a] hover:border-[#808080]'
                      }`}
                      style={{
                        color: selectedStatus === id ? color : "#808080",
                        backgroundColor: selectedStatus === id ? `${color}15` : "#0a0a0a",
                        boxShadow: selectedStatus === id
                          ? `0 0 12px ${color}40, inset 0 2px 4px rgba(0,0,0,0.5)`
                          : 'inset 0 2px 4px rgba(0,0,0,0.5)'
                      }}>
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowSelection(!showSelection)}
                  className={`w-full px-4 py-3 border-2 font-bold uppercase text-xs transition-all ${
                    showSelection
                      ? 'border-[#ff9500] bg-[#ff9500]20 text-[#ff9500]'
                      : 'border-[#3a3a3a] bg-[#0a0a0a] text-[#808080] hover:border-[#808080]'
                  }`}
                  style={{
                    boxShadow: showSelection
                      ? '0 0 15px rgba(255, 149, 0, 0.3), inset 0 2px 4px rgba(0,0,0,0.5)'
                      : 'inset 0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                  {showSelection ? "SELECTED ▼" : "SELECTION ▶"}
                </button>
              </div>
            </div>

            {/* Size Control */}
            <div className="relative bg-[#1a1a1a] border-3 border-[#3a3a3a] p-6"
              style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }}>
              <Rivet x={10} y={10} size={6} />
              <Rivet x={10} y={10} size={6} />

              <div className="relative z-10">
                <div className="text-xs text-[#808080] uppercase tracking-wider font-bold mb-4">SIZE CONTROL</div>
                <input
                  type="range"
                  min="16"
                  max="128"
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(Number(e.target.value))}
                  className="w-full"
                  style={{
                    accentColor: "#ff9500"
                  }}
                />
                <div className="text-2xl font-bold text-[#ff9500] text-center mt-3 tabular-nums"
                  style={{ textShadow: "0 0 10px rgba(255, 149, 0, 0.5)" }}>
                  {selectedSize}px
                </div>
              </div>
            </div>

            {/* Color Palette */}
            <div className="relative bg-[#1a1a1a] border-3 border-[#3a3a3a] p-6"
              style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }}>
              <Rivet x={10} y={10} size={6} />
              <Rivet x={10} y={10} size={6} />

              <div className="relative z-10">
                <div className="text-xs text-[#808080] uppercase tracking-wider font-bold mb-4">COLOR PALETTE</div>
                <div className="grid grid-cols-4 gap-3">
                  {powerColors.map(({ name, color }) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`relative w-full aspect-square border-2 transition-all ${
                        selectedColor === color
                          ? 'border-[#ff9500] scale-110'
                          : 'border-[#3a3a3a] hover:border-[#808080]'
                      }`}
                      style={{
                        backgroundColor: color,
                        boxShadow: selectedColor === color
                          ? `0 0 15px ${color}80, inset 0 2px 4px rgba(0,0,0,0.5)`
                          : 'inset 0 2px 4px rgba(0,0,0,0.5)'
                      }}
                      title={name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Specs */}
            <div className="relative bg-[#1a1a1a] border-3 border-[#3a3a3a] p-6"
              style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }}>
              <Rivet x={10} y={10} size={6} />
              <Rivet x={10} y={10} size={6} />

              <div className="relative z-10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#808080]">FORMAT</span>
                  <span className="text-[#e0e0e0] font-mono">SVG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#808080]">BASE SIZE</span>
                  <span className="text-[#e0e0e0] font-mono">16×16px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#808080]">RENDER MODE</span>
                  <span className="text-[#e0e0e0] font-mono">pixelated</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#808080]">COLORS</span>
                  <span className="text-[#e0e0e0] font-mono">Dynamic</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#808080]">SCALABLE</span>
                  <span className="text-[#4a7c59] font-mono">YES</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Icon Grid */}
        <div className="relative bg-[#1a1a1a] border-4 border-[#3a3a3a] p-8"
          style={{ boxShadow: "inset 0 4px 12px rgba(0,0,0,0.8)" }}>
          <Rivet x={20} y={20} size={8} />
          <Rivet x={20} y={20} size={8} />

          <div className="relative z-10">
            <div className="text-xs text-[#808080] uppercase tracking-wider font-bold mb-6 pb-4 border-b-2 border-[#3a3a3a]">
              UNIT SELECTION
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {icons.map((icon) => {
                const Icon = selectedMode === "single" ? icon.single : icon.group;
                const isSelected = selectedIcon === icon.id;

                return (
                  <button
                    key={icon.id}
                    onClick={() => setSelectedIcon(icon.id)}
                    className={`relative bg-[#0a0a0a] border-3 p-6 transition-all group ${
                      isSelected
                        ? 'border-[#ff9500] scale-105'
                        : 'border-[#2a2a2a] hover:border-[#808080]'
                    }`}
                    style={{
                      boxShadow: isSelected
                        ? '0 0 20px rgba(255, 149, 0, 0.4), inset 0 2px 6px rgba(0,0,0,0.8)'
                        : 'inset 0 2px 6px rgba(0,0,0,0.8)'
                    }}
                  >
                    <Rivet x={8} y={8} size={5} />
                    <Rivet x={8} y={8} size={5} />

                    <div className="relative z-10 flex flex-col items-center">
                      <div className={`mb-3 transition-all ${
                        isSelected ? 'text-[#ff9500]' : 'text-[#808080] group-hover:text-[#e0e0e0]'
                      }`}>
                        <Icon color={isSelected ? "#ff9500" : "#808080"} size={48} />
                      </div>
                      <div className={`text-xs font-bold uppercase tracking-wide ${
                        isSelected ? 'text-[#ff9500]' : 'text-[#808080] group-hover:text-[#e0e0e0]'
                      }`}>
                        {icon.name}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute inset-0 pointer-events-none border-2 border-[#ff9500]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Size Showcase */}
        <div className="mt-12 relative bg-[#1a1a1a] border-4 border-[#3a3a3a] p-8"
          style={{ boxShadow: "inset 0 4px 12px rgba(0,0,0,0.8)" }}>
          <Rivet x={20} y={20} size={8} />
          <Rivet x={20} y={20} size={8} />

          <div className="relative z-10">
            <div className="text-xs text-[#808080] uppercase tracking-wider font-bold mb-6 pb-4 border-b-2 border-[#3a3a3a]">
              SIZE VARIATIONS
            </div>

            {IconComponent && (
              <div className="flex items-end justify-around gap-8 py-8">
                {[16, 24, 32, 48, 64, 96, 128].map((size) => (
                  <div key={size} className="flex flex-col items-center gap-3">
                    <div className="bg-[#0a0a0a] border-2 border-[#2a2a2a] p-4 flex items-center justify-center"
                      style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8)" }}>
                      <IconComponent color={selectedColor} size={size} />
                    </div>
                    <div className="text-xs text-[#606060] font-mono">{size}px</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Badge System */}
        <div className="mt-12 relative bg-[#1a1a1a] border-4 border-[#3a3a3a] p-8"
          style={{ boxShadow: "inset 0 4px 12px rgba(0,0,0,0.8)" }}>
          <Rivet x={20} y={20} size={8} />
          <Rivet x={20} y={20} size={8} />

          <div className="relative z-10">
            <div className="text-xs text-[#808080] uppercase tracking-wider font-bold mb-6 pb-4 border-b-2 border-[#3a3a3a]">
              STATUS BADGE SYSTEM
            </div>

            {IconComponent && (
              <div className="space-y-8">
                {/* Status States */}
                <div>
                  <div className="text-xs text-[#606060] uppercase mb-4">Status Indicators</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-[#0a0a0a] p-4">
                        <IconComponent color={selectedColor} size={48} />
                      </div>
                      <div className="text-xs text-[#808080] uppercase">Default</div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-[#0a0a0a] p-4">
                        <IconWithBadge status="success" size={48}>
                          <IconComponent color="#4a7c59" size={48} />
                        </IconWithBadge>
                      </div>
                      <div className="text-xs text-[#4a7c59] uppercase font-bold">Success</div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-[#0a0a0a] p-4">
                        <IconWithBadge status="failed" size={48}>
                          <IconComponent color="#dc143c" size={48} />
                        </IconWithBadge>
                      </div>
                      <div className="text-xs text-[#dc143c] uppercase font-bold">Failed</div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-[#0a0a0a] p-4">
                        <IconWithBadge status="pending" size={48}>
                          <IconComponent color="#ff9500" size={48} />
                        </IconWithBadge>
                      </div>
                      <div className="text-xs text-[#ff9500] uppercase font-bold">Pending</div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-[#0a0a0a] p-4">
                        <IconWithBadge status="active" size={48}>
                          <IconComponent color="#4a7c9f" size={48} />
                        </IconWithBadge>
                      </div>
                      <div className="text-xs text-[#4a7c9f] uppercase font-bold">Active</div>
                    </div>
                  </div>
                </div>

                {/* Selected State */}
                <div>
                  <div className="text-xs text-[#606060] uppercase mb-4">Selection State</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-[#0a0a0a] p-4">
                        <IconWithBadge selected size={48}>
                          <IconComponent color="#ff9500" size={48} />
                        </IconWithBadge>
                      </div>
                      <div className="text-xs text-[#ff9500] uppercase font-bold">Selected</div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-[#0a0a0a] p-4">
                        <IconWithBadge selected status="success" size={48}>
                          <IconComponent color="#4a7c59" size={48} />
                        </IconWithBadge>
                      </div>
                      <div className="text-xs text-[#4a7c59] uppercase font-bold">Selected + Success</div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-[#0a0a0a] p-4">
                        <IconWithBadge selected status="pending" size={48}>
                          <IconComponent color="#ff9500" size={48} />
                        </IconWithBadge>
                      </div>
                      <div className="text-xs text-[#ff9500] uppercase font-bold">Selected + Pending</div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-[#0a0a0a] p-4">
                        <IconWithBadge selected status="active" size={48}>
                          <IconComponent color="#4a7c9f" size={48} />
                        </IconWithBadge>
                      </div>
                      <div className="text-xs text-[#4a7c9f] uppercase font-bold">Selected + Active</div>
                    </div>
                  </div>
                </div>

                {/* Usage Example */}
                <div className="pt-6 border-t-2 border-[#3a3a3a]">
                  <div className="text-xs text-[#606060] uppercase mb-4">Usage Context</div>
                  <div className="bg-[#0a0a0a] border-2 border-[#2a2a2a] p-6">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <IconWithBadge status="success" size={32}>
                          <PixelArmyIcon color="#4a7c59" size={32} />
                        </IconWithBadge>
                        <div>
                          <div className="text-xs font-bold text-[#4a7c59]">PARIS</div>
                          <div className="text-[10px] text-[#606060]">Hold successful</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <IconWithBadge status="failed" size={32}>
                          <PixelFleetIcon color="#dc143c" size={32} />
                        </IconWithBadge>
                        <div>
                          <div className="text-xs font-bold text-[#dc143c]">BREST</div>
                          <div className="text-[10px] text-[#606060]">Move failed</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <IconWithBadge status="pending" size={32}>
                          <PixelTankIcon color="#ff9500" size={32} />
                        </IconWithBadge>
                        <div>
                          <div className="text-xs font-bold text-[#ff9500]">BERLIN</div>
                          <div className="text-[10px] text-[#606060]">Awaiting orders</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <IconWithBadge selected status="active" size={32}>
                          <PixelCavalryIcon color="#4a7c9f" size={32} />
                        </IconWithBadge>
                        <div>
                          <div className="text-xs font-bold text-[#4a7c9f]">MUNICH</div>
                          <div className="text-[10px] text-[#606060]">Selected, moving</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 py-12 bg-[#1a1a1a] border-t-4 border-[#ff9500]">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <div className="text-[#808080] text-sm uppercase tracking-wide mb-4">
            Pixel Arsenal • Military Unit Icons • Industrial Design System
          </div>
          <div className="flex gap-8 justify-center text-xs">
            <a href="/military-ui-kit" className="text-[#ff9500] hover:text-[#ffaa20]">
              ← Back to UI Kit
            </a>
            <a href="/" className="text-[#808080] hover:text-[#e0e0e0]">
              Diplomacy Viewer →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
