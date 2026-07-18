export type MemberOrganizationRole = "MEMBER" | "OWNER";

export type MemberOrganization = {
  id: string;
  joinedAt: string;
  memberCount: number;
  memberLimit: number;
  name: string;
  role: MemberOrganizationRole;
  slug: string;
};

export type MemberOrganizationsResponse = {
  organizations: MemberOrganization[];
  user: {
    email: string;
    id: string;
    name: string;
  };
};

export type MemberAvailability = {
  available: false;
  reason: string;
  state?: "not_configured";
};

export type MemberOverviewResponse = {
  availability: {
    subscription: MemberAvailability;
  };
  members: Array<{
    id: string;
    joinedAt: string;
    name: string;
    role: MemberOrganizationRole;
  }>;
  organization: {
    id: string;
    memberCount: number;
    memberLimit: number;
    name: string;
    role: MemberOrganizationRole;
    slug: string;
  };
  recentTasks: Array<{
    assignedTo: { id: string; name: string } | null;
    dueDate: string | null;
    id: string;
    status: string;
    title: string;
    updatedAt: string;
  }>;
  taskSummary: {
    done: number;
    inProgress: number;
    overdue: number;
    todo: number;
    total: number;
  };
  workspace: {
    businessHealth: {
      score: number;
      status: "stable" | "watch" | "attention";
      summary: string;
    } | null;
    findingsAndRecommendations: Array<{
      detail: string;
      id: string;
      recommendation: string;
      severity: "information" | "opportunity" | "risk";
      title: string;
    }>;
    monthlyOperatingSummary: {
      accomplishments: string[];
      headline: string;
      nextPriorities: string[];
      period: string;
      summary: string;
    } | null;
    objectivesAndPriorities: Array<{
      id: string;
      priority: "high" | "medium" | "low";
      progress: number;
      status: "planned" | "active" | "complete";
      title: string;
    }>;
    publishedAt: string;
    version: number;
  } | null;
};

const memberAuthPaths = [
  "/member/sign-in",
  "/member/password-reset",
  "/member/verify-email"
];

export function safeMemberReturnPath(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate) {
    return "/member";
  }

  try {
    const base = "https://entral.invalid";
    const url = new URL(candidate, base);
    const isProtectedMemberPath = url.pathname === "/member" || url.pathname.startsWith("/member/");
    const isAuthenticationPath = memberAuthPaths.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`));

    if (url.origin !== base || !isProtectedMemberPath || isAuthenticationPath) {
      return "/member";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/member";
  }
}

export function memberSignInPath(returnTo = "/member") {
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
