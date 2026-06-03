import { buildLaunchPackage, type MerchProductSnapshot, type MerchStoreSnapshot } from "./merchReports.js";

export type GrowthDraft = {
  approvalStatus: "Draft - needs approval";
  channel: "Social" | "Shopify" | "Ads" | "Analytics";
  copy: string;
  title: string;
};

export type GrowthCampaignDraft = {
  audience: string;
  budgetGuardrail: string;
  name: string;
  objective: string;
  status: "Draft - spend locked";
};

export type GrowthAnalyticsLoop = {
  cadence: string;
  guardrail: string;
  metric: string;
  source: string;
};

export type GrowthPlan = {
  adCampaignDrafts: GrowthCampaignDraft[];
  analyticsLoop: GrowthAnalyticsLoop[];
  approvalQueue: string[];
  auditEvents: string[];
  blockedActions: string[];
  commercePrep: string[];
  contentDrafts: GrowthDraft[];
  mode: "Mock Mode";
  readinessScore: number;
  summary: string;
};

export type GrowthApprovalAction = {
  approvalStatus: "Pending human approval";
  channel: "Social" | "Shopify" | "Ads" | "Analytics" | "Provider";
  executionState: "Locked - no external action";
  id: string;
  requiredControls: string[];
  scheduledFor: string | null;
  summary: string;
  title: string;
};

export type GrowthApprovalPacket = {
  actions: GrowthApprovalAction[];
  auditEvents: string[];
  blockedActions: string[];
  businessName: string;
  costGuardrail: string;
  createdAt: string;
  humanApprovalRequired: true;
  id: string;
  logging: string;
  mode: "Mock Mode";
  note: string | null;
  scheduledFor: string | null;
  status: "Pending approval";
  storeId: string;
  summary: string;
};

export type GrowthOrchestrationStep = {
  actionId: string;
  channel: GrowthApprovalAction["channel"];
  checklist: string[];
  executionState: "Locked - no external action";
  guardrail: string;
  scheduledFor: string | null;
  status: "Ready for manual handoff";
  title: string;
};

export type GrowthOrchestrationPreview = {
  approvalPacketId: string;
  auditEvents: string[];
  businessName: string;
  costGuardrail: string;
  estimatedAiCostCents: 0;
  estimatedExternalSpendCents: 0;
  externalExecution: false;
  mode: "Read-only orchestration preview";
  providerContacted: false;
  scheduledFor: string | null;
  status: "Approved - execution locked";
  steps: GrowthOrchestrationStep[];
  summary: string;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function packetId(storeId: string, createdAt: string) {
  return `growth_approval_${storeId}_${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
}

function actionId(packetIdValue: string, channel: GrowthApprovalAction["channel"], index: number) {
  return `${packetIdValue}_${channel.toLowerCase()}_${index + 1}`;
}

export function buildGrowthPlan(store: MerchStoreSnapshot, products: MerchProductSnapshot[]): GrowthPlan {
  const launchPackage = buildLaunchPackage(store, products);
  const approvedProducts = launchPackage.approvedProducts;
  const approvedProductNames = approvedProducts.map((product) => product.productName).slice(0, 3);
  const approvalReadiness = store.approvalStatus === "Launch Approved" ? 30 : store.approvalStatus.includes("Approved") ? 18 : 8;
  const productReadiness = Math.min(35, approvedProducts.length * 7);
  const launchReadiness = store.launchStatus === "Launched" ? 20 : store.launchStatus === "Building Store" ? 14 : store.launchStatus === "Awaiting Approval" ? 10 : 5;
  const dataReadiness = store.revenue > 0 ? 15 : 7;

  const socialCaptions = launchPackage.socialCaptions.length > 0
    ? launchPackage.socialCaptions
    : [`${store.businessName} is preparing a reviewed merch update for ${store.audience}.`];

  return {
    adCampaignDrafts: [
      {
        audience: store.audience,
        budgetGuardrail: "Draft only. Daily spend stays locked until a user approves platform, audience, dates, and budget.",
        name: `${store.businessName} launch awareness draft`,
        objective: "Prepare a low-risk awareness campaign brief for reviewed products.",
        status: "Draft - spend locked"
      },
      {
        audience: approvedProductNames.length ? approvedProductNames.join(", ") : store.productTypes.join(", ") || "approved products",
        budgetGuardrail: "No ad account is contacted. UTM, creative, and offer notes remain internal until approval.",
        name: `${store.businessName} product validation draft`,
        objective: "Compare approved product lanes before requesting any paid campaign setup.",
        status: "Draft - spend locked"
      }
    ],
    analyticsLoop: [
      {
        cadence: "Weekly",
        guardrail: "Uses manual or connected read-only data until a user approves an analytics integration.",
        metric: "Approved product count",
        source: "ENTRAL approval queue"
      },
      {
        cadence: "Weekly",
        guardrail: "Treats estimates as planning signals, not live sales truth.",
        metric: "Estimated profit and margin",
        source: "Pricing calculator and product drafts"
      },
      {
        cadence: "After launch approval",
        guardrail: "Requires explicit approval before connecting storefront or ad-platform reporting.",
        metric: "Traffic, conversion, and revenue trend",
        source: "Future read-only commerce and analytics integrations"
      }
    ],
    approvalQueue: [
      "Approve final social captions before posting.",
      "Approve Shopify/storefront setup checklist before any external change.",
      "Approve ad platform, budget, schedule, targeting, and creative before spend.",
      "Approve analytics connection scope before importing performance data."
    ],
    auditEvents: [
      "Growth plan generated in Mock Mode.",
      "No social platform, commerce platform, ad account, or analytics provider was contacted.",
      "All growth actions remain pending human approval and future credential configuration."
    ],
    blockedActions: [
      "Publishing social posts",
      "Updating Shopify or marketplace listings",
      "Starting paid ad spend",
      "Importing customer, sales, or analytics data from external systems"
    ],
    commercePrep: [
      ...launchPackage.storeBuildChecklist,
      "Prepare Shopify collection structure and navigation notes for approval.",
      "Prepare go-live checklist with rollback owner and final user sign-off."
    ],
    contentDrafts: socialCaptions.slice(0, 3).map((caption, index) => ({
      approvalStatus: "Draft - needs approval",
      channel: "Social",
      copy: caption,
      title: `Social draft ${index + 1}`
    })),
    mode: "Mock Mode",
    readinessScore: clampScore(approvalReadiness + productReadiness + launchReadiness + dataReadiness),
    summary: `${store.businessName} has ${approvedProducts.length} approved product${approvedProducts.length === 1 ? "" : "s"} ready for reviewed growth preparation. ENTRAL can draft content, storefront steps, ad briefs, and analytics loops, but execution stays locked behind approval.`
  };
}

export function buildGrowthApprovalPacket(input: {
  createdAt?: string;
  note?: string | null;
  products: MerchProductSnapshot[];
  scheduledFor?: string | null;
  store: MerchStoreSnapshot;
  storeId: string;
}): GrowthApprovalPacket {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const scheduledFor = input.scheduledFor ?? null;
  const plan = buildGrowthPlan(input.store, input.products);
  const id = packetId(input.storeId, createdAt);
  const socialDrafts = plan.contentDrafts.slice(0, 2);
  const adDrafts = plan.adCampaignDrafts.slice(0, 2);

  const actions: GrowthApprovalAction[] = [
    ...socialDrafts.map((draft, index): GrowthApprovalAction => ({
      approvalStatus: "Pending human approval",
      channel: "Social",
      executionState: "Locked - no external action",
      id: actionId(id, "Social", index),
      requiredControls: ["caption approval", "channel approval", "scheduled time approval", "final user sign-off"],
      scheduledFor,
      summary: draft.copy,
      title: draft.title
    })),
    {
      approvalStatus: "Pending human approval",
      channel: "Shopify",
      executionState: "Locked - no external action",
      id: actionId(id, "Shopify", socialDrafts.length),
      requiredControls: ["storefront checklist approval", "credential scope approval", "rollback owner", "final user sign-off"],
      scheduledFor,
      summary: plan.commercePrep.slice(0, 3).join(" "),
      title: `${input.store.businessName} storefront prep review`
    },
    ...adDrafts.map((campaign, index): GrowthApprovalAction => ({
      approvalStatus: "Pending human approval",
      channel: "Ads",
      executionState: "Locked - no external action",
      id: actionId(id, "Ads", index),
      requiredControls: ["platform approval", "budget approval", "audience approval", "date approval", "creative approval"],
      scheduledFor,
      summary: `${campaign.objective} ${campaign.budgetGuardrail}`,
      title: campaign.name
    })),
    {
      approvalStatus: "Pending human approval",
      channel: "Analytics",
      executionState: "Locked - no external action",
      id: actionId(id, "Analytics", adDrafts.length),
      requiredControls: ["read-only data scope", "provider approval", "data retention note", "final user sign-off"],
      scheduledFor,
      summary: plan.analyticsLoop.map((item) => `${item.metric}: ${item.guardrail}`).join(" "),
      title: `${input.store.businessName} analytics loop review`
    }
  ];

  return {
    actions,
    auditEvents: [
      "Growth approval packet queued in Mock Mode.",
      "No social platform, commerce platform, ad account, or analytics provider was contacted.",
      "Every action remains locked until explicit human approval and credential configuration."
    ],
    blockedActions: plan.blockedActions,
    businessName: input.store.businessName,
    costGuardrail: "External ad spend is $0. Platform changes, posts, imports, and paid campaigns remain locked until approved.",
    createdAt,
    humanApprovalRequired: true,
    id,
    logging: "This packet is stored as an audit event with action-level approval requirements.",
    mode: "Mock Mode",
    note: input.note?.trim() ? input.note.trim().slice(0, 500) : null,
    scheduledFor,
    status: "Pending approval",
    storeId: input.storeId,
    summary: `${actions.length} growth actions prepared for review. ENTRAL will not publish, change storefronts, start spend, or import analytics without explicit approval.`
  };
}

export function buildGrowthOrchestrationPreview(packet: GrowthApprovalPacket): GrowthOrchestrationPreview {
  const steps = packet.actions.map((action): GrowthOrchestrationStep => {
    const channelGuardrails: Record<GrowthApprovalAction["channel"], string> = {
      Ads: "Paid media remains a campaign brief only. Budget, platform, targeting, and creative require a separate final approval before spend.",
      Analytics: "Analytics work remains a read-only connection plan. No customer, sales, traffic, or ad data is imported.",
      Provider: "Provider payload work remains a credential-scope and request-body review. No provider API request is sent.",
      Shopify: "Storefront work remains a setup checklist. No Shopify or marketplace listing is created, changed, or launched.",
      Social: "Social work remains a prepared caption and schedule note. No post is published or queued on a platform."
    };

    return {
      actionId: action.id,
      channel: action.channel,
      checklist: [
        "Confirm the prepared content or checklist still matches the current business objective.",
        "Confirm credentials, platform scope, budget, and timing with the user before any future external connector is enabled.",
        "Write a fresh audit event before any future execution attempt."
      ],
      executionState: "Locked - no external action",
      guardrail: channelGuardrails[action.channel],
      scheduledFor: action.scheduledFor,
      status: "Ready for manual handoff",
      title: action.title
    };
  });

  return {
    approvalPacketId: packet.id,
    auditEvents: [
      "Read-only growth orchestration preview generated.",
      "No social, Shopify, ad, or analytics system was contacted.",
      "Approved packet remains a manual handoff until a future connector receives separate final approval."
    ],
    businessName: packet.businessName,
    costGuardrail: "External spend remains $0. Estimated AI/provider cost for this preview is 0 cents.",
    estimatedAiCostCents: 0,
    estimatedExternalSpendCents: 0,
    externalExecution: false,
    mode: "Read-only orchestration preview",
    providerContacted: false,
    scheduledFor: packet.scheduledFor,
    status: "Approved - execution locked",
    steps,
    summary: `${steps.length} approved growth actions are organized for manual handoff. ENTRAL still will not publish posts, update storefronts, start ad spend, or import analytics data.`
  };
}
