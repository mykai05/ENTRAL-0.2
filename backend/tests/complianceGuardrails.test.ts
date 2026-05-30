import { describe, expect, it } from "vitest";
import { analyzeCompliance, complianceDisclaimer } from "../src/services/complianceGuardrails.js";

describe("merch compliance guardrails", () => {
  it("flags protected references and disclosure gaps without giving legal advice", () => {
    const result = analyzeCompliance({
      aiDisclosureNeeded: false,
      designConcept: "Nike-inspired Star Wars Lakers hoodie for a local fan drop.",
      productionPartnerDisclosureNeeded: false,
      tags: ["marvel", "nasa"]
    });

    expect(result.requiresApproval).toBe(true);
    expect(result.disclaimer).toBe(complianceDisclaimer);
    expect(result.disclaimer.toLowerCase()).toContain("not legal advice");
    expect(result.findings.map((finding) => finding.category)).toEqual(expect.arrayContaining([
      "brand_names",
      "movie_references",
      "sports_teams",
      "missing_ai_disclosure",
      "missing_production_partner_disclosure"
    ]));
  });
});
