import path from "path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// 允许在 monorepo 根目录放置 .env.local（02-agent-writing-studio/.env.local）
const monorepoRoot = path.resolve(__dirname, "../..");
loadEnvConfig(monorepoRoot);
loadEnvConfig(__dirname);

const nextConfig: NextConfig = {
  transpilePackages: ["@hello-agent/shared"],
};

export default nextConfig;
