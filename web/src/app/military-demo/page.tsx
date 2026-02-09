// web/src/app/military-demo/page.tsx
"use client";

import { useState } from "react";

// Simple panel component for demo structure
function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-[#2a2a2a] bg-[#1a1a1a] rounded ${className}`}>
      <div className="border-b border-[#2a2a2a] bg-[#0f0f0f] px-4 py-2">
        <h2 className="text-xs font-bold tracking-wider text-[#ff9500] uppercase">{title}</h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export default function MilitaryDemoPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] p-4">
      <div className="max-w-[1920px] mx-auto">
        {/* Top Navigation */}
        <div className="mb-4">
          <Panel title="GAME CONTROL">
            <div className="text-center text-sm text-[#808080]">Navigation Bar Placeholder</div>
          </Panel>
        </div>

        {/* Main 3-Column Layout */}
        <div className="grid grid-cols-[320px_1fr_380px] gap-4">
          {/* Left Sidebar */}
          <div className="space-y-4">
            <Panel title="ORDERS">
              <div className="text-sm text-[#808080]">Left sidebar placeholder</div>
            </Panel>
          </div>

          {/* Center Map */}
          <div>
            <Panel title="TACTICAL MAP">
              <div className="aspect-[4/3] flex items-center justify-center">
                <div className="text-sm text-[#808080]">Map Placeholder</div>
              </div>
            </Panel>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <Panel title="ACTIVITY FEED">
              <div className="text-sm text-[#808080]">Right sidebar placeholder</div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
