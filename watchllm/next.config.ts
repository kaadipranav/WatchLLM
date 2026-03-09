import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Proxy API calls to the FastAPI backend during dev. */
  async rewrites() {
    const backend = process.env.WATCHLLM_API_URL ?? "http://127.0.0.1:8000";
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/health", destination: `${backend}/health` },
    ];
  },
};

export default nextConfig;
