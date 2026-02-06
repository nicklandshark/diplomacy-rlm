import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    GAMES_DIR: process.env.GAMES_DIR || "../test_game_outputs",
    LIVE_API_URL: process.env.LIVE_API_URL || "",
  },
  output: "standalone",
};

export default nextConfig;
