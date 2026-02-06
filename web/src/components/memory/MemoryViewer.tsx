"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export default function MemoryViewer({ content }: Props) {
  return (
    <div className="prose prose-invert prose-sm max-w-none p-4 overflow-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
