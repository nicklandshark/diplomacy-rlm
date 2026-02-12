"use client";

import { useRef, useEffect } from "react";

interface MiniMapProps {
  svgContent: string;
  centers: Record<string, string[]>;
  influence: Record<string, string[]>;
  className?: string;
}

/**
 * Lightweight map thumbnail — renders territory colors with no interactivity.
 * Used for game cards on the home screen.
 */
export default function MiniMap({ svgContent, centers, influence, className }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const svgEl = el.querySelector("svg");
    if (!svgEl) return;

    // Force the SVG to fill the container
    svgEl.setAttribute("width", "100%");
    svgEl.setAttribute("height", "100%");
    svgEl.style.display = "block";
    svgEl.setAttribute("preserveAspectRatio", "xMidYMid slice");

    // Build province → power map
    const provinceOwner: Record<string, string> = {};
    for (const [power, locs] of Object.entries(centers)) {
      for (const loc of locs) {
        provinceOwner[loc.toUpperCase().slice(0, 3)] = power.toLowerCase();
      }
    }
    for (const [power, locs] of Object.entries(influence || {})) {
      for (const loc of locs) {
        const base = loc.toUpperCase().slice(0, 3);
        if (!provinceOwner[base]) {
          provinceOwner[base] = power.toLowerCase();
        }
      }
    }

    // Apply classes to SVG territory elements
    for (const [province, power] of Object.entries(provinceOwner)) {
      const id = `_${province.toLowerCase()}`;
      const target = svgEl.querySelector(`#${id}`);
      if (!target) continue;

      if (target.tagName === "path" || target.tagName === "polygon") {
        target.setAttribute("class", power);
      } else if (target.tagName === "g") {
        target.querySelectorAll("path, polygon").forEach((child) => {
          if (child.getAttribute("class") !== "water") {
            child.setAttribute("class", power);
          }
        });
      }
    }
  }, [svgContent, centers, influence]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: "hidden",
        pointerEvents: "none",
        userSelect: "none",
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
