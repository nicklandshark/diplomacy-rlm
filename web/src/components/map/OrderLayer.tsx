"use client";

import type { ParsedOrder } from "@/lib/types";
import { POWER_COLORS } from "@/lib/constants";
import HoldOrder from "./orders/HoldOrder";
import MoveOrder from "./orders/MoveOrder";
import SupportHoldOrder from "./orders/SupportHoldOrder";
import SupportMoveOrder from "./orders/SupportMoveOrder";
import ConvoyOrder from "./orders/ConvoyOrder";

interface OrderLayerProps {
  orders: { power: string; order: ParsedOrder }[];
}

export default function OrderLayer({ orders }: OrderLayerProps) {
  return (
    <g id="OrderLayerDynamic">
      {orders.map(({ power, order }, i) => {
        const color = POWER_COLORS[power] || "#999";
        const key = `${power}-${order.raw}-${i}`;

        switch (order.action) {
          case "H":
            return (
              <HoldOrder key={key} loc={order.loc} powerColor={color} />
            );
          case "M":
            if (!order.dest) return null;
            return (
              <MoveOrder
                key={key}
                src={order.loc}
                dest={order.dest}
                powerColor={color}
              />
            );
          case "S":
            if (order.srcLoc && order.dest) {
              return (
                <SupportMoveOrder
                  key={key}
                  loc={order.loc}
                  srcLoc={order.srcLoc}
                  dest={order.dest}
                  powerColor={color}
                />
              );
            } else if (order.dest) {
              return (
                <SupportHoldOrder
                  key={key}
                  loc={order.loc}
                  dest={order.dest}
                  powerColor={color}
                />
              );
            }
            return null;
          case "C":
            if (!order.srcLoc || !order.dest) return null;
            return (
              <ConvoyOrder
                key={key}
                loc={order.loc}
                srcLoc={order.srcLoc}
                dest={order.dest}
                powerColor={color}
              />
            );
          case "R":
            if (!order.dest) return null;
            return (
              <MoveOrder
                key={key}
                src={order.loc}
                dest={order.dest}
                powerColor={color}
                isDislodged
              />
            );
          default:
            return null;
        }
      })}
    </g>
  );
}
