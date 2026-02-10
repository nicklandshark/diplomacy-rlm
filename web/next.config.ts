import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "path";

// Next.js only auto-loads .env from its own directory (web/).
// Explicitly load the project root .env so API keys (OPENROUTER_API_KEY, etc.)
// are available to the server-side code and spawned child processes.
config({ path: resolve(process.cwd(), "..", ".env") });

const nextConfig: NextConfig = {
  env: {
    GAMES_DIR: process.env.GAMES_DIR || "../runs",
    LIVE_API_URL: process.env.LIVE_API_URL || "",
  },
  output: "standalone",
};

export default nextConfig;
