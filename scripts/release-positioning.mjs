export const publicPositioningRoots = [
  "README.md",
  "DEPLOYMENT.md",
  "frontend/app/layout.tsx",
  "frontend/app/page.tsx",
  "frontend/app/not-found.tsx",
  "e2e"
];

export const forbiddenPositioningPatterns = [
  { label: "dark web", pattern: /\bdark web\b/i },
  { label: "Tor", pattern: /\bTor\b/ },
  { label: "full autonomy", pattern: /\bfull autonomy\b/i },
  { label: "fully autonomous", pattern: /\bfully autonomous\b/i },
  { label: "completely autonomous", pattern: /\bcompletely autonomous\b/i },
  { label: "autonomous command workspace", pattern: /\bautonomous command workspace\b/i },
  { label: "runs your entire business", pattern: /\bruns your entire business\b/i },
  { label: "automated Shopify", pattern: /\bautomated Shopify\b/i },
  { label: "Shopify launching", pattern: /\bShopify launching\b/i }
];

export function findForbiddenPositioning(text) {
  return forbiddenPositioningPatterns.filter(({ pattern }) => pattern.test(text));
}
