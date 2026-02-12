// Shared military UI components used by the main app.

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
