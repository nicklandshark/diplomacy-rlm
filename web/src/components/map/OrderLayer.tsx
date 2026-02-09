"use client";

import type { ParsedOrder, PhaseResults } from "@/lib/types";
import { POWER_COLORS } from "@/lib/constants";
import { Coordinates, SymbolSizes } from "@/lib/map-metadata";
import HoldOrder from "./orders/HoldOrder";
import MoveOrder from "./orders/MoveOrder";
import SupportHoldOrder from "./orders/SupportHoldOrder";
import SupportMoveOrder from "./orders/SupportMoveOrder";
import ConvoyOrder from "./orders/ConvoyOrder";

interface OrderLayerProps {
  orders: { power: string; order: ParsedOrder }[];
  hoveredOrder?: string | null;
  revealedCount?: number; // -1 or undefined = show all; 0+ = orders revealed so far
  results?: PhaseResults | null;
}

type ResultStatus = "success" | "failed" | "void";

function getResultStatus(order: ParsedOrder, results: PhaseResults): ResultStatus | null {
  const unitKey = `${order.unitType} ${order.loc}`;
  const res = results[unitKey];
  if (!res) return null; // no result data for this unit
  if (res.length === 0) return "success";
  if (res.some(r => r === "bounce" || r === "dislodged" || r === "no convoy" || r === "disrupted" || r === "cut")) return "failed";
  if (res.some(r => r === "void")) return "void";
  return "failed";
}

function getIndicatorPosition(order: ParsedOrder): [number, number] | null {
  // Place indicator at the destination for moves, at the unit loc for holds/supports
  const targetLoc = (order.action === "M" || order.action === "R") && order.dest
    ? order.dest : order.loc;
  const coord = Coordinates[targetLoc];
  if (!coord) return null;
  const size = SymbolSizes.Army;
  return [coord.unit[0] + size.width / 2, coord.unit[1] + size.height / 2];
}

function ResultIndicator({ status, x, y }: { status: ResultStatus; x: number; y: number }) {
  const r = 8;
  if (status === "success") {
    return (
      <g transform={`translate(${x + 12}, ${y - 12})`}>
        <circle r={r} fill="#166534" stroke="#22c55e" strokeWidth={1.5} opacity={0.9} />
        <path d="M-4,0 L-1,3 L4,-3" fill="none" stroke="#4ade80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  if (status === "failed") {
    return (
      <g transform={`translate(${x + 12}, ${y - 12})`}>
        <circle r={r} fill="#7f1d1d" stroke="#ef4444" strokeWidth={1.5} opacity={0.9} />
        <path d="M-3,-3 L3,3 M3,-3 L-3,3" fill="none" stroke="#f87171" strokeWidth={2} strokeLinecap="round" />
      </g>
    );
  }
  // void
  return (
    <g transform={`translate(${x + 12}, ${y - 12})`}>
      <circle r={r} fill="#78350f" stroke="#f59e0b" strokeWidth={1.5} opacity={0.9} />
      <text textAnchor="middle" dominantBaseline="central" fill="#fbbf24" fontSize={10} fontWeight="bold">!</text>
    </g>
  );
}

export default function OrderLayer({ orders, hoveredOrder, revealedCount, results }: OrderLayerProps) {
  const hasHover = hoveredOrder != null;
  const isRevealing = revealedCount != null && revealedCount >= 0;
  return (
    <g id="OrderLayerDynamic">
      {orders.map(({ power, order }, i) => {
        const color = POWER_COLORS[power] || "#999";
        const key = `${power}-${order.raw}-${i}`;
        const isHovered = hoveredOrder === order.raw;

        let opacity: number;
        let filter: string | undefined;

        if (isRevealing) {
          if (i >= revealedCount) {
            opacity = 0;
          } else if (i === revealedCount - 1) {
            opacity = 1;
            filter = "drop-shadow(0 0 6px white)";
          } else {
            opacity = 0.45;
          }
        } else if (hasHover) {
          opacity = isHovered ? 1 : 0.15;
          filter = isHovered ? "drop-shadow(0 0 6px white)" : undefined;
        } else {
          opacity = 1;
        }

        // Result status indicator
        const resultStatus = results ? getResultStatus(order, results) : null;
        const indicatorPos = resultStatus ? getIndicatorPosition(order) : null;

        let node: React.ReactNode = null;
        switch (order.action) {
          case "H":
            node = <HoldOrder loc={order.loc} powerColor={color} />;
            break;
          case "M":
            if (!order.dest) return null;
            node = <MoveOrder src={order.loc} dest={order.dest} powerColor={color} isHovered={isHovered} />;
            break;
          case "S":
            if (order.srcLoc && order.dest) {
              node = <SupportMoveOrder loc={order.loc} srcLoc={order.srcLoc} dest={order.dest} powerColor={color} />;
            } else if (order.dest) {
              node = <SupportHoldOrder loc={order.loc} dest={order.dest} powerColor={color} />;
            }
            break;
          case "C":
            if (!order.srcLoc || !order.dest) return null;
            node = <ConvoyOrder loc={order.loc} srcLoc={order.srcLoc} dest={order.dest} powerColor={color} />;
            break;
          case "R":
            if (!order.dest) return null;
            node = <MoveOrder src={order.loc} dest={order.dest} powerColor={color} isDislodged isHovered={isHovered} />;
            break;
        }
        if (!node) return null;
        return (
          <g key={key} opacity={opacity} filter={filter} style={{ transition: "opacity 0.4s ease-out, filter 0.4s ease-out" }}>
            {node}
            {resultStatus && indicatorPos && !isRevealing && (
              <ResultIndicator status={resultStatus} x={indicatorPos[0]} y={indicatorPos[1]} />
            )}
          </g>
        );
      })}
    </g>
  );
}
