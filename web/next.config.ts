import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    GAMES_DIR: process.env.GAMES_DIR || "../runs",
    LIVE_API_URL: process.env.LIVE_API_URL || "",
  },
  output: "standalone",
};

export default nextConfig;
