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

// TacticalPanel - Main container with rivets
export const TacticalPanel = ({ children, title, className = "", contentClassName = "" }: any) => (
  <div className={`relative bg-[#2a2a2a] border-4 overflow-hidden ${className}`}
    style={{
      borderColor: "#1a1a1a",
      boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6), inset 0 -1px 3px rgba(255,255,255,0.05), 0 6px 12px rgba(0,0,0,0.4)",
      background: "linear-gradient(135deg, #2a2a2a 0%, #252525 50%, #2a2a2a 100%)"
    }}>
    <Rivet style={{ left: "12px", top: "12px" }} />
    <Rivet style={{ right: "12px", top: "12px" }} />
    <Rivet style={{ left: "12px", bottom: "12px" }} />
    <Rivet style={{ right: "12px", bottom: "12px" }} />

    {[25, 50, 75].map((percent) => (
      <div key={`top-${percent}`}>
        <Rivet style={{ left: `${percent}%`, top: "12px", transform: "translateX(-50%)" }} />
        <Rivet style={{ left: `${percent}%`, bottom: "12px", transform: "translateX(-50%)" }} />
      </div>
    ))}

    {title && (
      <div className="relative z-10 bg-gradient-to-r from-transparent via-[#ff9500] to-transparent h-[2px] mb-4 opacity-50" />
    )}

    <div className={`relative z-10 ${contentClassName || "p-6"}`}>
      {title && (
        <div className="text-[#ff9500] text-sm uppercase tracking-[0.2em] font-bold mb-4">{title}</div>
      )}
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
