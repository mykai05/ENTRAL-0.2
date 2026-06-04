import type { MerchStoreSnapshot } from "./merchReports.js";
import type { ShopifyConnectionSnapshot } from "./shopifyConnections.js";

export const shopifyStoreProvisioningConfirmation = "PREPARE SHOPIFY STORE CREATION PACKET";
const shopifyOAuthStartConfirmation = "START SHOPIFY OAUTH";
const shopifyAutonomyResumeJobConfirmation = "QUEUE SHOPIFY AUTONOMY RESUME JOB";
const shopifyStoreCreationHandoffJobConfirmation = "QUEUE SHOPIFY STORE CREATION HANDOFF JOB";
const defaultShopifyScopes = [
  "read_products",
  "write_products",
  "read_online_store_pages",
  "write_online_store_pages",
  "read_online_store_navigation",
  "write_online_store_navigation"
];

export type ShopifyStoreProvisioningStatus =
  | "connected_existing_shop"
  | "dev_dashboard_creation_required"
  | "not_applicable";

export type ShopifyDevDashboardBrowserTask = {
  allowedDomains: string[];
  allowedSteps: Array<{
    expectedState: string;
    id: string;
    instruction: string;
    selectorHints: string[];
  }>;
  completionEvidence: {
    captureEndpoint: string;
    nextAutonomousStep: "submit_shopify_store_creation_capture";
    requiredFields: string[];
  };
  currentExecution: "not_started";
  hardStops: string[];
  mode: "Governed Shopify Dev Dashboard Browser Task";
  targetUrl: string;
};

export type ShopifyStoreProvisioningPlan = {
  actualExternalActionsExecuted: false;
  auditEvents: string[];
  blockedExternalActions: string[];
  continuation: {
    connectEndpoint: string;
    draftExecutorEndpoint: string;
    nextAutonomousStep: "connect_existing_shop" | "run_shopify_draft_executor" | "skip_non_shopify_store";
    readyForDraftExecutor: boolean;
  };
  creationCapture: {
    afterCreationChecklist: string[];
    autonomyResumeJobEndpoint: string;
    autonomyResumeJobRequestDefaults: {
      confirm: typeof shopifyAutonomyResumeJobConfirmation;
      connectionWatchIntervalMinutes: number;
      countryCode: string;
      dryRun: false;
      maxConnectionWatchAttempts: number;
      requestedShopName: string;
      storeType: "client_transfer" | "development";
      watchForConnection: true;
    };
    expectedShopDomain: string | null;
    nextAutonomousStep: "create_store_in_dashboard" | "run_shopify_draft_executor" | "skip_non_shopify_store" | "start_shopify_oauth";
    oauthStartEndpoint: string;
    oauthStartRequestDefaults: {
      confirm: typeof shopifyOAuthStartConfirmation;
      continueAfterApproval: true;
      countryCode: string;
      requestedShopName: string;
      scopes: string[];
      shopDomain: string | null;
      storeType: "client_transfer" | "development";
    };
    status: "capture_required" | "connected_shop_ready" | "not_applicable";
    summary: string;
  };
  creationHandoff: {
    automationJobEndpoint: string;
    automationJobRequestDefaults: {
      confirm: typeof shopifyStoreCreationHandoffJobConfirmation;
      connectionWatchIntervalMinutes: number;
      countryCode: string;
      dryRun: false;
      maxConnectionWatchAttempts: number;
      queueBrowserTask: true;
      queueAutonomyResume: true;
      requestedShopName: string;
      storeType: "client_transfer" | "development";
      watchForConnection: true;
    };
    blockedBrowserActions: string[];
    browserTask: ShopifyDevDashboardBrowserTask;
    evidenceToCapture: string[];
    expectedShopDomain: string | null;
    nextAutonomousStep: "queue_store_creation_handoff_job" | "run_shopify_draft_executor" | "skip_non_shopify_store";
    status: "ready_to_queue" | "connected_shop_ready" | "not_applicable";
    summary: string;
    targetUrl: string;
  };
  devDashboardPacket: {
    countryCode: string;
    ownerEmail: string | null;
    partnerDashboardStoresUrl: string;
    requestedShopName: string;
    shopDomainSuggestion: string;
    storeType: "client_transfer" | "development";
  };
  externalExecution: false;
  generatedAt: string;
  guardrails: string[];
  mode: "Shopify Store Creation Provisioning Gate";
  officialApiSurface: {
    createStoreMutationDocumented: false;
    docs: Array<{
      label: string;
      url: string;
    }>;
    summary: string;
  };
  providerContacted: false;
  sourceStore: {
    businessName: string;
    storePlatform: string;
  };
  status: ShopifyStoreProvisioningStatus;
  summary: string;
};

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "entral-store";
}

function activeConnection(connections: ShopifyConnectionSnapshot[] = []) {
  return connections.find((connection) => connection.status === "active" && connection.tokenConfigured);
}

function buildDevDashboardBrowserTask(input: {
  captureEndpoint: string;
  countryCode: string;
  expectedShopDomain: string | null;
  requestedShopName: string;
  status: ShopifyStoreProvisioningStatus;
  storeType: "client_transfer" | "development";
  targetUrl: string;
}): ShopifyDevDashboardBrowserTask {
  const storeTypeLabel = input.storeType === "client_transfer" ? "Client transfer store" : "Development store";

  return {
    allowedDomains: [
      "dev.shopify.com",
      "accounts.shopify.com",
      "myshopify.com"
    ],
    allowedSteps: input.status === "dev_dashboard_creation_required"
      ? [
        {
          expectedState: "Dev Dashboard Stores page is open, or a normal Shopify login/organization gate is visible.",
          id: "open_dev_dashboard_stores",
          instruction: "Open Shopify Dev Dashboard Stores.",
          selectorHints: ["a[href*='/dashboard/stores']", "text=/Stores/i"]
        },
        {
          expectedState: "Create-store form is visible without asking for billing, payouts, payments, domains, app charges, or public publishing.",
          id: "open_create_store_form",
          instruction: "Select Create store.",
          selectorHints: ["button:has-text('Create store')", "a:has-text('Create store')"]
        },
        {
          expectedState: `${storeTypeLabel} is selected and the form still shows only store setup fields.`,
          id: "select_store_type",
          instruction: `Select ${storeTypeLabel}.`,
          selectorHints: [`text=/${storeTypeLabel}/i`, "input[type='radio']"]
        },
        {
          expectedState: `Store name is filled as ${input.requestedShopName}.`,
          id: "fill_store_name",
          instruction: `Enter store name: ${input.requestedShopName}.`,
          selectorHints: ["input[name='name']", "input[aria-label*='store name' i]", "input[placeholder*='store name' i]"]
        },
        {
          expectedState: `Country or region is set to ${input.countryCode}.`,
          id: "select_country",
          instruction: `Select country or region: ${input.countryCode}.`,
          selectorHints: ["select[name='country']", "button[aria-label*='country' i]", "input[aria-label*='country' i]"]
        },
        {
          expectedState: `Shopify reports a created store and exposes the final myshopify.com domain, expected near ${input.expectedShopDomain ?? "the requested store slug"}.`,
          id: "create_store_and_capture_domain",
          instruction: "Select Create store only if no hard stop is present, then capture the final myshopify.com domain.",
          selectorHints: ["button:has-text('Create store')", "text=/myshopify\\.com/i"]
        }
      ]
      : [],
    completionEvidence: {
      captureEndpoint: input.captureEndpoint,
      nextAutonomousStep: "submit_shopify_store_creation_capture",
      requiredFields: [
        "finalShopDomain",
        "storeType",
        "countryCode",
        "operatorOrSessionContext",
        "createdAt"
      ]
    },
    currentExecution: "not_started",
    hardStops: [
      "Login, MFA, CAPTCHA, bot challenge, account recovery, or organization-permission challenge requires the owner/operator.",
      "Billing, paid plan selection, payouts, payments, domains, app charges, Shopify Plus enablement, or public publishing must stop for separate owner approval.",
      "Any browser request for stealth, proxy rotation, fingerprint spoofing, CAPTCHA bypass, account warmup, or traffic disguise must stop."
    ],
    mode: "Governed Shopify Dev Dashboard Browser Task",
    targetUrl: input.targetUrl
  };
}

function summaryFor(input: {
  connectedShopDomain: string | null;
  status: ShopifyStoreProvisioningStatus;
  store: MerchStoreSnapshot;
}) {
  if (input.status === "not_applicable") {
    return `${input.store.businessName} is configured for ${input.store.storePlatform}, so Shopify store provisioning is not applicable.`;
  }

  if (input.status === "connected_existing_shop") {
    return `${input.store.businessName} already has a connected Shopify shop (${input.connectedShopDomain}); Entral can continue with draft storefront automation.`;
  }

  return `${input.store.businessName} needs a Shopify Dev Dashboard store creation step before Entral can connect Admin API credentials and continue autonomous draft setup.`;
}

export function buildShopifyStoreProvisioningPlan(input: {
  connectedShopDomain?: string | null;
  connections?: ShopifyConnectionSnapshot[];
  countryCode?: string | null;
  generatedAt?: string;
  ownerEmail?: string | null;
  requestedShopName?: string | null;
  store: MerchStoreSnapshot;
  storeId: string;
  storeType?: "client_transfer" | "development" | null;
}): ShopifyStoreProvisioningPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const connected = activeConnection(input.connections);
  const connectedShopDomain = connected?.shopDomain ?? input.connectedShopDomain?.trim() ?? null;
  const status: ShopifyStoreProvisioningStatus = input.store.storePlatform !== "Shopify"
    ? "not_applicable"
    : connectedShopDomain
      ? "connected_existing_shop"
      : "dev_dashboard_creation_required";
  const requestedShopName = input.requestedShopName?.trim() || input.store.businessName;
  const shopDomainSuggestion = `${slug(requestedShopName)}.myshopify.com`;
  const countryCode = (input.countryCode?.trim().toUpperCase() || "US").slice(0, 2);
  const storeType = input.storeType ?? "client_transfer";
  const captureStatus = status === "connected_existing_shop"
    ? "connected_shop_ready"
    : status === "not_applicable" ? "not_applicable" : "capture_required";
  const expectedShopDomain = connectedShopDomain ?? (status === "not_applicable" ? null : shopDomainSuggestion);
  const oauthStartEndpoint = `/api/v1/merch/stores/${input.storeId}/shopify-oauth/start`;
  const autonomyResumeJobEndpoint = `/api/v1/merch/stores/${input.storeId}/shopify-autonomy-resume-job`;
  const creationHandoffJobEndpoint = `/api/v1/merch/stores/${input.storeId}/shopify-store-creation-handoff-job`;
  const creationCaptureEndpoint = `/api/v1/merch/stores/${input.storeId}/shopify-store-creation-capture`;
  const partnerDashboardStoresUrl = "https://dev.shopify.com/dashboard/stores";
  const browserTask = buildDevDashboardBrowserTask({
    captureEndpoint: creationCaptureEndpoint,
    countryCode,
    expectedShopDomain,
    requestedShopName,
    status,
    storeType,
    targetUrl: partnerDashboardStoresUrl
  });

  return {
    actualExternalActionsExecuted: false,
    auditEvents: [
      "Shopify store provisioning gate prepared.",
      "No Shopify account, store, billing, payout, domain, browser, or payment action was executed.",
      "Entral can continue automatically after a Shopify shop domain and Admin API token are connected."
    ],
    blockedExternalActions: [
      "Creating a brand-new Shopify account or store through undocumented Partner API behavior",
      "Using browser automation to bypass Shopify login, MFA, bot checks, account protections, plan selection, billing, payouts, or payment setup",
      "Purchasing domains, selecting paid plans, adding bank accounts, enabling payment processors, or publishing a public storefront"
    ],
    continuation: {
      connectEndpoint: `/api/v1/merch/stores/${input.storeId}/shopify-connection`,
      draftExecutorEndpoint: `/api/v1/merch/stores/${input.storeId}/shopify-storefront-draft`,
      nextAutonomousStep: status === "connected_existing_shop"
        ? "run_shopify_draft_executor"
        : status === "not_applicable"
          ? "skip_non_shopify_store"
        : "connect_existing_shop",
      readyForDraftExecutor: status === "connected_existing_shop"
    },
    creationCapture: {
      afterCreationChecklist: status === "dev_dashboard_creation_required"
        ? [
          "Create the Shopify store from the documented Dev Dashboard or Partner Dashboard flow.",
          "Copy the final myshopify.com domain into Entral exactly as Shopify shows it.",
          "Start Shopify OAuth approval from Entral with Continue After Approval enabled.",
          "Keep the queued Shopify autonomy resume job watching for the verified connection."
        ]
        : status === "connected_existing_shop"
          ? [
            "Verified Shopify Admin API connection is already available.",
            "Run the controlled Shopify draft storefront executor when owner gates are accepted."
          ]
          : [],
      autonomyResumeJobEndpoint,
      autonomyResumeJobRequestDefaults: {
        confirm: shopifyAutonomyResumeJobConfirmation,
        connectionWatchIntervalMinutes: 15,
        countryCode,
        dryRun: false,
        maxConnectionWatchAttempts: 24,
        requestedShopName,
        storeType,
        watchForConnection: true
      },
      expectedShopDomain,
      nextAutonomousStep: status === "connected_existing_shop"
        ? "run_shopify_draft_executor"
        : status === "not_applicable" ? "skip_non_shopify_store" : "create_store_in_dashboard",
      oauthStartEndpoint,
      oauthStartRequestDefaults: {
        confirm: shopifyOAuthStartConfirmation,
        continueAfterApproval: true,
        countryCode,
        requestedShopName,
        scopes: defaultShopifyScopes,
        shopDomain: expectedShopDomain,
        storeType
      },
      status: captureStatus,
      summary: status === "dev_dashboard_creation_required"
        ? `${input.store.businessName} is waiting for the Shopify dashboard-created shop domain; Entral can start OAuth and resume autonomy as soon as that domain is captured.`
        : status === "connected_existing_shop"
          ? `${input.store.businessName} already has ${connectedShopDomain} captured and verified for Shopify OAuth continuation.`
        : `${input.store.businessName} does not need Shopify store creation capture.`
    },
    creationHandoff: {
      automationJobEndpoint: creationHandoffJobEndpoint,
      automationJobRequestDefaults: {
        confirm: shopifyStoreCreationHandoffJobConfirmation,
        connectionWatchIntervalMinutes: 15,
        countryCode,
        dryRun: false,
        maxConnectionWatchAttempts: 24,
        queueBrowserTask: true,
        queueAutonomyResume: true,
        requestedShopName,
        storeType,
        watchForConnection: true
      },
      blockedBrowserActions: [
        "Entering credentials, solving MFA/CAPTCHA, bypassing account protections, or clicking through protected Shopify login flows",
        "Selecting paid plans, adding billing, enabling payouts/payments, buying domains, publishing storefront changes, or accepting app charges",
        "Using stealth, proxy, fingerprint, anti-detection, or traffic-disguise browser automation"
      ],
      browserTask,
      evidenceToCapture: status === "dev_dashboard_creation_required"
        ? [
          "Final myshopify.com domain after Shopify creates the store",
          "Store type selected in the Shopify dashboard",
          "Timestamp and operator/account context for the dashboard-created store"
        ]
        : status === "connected_existing_shop"
          ? [
            "Existing verified Shopify connection",
            "Draft executor readiness receipt"
          ]
          : [],
      expectedShopDomain,
      nextAutonomousStep: status === "connected_existing_shop"
        ? "run_shopify_draft_executor"
        : status === "not_applicable" ? "skip_non_shopify_store" : "queue_store_creation_handoff_job",
      status: status === "connected_existing_shop"
        ? "connected_shop_ready"
        : status === "not_applicable" ? "not_applicable" : "ready_to_queue",
      summary: status === "dev_dashboard_creation_required"
        ? `${input.store.businessName} can queue a Shopify store creation handoff job that tracks the Dev Dashboard step, records required evidence, and starts the bounded connection watcher.`
        : status === "connected_existing_shop"
          ? `${input.store.businessName} already has a connected Shopify shop, so no store creation handoff job is needed.`
          : `${input.store.businessName} does not need a Shopify store creation handoff job.`,
      targetUrl: partnerDashboardStoresUrl
    },
    devDashboardPacket: {
      countryCode,
      ownerEmail: input.ownerEmail?.trim() || null,
      partnerDashboardStoresUrl,
      requestedShopName,
      shopDomainSuggestion,
      storeType
    },
    externalExecution: false,
    generatedAt,
    guardrails: [
      "Use the Shopify Dev Dashboard Stores tab for store creation while Shopify lacks a documented public create-store mutation.",
      "Prefer a client transfer store for client merchant builds and a development store for app/theme testing.",
      "After the shop exists, connect its Admin API token in Entral and resume the controlled draft storefront executor.",
      "Keep products draft and collections unpublished until separate public launch approval exists."
    ],
    mode: "Shopify Store Creation Provisioning Gate",
    officialApiSurface: {
      createStoreMutationDocumented: false,
      docs: [
        {
          label: "Shopify Partner API reference",
          url: "https://shopify.dev/docs/api/partner/latest"
        },
        {
          label: "Shopify Dev Dashboard stores",
          url: "https://shopify.dev/docs/apps/build/dev-dashboard/stores/index"
        }
      ],
      summary: "Shopify documents the Partner API for Partner Dashboard data and documents store creation from the Dev Dashboard Stores tab, not a public create-store Partner API mutation."
    },
    providerContacted: false,
    sourceStore: {
      businessName: input.store.businessName,
      storePlatform: input.store.storePlatform
    },
    status,
    summary: summaryFor({
      connectedShopDomain,
      status,
      store: input.store
    })
  };
}
