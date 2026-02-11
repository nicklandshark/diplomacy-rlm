import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diplomacy RLM Viewer",
  description: "Game viewer for Diplomacy RLM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-ui-sans bg-gray-950 text-gray-100 min-h-screen">
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
