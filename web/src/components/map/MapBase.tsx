"use client";

interface MapBaseProps {
  svgContent: string;
  className?: string;
}

export default function MapBase({ svgContent, className }: MapBaseProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
