"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  lastUpdated?: number;
  variant?: "dark" | "paper" | "microfiche";
  className?: string;
}

const DARK_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="m-0 text-[18px] leading-[24px] font-bold tracking-[0.04em] text-[#f1f1f1]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="m-0 mt-[16px] text-[15px] leading-[22px] font-semibold tracking-[0.04em] text-[#e6e6e6]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="m-0 mt-[14px] text-[14px] leading-[20px] font-semibold text-[#dcdcdc]">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="m-0 text-[12px] leading-[20px] text-[#c6c6c6]">
      {children}
    </p>
  ),
  ul: ({ children }) => <ul className="my-0 list-disc pl-5 marker:text-[#8d8d8d]">{children}</ul>,
  ol: ({ children }) => <ol className="my-0 list-decimal pl-5 marker:text-[#8d8d8d]">{children}</ol>,
  li: ({ children }) => <li className="m-0 text-[12px] leading-[20px] text-[#c6c6c6]">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[#f4f4f4]">{children}</strong>,
  em: ({ children }) => <em className="text-[#d9d9d9]">{children}</em>,
  code: ({ children }) => <code className="rounded bg-[#272727] px-1 py-[1px] text-[11px] text-[#e2e2e2]">{children}</code>,
  hr: () => <hr className="my-3 border-0 border-t border-[#2f2f2f]" />,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[#4a4a4a] bg-[#171717] px-3 py-1 text-[12px] leading-[20px] text-[#c8c8c8]">
      {children}
    </blockquote>
  ),
};

const PAPER_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1
      className="m-0 text-[16px] leading-[24px] font-bold tracking-[0.06em] uppercase text-[#2f1f15]"
      style={{ fontFamily: "'Special Elite', 'Courier Prime', 'IBM Plex Mono', monospace" }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      className="m-0 mt-[24px] border-b border-[#c7b993] pb-0 text-[15px] leading-[24px] font-bold tracking-[0.08em] uppercase text-[#2f2114]"
      style={{ fontFamily: "'Special Elite', 'Courier Prime', 'IBM Plex Mono', monospace" }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className="m-0 mt-[24px] text-[14px] leading-[24px] font-bold tracking-[0.06em] uppercase text-[#342416]"
      style={{ fontFamily: "'Special Elite', 'Courier Prime', 'IBM Plex Mono', monospace" }}
    >
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p
      className="m-0 text-[13px] leading-[24px] text-[#463324]"
      style={{ fontFamily: "'Courier Prime', 'IBM Plex Mono', ui-monospace, monospace" }}
    >
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-0 list-disc pl-5 marker:text-[#7f6444]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-0 list-decimal pl-5 marker:font-semibold marker:text-[#8a2f1f]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li
      className="m-0 text-[13px] leading-[24px] text-[#4a3828]"
      style={{ fontFamily: "'Courier Prime', 'IBM Plex Mono', ui-monospace, monospace" }}
    >
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-[#2a1b12]">
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className="text-[#5a4636]">
      {children}
    </em>
  ),
  code: ({ children }) => (
    <code
      className="rounded bg-[#d8c79f] px-1 py-[1px] text-[12px] text-[#4b321e]"
      style={{ fontFamily: "'Courier Prime', 'IBM Plex Mono', ui-monospace, monospace" }}
    >
      {children}
    </code>
  ),
  hr: () => <hr className="my-[24px] border-0 border-t border-dashed border-[#c4b58d]" />,
  blockquote: ({ children }) => (
    <blockquote
      className="my-0 border-l-2 border-[#b77262] bg-[#e6d8b9]/75 px-3 py-0 text-[13px] leading-[24px] text-[#5c3a2f]"
      style={{ fontFamily: "'Courier Prime', 'IBM Plex Mono', ui-monospace, monospace" }}
    >
      {children}
    </blockquote>
  ),
};

const MICROFICHE_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1
      className="m-0 text-[12px] leading-[24px] font-semibold tracking-[0.03em] text-[#86cfa6]"
      style={{
        fontFamily: "'IBM Plex Mono', 'Share Tech Mono', ui-monospace, monospace",
        textShadow: "0 0 8px rgba(134,207,166,0.2)",
      }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      className="m-0 mt-[16px] text-[11px] leading-[24px] font-semibold uppercase tracking-[0.14em] text-[#5d9e78]"
      style={{
        fontFamily: "'IBM Plex Mono', 'Share Tech Mono', ui-monospace, monospace",
        textShadow: "0 0 6px rgba(93,158,120,0.18)",
      }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className="m-0 mt-[16px] text-[11px] leading-[24px] font-semibold uppercase tracking-[0.12em] text-[#5d9e78]"
      style={{
        fontFamily: "'IBM Plex Mono', 'Share Tech Mono', ui-monospace, monospace",
        textShadow: "0 0 6px rgba(93,158,120,0.18)",
      }}
    >
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p
      className="m-0 text-[11px] leading-[24px] text-[#73b18d]"
      style={{
        fontFamily: "'IBM Plex Mono', 'Share Tech Mono', ui-monospace, monospace",
        textShadow: "0 0 4px rgba(115,177,141,0.14)",
      }}
    >
      {children}
    </p>
  ),
  ul: ({ children }) => <ul className="my-0 list-none pl-3">{children}</ul>,
  ol: ({ children }) => <ol className="my-0 list-none pl-3">{children}</ol>,
  li: ({ children }) => (
    <li
      className="m-0 text-[11px] leading-[24px] text-[#73b18d] relative"
      style={{
        fontFamily: "'IBM Plex Mono', 'Share Tech Mono', ui-monospace, monospace",
        textShadow: "0 0 4px rgba(115,177,141,0.14)",
      }}
    >
      <span className="absolute left-[-10px] text-[#3f7354]">·</span>
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#92d8af]" style={{ textShadow: "0 0 6px rgba(146,216,175,0.2)" }}>
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="text-[#6aa883]">{children}</em>,
  code: ({ children }) => (
    <code
      className="rounded bg-[#0e1712] px-1 py-[1px] text-[10px] text-[#72b88f]"
      style={{ fontFamily: "'IBM Plex Mono', 'Share Tech Mono', ui-monospace, monospace" }}
    >
      {children}
    </code>
  ),
  hr: () => <hr className="my-[12px] border-0 border-t border-dashed border-[#214431]" />,
  blockquote: ({ children }) => (
    <blockquote
      className="my-0 border-l-2 border-[#7d2d2b] bg-[#1a1211]/70 px-3 py-0 text-[11px] leading-[24px] text-[#c95a58]"
      style={{ fontFamily: "'IBM Plex Mono', 'Share Tech Mono', ui-monospace, monospace" }}
    >
      {children}
    </blockquote>
  ),
};

export default function MemoryViewer({ content, lastUpdated, variant = "dark", className = "" }: Props) {
  const prevUpdated = useRef(lastUpdated);
  const [flash, setFlash] = useState(false);
  const isPaper = variant === "paper" || className.includes("memory-paper");
  const isMicrofiche = variant === "microfiche" || className.includes("memory-fiche");

  useEffect(() => {
    if (lastUpdated !== undefined && lastUpdated !== prevUpdated.current) {
      prevUpdated.current = lastUpdated;
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [lastUpdated]);

  return (
    <div
      className={`overflow-auto border rounded-lg transition-[border-color] duration-[1500ms] ease-out ${
        isPaper
          ? "max-w-none p-0 border-0 rounded-none text-[#463324] text-[13px] leading-[24px]"
          : isMicrofiche
          ? "max-w-none p-0 border-0 rounded-none text-[11px] leading-[24px] text-[#5a9a75]"
          : "max-w-none p-3 border-transparent text-[12px] leading-[20px] text-[#c6c6c6]"
      } ${className}`}
      style={{
        borderColor: isPaper || isMicrofiche
          ? "transparent"
          : (flash ? "rgb(192 132 252)" : "transparent"),
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={isPaper ? PAPER_COMPONENTS : isMicrofiche ? MICROFICHE_COMPONENTS : DARK_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
