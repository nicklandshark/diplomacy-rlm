"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ComponentAssets {
  name: string;
  overview: string[];
  textures: string[];
  totalCount: number;
}

// Categorize components into logical groups for the sidebar
const CATEGORIES: Record<string, { label: string; match: (name: string) => boolean }> = {
  hud: { label: "HUD & Tactical", match: n => n.startsWith("Tactical") || n.startsWith("HUD") },
  menus: { label: "Menus & Screens", match: n => /^fe[gs]?_m_/.test(n) || n === "LoadScreen" },
  controls: { label: "Controls & Inputs", match: n => n.startsWith("std_") || n === "StandardCommandButton" },
  shared: { label: "Shared & Libs", match: n => /shared|lib|Global|skins/i.test(n) },
  dialogs: { label: "Dialogs & Popups", match: n => /Dialog|Popup|NotificationPopUp|HelpBox|InfoBox|Chat/i.test(n) },
  misc: { label: "Other", match: () => true },
};

function categorize(name: string): string {
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (key !== "misc" && cat.match(name)) return key;
  }
  return "misc";
}

// Human-readable label from component directory name
function prettyName(name: string): string {
  return name
    .replace(/^(apt_|fe[gs]?_[ms]?_|std_[Mm]ouse|ig_)/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 cursor-pointer" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="max-w-full max-h-[85vh] object-contain rounded border border-gray-700" style={{ imageRendering: "pixelated" }} />
        <div className="absolute top-2 right-2 bg-gray-900/80 text-gray-400 text-xs px-2 py-1 rounded">
          ESC to close
        </div>
        <div className="text-center text-gray-500 text-xs mt-2 font-mono">
          {src.split("/").slice(-2).join("/")}
        </div>
      </div>
    </div>
  );
}

function AssetImage({ src, onClick }: { src: string; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const filename = src.split("/").pop() || "";

  if (errored) return null;

  return (
    <button
      onClick={onClick}
      className="group relative bg-gray-900 border border-gray-800 rounded hover:border-gray-600 transition-colors overflow-hidden flex flex-col items-center"
    >
      <div className="w-full aspect-square flex items-center justify-center p-1 bg-[#1a1a2e]">
        {!loaded && <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={filename}
          className={`max-w-full max-h-full object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
          style={{ imageRendering: "pixelated" }}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      </div>
      <div className="w-full px-1 py-0.5 text-[10px] text-gray-500 font-mono truncate text-center bg-gray-900/80">
        {filename}
      </div>
    </button>
  );
}

function ComponentSection({ comp, onImageClick }: { comp: ComponentAssets; onImageClick: (src: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const PREVIEW_LIMIT = 24;
  const allImages = [...comp.overview, ...comp.textures];
  const visible = showAll ? allImages : allImages.slice(0, PREVIEW_LIMIT);
  const hasMore = allImages.length > PREVIEW_LIMIT;

  return (
    <div className="mb-8" id={`comp-${comp.name}`}>
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-200">{prettyName(comp.name)}</h3>
        <span className="text-[11px] text-gray-600 font-mono">{comp.name}</span>
        <span className="text-[11px] text-gray-500">
          {comp.overview.length > 0 && `${comp.overview.length} overview`}
          {comp.overview.length > 0 && comp.textures.length > 0 && " + "}
          {comp.textures.length > 0 && `${comp.textures.length} textures`}
        </span>
      </div>

      {/* Overview images (full width) */}
      {comp.overview.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {comp.overview.map(src => (
            <button
              key={src}
              onClick={() => onImageClick(src)}
              className="relative bg-[#1a1a2e] border border-gray-800 rounded hover:border-gray-600 transition-colors overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="max-h-40 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 text-[10px] text-gray-500 font-mono px-1 py-0.5 text-center truncate">
                {src.split("/").pop()}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Texture grid */}
      {comp.textures.length > 0 && (
        <>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))" }}>
            {(showAll ? comp.textures : comp.textures.slice(0, PREVIEW_LIMIT - comp.overview.length)).map(src => (
              <AssetImage key={src} src={src} onClick={() => onImageClick(src)} />
            ))}
          </div>
          {hasMore && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Show all {allImages.length} assets ({allImages.length - PREVIEW_LIMIT} more)
            </button>
          )}
        </>
      )}
    </div>
  );
}

function RetrofitGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/50 hover:bg-gray-900 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-200">Retrofit Guide: RA3 UI &rarr; Diplomacy App</span>
        <span className="text-gray-500 text-xs">{open ? "collapse" : "expand"}</span>
      </button>
      {open && (
        <div className="px-4 py-4 text-sm text-gray-300 space-y-4 leading-relaxed">
          <div>
            <h4 className="text-gray-100 font-semibold mb-1">Overview</h4>
            <p className="text-gray-400">
              The RA3 SDK UI pack contains 36 Flash-based UI component modules originally built for
              Red Alert 3. Each module includes compiled .apt/.flm files (Flash bytecode), .tac geometry,
              and TGA texture atlases. The textures have been converted to PNG for web use.
            </p>
          </div>

          <div>
            <h4 className="text-gray-100 font-semibold mb-1">Asset Categories for Diplomacy</h4>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-1 text-gray-400 font-medium">RA3 Component</th>
                  <th className="text-left py-1 text-gray-400 font-medium">Diplomacy Use</th>
                  <th className="text-left py-1 text-gray-400 font-medium">Priority</th>
                </tr>
              </thead>
              <tbody className="text-gray-500">
                <tr className="border-b border-gray-800/50"><td className="py-1">TacticalHUDRadar</td><td>Map overlay frame / minimap chrome</td><td className="text-green-400">High</td></tr>
                <tr className="border-b border-gray-800/50"><td className="py-1">fe_shared_mainMenuLib</td><td>Navigation bar backgrounds, panel frames</td><td className="text-green-400">High</td></tr>
                <tr className="border-b border-gray-800/50"><td className="py-1">StandardCommandButton</td><td>Order submission buttons, action buttons</td><td className="text-green-400">High</td></tr>
                <tr className="border-b border-gray-800/50"><td className="py-1">TacticalHUDSelectionDetails</td><td>Power detail panels, unit info cards</td><td className="text-yellow-400">Medium</td></tr>
                <tr className="border-b border-gray-800/50"><td className="py-1">InGameChat</td><td>Diplomacy message thread chrome</td><td className="text-yellow-400">Medium</td></tr>
                <tr className="border-b border-gray-800/50"><td className="py-1">skins</td><td>Faction-specific theme variants</td><td className="text-yellow-400">Medium</td></tr>
                <tr className="border-b border-gray-800/50"><td className="py-1">TacticalHUDMainCommandBar</td><td>Bottom command bar / phase controls</td><td className="text-yellow-400">Medium</td></tr>
                <tr className="border-b border-gray-800/50"><td className="py-1">std_mouseScrollbar</td><td>Custom scrollbar styling</td><td className="text-gray-500">Low</td></tr>
                <tr><td className="py-1">VerticalScrollBar</td><td>Activity feed scrollbar</td><td className="text-gray-500">Low</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="text-gray-100 font-semibold mb-1">Integration Strategy</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-400">
              <li>
                <strong className="text-gray-300">9-slice panel frames</strong> &mdash; Extract border/corner textures from overview images.
                Use CSS <code className="text-blue-400 bg-gray-800 px-1 rounded">border-image-slice</code> for scalable panel backgrounds
                (similar to how wc3ui.banteg.xyz renders WC3 frame textures).
              </li>
              <li>
                <strong className="text-gray-300">Button state sprites</strong> &mdash; Individual numbered textures often represent
                hover/active/disabled states. Map these to CSS <code className="text-blue-400 bg-gray-800 px-1 rounded">:hover</code> and
                <code className="text-blue-400 bg-gray-800 px-1 rounded">:active</code> pseudo-classes.
              </li>
              <li>
                <strong className="text-gray-300">Texture atlas extraction</strong> &mdash; The XML PackedTextureImage entries define
                sprite coordinates within atlas images. A build-time script can auto-generate CSS sprite sheets
                or individual cropped PNGs.
              </li>
              <li>
                <strong className="text-gray-300">Theme per faction</strong> &mdash; RA3 skins module has faction-specific variants.
                Map these to Diplomacy power colors for themed UI per power.
              </li>
              <li>
                <strong className="text-gray-300">Pixel-art rendering</strong> &mdash; Use <code className="text-blue-400 bg-gray-800 px-1 rounded">image-rendering: pixelated</code> for
                sharp upscaling of small textures. Match the retro-RTS aesthetic.
              </li>
            </ol>
          </div>

          <div>
            <h4 className="text-gray-100 font-semibold mb-1">File Format Reference</h4>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-1 text-gray-400 font-medium">Extension</th>
                  <th className="text-left py-1 text-gray-400 font-medium">Format</th>
                  <th className="text-left py-1 text-gray-400 font-medium">Web Usable</th>
                </tr>
              </thead>
              <tbody className="text-gray-500">
                <tr className="border-b border-gray-800/50"><td className="py-1 font-mono">.tga &rarr; .png</td><td>Texture (converted)</td><td className="text-green-400">Yes</td></tr>
                <tr className="border-b border-gray-800/50"><td className="py-1 font-mono">.apt</td><td>Flash compiled UI</td><td className="text-red-400">No (reference only)</td></tr>
                <tr className="border-b border-gray-800/50"><td className="py-1 font-mono">.flm</td><td>Flash movie</td><td className="text-red-400">No</td></tr>
                <tr className="border-b border-gray-800/50"><td className="py-1 font-mono">.xml</td><td>Asset declarations</td><td className="text-yellow-400">Metadata only</td></tr>
                <tr className="border-b border-gray-800/50"><td className="py-1 font-mono">.ru</td><td>Geometry data</td><td className="text-red-400">No</td></tr>
                <tr><td className="py-1 font-mono">.tac</td><td>Compiled geometry</td><td className="text-red-400">No</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="text-gray-100 font-semibold mb-1">Quick Start</h4>
            <p className="text-gray-400">
              Browse the assets below. Click any image to zoom. Start with the <strong className="text-gray-300">High priority</strong> components
              in the table above. The overview (apt_*) images show the full assembled UI panel, while the numbered
              textures in each component are the individual sprites that compose it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RA3AssetsPage() {
  const [components, setComponents] = useState<ComponentAssets[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ra3-assets")
      .then(r => r.json())
      .then(data => {
        setComponents(data.components || []);
        setTotalAssets(data.totalAssets || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  // Group components by category
  const grouped = components.reduce<Record<string, ComponentAssets[]>>((acc, comp) => {
    const cat = categorize(comp.name);
    (acc[cat] ||= []).push(comp);
    return acc;
  }, {});

  // Filter by search
  const matchSearch = (comp: ComponentAssets) =>
    !search || comp.name.toLowerCase().includes(search.toLowerCase()) ||
    prettyName(comp.name).toLowerCase().includes(search.toLowerCase());

  const filteredComponents = activeCategory
    ? (grouped[activeCategory] || []).filter(matchSearch)
    : components.filter(matchSearch);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100 mb-1">RA3 SDK UI Assets</h1>
        <p className="text-sm text-gray-500">
          {totalAssets} textures across {components.length} components &mdash; converted from Red Alert 3 SDK UI ScreensPack
        </p>
      </div>

      {/* Retrofit Guide */}
      <RetrofitGuide />

      {/* Controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search components..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-600 w-64"
        />

        <button
          onClick={() => setActiveCategory(null)}
          className={`px-2.5 py-1 rounded text-xs transition-colors ${
            !activeCategory ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          All ({components.length})
        </button>

        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const count = (grouped[key] || []).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(activeCategory === key ? null : key)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                activeCategory === key ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Sidebar + Content layout */}
      <div className="flex gap-4">
        {/* Component sidebar */}
        <div className="w-52 flex-shrink-0 hidden lg:block">
          <div className="sticky top-4 space-y-0.5 max-h-[calc(100vh-8rem)] overflow-y-auto text-xs">
            {filteredComponents.map(comp => (
              <a
                key={comp.name}
                href={`#comp-${comp.name}`}
                className="block px-2 py-1 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-800/50 transition-colors truncate"
                title={comp.name}
              >
                <span className="text-gray-400">{prettyName(comp.name)}</span>
                <span className="text-gray-700 ml-1">({comp.totalCount})</span>
              </a>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0" ref={contentRef}>
          {filteredComponents.length === 0 ? (
            <div className="text-gray-500 text-sm py-8 text-center">
              No components match your search.
            </div>
          ) : (
            filteredComponents.map(comp => (
              <ComponentSection key={comp.name} comp={comp} onImageClick={setLightboxSrc} />
            ))
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={closeLightbox} />}
    </div>
  );
}
