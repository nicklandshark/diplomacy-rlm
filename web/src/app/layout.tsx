import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diplomacy RLM Viewer",
  description: "Game viewer for Diplomacy RLM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <nav className="border-b border-gray-800 px-6 py-3">
          <a href="/" className="text-lg font-semibold text-gray-100 hover:text-white">
            Diplomacy RLM Viewer
          </a>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
