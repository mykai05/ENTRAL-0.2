export type AgentCapabilityRisk = "standard" | "sensitive" | "restricted";

export type AgentCapabilityBlueprint = {
  allowedActions: string[];
  description: string;
  id: string;
  label: string;
  requiredControls: string[];
  risk: AgentCapabilityRisk;
};

export const agentCapabilityBlueprints: AgentCapabilityBlueprint[] = [
  {
    allowedActions: ["research", "internet_research", "business_discovery"],
    description: "Research across public search engines, websites, maps data, directories, and approved data APIs.",
    id: "public-research",
    label: "Public web research",
    requiredControls: ["robots/terms review", "rate limits", "source attribution"],
    risk: "standard"
  },
  {
    allowedActions: ["governed_deep_research"],
    description: "Restricted-network research connector for Tor or similar networks. This is a policy-gated planning surface, not an unrestricted crawler.",
    id: "restricted-network-research",
    label: "Restricted network research",
    requiredControls: ["legal scope", "admin approval", "audit log", "manual review", "egress isolation"],
    risk: "restricted"
  },
  {
    allowedActions: ["business_discovery", "sales_outreach", "internet_research"],
    description: "Find businesses, enrich leads, identify missing websites, score opportunities, and route compliant outreach.",
    id: "business-discovery",
    label: "Business discovery",
    requiredControls: ["contact policy", "domain allowlist", "quota"],
    risk: "sensitive"
  },
  {
    allowedActions: ["commerce_operations", "automation_review", "external_tool_call"],
    description: "Coordinate Shopify setup, catalog work, optimization experiments, fulfillment checks, reporting, and commerce tools.",
    id: "shopify-operations",
    label: "Shopify operations",
    requiredControls: ["credential vault", "approval checkpoints", "rollback plan"],
    risk: "sensitive"
  },
  {
    allowedActions: ["app_build", "automation_review", "external_tool_call"],
    description: "Delegate design, code, QA, deployment, monitoring, and iteration work for web and mobile application builds.",
    id: "app-builder",
    label: "App builder",
    requiredControls: ["test gate", "deployment approval", "secret redaction"],
    risk: "standard"
  },
  {
    allowedActions: ["brand_operations", "commerce_operations", "sales_outreach"],
    description: "Coordinate clothing brand strategy, product concepts, sourcing research, creative direction, marketing, and fulfillment workflows.",
    id: "brand-operations",
    label: "Brand operations",
    requiredControls: ["supplier verification", "brand safety", "spend limits"],
    risk: "sensitive"
  },
  {
    allowedActions: ["browser_automation", "external_tool_call", "automation_review"],
    description: "Launch browser automation, Playwright scripts, webhooks, APIs, queues, and internal tools through governed execution policies.",
    id: "tool-orchestration",
    label: "Tool orchestration",
    requiredControls: ["sandboxing", "safe URL checks", "rate limits", "observability"],
    risk: "sensitive"
  },
  {
    allowedActions: ["general", "chat_summary", "automation_review"],
    description: "Enforce quotas, approvals, audit trails, domain controls, user consent, and safe execution boundaries before action.",
    id: "governance",
    label: "Governance layer",
    requiredControls: ["policy engine", "audit hash", "kill switch"],
    risk: "standard"
  }
];

export function describeAgentCapabilities(capabilityIds: string[]) {
  const selected = agentCapabilityBlueprints.filter((capability) => capabilityIds.includes(capability.id));
  const capabilities = selected.length > 0 ? selected : agentCapabilityBlueprints.filter((capability) => capability.id === "governance");

  return capabilities.map((capability) => [
    `${capability.label} (${capability.risk})`,
    capability.description,
    `Allowed actions: ${capability.allowedActions.join(", ")}`,
    `Required controls: ${capability.requiredControls.join(", ")}`
  ].join(" | "));
}
