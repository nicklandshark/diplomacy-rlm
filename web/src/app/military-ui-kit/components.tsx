// Shared Military UI Components
// These are the actual components from the military-ui-kit that should be reused

// Rivet - Steel rivet with depth and cross slot
export const Rivet = ({ x, y, size = 8, style }: { x?: number; y?: number; size?: number; style?: React.CSSProperties }) => (
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
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-[60%] h-[1.5px] bg-[#0a0a0a]" style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.1)" }} />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-[60%] w-[1.5px] bg-[#0a0a0a]" style={{ boxShadow: "1px 0 0 rgba(255,255,255,0.1)" }} />
    </div>
  </div>
);

// TacticalPanel - Main container with subtle corner rivets and optional inset title well
export const TacticalPanel = ({ children, title, verticalTitle = false, className = "", contentClassName = "" }: any) => (
  <div className={`relative bg-[#2a2a2a] border-4 overflow-hidden ${className}`}
    style={{
      borderColor: "#1a1a1a",
      boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6), inset 0 -1px 3px rgba(255,255,255,0.05), 0 6px 12px rgba(0,0,0,0.4)",
      background: "linear-gradient(135deg, #2a2a2a 0%, #252525 50%, #2a2a2a 100%)"
    }}>
    {/* Corner rivets only - smaller and more subtle */}
    <Rivet size={6} style={{ left: "8px", top: "8px", opacity: 0.6 }} />
    <Rivet size={6} style={{ right: "8px", top: "8px", opacity: 0.6 }} />
    <Rivet size={6} style={{ left: "8px", bottom: "8px", opacity: 0.6 }} />
    <Rivet size={6} style={{ right: "8px", bottom: "8px", opacity: 0.6 }} />

    {/* Inset title well - horizontal or vertical */}
    {title && !verticalTitle && (
      <div className="relative z-10 mx-3 sm:mx-4 mt-3 mb-2" style={{
        background: "linear-gradient(180deg, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8), inset 0 -1px 2px rgba(255,255,255,0.03), 0 1px 0 rgba(255,149,0,0.1)",
        border: "2px solid #0a0a0a",
        borderRadius: "2px"
      }}>
        {/* Inner glow accent */}
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
          background: "radial-gradient(ellipse at top, rgba(255,149,0,0.1) 0%, transparent 50%)"
        }} />

        {/* Title text */}
        <div className="relative px-3 py-1 text-[#ff9500] text-[11px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold text-center" style={{
          textShadow: "0 0 8px rgba(255,149,0,0.4), 0 1px 2px rgba(0,0,0,0.8)"
        }}>
          {title}
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff9500] to-transparent opacity-20" />
      </div>
    )}

    {/* Vertical title well - rotated 90 degrees */}
    {title && verticalTitle && (
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        transform: "translateY(-50%)"
      }}>
        <div className="relative py-3 sm:py-4 px-1.5 sm:px-2" style={{
          background: "linear-gradient(90deg, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)",
          boxShadow: "inset 2px 0 6px rgba(0,0,0,0.8), inset -1px 0 2px rgba(255,255,255,0.03), 1px 0 0 rgba(255,149,0,0.1)",
          border: "2px solid #0a0a0a",
          borderRadius: "2px"
        }}>
          {/* Inner glow accent */}
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
            background: "radial-gradient(ellipse at left, rgba(255,149,0,0.1) 0%, transparent 50%)"
          }} />

          {/* Title text */}
          <div className="relative text-[#ff9500] text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold text-center" style={{
            textShadow: "0 0 8px rgba(255,149,0,0.4), 0 1px 2px rgba(0,0,0,0.8)"
          }}>
            {title}
          </div>

          {/* Side accent line */}
          <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#ff9500] to-transparent opacity-20" />
        </div>
      </div>
    )}

    {/* Content area */}
    <div className={`relative z-10 ${contentClassName || "p-6"}`}>
      {children}
    </div>
  </div>
);

// NavButton - Compact navigation button for controls
export const NavButton = ({ children, variant = "secondary", disabled = false, onClick, className = "" }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) => {
  const isPrimary = variant === "primary";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative h-8 w-8 rounded-[4px] border text-[11px] font-bold transition-all flex items-center justify-center ${className}`}
      style={{
        background: disabled
          ? "linear-gradient(180deg, #25211d 0%, #1f1b18 100%)"
          : isPrimary
            ? "linear-gradient(180deg, #debb4e 0%, #bf8b15 48%, #7d5a12 100%)"
            : "linear-gradient(180deg, #55514a 0%, #403c36 35%, #322f2a 70%, #27241f 100%)",
        borderColor: disabled
          ? "#35302b"
          : isPrimary
            ? "#6f4e11"
            : "#2a2622",
        color: disabled
          ? "#5a534b"
          : isPrimary
            ? "#25180a"
            : "#908880",
        boxShadow: disabled
          ? "inset 0 2px 4px rgba(0,0,0,0.5)"
          : isPrimary
            ? "inset 0 1px 0 rgba(255,232,158,0.32), inset 0 -1px 0 rgba(80,56,10,0.35), 0 2px 0 #4d370d, 0 4px 9px rgba(0,0,0,0.5)"
            : "inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.35), 0 2px 0 #171512, 0 4px 8px rgba(0,0,0,0.45)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        textShadow: isPrimary && !disabled ? "0 1px 0 rgba(255,226,145,0.45)" : "0 1px 0 rgba(0,0,0,0.45)"
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isPrimary) {
          e.currentTarget.style.borderColor = "#544d45";
          e.currentTarget.style.color = "#d4c7b6";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isPrimary) {
          e.currentTarget.style.borderColor = "#2a2622";
          e.currentTarget.style.color = "#908880";
        }
      }}
    >
      {children}
    </button>
  );
};

// CommandButton - Military styled button
export const CommandButton = ({ children, variant = "primary", disabled = false, onClick, className = "" }: any) => {
  const variants = {
    primary: {
      bg: "#ff9500",
      border: "#ff9500",
      text: "#0a0a0a",
      glow: "rgba(255, 149, 0, 0.4)",
      innerGlow: "rgba(255, 200, 100, 0.3)"
    },
    secondary: {
      bg: "#3a3a3a",
      border: "#ff9500",
      text: "#ff9500",
      glow: "rgba(255, 149, 0, 0.2)",
      innerGlow: "rgba(255, 149, 0, 0.1)"
    },
    danger: {
      bg: "#dc143c",
      border: "#dc143c",
      text: "#ffffff",
      glow: "rgba(220, 20, 60, 0.4)",
      innerGlow: "rgba(255, 100, 100, 0.3)"
    },
    success: {
      bg: "#4a7c59",
      border: "#4a7c59",
      text: "#ffffff",
      glow: "rgba(74, 124, 89, 0.4)",
      innerGlow: "rgba(100, 200, 100, 0.3)"
    }
  };

  const style = variants[variant as keyof typeof variants] || variants.primary;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative px-6 py-3 font-bold uppercase tracking-wider transition-all border-4 ${className}`}
      style={{
        background: disabled ? "#1a1a1a" : style.bg,
        borderColor: disabled ? "#3a3a3a" : style.border,
        color: disabled ? "#3a3a3a" : style.text,
        boxShadow: disabled
          ? "inset 0 2px 4px rgba(0,0,0,0.6)"
          : `inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 12px ${style.glow}, 0 0 20px ${style.glow}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        borderStyle: "solid",
        textShadow: `0 0 10px ${style.glow}, 0 2px 4px rgba(0,0,0,0.8)`,
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)"
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at center, ${style.innerGlow} 0%, transparent 60%)`,
        opacity: disabled ? 0.3 : 1
      }} />

      <div className="absolute top-0 left-0 w-1 h-6 opacity-50" style={{ background: style.border }} />
      <div className="absolute top-0 left-0 h-1 w-6 opacity-50" style={{ background: style.border }} />
      <div className="absolute bottom-0 right-0 w-1 h-6 opacity-50" style={{ background: style.border }} />
      <div className="absolute bottom-0 right-0 h-1 w-6 opacity-50" style={{ background: style.border }} />

      <span className="relative z-10">{children}</span>
    </button>
  );
};

// OrderItem - From military-ui-kit
export const OrderItem = ({ territory, unitType, order, status }: any) => {
  const statusColors = {
    success: { border: "#4a7c59", glow: "rgba(74, 124, 89, 0.3)", text: "text-[#4a7c59]", icon: "✓" },
    failed: { border: "#dc143c", glow: "rgba(220, 20, 60, 0.3)", text: "text-[#dc143c]", icon: "✗" },
    pending: { border: "#ff9500", glow: "rgba(255, 149, 0, 0.3)", text: "text-[#ff9500]", icon: "⋯" },
    bounced: { border: "#808080", glow: "rgba(128, 128, 128, 0.3)", text: "text-[#808080]", icon: "↩" }
  };

  const colorSet = statusColors[status as keyof typeof statusColors] || statusColors.pending;

  return (
    <div
      className="relative bg-[#1a1a1a] border-2 p-3 mb-2 overflow-hidden"
      style={{
        borderColor: colorSet.border,
        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.6), 0 0 12px ${colorSet.glow}`,
        background: "linear-gradient(135deg, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)"
      }}>
      <Rivet size={5} style={{ left: "6px", top: "6px" }} />
      <Rivet size={5} style={{ right: "6px", top: "6px" }} />

      <div className="relative z-10 flex items-center gap-3">
        <div className={`text-2xl font-bold ${colorSet.text}`}>{colorSet.icon}</div>
        <div className="flex-1">
          <div className="text-xs text-[#808080] uppercase tracking-wider mb-1">{territory}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 bg-[#3a3a3a] border border-[#4a4a4a] uppercase tracking-wide font-bold text-[#e0e0e0]">
              {unitType}
            </span>
            <span className="text-sm text-[#e0e0e0]">{order}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// MessageBubble - From military-ui-kit
export const MessageBubble = ({ from, to, content, timestamp }: any) => (
  <div className="relative bg-[#1a1a1a] border-2 border-[#3a3a3a] p-3 mb-2">
    <Rivet size={5} style={{ left: "8px", top: "8px" }} />
    <Rivet size={5} style={{ right: "8px", top: "8px" }} />

    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-[#ff9500] uppercase">{from}</span>
        <span className="text-xs text-[#808080]">→</span>
        <span className="text-xs font-bold text-[#4a7c59] uppercase">{to}</span>
      </div>
      <p className="text-sm text-[#e0e0e0] leading-relaxed mb-2">{content}</p>
      <span className="text-[10px] text-[#808080]">{timestamp}</span>
    </div>
  </div>
);

// PhaseTimeline - From military-ui-kit
export const PhaseTimeline = ({ phases, currentIndex }: any) => (
  <div className="relative bg-[#1a1a1a] border-2 border-[#3a3a3a] p-6 overflow-hidden">

    <Rivet size={6} style={{ left: "10px", top: "10px" }} />
    <Rivet size={6} style={{ right: "10px", top: "10px" }} />

    <div className="relative z-10">
      <div className="text-xs text-[#808080] uppercase tracking-[0.15em] mb-4 font-bold">GAME TIMELINE</div>
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {phases.map((phase: any, idx: number) => (
          <div
            key={idx}
            className={`relative w-12 h-12 border-2 flex items-center justify-center transition-all ${
              idx === currentIndex
                ? "border-[#ff9500] bg-[#ff9500]/10 text-[#ff9500]"
                : idx < currentIndex
                ? "border-[#4a7c59] bg-[#4a7c59]/5 text-[#4a7c59]"
                : "border-[#3a3a3a] bg-[#1a1a1a] text-[#808080]"
            }`}
            style={{
              boxShadow: idx === currentIndex
                ? "0 0 16px rgba(255, 149, 0, 0.3), inset 0 2px 4px rgba(0,0,0,0.6)"
                : idx < currentIndex
                ? "inset 0 2px 4px rgba(0,0,0,0.6)"
                : "inset 0 2px 4px rgba(0,0,0,0.8)"
            }}
          >
            <div className="text-xs font-bold">{phase.slice(0, 6)}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ActionLog - From military-ui-kit
export const ActionLog = ({ actions }: any) => (
  <div className="relative bg-[#1a1a1a] border-2 border-[#3a3a3a] overflow-hidden">
    <Rivet size={6} style={{ left: "10px", top: "10px" }} />
    <Rivet size={6} style={{ right: "10px", top: "10px" }} />

    <div className="relative z-10 p-4">
      <div className="text-xs text-[#808080] uppercase tracking-[0.15em] mb-3 font-bold">ACTION LOG</div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {actions.map((action: any, idx: number) => (
          <div key={idx} className="flex items-start gap-2 py-1 border-b border-[#2a2a2a] last:border-0">
            <div className="text-[10px] text-[#808080] min-w-[45px]">{action.time}</div>
            <div className="text-xs text-[#e0e0e0]">{action.message}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ProgressBar - Military styled progress bar
export const ProgressBar = ({ value, label, color = "#ff9500", showPercentage = true }: {
  value: number;
  label?: string;
  color?: string;
  showPercentage?: boolean;
}) => (
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
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-xs font-bold text-[#e0e0e0] tracking-wider" style={{
            textShadow: "0 0 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,1)"
          }}>{value}%</span>
        </div>
      )}

      {/* Scan line effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 pointer-events-none z-[2]"
        style={{ animation: "scan 2s linear infinite" }} />
    </div>
  </div>
);

// TacticalTabGroup - Military styled segmented control tabs
export const TacticalTabGroup = ({ tabs, activeTab, onTabChange, badge }: {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  badge?: Record<string, number>;
}) => (
  <div
    className="flex mb-3 rounded-[5px] overflow-hidden"
    style={{
      background: "linear-gradient(180deg, #151515 0%, #111111 100%)",
      border: "2px solid #0a0a0a",
      boxShadow: "inset 0 2px 6px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.03)",
    }}
  >
    {tabs.map((tab, i) => {
      const isActive = activeTab === tab;
      return (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className="font-ui-panel relative flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-all whitespace-nowrap"
          style={{
            color: isActive ? "#ff9500" : "#606060",
            background: isActive
              ? "linear-gradient(180deg, #2a2518 0%, #1e1b14 100%)"
              : "transparent",
            textShadow: isActive ? "0 0 8px rgba(255,149,0,0.3)" : "none",
            borderRight: i < tabs.length - 1 ? "1px solid #0a0a0a" : "none",
            boxShadow: isActive
              ? "inset 0 -2px 0 #ff9500, inset 0 1px 4px rgba(255,149,0,0.08)"
              : "none",
          }}
        >
          {tab}
          {badge && badge[tab] > 0 && !isActive && (
            <span
              className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[14px] px-1 text-[8px] font-bold rounded-full"
              style={{
                background: "#ff9500",
                color: "#0a0a0a",
                boxShadow: "0 0 6px rgba(255,149,0,0.4)",
              }}
            >
              {badge[tab]}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export { GlassPane } from "./shaders/GlassPane";
export type { GlassPaneProps } from "./shaders/GlassPane";
export { MaterialSurface } from "./shaders/MaterialSurface";
export type { MaterialSurfaceProps } from "./shaders/MaterialSurface";
export { getMaterialPreset, getStrictWebGLContext } from "./shaders/types";
export type { MaterialPreset, MaterialPresetKey, Vec3 } from "./shaders/types";
