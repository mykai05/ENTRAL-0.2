export type ComplianceSeverity = "low" | "medium" | "high";

export type ComplianceFinding = {
  category: string;
  label: string;
  matched: string[];
  message: string;
  requiresApproval: boolean;
  severity: ComplianceSeverity;
};

export type ComplianceInput = {
  aiDisclosureNeeded?: boolean;
  colorDirection?: string | null;
  complianceNotes?: string | null;
  designConcept?: string | null;
  designPrompt?: string | null;
  designTheme?: string | null;
  listingDescription?: string | null;
  listingTitle?: string | null;
  productName?: string | null;
  productionPartnerDisclosureNeeded?: boolean;
  tags?: string[];
  typographyDirection?: string | null;
};

export type ComplianceSummary = {
  disclaimer: string;
  findings: ComplianceFinding[];
  requiresApproval: boolean;
  riskLevel: ComplianceSeverity;
};

type Rule = {
  category: string;
  label: string;
  message: string;
  patterns: RegExp[];
  severity: ComplianceSeverity;
};

type RuleDefinition = Omit<Rule, "severity"> & {
  severity?: ComplianceSeverity;
};

export const complianceDisclaimer = "Compliance warnings are operational risk signals only and are not legal advice. A qualified professional should review flagged products before publishing.";

const ruleDefinitions: RuleDefinition[] = [
  {
    category: "trademarked_phrases",
    label: "Trademarked phrases",
    message: "Possible protected phrase detected. Confirm ownership or remove before publishing.",
    patterns: [/just do it/i, /i'?m lovin'? it/i, /got milk/i, /where'?s the beef/i, /because you'?re worth it/i, /the happiest place on earth/i]
  },
  {
    category: "brand_names",
    label: "Brand names",
    message: "Brand name detected. Do not imply endorsement, affiliation, or use protected marks without permission.",
    patterns: [/nike/i, /adidas/i, /disney/i, /apple/i, /tesla/i, /starbucks/i, /coca[-\s]?cola/i, /lego/i, /barbie/i, /marvel/i, /pokemon/i]
  },
  {
    category: "celebrity_names",
    label: "Celebrity names",
    message: "Celebrity or public figure reference detected. Review publicity rights and remove if not licensed.",
    patterns: [/taylor swift/i, /beyonce/i, /drake/i, /lebron james/i, /messi/i, /cristiano ronaldo/i, /rihanna/i, /elon musk/i]
  },
  {
    category: "sports_teams",
    label: "Sports teams",
    message: "Sports team reference detected. Review league/team trademark risk before approval.",
    patterns: [/lakers/i, /yankees/i, /cowboys/i, /dodgers/i, /warriors/i, /chiefs/i, /eagles/i, /patriots/i, /real madrid/i, /manchester united/i]
  },
  {
    category: "movie_references",
    label: "Movie references",
    message: "Movie or franchise reference detected. Avoid protected titles, quotes, characters, and trade dress.",
    patterns: [/star wars/i, /harry potter/i, /jurassic park/i, /marvel/i, /batman/i, /spider[-\s]?man/i, /lord of the rings/i, /barbie/i]
  },
  {
    category: "game_references",
    label: "Game references",
    message: "Game reference detected. Avoid protected game names, characters, imagery, and slogans.",
    patterns: [/minecraft/i, /fortnite/i, /roblox/i, /zelda/i, /mario/i, /call of duty/i, /grand theft auto/i, /league of legends/i]
  },
  {
    category: "anime_references",
    label: "Anime references",
    message: "Anime reference detected. Avoid protected series names, characters, symbols, and recognizable art styles tied to a franchise.",
    patterns: [/naruto/i, /dragon ball/i, /one piece/i, /demon slayer/i, /attack on titan/i, /jujutsu kaisen/i, /sailor moon/i]
  },
  {
    category: "military_branch_seals",
    label: "Military branch seals",
    message: "Military branch or seal reference detected. Official seals and insignia usually require strict permission.",
    patterns: [/department of defense/i, /u\.?s\.?\s?army/i, /u\.?s\.?\s?navy/i, /u\.?s\.?\s?air force/i, /marine corps/i, /coast guard/i, /space force/i]
  },
  {
    category: "official_emblems",
    label: "Official emblems",
    message: "Official emblem or government mark reference detected. Do not use protected official identifiers without permission.",
    patterns: [/presidential seal/i, /state seal/i, /federal bureau/i, /\bfbi\b/i, /\bcia\b/i, /\bnasa\b/i, /official emblem/i]
  },
  {
    category: "copyrighted_characters",
    label: "Copyrighted characters",
    message: "Copyrighted character reference detected. Remove character names, likenesses, and derivative art unless licensed.",
    patterns: [/mickey mouse/i, /spongebob/i, /pikachu/i, /hello kitty/i, /batman/i, /superman/i, /elsa/i, /winnie[-\s]?the[-\s]?pooh/i]
  },
  {
    category: "hate_or_prohibited_content",
    label: "Hate or prohibited content",
    message: "Potential prohibited content detected. Do not publish hateful, extremist, or targeted harassment content.",
    patterns: [/nazi/i, /white power/i, /kkk/i, /ethnic cleansing/i, /kill all/i, /racial slur/i, /hate group/i],
    severity: "high"
  }
];

const rules: Rule[] = ruleDefinitions.map((rule) => ({ severity: "medium", ...rule }));

const severityWeight: Record<ComplianceSeverity, number> = {
  high: 3,
  low: 1,
  medium: 2
};

function textFor(input: ComplianceInput) {
  return [
    input.productName,
    input.designTheme,
    input.designConcept,
    input.designPrompt,
    input.typographyDirection,
    input.colorDirection,
    input.listingTitle,
    input.listingDescription,
    input.complianceNotes,
    ...(input.tags ?? [])
  ].filter(Boolean).join(" ");
}

function riskLevelFor(findings: ComplianceFinding[]): ComplianceSeverity {
  if (findings.some((finding) => finding.severity === "high")) return "high";
  if (findings.some((finding) => finding.severity === "medium")) return "medium";
  return findings.length > 0 ? "low" : "low";
}

export function analyzeCompliance(input: ComplianceInput): ComplianceSummary {
  const text = textFor(input);
  const findings = rules.flatMap((rule): ComplianceFinding[] => {
    const matched = rule.patterns
      .filter((pattern) => pattern.test(text))
      .map((pattern) => pattern.source.replace(/\\b|\\s|\[|\]|\?|\.|\*/g, "").replace(/\|/g, " / "));

    if (matched.length === 0) {
      return [];
    }

    return [{
      category: rule.category,
      label: rule.label,
      matched,
      message: rule.message,
      requiresApproval: true,
      severity: rule.severity
    }];
  });

  if (!input.aiDisclosureNeeded) {
    findings.push({
      category: "missing_ai_disclosure",
      label: "Missing AI disclosure",
      matched: [],
      message: "AI disclosure is not marked as needed. Confirm marketplace and client disclosure requirements before approval.",
      requiresApproval: true,
      severity: "medium"
    });
  }

  if (!input.productionPartnerDisclosureNeeded) {
    findings.push({
      category: "missing_production_partner_disclosure",
      label: "Missing production partner disclosure",
      matched: [],
      message: "Production partner disclosure is not marked as needed. Confirm POD platform disclosure requirements before approval.",
      requiresApproval: true,
      severity: "medium"
    });
  }

  findings.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity] || a.label.localeCompare(b.label));

  return {
    disclaimer: complianceDisclaimer,
    findings,
    requiresApproval: findings.some((finding) => finding.requiresApproval),
    riskLevel: riskLevelFor(findings)
  };
}

export function formatComplianceNotes(input: ComplianceInput) {
  const summary = analyzeCompliance(input);
  const warnings = summary.findings.map((finding) => `${finding.label}: ${finding.message}`);

  return [complianceDisclaimer, ...warnings].join(" ");
}
