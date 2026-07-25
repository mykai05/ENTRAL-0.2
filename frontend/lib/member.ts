export type {
  MemberAvailability,
  MemberCommandHierarchy,
  MemberCommandNode,
  MemberCommandRank,
  MemberCommandStatus,
  MemberOrganization,
  MemberOrganizationRole,
  MemberOrganizationsResponse,
  MemberOverviewResponse
} from "@entral/contracts";

const memberAuthPaths = [
  "/member/sign-in",
  "/member/password-reset",
  "/member/verify-email"
];

export function safeMemberReturnPath(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate) {
    return "/member/dashboard";
  }

  try {
    const base = "https://entral.invalid";
    const url = new URL(candidate, base);
    const isProtectedMemberPath = url.pathname === "/member" || url.pathname.startsWith("/member/");
    const isAuthenticationPath = memberAuthPaths.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`));

    if (url.origin !== base || !isProtectedMemberPath || isAuthenticationPath) {
      return "/member/dashboard";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/member/dashboard";
  }
}

export function memberSignInPath(returnTo = "/member/dashboard") {
  return `/member/sign-in?returnTo=${encodeURIComponent(safeMemberReturnPath(returnTo))}`;
}

export function sovereignProtocolUrl(value = process.env.NEXT_PUBLIC_SP_COMMAND_URL) {
  try {
    const url = new URL(value?.trim() || "https://spcommand.com");
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : "https://spcommand.com";
  } catch {
    return "https://spcommand.com";
  }
}
