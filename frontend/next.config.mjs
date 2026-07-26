import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {(phase: string) => import('next').NextConfig} */
export default function nextConfig(phase) {
  const configuredAssetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX?.replace(/\/$/, "");
  const assetPrefix = configuredAssetPrefix
    || (process.env.NODE_ENV === "production" ? "https://entral-0-2-frontend.vercel.app" : undefined);

  return {
    assetPrefix,
    devIndicators: false,
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    async rewrites() {
      const apiProxyUrl = process.env.API_PROXY_URL?.replace(/\/$/, "");

      if (!apiProxyUrl) {
        return [];
      }

      return [
        {
          source: "/member/api/v1/:path*",
          destination: `${apiProxyUrl}/api/v1/:path*`
        },
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
