"use client";

import { useState } from "react";

// ===========================================================================
// MILITARY UI KIT COMPONENTS - Using Exact Patterns from /military-ui-kit
// ===========================================================================

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
}

@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}
`;

// Pixel Army Icon - Exact from icons page
const PixelArmyIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
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
    <rect x="4" y="8" width="1" height="3" fill={color} opacity="0.7" />
    <rect x="11" y="8" width="1" height="3" fill={color} opacity="0.7" />
    <rect x="5" y="12" width="2" height="2" fill={color} opacity="0.8" />
    <rect x="9" y="12" width="2" height="2" fill={color} opacity="0.8" />
    <rect x="7" y="13" width="2" height="1" fill="#0a0a0a" opacity="0.3" />
  </svg>
);

// Pixel Fleet Icon - Exact from icons page
const PixelFleetIcon = ({ color = "#e0e0e0", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
    <rect x="7" y="3" width="2" height="1" fill={color} />
    <rect x="7" y="4" width="2" height="1" fill={color} />
    <rect x="7" y="5" width="2" height="1" fill={color} />
    <rect x="6" y="4" width="1" height="1" fill="#dc143c" />
    <rect x="6" y="5" width="1" height="1" fill="#ff4444" opacity="0.5" />
    <rect x="7" y="6" width="1" height="1" fill={color} opacity="0.8" />
    <rect x="7" y="7" width="2" height="1" fill={color} />
    <rect x="6" y="8" width="4" height="1" fill={color} />
    <rect x="5" y="9" width="6" height="2" fill={color} />
    <rect x="6" y="9" width="4" height="1" fill={color} opacity="0.6" />
    <rect x="4" y="10" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="11" y="10" width="1" height="1" fill={color} opacity="0.5" />
    <rect x="5" y="11" width="6" height="1" fill={color} opacity="0.7" />
    <rect x="4" y="12" width="8" height="1" fill="#4488aa" opacity="0.2" />
    <rect x="3" y="13" width="10" height="1" fill="#4488aa" opacity="0.15" />
  </svg>
);

// Rivet - Exact from military UI kit
const Rivet = ({ size = 8, style }: { size?: number; style?: React.CSSProperties }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      background: "radial-gradient(circle at 35% 35%, #5a5a5a, #3a3a3a 50%, #2a2a2a)",
      boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.8), 0 2px 3px rgba(0,0,0,0.6)",
      border: "1px solid #1a1a1a",
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

// PowerStatusCard - Exact from military UI kit
const PowerStatusCard = ({ power, units, supplyCount, ordersSubmitted, color }: any) => (
  <div className="relative bg-[#1a1a1a] border-3 p-5 overflow-hidden"
    style={{
      borderColor: color,
      borderWidth: "3px",
      borderStyle: "solid",
      boxShadow: `inset 0 2px 6px rgba(0,0,0,0.6), inset 0 -1px 3px rgba(255,255,255,0.05), 0 6px 12px rgba(0,0,0,0.4), 0 0 20px ${color}40`,
      background: "linear-gradient(135deg, #1a1a1a 0%, #171717 50%, #1a1a1a 100%)"
    }}>
    <Rivet size={7} style={{ left: "10px", top: "10px" }} />
    <Rivet size={7} style={{ right: "10px", top: "10px" }} />
    <Rivet size={7} style={{ left: "10px", bottom: "10px" }} />
    <Rivet size={7} style={{ right: "10px", bottom: "10px" }} />

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

// OrderItem - Exact from military UI kit
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

// MessageBubble - Exact from military UI kit
const MessageBubble = ({ from, to, content, timestamp }: any) => (
  <div className="relative bg-[#1a1a1a] border-2 border-[#3a3a3a] p-4 mb-3">
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

// PhaseTimeline - Exact from military UI kit
const PhaseTimeline = ({ phases, currentIndex }: any) => (
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

// ActionLog - Exact from military UI kit
const ActionLog = ({ actions }: any) => (
  <div className="relative bg-[#1a1a1a] border-2 border-[#3a3a3a] overflow-hidden">
    <Rivet size={6} style={{ left: "10px", top: "10px" }} />
    <Rivet size={6} style={{ right: "10px", top: "10px" }} />

    <div className="relative z-10 p-4">
      <div className="text-xs text-[#808080] uppercase tracking-[0.15em] mb-3 font-bold">ACTIVITY FEED</div>
      <div className="space-y-1 max-h-96 overflow-y-auto">
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

// TacticalPanel - Exact from military UI kit
const TacticalPanel = ({ children, title }: any) => (
  <div className="relative bg-[#2a2a2a] border-4 overflow-hidden"
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

    <div className="relative z-10 p-6">
      {title && (
        <div className="text-[#ff9500] text-sm uppercase tracking-[0.2em] font-bold mb-4">{title}</div>
      )}
      {children}
    </div>
  </div>
);

// ============================================================================
// MAIN DEMO PAGE - Full Military UI
// ============================================================================
export default function MilitaryUIDemo() {
  const [activeTab, setActiveTab] = useState<"orders" | "messages" | "summary">("orders");

  const mockActivity = [
    { time: "14:20", message: "Phase W1901A complete" },
    { time: "14:21", message: "FRANCE submitted 3 orders" },
    { time: "14:22", message: "GERMANY submitted 2 orders" },
    { time: "14:23", message: "FRANCE sent message to GERMANY" },
    { time: "14:24", message: "Entered S1902M" },
  ];

  const mockMessages = [
    { from: "FRANCE", to: "GERMANY", content: "Shall we coordinate against Austria in the south?", timestamp: "14:23" },
    { from: "GERMANY", to: "FRANCE", content: "Interesting proposal. What do you have in mind?", timestamp: "14:25" },
    { from: "FRANCE", to: "GERMANY", content: "I'll move into Burgundy while you pressure Munich. We can divide the spoils.", timestamp: "14:27" },
  ];

  const mockOrders = [
    { territory: "PAR", unitType: "army", order: "A PAR - BUR", status: "success" },
    { territory: "MAR", unitType: "army", order: "A MAR - SPA", status: "success" },
    { territory: "BRE", unitType: "fleet", order: "F BRE - MAO", status: "failed" },
    { territory: "MUN", unitType: "army", order: "A MUN - RUH", status: "pending" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] p-4">
      <style dangerouslySetInnerHTML={{ __html: cssVariables }} />

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="relative bg-[#1a1a1a] border-2 border-[#ff9500] p-6"
          style={{ boxShadow: "0 0 20px rgba(255, 149, 0, 0.3), inset 0 2px 6px rgba(0,0,0,0.6)" }}>
          <Rivet size={10} style={{ left: "16px", top: "16px" }} />
          <Rivet size={10} style={{ right: "16px", top: "16px" }} />
          <div className="text-3xl font-black uppercase tracking-wider text-[#ff9500]">
            MILITARY UI KIT DEMO
          </div>
          <div className="text-sm text-[#808080] uppercase tracking-wide mt-2">
            Full Application Layout
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column - Power cards */}
          <div className="space-y-4">
            <PowerStatusCard
              power="FRANCE"
              color="#44aaff"
              units={{ armies: 2, fleets: 1 }}
              supplyCount={3}
              ordersSubmitted={true}
            />
            <PowerStatusCard
              power="GERMANY"
              color="#888888"
              units={{ armies: 2, fleets: 1 }}
              supplyCount={3}
              ordersSubmitted={false}
            />
          </div>

          {/* Middle column - Orders/Messages */}
          <div className="space-y-4">
            <TacticalPanel title={activeTab.toUpperCase()}>
              <div className="flex gap-2 mb-4">
                {["orders", "messages", "summary"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 border-2 text-xs uppercase font-bold tracking-wider transition-all ${
                      activeTab === tab
                        ? "border-[#ff9500] bg-[#ff9500]/10 text-[#ff9500]"
                        : "border-[#3a3a3a] text-[#808080] hover:border-[#808080]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "orders" && (
                <div>
                  {mockOrders.map((order, idx) => (
                    <OrderItem key={idx} {...order} />
                  ))}
                </div>
              )}

              {activeTab === "messages" && (
                <div>
                  {mockMessages.map((msg, idx) => (
                    <MessageBubble key={idx} {...msg} />
                  ))}
                </div>
              )}

              {activeTab === "summary" && (
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#808080]">Phase:</span>
                    <span className="text-[#ff9500] font-bold">S1902M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#808080]">Turn:</span>
                    <span className="text-[#e0e0e0] font-bold">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#808080]">Active Powers:</span>
                    <span className="text-[#e0e0e0] font-bold">7</span>
                  </div>
                </div>
              )}
            </TacticalPanel>

            <PhaseTimeline
              phases={["S1901M", "F1901M", "W1901A", "S1902M", "F1902M"]}
              currentIndex={2}
            />
          </div>

          {/* Right column - Activity */}
          <div>
            <ActionLog actions={mockActivity} />
          </div>
        </div>
      </div>
    </div>
  );
}
