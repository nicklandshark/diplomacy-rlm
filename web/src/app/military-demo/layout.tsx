// web/src/app/military-demo/layout.tsx
"use client";

import { useEffect, useState } from "react";

export default function MilitaryDemoLayout({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    const shouldUseMSW = (() => {
      if (typeof window === "undefined") return false;
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("msw") === "1") return true;
      if (qs.get("msw") === "0") return false;
      return process.env.NEXT_PUBLIC_USE_MSW === "1";
    })();

    if (!shouldUseMSW) {
      setMswReady(true);
      return;
    }

    const startMSW = async () => {
      if (typeof window !== "undefined") {
        const { worker } = await import("./mocks/browser");
        await worker.start({
          serviceWorker: {
            url: "/mockServiceWorker.js",
          },
          onUnhandledRequest: "bypass",
          quiet: false, // Log all MSW activity
        });
        console.log("[MSW] Service worker started successfully");
        setMswReady(true);
      }
    };

    startMSW().catch((err) => {
      console.error("[MSW] Failed to start:", err);
      // Start anyway to not block the app
      setMswReady(true);
    });
  }, []);

  if (!mswReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-[#ff9500] text-sm uppercase tracking-wider">
          Initializing MSW...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
