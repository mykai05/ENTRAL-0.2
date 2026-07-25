import type { MemberCommandHierarchy, MemberCommandNode } from "./member";

const marshals = [
  ["portfolio-marshal", "Portfolio Marshal"],
  ["intelligence-marshal", "Intelligence Marshal"],
  ["operations-marshal", "Operations Marshal"],
  ["growth-marshal", "Growth Marshal"],
  ["governance-marshal", "Governance Marshal"]
] as const;

const soldiers = [
  "Market Research Soldier",
  "Business Analysis Soldier",
  "Planning Soldier",
  "Opportunity Soldier",
  "Workflow Soldier",
  "Delivery Soldier",
  "Quality Soldier",
  "Capacity Soldier",
  "Positioning Soldier",
  "Pipeline Soldier",
  "Client Success Soldier",
  "Retention Soldier",
  "Evidence Soldier",
  "Approval Soldier",
  "Risk Soldier",
  "Audit Soldier"
] as const;

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** A member-safe topology containing no prompts, tools, logs, or internal routing state. */
export function createMemberStarterHierarchy(organizationName: string): MemberCommandHierarchy {
  const generalId = "organization-general";
  const nodes: MemberCommandNode[] = [{
    id: "entral",
    name: "ENTRAL",
    parentId: null,
    rank: "ENTRAL",
    status: "thinking"
  }];

  for (const [id, name] of marshals) {
    nodes.push({ id, name, parentId: "entral", rank: "MARSHAL", status: id === "portfolio-marshal" ? "working" : "idle" });
  }

  nodes.push({ id: generalId, name: `${organizationName} General`, parentId: "portfolio-marshal", rank: "GENERAL", status: "working" });
  const commanderId = "organization-commander";
  nodes.push({ id: commanderId, name: `${organizationName} Commander`, parentId: generalId, rank: "COMMANDER", status: "idle" });
  for (const soldierName of soldiers) {
    nodes.push({
      id: `${commanderId}:${slug(soldierName)}`,
      name: soldierName,
      parentId: commanderId,
      rank: "SOLDIER",
      status: "idle"
    });
  }

  return { nodes };
}
