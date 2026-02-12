"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface FlapSelectOption {
  value: string;
  label: string;
}

interface FlapSelectProps {
  options: FlapSelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Number of character cells to display (auto-sizes if omitted) */
  cells?: number;
}

/* ─── Character set for the flipboard cycling effect ─── */
const FLIP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-/ ";

function randomChar(): string {
  return FLIP_CHARS[Math.floor(Math.random() * FLIP_CHARS.length)];
}

/* ─── Single animated flap character cell ─── */
export function FlapCell({ target, delay, lit = true }: { target: string; delay: number; lit?: boolean }) {
  const [display, setDisplay] = useState(target);
  const [phase, setPhase] = useState<"idle" | "flip-out" | "flip-in">("idle");
  const prevTarget = useRef(target);

  useEffect(() => {
    if (target === prevTarget.current) return;
    prevTarget.current = target;

    const startTimer = setTimeout(() => {
      let tick = 0;
      const totalTicks = 3 + Math.floor(Math.random() * 3); // 3-5 intermediate chars

      const interval = setInterval(() => {
        if (tick < totalTicks) {
          // Flip out current → flip in random
          setPhase("flip-out");
          setTimeout(() => {
            setDisplay(randomChar());
            setPhase("flip-in");
            setTimeout(() => setPhase("idle"), 40);
          }, 40);
          tick++;
        } else {
          clearInterval(interval);
          setPhase("flip-out");
          setTimeout(() => {
            setDisplay(target);
            setPhase("flip-in");
            setTimeout(() => setPhase("idle"), 50);
          }, 50);
        }
      }, 80);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [target, delay]);

  const transform =
    phase === "flip-out"
      ? "perspective(80px) rotateX(40deg)"
      : phase === "flip-in"
        ? "perspective(80px) rotateX(-20deg)"
        : "perspective(80px) rotateX(0deg)";

  const charOpacity = phase === "flip-out" ? 0.3 : 1;

  return (
    <div
      style={{
        width: 22,
        height: 34,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 0.5px",
        borderRadius: 2,
        overflow: "hidden",
        background: lit
          ? "linear-gradient(180deg, #1c1a16 0%, #141210 100%)"
          : "linear-gradient(180deg, #161616 0%, #0f0f0f 100%)",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.04)",
        borderTop: "1px solid #1a1a1a",
        borderBottom: "1px solid #0a0a0a",
        borderLeft: "1px solid #0e0e0e",
        borderRight: "1px solid #0e0e0e",
      }}
    >
      <span
        style={{
          fontFamily: "'Courier New', 'Lucida Console', monospace",
          fontSize: 18,
          fontWeight: 800,
          color: lit ? "#ff9500" : "#1a1a1a",
          textShadow: lit ? "0 0 8px rgba(255,149,0,0.6), 0 0 2px rgba(255,149,0,0.9)" : "none",
          lineHeight: 1,
          userSelect: "none",
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          transform,
          opacity: charOpacity,
          transition: "transform 45ms ease-out, opacity 35ms",
          transformOrigin: "center bottom",
        }}
      >
        {display}
      </span>
    </div>
  );
}

/* ─── Portal-based dropdown positioned via getBoundingClientRect ─── */
function DropdownPortal({
  anchorRef,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    function update() {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4 + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 200),
      });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export default function FlapSelect({ options, value, onChange, disabled, cells }: FlapSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const displayText = selected?.label || value || "";

  // Auto-size: use the longest option label
  const maxLen = cells ?? Math.max(12, ...options.map((o) => o.label.length));
  const chars = displayText.toUpperCase().split("");

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        // Also check if click is inside the portal dropdown
        const portal = document.querySelector("[data-flap-dropdown]");
        if (portal && portal.contains(target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (open && highlightIdx >= 0) {
          onChange(options[highlightIdx].value);
          setOpen(false);
        } else {
          setOpen((o) => !o);
          setHighlightIdx(options.findIndex((o) => o.value === value));
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlightIdx(options.findIndex((o) => o.value === value));
        } else {
          setHighlightIdx((i) => Math.min(i + 1, options.length - 1));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
      }
    },
    [open, highlightIdx, options, value, onChange, disabled]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || highlightIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx, open]);

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="w-full flex items-center rounded-[3px] overflow-hidden transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9500]/50"
        style={{
          borderTop: `1px solid ${open ? "#4a4530" : "#1a1a1a"}`,
          borderBottom: `1px solid ${open ? "#4a4530" : "#1a1a1a"}`,
          borderLeft: `1px solid ${open ? "#4a4530" : "#1a1a1a"}`,
          borderRight: `1px solid ${open ? "#4a4530" : "#1a1a1a"}`,
          background: "linear-gradient(180deg, #1e1c18 0%, #141210 50%, #0e0d0b 100%)",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.03), 0 1px 0 rgba(255,255,255,0.04)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          padding: "5px 8px",
        }}
      >
        {/* Flap character cells */}
        <div className="flex items-center flex-1 min-w-0">
          {Array.from({ length: maxLen }).map((_, i) => (
            <FlapCell
              key={i}
              target={chars[i] || " "}
              delay={i * 30}
              lit={i < chars.length}
            />
          ))}
        </div>

        {/* Dropdown arrow */}
        <div
          className="flex-shrink-0 ml-2 flex items-center justify-center"
          style={{
            width: 24,
            height: 34,
            color: "#ff9500",
            opacity: 0.7,
            transition: "transform 150ms",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
            <path d="M0 0 L5 6 L10 0 Z" />
          </svg>
        </div>
      </button>

      {/* Dropdown menu — rendered via portal to escape overflow clipping */}
      {open && !disabled && (
        <DropdownPortal anchorRef={triggerRef}>
          <div
            ref={listRef}
            data-flap-dropdown="true"
            className="rounded-[3px] overflow-hidden overflow-y-auto"
            style={{
              maxHeight: 280,
              borderTop: "1px solid #4a4530",
              borderBottom: "1px solid #4a4530",
              borderLeft: "1px solid #4a4530",
              borderRight: "1px solid #4a4530",
              background: "linear-gradient(180deg, #1a1a1a 0%, #141414 100%)",
              boxShadow: "0 12px 36px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,149,0,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
            role="listbox"
          >
            {options.map((opt, i) => {
              const isActive = opt.value === value;
              const isHighlighted = i === highlightIdx;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className="w-full text-left px-3 py-2.5 transition-colors flex items-center gap-2"
                  style={{
                    background: isHighlighted
                      ? "linear-gradient(90deg, rgba(255,149,0,0.15) 0%, rgba(255,149,0,0.06) 100%)"
                      : "transparent",
                    color: isActive ? "#ff9500" : isHighlighted ? "#d8c183" : "#a09080",
                    borderBottom: i < options.length - 1 ? "1px solid #1e1e1e" : "none",
                    fontFamily: "'Courier New', monospace",
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHighlightIdx(i)}
                >
                  <span
                    className="flex-shrink-0"
                    style={{
                      width: 12,
                      fontSize: 10,
                      color: "#ff9500",
                      opacity: isActive ? 1 : 0,
                    }}
                  >
                    &#9656;
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </DropdownPortal>
      )}
    </div>
  );
}
