import type { MemberCommandHierarchy } from "./member";

const marshals = [
  ["portfolio-marshal", "Portfolio Marshal"],
  ["intelligence-marshal", "Intelligence Marshal"],
  ["operations-marshal", "Operations Marshal"],
  ["growth-marshal", "Growth Marshal"],
  ["governance-marshal", "Governance Marshal"]
] as const;

const commanders = [
  ["strategy-commander", "Strategy Commander", ["Market Research Soldier", "Business Analysis Soldier", "Planning Soldier", "Opportunity Soldier"]],
  ["operations-commander", "Operations Commander", ["Workflow Soldier", "Delivery Soldier", "Quality Soldier", "Capacity Soldier"]],
  ["growth-commander", "Growth Commander", ["Positioning Soldier", "Pipeline Soldier", "Client Success Soldier", "Retention Soldier"]],
  ["governance-commander", "Governance Commander", ["Evidence Soldier", "Approval Soldier", "Risk Soldier", "Audit Soldier"]]
] as const;

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** A member-safe topology containing no prompts, tools, logs, or internal routing state. */
export function createMemberStarterHierarchy(organizationName: string): MemberCommandHierarchy {
  const generalId = "organization-general";
  const nodes: MemberCommandHierarchy["nodes"] = [{
    id: "entral",
    name: "ENTRAL",
    parentId: null,
    rank: "emperor",
    status: "thinking"
  }];

  for (const [id, name] of marshals) {
    nodes.push({ id, name, parentId: "entral", rank: "marshal", status: id === "operations-marshal" ? "working" : "idle" });
  }

  nodes.push({ id: generalId, name: `${organizationName} General`, parentId: "operations-marshal", rank: "general", status: "working" });
  for (const [commanderId, name, soldiers] of commanders) {
    nodes.push({ id: commanderId, name, parentId: generalId, rank: "commander", status: "idle" });
    for (const soldierName of soldiers) {
      nodes.push({
        id: `${commanderId}:${slug(soldierName)}`,
        name: soldierName,
        parentId: commanderId,
        rank: "soldier",
        status: "idle"
      });
    }
  }

  return { nodes };
}
