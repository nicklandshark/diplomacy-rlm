"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import type { PhaseOrders, PhaseResults } from "@/lib/types";
import { buildOrderRows } from "./intel/fsb-utils";

interface OrderPanelProps {
  orders: PhaseOrders | null;
  results: PhaseResults | null;
  pendingPowers: Set<string>;
  onOrderHover?: (order: string | null) => void;
  revealedOrderCount?: number; // -1 = show all, 0+ = show up to this index
  activeOrderRef?: RefObject<HTMLDivElement | null>;
}

export function OrderPanel({ orders, results, pendingPowers, onOrderHover, revealedOrderCount = -1, activeOrderRef }: OrderPanelProps) {
  const rows = buildOrderRows(orders, results, pendingPowers);
  const shellRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<"full" | "medium" | "compact">("full");

  useEffect(() => {
    const host = shellRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;

    const updateLayout = () => {
      const width = host.getBoundingClientRect().width;
      if (width < 520) {
        setLayoutMode("compact");
      } else if (width < 720) {
        setLayoutMode("medium");
      } else {
        setLayoutMode("full");
      }
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const columnTemplate =
    layoutMode === "compact"
      ? "58px 72px minmax(128px,1fr)"
      : layoutMode === "medium"
      ? "64px 72px minmax(132px,1fr) 110px"
      : "70px 74px minmax(160px,1fr) 90px 66px";

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[#808080]">
        <div className="text-2xl mb-2">—</div>
        <div className="text-sm uppercase tracking-wider">No orders issued</div>
      </div>
    );
  }

  const isRevealing = revealedOrderCount >= 0;
  const statusStyles: Record<string, { text: string; badge: string; icon: string; label: string }> = {
    pending: { text: "text-[#4a7c59]", badge: "border-[#4a7c59]/50 bg-[#4a7c59]/15", icon: "…", label: "pending" },
    success: { text: "text-[#4a7c59]", badge: "border-[#4a7c59]/50 bg-[#4a7c59]/10", icon: "✓", label: "success" },
    failed: { text: "text-[#dc143c]", badge: "border-[#dc143c]/50 bg-[#dc143c]/10", icon: "✕", label: "failed" },
    void: { text: "text-[#ff9500]", badge: "border-[#ff9500]/50 bg-[#ff9500]/10", icon: "⊘", label: "void" },
    unknown: { text: "text-[#b7bec6]", badge: "border-[#8a95a1]/45 bg-[#8a95a1]/12", icon: "?", label: "unknown" },
  };

  const resultText = (rowResult: string, statusLabel: string) => {
    const rendered = (rowResult || "").trim();
    if (!rendered || rendered.toLowerCase() === "no report") return "no report";
    if (rendered.toLowerCase() === "resolved") return statusLabel;
    return rendered;
  };

  return (
    <div ref={shellRef} className="p-2 text-xs font-['IBM_Plex_Mono']">
      <div
        className="border border-[#3a3a3a] bg-[#0f0f0f]"
        role="table"
        aria-label="Orders table"
      >
        <div
          className="grid bg-[#181818] border-b border-[#3a3a3a] text-[10px] font-bold uppercase tracking-[0.11em] text-[#808080]"
          style={{ gridTemplateColumns: columnTemplate }}
          role="row"
        >
          <div className="px-2 py-1.5" role="columnheader">Power</div>
          <div className="px-2 py-1.5" role="columnheader">Unit</div>
          <div className="px-2 py-1.5" role="columnheader">Order</div>
          {layoutMode !== "compact" && <div className="px-2 py-1.5" role="columnheader">Result</div>}
          {layoutMode === "full" && <div className="px-2 py-1.5" role="columnheader">Status</div>}
        </div>

        <div className="divide-y divide-[#2a2a2a]" role="rowgroup">
          {rows.map((row) => {
            const isActive = isRevealing && row.index === revealedOrderCount - 1;
            const isHidden = isRevealing && row.index >= revealedOrderCount;
            const isDimmed = isRevealing && row.index < revealedOrderCount - 1;
            const statusStyle = statusStyles[row.status] ?? statusStyles.unknown;

            return (
              <div
                key={row.key}
                ref={isActive ? activeOrderRef : undefined}
                className={`grid ${layoutMode === "compact" ? "items-start" : "items-center"} text-[11px] leading-[1.2] transition-all duration-300 ${
                  isActive ? "bg-[#ff9500]/15 border-l-2 border-[#ff9500]" :
                  isHidden ? "opacity-25 text-[#666]" :
                  isDimmed ? "opacity-55 text-[#999]" :
                  "text-[#e0e0e0] hover:bg-[#1b1b1b]"
                }`}
                style={{ gridTemplateColumns: columnTemplate }}
                onMouseEnter={() => !isRevealing && onOrderHover?.(row.rawOrder)}
                onMouseLeave={() => !isRevealing && onOrderHover?.(null)}
                title={row.rawOrder}
                role="row"
                aria-label={`${row.power.slice(0, 3)} ${row.unit} ${row.order} ${statusStyle.label}`}
              >
                <div className="px-2 py-1.5 font-semibold uppercase tracking-[0.08em] text-[#ff9500]" role="cell">{row.power.slice(0, 3)}</div>
                <div className="px-2 py-1.5 text-[#b8b8b8]" role="cell">{row.unit}</div>
                <div className={`px-2 py-1.5 text-[#d0d0d0] min-w-0 ${layoutMode === "compact" ? "flex flex-col items-start gap-1" : "flex items-center justify-between gap-2"}`} role="cell">
                  <span className={`${layoutMode === "compact" ? "whitespace-normal break-words leading-[1.35]" : layoutMode === "medium" ? "whitespace-normal break-words leading-[1.25]" : "truncate"}`}>{row.order}</span>
                  {layoutMode === "compact" && (
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.05em] font-semibold ${statusStyle.text} ${statusStyle.badge}`}
                      title={resultText(row.result, statusStyle.label)}
                    >
                      <span aria-hidden="true">{statusStyle.icon}</span>
                      <span>{resultText(row.result, statusStyle.label)}</span>
                    </span>
                  )}
                </div>
                {layoutMode !== "compact" && (
                  <div className={`px-2 py-1.5 ${statusStyle.text} ${layoutMode === "medium" ? "whitespace-normal break-words leading-[1.25]" : ""}`} role="cell">
                    {layoutMode === "medium" ? resultText(row.result, statusStyle.label) : row.result}
                  </div>
                )}
                {layoutMode === "full" && (
                  <div className="px-2 py-1.5 flex justify-center" role="cell">
                    <span
                      className={`inline-flex h-6 w-8 items-center justify-center rounded border text-[13px] font-semibold ${statusStyle.text} ${statusStyle.badge}`}
                      title={statusStyle.label}
                      aria-label={statusStyle.label}
                      aria-hidden="true"
                    >
                      {statusStyle.icon}
                    </span>
                  </div>
                )}
                {layoutMode === "compact" && <span className="sr-only">{resultText(row.result, statusStyle.label)}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
