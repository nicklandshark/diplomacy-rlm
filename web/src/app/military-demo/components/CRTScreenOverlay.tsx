"use client";

/**
 * CRTScreenOverlay — Reusable CRT effect layer for non-map panels.
 *
 * Applies scanlines, chromatic aberration, color tint, phosphor glow,
 * vignette, and inset shadow. No WebGL barrel distortion (text panels
 * don't benefit from geometric warping).
 *
 * Color presets:
 *   "amber"   — warm orange, used for activity feed
 *   "cyan"    — cool teal/cyan, used for memory microfiche
 */

interface Props {
  /** Color palette */
  color?: "amber" | "cyan";
  /** Scanline opacity 0-1, default 0.8 */
  scanlineOpacity?: number;
  /** Overall intensity multiplier 0-1, default 1 */
  intensity?: number;
  className?: string;
}

const PALETTES = {
  amber: {
    tint: "rgba(224,171,84,0.18)",
    tintEdge: "rgba(224,171,84,0.06)",
    glow: "rgba(239,206,140,0.18)",
    glowMid: "rgba(194,140,62,0.06)",
    caLeft: "rgba(239,209,144,0.14)",
    caRight: "rgba(255,241,208,0.12)",
    caLeft2: "rgba(221,170,86,0.14)",
    caRight2: "rgba(241,226,194,0.1)",
    scanTint: "rgba(224,171,84,0.16)",
  },
  cyan: {
    tint: "rgba(90,170,160,0.14)",
    tintEdge: "rgba(90,170,160,0.04)",
    glow: "rgba(132,236,194,0.14)",
    glowMid: "rgba(92,170,148,0.05)",
    caLeft: "rgba(78,136,194,0.1)",
    caRight: "rgba(109,198,167,0.12)",
    caLeft2: "rgba(112,206,173,0.12)",
    caRight2: "rgba(104,160,220,0.08)",
    scanTint: "rgba(90,170,160,0.12)",
  },
} as const;

export default function CRTScreenOverlay({
  color = "amber",
  scanlineOpacity = 0.8,
  intensity = 1,
  className = "",
}: Props) {
  const p = PALETTES[color];

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} style={{ opacity: intensity }}>
      {/* Scanlines + radial color tint */}
      <div
        className="absolute inset-0 crt-panel-scan"
        style={{
          opacity: scanlineOpacity,
          background: `repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0px, rgba(0,0,0,0.14) 1px, rgba(0,0,0,0.5) 1px, rgba(0,0,0,0.5) 3px), radial-gradient(ellipse at 50% 40%, ${p.scanTint} 0%, ${p.tintEdge} 50%, transparent 78%)`,
        }}
      />

      {/* Chromatic aberration — left shift */}
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{
          opacity: 0.48,
          background: `linear-gradient(90deg, ${p.caLeft} 0%, transparent 28%, transparent 72%, ${p.caRight} 100%)`,
          transform: "translateX(-1px)",
        }}
      />

      {/* Chromatic aberration — right shift */}
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{
          opacity: 0.36,
          background: `linear-gradient(90deg, ${p.caLeft2} 0%, transparent 32%, transparent 68%, ${p.caRight2} 100%)`,
          transform: "translateX(1px)",
        }}
      />

      {/* Phosphor glow — pulsing */}
      <div
        className="absolute inset-0 crt-panel-bloom"
        style={{
          opacity: 0.38,
          background: `radial-gradient(ellipse at 50% 42%, ${p.glow} 0%, ${p.glowMid} 50%, transparent 82%)`,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 44%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* Inset shadow */}
      <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.7)]" />

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes panelScanDrift {
          from { background-position: 0 0, 0 0; }
          to { background-position: 0 6px, 0 0; }
        }
        @keyframes panelBloomPulse {
          0%, 100% { opacity: 0.32; }
          50% { opacity: 0.48; }
        }
        .crt-panel-scan {
          animation: panelScanDrift 9s linear infinite;
        }
        .crt-panel-bloom {
          animation: panelBloomPulse 3.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
