import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {(phase: string) => import('next').NextConfig} */
export default function nextConfig(phase) {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    async rewrites() {
      const apiProxyUrl = process.env.API_PROXY_URL?.replace(/\/$/, "");

      if (!apiProxyUrl) {
        return [];
      }

      return [
        {
          source: "/api/v1/:path*",
          destination: `${apiProxyUrl}/api/v1/:path*`
        },
        {
          source: "/health",
          destination: `${apiProxyUrl}/health`
        }
      ];
    }
  };
}
