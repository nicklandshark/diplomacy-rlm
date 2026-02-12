"use client";

import { RefObject } from "react";
import type { PhaseOrders, PhaseResults } from "@/lib/types";
import { buildOrderRows, type FsbOrderStatus } from "./intel/fsb-utils";

interface OrderPanelProps {
  orders: PhaseOrders | null;
  results: PhaseResults | null;
  pendingPowers: Set<string>;
  onOrderHover?: (order: string | null) => void;
  revealedOrderCount?: number; // -1 = show all, 0+ = show up to this index
  activeOrderRef?: RefObject<HTMLDivElement | null>;
}

const STATUS: Record<FsbOrderStatus, { color: string; icon: string; label: string }> = {
  pending:  { color: "#607a68", icon: "\u2026", label: "pending" },
  success:  { color: "#4a7c59", icon: "\u2713", label: "success" },
  failed:   { color: "#dc143c", icon: "\u2715", label: "failed" },
  void:     { color: "#ff9500", icon: "\u2298", label: "void" },
  unknown:  { color: "#8a95a1", icon: "?",      label: "unknown" },
};

export function OrderPanel({ orders, results, pendingPowers, onOrderHover, revealedOrderCount = -1, activeOrderRef }: OrderPanelProps) {
  const rows = buildOrderRows(orders, results, pendingPowers);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[#808080]">
        <div className="text-2xl mb-2">&mdash;</div>
        <div className="text-sm uppercase tracking-wider">No orders issued</div>
      </div>
    );
  }

  const isRevealing = revealedOrderCount >= 0;

  return (
    <div className="p-1.5">
      {/* Table shell */}
      <div
        className="border border-[#2a2a2a] bg-[#0c0c0c] overflow-hidden"
        role="table"
        aria-label="Orders table"
      >
        {/* Header */}
        <div
          className="grid items-center bg-[#151515] border-b border-[#2a2a2a] text-[9px] font-bold uppercase tracking-[0.14em] text-[#606060]"
          style={{ gridTemplateColumns: "36px 62px 1fr 50px" }}
          role="row"
        >
          <div className="px-1.5 py-1" role="columnheader">Pwr</div>
          <div className="px-1.5 py-1" role="columnheader">Unit</div>
          <div className="px-1.5 py-1" role="columnheader">Order</div>
          <div className="px-1 py-1 text-center" role="columnheader">Status</div>
        </div>

        {/* Rows */}
        <div role="rowgroup">
          {rows.map((row, i) => {
            const isActive = isRevealing && row.index === revealedOrderCount - 1;
            const isHidden = isRevealing && row.index >= revealedOrderCount;
            const isDimmed = isRevealing && row.index < revealedOrderCount - 1;
            const st = STATUS[row.status] ?? STATUS.unknown;

            // Alternating row stripe
            const stripe = i % 2 === 0 ? "bg-[#0c0c0c]" : "bg-[#111111]";

            return (
              <div
                key={row.key}
                ref={isActive ? activeOrderRef : undefined}
                className={`grid items-center text-[10px] leading-tight transition-colors duration-200 border-b border-[#1a1a1a] last:border-b-0 ${stripe} ${
                  isActive ? "!bg-[#ff9500]/12 border-l-2 !border-l-[#ff9500]" :
                  isHidden ? "opacity-20" :
                  isDimmed ? "opacity-50" :
                  "hover:bg-[#181818]"
                }`}
                style={{ gridTemplateColumns: "36px 62px 1fr 50px" }}
                onMouseEnter={() => !isRevealing && onOrderHover?.(row.rawOrder)}
                onMouseLeave={() => !isRevealing && onOrderHover?.(null)}
                title={row.rawOrder}
                role="row"
                aria-label={`${row.power.slice(0, 3)} ${row.unit} ${row.order} ${st.label}`}
              >
                {/* Power — 3-letter abbrev */}
                <div className="px-1.5 py-[5px] font-bold uppercase tracking-[0.06em] text-[#ff9500] truncate" role="cell">
                  {row.power.slice(0, 3)}
                </div>

                {/* Unit — e.g. "A PAR" */}
                <div className="px-1.5 py-[5px] text-[#999] truncate" role="cell">
                  {row.unit}
                </div>

                {/* Order — e.g. "MOVE BUR" */}
                <div className="px-1.5 py-[5px] text-[#d0d0d0] truncate min-w-0" role="cell">
                  {row.order}
                </div>

                {/* Status icon */}
                <div className="flex justify-center py-[5px]" role="cell">
                  <span
                    className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-sm text-[11px] font-bold"
                    style={{
                      color: st.color,
                      backgroundColor: st.color + "18",
                      border: `1px solid ${st.color}44`,
                    }}
                    title={st.label}
                    aria-label={st.label}
                  >
                    {st.icon}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
