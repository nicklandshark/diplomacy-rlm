"use client";

import { RefObject } from "react";
import { parseOrder, humanizeOrder, orderIcon } from "@/lib/parse-orders";
import type { PhaseOrders, PhaseResults } from "@/lib/types";

interface OrderPanelProps {
  orders: PhaseOrders | null;
  results: PhaseResults | null;
  pendingPowers: Set<string>;
  onOrderHover?: (order: string | null) => void;
  revealedOrderCount?: number; // -1 = show all, 0+ = show up to this index
  activeOrderRef?: RefObject<HTMLDivElement | null>;
}

export function OrderPanel({ orders, results, pendingPowers, onOrderHover, revealedOrderCount = -1, activeOrderRef }: OrderPanelProps) {
  if (!orders || Object.values(orders).every((v) => !(v as string[]).length)) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[#808080]">
        <div className="text-2xl mb-2">—</div>
        <div className="text-sm uppercase tracking-wider">No orders issued</div>
      </div>
    );
  }

  // Flatten orders with global index for reveal
  let globalIndex = 0;
  const allOrders: { power: string; order: string; index: number }[] = [];
  Object.entries(orders).forEach(([power, orderList]) => {
    (orderList as string[]).forEach((order) => {
      allOrders.push({ power, order, index: globalIndex++ });
    });
  });

  const isRevealing = revealedOrderCount >= 0;

  return (
    <div className="p-2 text-sm">
      {Object.entries(orders).map(([power, orderList]) => {
        if (!(orderList as string[]).length) return null;
        const isPending = pendingPowers.has(power);

        return (
          <div key={power} className="mb-3">
            <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
              <span className="text-[#ff9500] uppercase tracking-wider">{power}</span>
              {isPending && (
                <span className="text-[10px] text-[#4a7c59] font-normal italic">pending</span>
              )}
            </div>

            {(orderList as string[]).map((order, i) => {
              const orderGlobalIdx = allOrders.findIndex(o => o.power === power && o.order === order);
              const parsed = parseOrder(order);
              const isActive = isRevealing && orderGlobalIdx === revealedOrderCount - 1;
              const isHidden = isRevealing && orderGlobalIdx >= revealedOrderCount;
              const isDimmed = isRevealing && orderGlobalIdx < revealedOrderCount - 1;

              if (!parsed) return null;

              return (
                <div
                  key={i}
                  ref={isActive ? activeOrderRef : undefined}
                  className={`flex items-center gap-1.5 text-xs pl-2 py-0.5 rounded cursor-default transition-all duration-300 ${
                    isPending && !isActive ? "border-l-2 border-[#4a7c59]/40 " : ""
                  }${
                    isActive ? "bg-[#ff9500]/20 text-white border-l-2 border-[#ff9500] " :
                    isHidden ? "opacity-30 text-[#808080] " :
                    isDimmed ? "opacity-60 text-[#e0e0e0]/60 " :
                    "text-[#e0e0e0] hover:bg-[#2a2a2a] "
                  }`}
                  title={order}
                  onMouseEnter={() => !isRevealing && onOrderHover?.(order)}
                  onMouseLeave={() => !isRevealing && onOrderHover?.(null)}
                >
                  <span className={`w-4 text-center flex-shrink-0 ${isActive ? "text-[#ff9500]" : "text-[#808080]"}`}>
                    {orderIcon(parsed.action)}
                  </span>
                  <span>{humanizeOrder(parsed)}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
