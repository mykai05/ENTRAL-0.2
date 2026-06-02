import { prisma } from "../db.js";
import { type PolicyRule, policyRuleSchema } from "../schemas.js";
import { parseSecureJson, stringifySecureJson } from "./secureJson.js";

export type AgentPolicySubject = {
  action: string;
  agentId: string;
  payload: {
    context?: string;
    instructions: string;
    sourceId?: string;
    sourceType?: string;
    webhookUrl?: string;
  };
  scheduled?: boolean;
  taskId?: string | null;
  title: string;
  userId: string;
};

export type PolicyViolation = {
  message: string;
  policyId: string;
  policyName: string;
  severity: string;
};

type PolicyRecord = {
  effect: string;
  enabled: boolean;
  id: string;
  name: string;
  ruleJson: string;
  severity: string;
};

const defaultPolicies: Array<{
  description: string;
  name: string;
  rule: PolicyRule;
  severity: string;
}> = [
  {
    description: "Stops agents from handling obvious secret exfiltration requests.",
    name: "Block credential exfiltration",
    rule: {
      kind: "blocked_keywords",
      keywords: ["password", "api key", "secret token", "private key"]
    },
    severity: "critical"
  },
  {
    description: "Prevents agents from targeting common internal metadata endpoints.",
    name: "Block internal metadata domains",
    rule: {
      kind: "blocked_domains",
      domains: ["169.254.169.254", "metadata.google.internal", "localhost"]
    },
    severity: "high"
  },
  {
    description: "Caps agent task volume to keep runaway scheduled work visible.",
    name: "Default per-agent quota",
    rule: {
      kind: "agent_quota",
      maxTasks: 50,
      windowMinutes: 60
    },
    severity: "medium"
  }
];

function taskText(subject: AgentPolicySubject) {
  return [
    subject.title,
    subject.action,
    subject.payload.instructions,
    subject.payload.context,
    subject.payload.sourceId,
    subject.payload.sourceType,
    subject.payload.webhookUrl
  ].filter(Boolean).join(" ").toLowerCase();
}

export function extractHosts(input: string) {
  const matches = input.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  const hosts = new Set<string>();

  for (const match of matches) {
    try {
      hosts.add(new URL(match).hostname.toLowerCase());
    } catch {
      continue;
    }
  }

  return [...hosts];
}

function hostMatches(host: string, blockedDomain: string) {
  const normalized = blockedDomain.toLowerCase();
  return host === normalized || host.endsWith(`.${normalized}`);
}

async function evaluateRule(policy: PolicyRecord, rule: PolicyRule, subject: AgentPolicySubject) {
  if (rule.kind === "blocked_keywords") {
    const text = taskText(subject);
    const matched = rule.keywords.find((keyword) => text.includes(keyword.toLowerCase()));

    if (matched) {
      return `Matched blocked keyword "${matched}".`;
    }
  }

  if (rule.kind === "blocked_domains") {
    const hosts = extractHosts(taskText(subject));
    const matched = hosts.find((host) => rule.domains.some((domain) => hostMatches(host, domain)));

    if (matched) {
      return `Matched blocked domain "${matched}".`;
    }
  }

  if (rule.kind === "agent_quota") {
    const since = new Date(Date.now() - rule.windowMinutes * 60 * 1000);
    const taskCount = await prisma.agentTask.count({
      where: {
        agentId: subject.agentId,
        createdAt: { gte: since }
      }
    });

    if (taskCount >= rule.maxTasks) {
      return `Agent quota exceeded: ${taskCount}/${rule.maxTasks} tasks in ${rule.windowMinutes} minutes.`;
    }
  }

  if (rule.kind === "manual_approval_required" && subject.scheduled && rule.actions.some((action) => action === subject.action)) {
    return `Scheduled ${subject.action} tasks require manual approval.`;
  }

  return null;
}

export async function evaluateAgentPolicies(subject: AgentPolicySubject) {
  const policies = await prisma.policy.findMany({
    where: { enabled: true },
    orderBy: { createdAt: "asc" }
  });
  const violations: PolicyViolation[] = [];

  for (const policy of policies) {
    const rule = policyRuleSchema.parse(parseSecureJson(policy.ruleJson));
    const message = await evaluateRule(policy, rule, subject);

    if (message && policy.effect === "block") {
      violations.push({
        message,
        policyId: policy.id,
        policyName: policy.name,
        severity: policy.severity
      });
    }
  }

  return {
    allowed: violations.length === 0,
    checkedPolicies: policies.length,
    violations
  };
}

export async function ensureDefaultPolicies() {
  const existing = await prisma.policy.count();

  if (existing > 0) {
    return;
  }

  await prisma.policy.createMany({
    data: defaultPolicies.map((policy) => ({
      description: policy.description,
      enabled: true,
      effect: "block",
      name: policy.name,
      ruleJson: stringifySecureJson(policy.rule),
      severity: policy.severity
    }))
  });
}
