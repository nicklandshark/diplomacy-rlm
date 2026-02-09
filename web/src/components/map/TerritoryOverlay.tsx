"use client";

import { useEffect } from "react";

interface TerritoryOverlayProps {
  svgContainer: HTMLElement | null;
  influence: Record<string, string[]>;
  centers: Record<string, string[]>;
  /** Extra dependency to force re-application (e.g. after terrain readiness changes the SVG DOM) */
  refreshKey?: number | boolean;
}

export default function TerritoryOverlay({
  svgContainer,
  influence,
  centers,
  refreshKey,
}: TerritoryOverlayProps) {
  useEffect(() => {
    if (!svgContainer) return;

    // Build a map of province -> power
    const provinceOwner: Record<string, string> = {};

    // Centers determine ownership
    for (const [power, locs] of Object.entries(centers)) {
      for (const loc of locs) {
        provinceOwner[loc.toUpperCase().slice(0, 3)] = power.toLowerCase();
      }
    }

    // Influence for non-SC territories
    for (const [power, locs] of Object.entries(influence || {})) {
      for (const loc of locs) {
        const base = loc.toUpperCase().slice(0, 3);
        if (!provinceOwner[base]) {
          provinceOwner[base] = power.toLowerCase();
        }
      }
    }

    // Apply classes to SVG elements
    const svgEl = svgContainer.querySelector("svg");
    if (!svgEl) return;

    for (const [province, power] of Object.entries(provinceOwner)) {
      const id = `_${province.toLowerCase()}`;
      const el = svgEl.querySelector(`#${id}`);
      if (!el) continue;

      if (el.tagName === "path" || el.tagName === "polygon") {
        el.setAttribute("class", power);
      } else if (el.tagName === "g") {
        const children = el.querySelectorAll("path, polygon");
        children.forEach((child) => {
          if (child.getAttribute("class") !== "water") {
            child.setAttribute("class", power);
          }
        });
      }
    }
  }, [svgContainer, influence, centers, refreshKey]);

  return null;
}
