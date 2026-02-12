"use client";

import { useState } from "react";
import Image from "next/image";

// Reusable RA3 Components
const RA3Button = ({ children, onClick, variant = "normal", className = "" }: any) => {
  const sprites = {
    normal: "14.png",
    hover: "6.png",
    active: "9.png",
    disabled: "22.png"
  };

  return (
    <button
      onClick={onClick}
      className={`relative px-6 py-3 font-bold ${className}`}
      style={{
        backgroundImage: `url('/ra3-assets/std_MouseButton/textures/${sprites[variant as keyof typeof sprites]}')`,
        backgroundSize: "100% 100%",
        imageRendering: "pixelated",
        color: variant === "disabled" ? "#6b7280" : "#fbbf24"
      }}
    >
      {children}
    </button>
  );
};

const RA3Panel = ({ children, faction = "soviet", className = "" }: any) => {
  const positions = {
    soviet: "0% 0%",
    allied: "33.33% 0%",
    empire: "66.66% 0%"
  };

  return (
    <div
      className={`relative p-8 ${className}`}
      style={{
        backgroundImage: "url('/ra3-assets/TacticalHUD/apt_TacticalHUD_1.png')",
        backgroundSize: "300% 100%",
        backgroundPosition: positions[faction as keyof typeof positions],
        imageRendering: "pixelated",
        minHeight: "400px"
      }}
    >
      {children}
    </div>
  );
};

export default function RA3UIKitPage() {
  const [activeTab, setActiveTab] = useState<"atlas" | "components" | "examples">("atlas");
  const [hoverSprite, setHoverSprite] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-black/90 border-b-2 border-yellow-600/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-5xl font-black uppercase mb-4" style={{
            color: "#fbbf24",
            textShadow: "0 0 20px rgba(251,191,36,0.6)"
          }}>
            RED ALERT 3 UI KIT
          </h1>
          <p className="text-gray-400">Atlas-based component library for web</p>

          {/* Tabs */}
          <div className="flex gap-4 mt-6">
            {["atlas", "components", "examples"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className="relative px-6 py-2 font-bold text-sm uppercase"
                style={{
                  backgroundImage: activeTab === tab
                    ? "url('/ra3-assets/std_MouseButton/textures/6.png')"
                    : "url('/ra3-assets/std_MouseButton/textures/14.png')",
                  backgroundSize: "100% 100%",
                  imageRendering: "pixelated",
                  color: activeTab === tab ? "#fbbf24" : "#9ca3af"
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-16">
        {activeTab === "atlas" && (
          <div className="space-y-16">
            <section>
              <h2 className="text-4xl font-bold mb-8 text-yellow-400">Texture Atlases</h2>
              <p className="text-gray-400 mb-8">
                All UI elements are packed into texture atlases. Use background-position or sprite sheets to extract individual components.
              </p>

              {/* Faction Panels Atlas */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold mb-4 text-gray-300">Tactical HUD Panels</h3>
                <code className="text-sm text-gray-500 block mb-4">
                  /ra3-assets/TacticalHUD/apt_TacticalHUD_1.png (1024×512)
                </code>
                <div className="relative bg-gray-900 p-4 rounded">
                  <Image
                    src="/ra3-assets/TacticalHUD/apt_TacticalHUD_1.png"
                    alt="Tactical HUD Atlas"
                    width={1024}
                    height={512}
                    className="w-full h-auto"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-800 p-3 rounded">
                      <div className="text-yellow-400 font-bold mb-1">Soviet (Left)</div>
                      <code className="text-xs text-gray-400">backgroundPosition: '0% 0%'</code>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <div className="text-blue-400 font-bold mb-1">Allied (Center)</div>
                      <code className="text-xs text-gray-400">backgroundPosition: '50% 0%'</code>
                    </div>
                    <div className="bg-gray-800 p-3 rounded">
                      <div className="text-red-400 font-bold mb-1">Empire (Right)</div>
                      <code className="text-xs text-gray-400">backgroundPosition: '100% 0%'</code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Command Buttons Atlas */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold mb-4 text-gray-300">Command Buttons</h3>
                <code className="text-sm text-gray-500 block mb-4">
                  /ra3-assets/TacticalHUDMainCommandBar/apt_TacticalHUDMainCommandBar_1.png
                </code>
                <div className="relative bg-gray-900 p-4 rounded">
                  <Image
                    src="/ra3-assets/TacticalHUDMainCommandBar/apt_TacticalHUDMainCommandBar_1.png"
                    alt="Command Bar Atlas"
                    width={512}
                    height={256}
                    className="w-full h-auto"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <div className="mt-4 bg-gray-800 p-3 rounded">
                    <div className="text-gray-300 font-bold mb-2">Individual sprites in textures/</div>
                    <div className="grid grid-cols-6 gap-2">
                      {[11, 13, 15, 18, 20, 22].map((num) => (
                        <div
                          key={num}
                          className="relative aspect-square bg-gray-700 rounded overflow-hidden group cursor-pointer"
                          onMouseEnter={() => setHoverSprite(`${num}.png`)}
                          onMouseLeave={() => setHoverSprite(null)}
                        >
                          <Image
                            src={`/ra3-assets/TacticalHUDMainCommandBar/textures/${num}.png`}
                            alt={`Sprite ${num}`}
                            fill
                            style={{ objectFit: "contain", imageRendering: "pixelated" }}
                            className="group-hover:brightness-125"
                          />
                        </div>
                      ))}
                    </div>
                    {hoverSprite && (
                      <code className="text-xs text-gray-400 block mt-2">
                        {hoverSprite}
                      </code>
                    )}
                  </div>
                </div>
              </div>

              {/* Build Queue Grids */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold mb-4 text-gray-300">Build Queue Grids</h3>
                <code className="text-sm text-gray-500 block mb-4">
                  /ra3-assets/TacticalHUDBuildQueuePage/apt_TacticalHUDBuildQueuePage_1.png
                </code>
                <div className="relative bg-gray-900 p-4 rounded">
                  <Image
                    src="/ra3-assets/TacticalHUDBuildQueuePage/apt_TacticalHUDBuildQueuePage_1.png"
                    alt="Build Queue Atlas"
                    width={512}
                    height={512}
                    className="w-full h-auto max-w-2xl mx-auto"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <div className="mt-4 text-sm text-gray-400">
                    Contains 3×3 grid variants for Soviet (top-left), Allied (top-right), and Empire (bottom-left)
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "components" && (
          <div className="space-y-16">
            <section>
              <h2 className="text-4xl font-bold mb-8 text-yellow-400">Reusable Components</h2>

              {/* Button Component */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold mb-4 text-gray-300">RA3Button</h3>
                <div className="bg-gray-900 rounded-lg p-6">
                  <div className="flex gap-4 mb-6">
                    <RA3Button variant="normal">NORMAL</RA3Button>
                    <RA3Button variant="hover">HOVER</RA3Button>
                    <RA3Button variant="active">ACTIVE</RA3Button>
                    <RA3Button variant="disabled">DISABLED</RA3Button>
                  </div>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-yellow-400 font-bold mb-2">View Code</summary>
                    <pre className="bg-black p-4 rounded text-xs overflow-x-auto">
{`const RA3Button = ({ children, variant = "normal" }) => {
  const sprites = {
    normal: "14.png",
    hover: "6.png",
    active: "9.png",
    disabled: "22.png"
  };

  return (
    <button
      style={{
        backgroundImage: \`url('/ra3-assets/std_MouseButton/textures/\${sprites[variant]}')\`,
        backgroundSize: "100% 100%",
        imageRendering: "pixelated"
      }}
    >
      {children}
    </button>
  );
};`}
                    </pre>
                  </details>
                </div>
              </div>

              {/* Panel Component */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold mb-4 text-gray-300">RA3Panel</h3>
                <div className="bg-gray-900 rounded-lg p-6">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {["soviet", "allied", "empire"].map((faction) => (
                      <RA3Panel key={faction} faction={faction} className="h-48">
                        <div className="text-center">
                          <div className="text-xl font-bold mb-2 uppercase"
                            style={{
                              color: faction === "soviet" ? "#fbbf24" : faction === "allied" ? "#60a5fa" : "#ef4444"
                            }}>
                            {faction}
                          </div>
                          <div className="text-sm text-gray-300">Content goes here</div>
                        </div>
                      </RA3Panel>
                    ))}
                  </div>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-yellow-400 font-bold mb-2">View Code</summary>
                    <pre className="bg-black p-4 rounded text-xs overflow-x-auto">
{`const RA3Panel = ({ children, faction = "soviet" }) => {
  const positions = {
    soviet: "0% 0%",
    allied: "33.33% 0%",
    empire: "66.66% 0%"
  };

  return (
    <div
      style={{
        backgroundImage: "url('/ra3-assets/TacticalHUD/apt_TacticalHUD_1.png')",
        backgroundSize: "300% 100%",
        backgroundPosition: positions[faction],
        imageRendering: "pixelated"
      }}
    >
      {children}
    </div>
  );
};`}
                    </pre>
                  </details>
                </div>
              </div>

              {/* Icon Grid */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold mb-4 text-gray-300">Command Icon Grid</h3>
                <div className="bg-gray-900 rounded-lg p-6">
                  <div className="grid grid-cols-6 gap-3 mb-6">
                    {[11, 13, 15, 18, 20, 22, 107, 109, 111, 113, 115, 105].map((num) => (
                      <button
                        key={num}
                        className="relative aspect-square bg-black/50 rounded hover:bg-black hover:scale-110 transition-all"
                      >
                        <Image
                          src={`/ra3-assets/TacticalHUDMainCommandBar/textures/${num}.png`}
                          alt=""
                          fill
                          style={{ objectFit: "contain", imageRendering: "pixelated" }}
                          className="p-2"
                        />
                      </button>
                    ))}
                  </div>
                  <div className="text-sm text-gray-400">
                    Interactive command buttons with hover effects
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "examples" && (
          <div className="space-y-16">
            <section>
              <h2 className="text-4xl font-bold mb-8 text-yellow-400">Integration Examples</h2>

              {/* Game HUD Example */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold mb-4 text-gray-300">Game HUD Layout</h3>
                <div className="relative bg-gray-950 rounded-lg overflow-hidden border-2 border-yellow-600/30"
                  style={{ aspectRatio: "16/9" }}>
                  {/* Top bar */}
                  <div className="absolute top-0 left-0 right-0 h-16 bg-black/90 border-b border-yellow-600/50 flex items-center px-6 gap-4">
                    <div className="flex gap-2">
                      {[11, 13, 15].map((num) => (
                        <div key={num} className="relative w-10 h-10">
                          <Image
                            src={`/ra3-assets/TacticalHUDMainCommandBar/textures/${num}.png`}
                            alt=""
                            fill
                            style={{ objectFit: "contain", imageRendering: "pixelated" }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 text-center text-yellow-400 font-bold">
                      SPRING 1901 - DIPLOMACY PHASE
                    </div>
                    <div className="text-gray-400 font-mono">05:32</div>
                  </div>

                  {/* Bottom left panel */}
                  <div className="absolute bottom-4 left-4 w-64 h-48">
                    <RA3Panel faction="soviet" className="h-full">
                      <div className="text-yellow-400 font-bold mb-2">FRANCE</div>
                      <div className="text-sm space-y-1">
                        <div>Supply Centers: 3</div>
                        <div>Units: 3</div>
                        <div>Orders: 2/3</div>
                      </div>
                    </RA3Panel>
                  </div>
                </div>
              </div>

              {/* Modal Example */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold mb-4 text-gray-300">Dialog Modal</h3>
                <div className="relative w-full max-w-2xl mx-auto">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src="/ra3-assets/YesNoDialog/textures/8.png"
                      alt="Dialog"
                      fill
                      style={{ objectFit: "fill", imageRendering: "pixelated" }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-16">
                      <h4 className="text-3xl font-bold mb-6 text-yellow-400">CONFIRM ACTION</h4>
                      <p className="text-center text-gray-300 mb-8">
                        Are you sure you want to proceed with this operation?
                      </p>
                      <div className="flex gap-4">
                        <RA3Button variant="hover">CONFIRM</RA3Button>
                        <RA3Button variant="disabled">CANCEL</RA3Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-32 py-12 bg-black border-t-2 border-yellow-600/30">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <p className="text-gray-400 mb-4">
            Command & Conquer: Red Alert 3 UI SDK Assets
          </p>
          <div className="flex gap-8 justify-center">
            <a href="/ra3-assets" className="text-yellow-400 hover:text-yellow-300">
              Browse All Assets →
            </a>
            <a href="/" className="text-gray-400 hover:text-gray-300">
              ← Diplomacy Viewer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
