"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  lastUpdated?: number;
}

export default function MemoryViewer({ content, lastUpdated }: Props) {
  const prevUpdated = useRef(lastUpdated);
  const [flash, setFlash] = useState(false);

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
      className="prose prose-invert prose-sm max-w-none p-4 overflow-auto border rounded-lg transition-[border-color] duration-[1500ms] ease-out"
      style={{
        borderColor: flash ? "rgb(192 132 252)" : "transparent", // purple-400 when flashing
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
