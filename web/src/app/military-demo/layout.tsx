// web/src/app/military-demo/layout.tsx
"use client";

import { useEffect, useState } from "react";

export default function MilitaryDemoLayout({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    const startMSW = async () => {
      if (typeof window !== "undefined") {
        const { worker } = await import("./mocks/browser");
        await worker.start({
          onUnhandledRequest: "bypass", // Don't warn about unhandled requests
          quiet: false, // Log MSW activity for debugging
        });
        setMswReady(true);
      }
    };

    startMSW();
  }, []);

  if (!mswReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-[#ff9500] text-sm uppercase tracking-wider">
          Initializing Mock Service Worker...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
