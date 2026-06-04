import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MerchProductSnapshot, MerchStoreSnapshot } from "../src/services/merchReports.js";
import type { RevenueEngineProductSnapshot, RevenueEngineStoreSnapshot } from "../src/services/revenueEngine.js";

function resetEnv() {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  delete process.env.SHOPIFY_STORE_DOMAIN;
  delete process.env.SHOPIFY_CONNECTOR_ADMIN_TOKEN;
  delete process.env.SHOPIFY_API_VERSION;
}

function jsonResponse(body: unknown, status = 200) {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status
  };
}

const store: MerchStoreSnapshot = {
  approvalStatus: "Launch Approved",
  audience: "Strength athletes",
  brandStyle: "Industrial training",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  estimatedProfit: 120,
  industry: "Fitness",
  launchStatus: "Building Store",
  podProvider: "Printify",
  productTypes: ["T-Shirt"],
  revenue: 0,
  storePlatform: "Shopify"
};

const products: MerchProductSnapshot[] = [{
  aiDisclosureNeeded: false,
  designConcept: "Core strength tee",
  designPrompt: "Bold gym tee",
  estimatedProfit: 24,
  listingDescription: "A draft launch tee for strength athletes.",
  listingTitle: "Iron House Core Tee",
  productName: "Core Tee",
  productType: "T-Shirt",
  productionPartnerDisclosureNeeded: true,
  retailPrice: 32,
  status: "Approved",
  tags: ["gym", "strength", "training"]
}];

const engineStore: RevenueEngineStoreSnapshot = {
  approvalStatus: "Launch Approved",
  audience: "independent gym members and local training clients",
  brandStyle: "bold black-and-green training aesthetic",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  estimatedProfit: 480,
  id: "store_scale",
  industry: "fitness",
  launchStatus: "Optimizing",
  productTypes: ["T-shirt", "Hoodie", "Sticker"],
  revenue: 1200,
  storePlatform: "Shopify"
};

function engineProduct(input: Partial<RevenueEngineProductSnapshot> & { id: string }): RevenueEngineProductSnapshot {
  return {
    aiDisclosureNeeded: true,
    complianceNotes: "Original internal merch draft. Verify trademarks before publishing.",
    designConcept: "Original typography for a brand-owned merch lane.",
    designPrompt: "Create original art with no protected marks or copied work.",
    designTheme: "Original operator series",
    estimatedProfit: 16,
    id: input.id,
    listingDescription: "Original product listing.",
    listingTitle: "Original Product",
    productName: "Original Product",
    productType: "T-shirt",
    productionPartnerDisclosureNeeded: true,
    profitMargin: 42,
    retailPrice: 38,
    status: "Approved",
    storeId: engineStore.id,
    tags: ["original", "fitness"],
    ...input
  };
}

beforeEach(resetEnv);

describe("Shopify Storefront Draft Executor", () => {
  it("builds a dry-run plan without contacting Shopify", async () => {
    const { buildShopifyStorefrontDraftPlan } = await import("../src/services/shopifyStorefrontExecutor.js");
    const plan = buildShopifyStorefrontDraftPlan({
      dryRun: true,
      products,
      store,
      storeId: "store_iron"
    });

    expect(plan.mode).toBe("Controlled Shopify Storefront Draft Executor");
    expect(plan.status).toBe("dry_run");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.totals.products).toBe(1);
    expect(plan.totals.collections).toBe(1);
    expect(plan.totals.pages).toBe(3);
    expect(plan.totals.navigationMenus).toBe(1);
    expect(plan.totals.storeShellActions).toBe(4);
    expect(plan.storefrontActions[0]?.mutationName).toBe("productSet");
    expect(plan.storefrontActions[0]?.handle).toContain("entral-store-iron-iron-house-core-tee");
    expect(plan.storefrontActions.some((action) => action.mutationName === "pageCreate")).toBe(true);
    expect(plan.storefrontActions.some((action) => action.mutationName === "menuCreate")).toBe(true);
    expect(plan.launchReadiness.status).toBe("not_started");
    expect(plan.launchReadiness.nextAutonomousStep).toBe("run_shopify_draft_executor");
    expect(plan.launchReadiness.readyResourceCount).toBe(0);
    expect(plan.blockedExternalActions.join(" ")).toContain("brand-new Shopify account");
  });

  it("blocks live execution until the owner unlock gates are present", async () => {
    const { executeShopifyStorefrontDraft } = await import("../src/services/shopifyStorefrontExecutor.js");
    const fetcher = vi.fn();
    const plan = await executeShopifyStorefrontDraft({
      connectorApproval: false,
      credentials: {
        adminToken: "shpat_test",
        shopDomain: "iron-house.myshopify.com"
      },
      dryRun: false,
      fetcher,
      products,
      store,
      storeId: "store_iron"
    });

    expect(plan.status).toBe("ready_for_owner_unlock");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("executes approved draft product and collection actions against a connected shop", async () => {
    const {
      executeShopifyStorefrontDraft,
      shopifyStorefrontDraftUnlockPhrase
    } = await import("../src/services/shopifyStorefrontExecutor.js");
    const fetcher = vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { query: string; variables?: { page?: { handle?: string; title?: string }; handle?: string; title?: string } };

      if (body.query.includes("collectionByIdentifier")) {
        return jsonResponse({ data: { collectionByIdentifier: null } });
      }

      if (body.query.includes("pages(")) {
        return jsonResponse({ data: { pages: { nodes: [] } } });
      }

      if (body.query.includes("menus(")) {
        return jsonResponse({ data: { menus: { nodes: [] } } });
      }

      if (body.query.includes("collectionCreate")) {
        return jsonResponse({
          data: {
            collectionCreate: {
              collection: {
                handle: "entral-store-iron-launch",
                id: "gid://shopify/Collection/1",
                title: "Iron House Gym Launch Collection"
              },
              userErrors: []
            }
          }
        });
      }

      if (body.query.includes("pageCreate")) {
        return jsonResponse({
          data: {
            pageCreate: {
              page: {
                handle: body.variables?.page?.handle,
                id: `gid://shopify/Page/${body.variables?.page?.handle}`,
                isPublished: false,
                title: body.variables?.page?.title
              },
              userErrors: []
            }
          }
        });
      }

      if (body.query.includes("menuCreate")) {
        return jsonResponse({
          data: {
            menuCreate: {
              menu: {
                handle: body.variables?.handle,
                id: "gid://shopify/Menu/1",
                title: body.variables?.title
              },
              userErrors: []
            }
          }
        });
      }

      return jsonResponse({
        data: {
          productSet: {
            product: {
              handle: "entral-store-iron-iron-house-core-tee",
              id: "gid://shopify/Product/1",
              status: "DRAFT",
              title: "Iron House Core Tee"
            },
            userErrors: []
          }
        }
      });
    });
    const plan = await executeShopifyStorefrontDraft({
      connectorApproval: true,
      credentials: {
        adminToken: "shpat_test",
        apiVersion: "2026-04",
        shopDomain: "https://iron-house.myshopify.com/admin"
      },
      dryRun: false,
      fetcher,
      liveUnlockPhrase: shopifyStorefrontDraftUnlockPhrase,
      products,
      store,
      storeId: "store_iron"
    });

    expect(plan.status).toBe("executed");
    expect(plan.externalExecution).toBe(true);
    expect(plan.providerContacted).toBe(true);
    expect(plan.providerContactedDomain).toBe("iron-house.myshopify.com");
    expect(plan.totals.executedActions).toBe(6);
    expect(plan.totals.pages).toBe(3);
    expect(plan.totals.navigationMenus).toBe(1);
    expect(plan.storefrontActions.every((action) => action.result?.resourceId)).toBe(true);
    expect(plan.launchReadiness.status).toBe("ready_for_review");
    expect(plan.launchReadiness.readyResourceCount).toBe(6);
    expect(plan.launchReadiness.reviewResources.some((resource) => resource.adminUrl === "https://iron-house.myshopify.com/admin/products/1")).toBe(true);
    expect(plan.launchReadiness.remainingApprovals.join(" ")).toContain("public launch approval");
    expect(fetcher).toHaveBeenCalledTimes(11);
    expect(String(fetcher.mock.calls[0]?.[0])).toBe("https://iron-house.myshopify.com/admin/api/2026-04/graphql.json");
  });

  it("verifies environment fallback credentials before live draft writes", async () => {
    process.env.SHOPIFY_STORE_DOMAIN = "iron-house.myshopify.com";
    process.env.SHOPIFY_CONNECTOR_ADMIN_TOKEN = "shpat_env_secret_1234";
    const {
      executeShopifyStorefrontDraft,
      shopifyStorefrontDraftUnlockPhrase
    } = await import("../src/services/shopifyStorefrontExecutor.js");
    const fetcher = vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { query: string };

      if (body.query.includes("EntralVerifyShopifyConnection")) {
        return jsonResponse({
          data: {
            currentAppInstallation: {
              accessScopes: [
                { handle: "read_products" }
              ]
            },
            shop: {
              id: "gid://shopify/Shop/1",
              myshopifyDomain: "iron-house.myshopify.com",
              name: "Iron House Gym"
            }
          }
        });
      }

      throw new Error("draft writes should not run until environment credentials verify");
    });
    const plan = await executeShopifyStorefrontDraft({
      connectorApproval: true,
      dryRun: false,
      fetcher,
      liveUnlockPhrase: shopifyStorefrontDraftUnlockPhrase,
      products,
      store,
      storeId: "store_iron"
    });

    expect(plan.status).toBe("failed");
    expect(plan.externalExecution).toBe(false);
    expect(plan.actualExternalActionsExecuted).toBe(false);
    expect(plan.providerContacted).toBe(true);
    expect(plan.providerContactedDomain).toBe("iron-house.myshopify.com");
    expect(plan.totals.failedActions).toBe(plan.storefrontActions.length);
    expect(plan.launchReadiness.status).toBe("blocked_by_failures");
    expect(plan.launchReadiness.nextAutonomousStep).toBe("repair_failed_draft_actions");
    expect(plan.launchReadiness.failedResourceCount).toBe(plan.storefrontActions.length);
    expect(plan.summary).toContain("Shopify connection verification failed");
    expect(plan.summary).toContain("write_products");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("skips existing draft resources by handle during live retries", async () => {
    const {
      executeShopifyStorefrontDraft,
      shopifyStorefrontDraftUnlockPhrase
    } = await import("../src/services/shopifyStorefrontExecutor.js");
    const fetcher = vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as {
        query: string;
        variables?: {
          identifier?: { handle?: string };
          input?: { handle?: string };
          query?: string;
        };
      };

      if (body.query.includes("collectionByIdentifier")) {
        return jsonResponse({
          data: {
            collectionByIdentifier: {
              handle: body.variables?.identifier?.handle,
              id: "gid://shopify/Collection/existing",
              title: "Iron House Gym Launch Collection"
            }
          }
        });
      }

      if (body.query.includes("pages(")) {
        const handle = String(body.variables?.query ?? "").replace(/^handle:/, "");

        return jsonResponse({
          data: {
            pages: {
              nodes: [{
                handle,
                id: `gid://shopify/Page/${handle}`,
                isPublished: false,
                title: "Existing page"
              }]
            }
          }
        });
      }

      if (body.query.includes("menus(")) {
        return jsonResponse({
          data: {
            menus: {
              nodes: [{
                handle: "entral-store-iron-launch-menu",
                id: "gid://shopify/Menu/existing",
                title: "Iron House Gym Draft Launch Menu"
              }]
            }
          }
        });
      }

      if (body.query.includes("collectionCreate") || body.query.includes("pageCreate") || body.query.includes("menuCreate")) {
        throw new Error("existing draft resources should not be created again");
      }

      return jsonResponse({
        data: {
          productSet: {
            product: {
              handle: body.variables?.input?.handle,
              id: "gid://shopify/Product/1",
              status: "DRAFT",
              title: "Iron House Core Tee"
            },
            userErrors: []
          }
        }
      });
    });
    const plan = await executeShopifyStorefrontDraft({
      connectorApproval: true,
      credentials: {
        adminToken: "shpat_test",
        apiVersion: "2026-04",
        shopDomain: "iron-house.myshopify.com"
      },
      dryRun: false,
      fetcher,
      liveUnlockPhrase: shopifyStorefrontDraftUnlockPhrase,
      products,
      store,
      storeId: "store_iron"
    });

    expect(plan.status).toBe("executed");
    expect(plan.externalExecution).toBe(true);
    expect(plan.actualExternalActionsExecuted).toBe(true);
    expect(plan.totals.executedActions).toBe(1);
    expect(plan.totals.skippedActions).toBe(5);
    expect(plan.totals.failedActions).toBe(0);
    expect(plan.storefrontActions.filter((action) => action.status === "skipped").every((action) => action.result?.resourceId)).toBe(true);
    expect(plan.summary).toContain("1 Shopify draft action completed and 5 existing draft resources skipped");
    expect(fetcher).toHaveBeenCalledTimes(6);
  });

  it("bridges an armed first-business live executor into Shopify draft storefront execution", async () => {
    const {
      buildRevenueAssetPortfolio,
      buildRevenueEnginePlan
    } = await import("../src/services/revenueEngine.js");
    const { buildRevenueMoneyArmyGenerateScoreBatchPlan } = await import("../src/services/revenueMoneyArmyGenerateScoreBatch.js");
    const {
      buildRevenueFirstBusinessAutonomousLaunchPlan,
      buildRevenueFirstBusinessExecutionPlan,
      buildRevenueFirstBusinessInternalLaunchPlan,
      buildRevenueFirstBusinessLiveExecutorPlan,
      buildRevenueFirstStorePreparationPlan
    } = await import("../src/services/revenueFirstStorePreparation.js");
    const {
      executeFirstBusinessShopifyAutonomyRun,
      executeFirstBusinessShopifyStorefrontDraft
    } = await import("../src/services/revenueFirstBusinessShopifyBridge.js");
    const { shopifyStorefrontDraftUnlockPhrase } = await import("../src/services/shopifyStorefrontExecutor.js");
    const sourceProducts = [
      engineProduct({ id: "product-source-1", productName: "Core Tee", listingTitle: "Iron House Core Tee" }),
      engineProduct({ id: "product-source-2", productName: "Operator Hoodie", productType: "Hoodie", retailPrice: 58 })
    ];
    const currentPortfolio = buildRevenueAssetPortfolio(buildRevenueEnginePlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: sourceProducts,
      stores: [engineStore]
    }));
    const sourceBatch = buildRevenueMoneyArmyGenerateScoreBatchPlan({
      currentPortfolio,
      options: {
        candidateCount: 12,
        generatedAt: "2026-06-02T12:30:00.000Z",
        riskTolerance: "Low"
      },
      products: sourceProducts,
      stores: [engineStore]
    });
    const preparation = buildRevenueFirstStorePreparationPlan({
      approvedAt: "2026-06-02T12:45:00.000Z",
      packagePlan: sourceBatch.firstBusinessLaunchPackage!
    });
    const launch = buildRevenueFirstBusinessInternalLaunchPlan({
      launchedAt: "2026-06-02T13:00:00.000Z",
      preparationPlan: preparation
    });
    const execution = buildRevenueFirstBusinessExecutionPlan({
      executedAt: "2026-06-02T13:15:00.000Z",
      launchPlan: launch
    });
    const autonomousLaunch = buildRevenueFirstBusinessAutonomousLaunchPlan({
      executedAt: "2026-06-02T13:30:00.000Z",
      executionPlan: execution
    });
    const liveExecutor = buildRevenueFirstBusinessLiveExecutorPlan({
      adDraftApproval: true,
      autonomousLaunch,
      connectorApproval: true,
      generatedAt: "2026-06-02T13:45:00.000Z",
      liveUnlockPhraseAccepted: true,
      publicLaunchApproval: true
    });
    const fetcher = vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { query: string; variables?: { page?: { handle?: string; title?: string }; handle?: string; title?: string } };

      if (body.query.includes("collectionByIdentifier")) {
        return jsonResponse({ data: { collectionByIdentifier: null } });
      }

      if (body.query.includes("pages(")) {
        return jsonResponse({ data: { pages: { nodes: [] } } });
      }

      if (body.query.includes("menus(")) {
        return jsonResponse({ data: { menus: { nodes: [] } } });
      }

      if (body.query.includes("collectionCreate")) {
        return jsonResponse({
          data: {
            collectionCreate: {
              collection: {
                handle: "entral-store-scale-launch",
                id: "gid://shopify/Collection/10",
                title: "Iron House Gym Launch Collection"
              },
              userErrors: []
            }
          }
        });
      }

      if (body.query.includes("pageCreate")) {
        return jsonResponse({
          data: {
            pageCreate: {
              page: {
                handle: body.variables?.page?.handle,
                id: `gid://shopify/Page/${body.variables?.page?.handle}`,
                isPublished: false,
                title: body.variables?.page?.title
              },
              userErrors: []
            }
          }
        });
      }

      if (body.query.includes("menuCreate")) {
        return jsonResponse({
          data: {
            menuCreate: {
              menu: {
                handle: body.variables?.handle,
                id: "gid://shopify/Menu/10",
                title: body.variables?.title
              },
              userErrors: []
            }
          }
        });
      }

      return jsonResponse({
        data: {
          productSet: {
            product: {
              handle: "entral-store-scale-iron-house-core-tee",
              id: "gid://shopify/Product/10",
              status: "DRAFT",
              title: "Iron House Core Tee"
            },
            userErrors: []
          }
        }
      });
    });
    const plan = await executeFirstBusinessShopifyStorefrontDraft({
      autonomousLaunch,
      connectorApproval: true,
      credentials: {
        adminToken: "shpat_test",
        apiVersion: "2026-04",
        shopDomain: "iron-house.myshopify.com"
      },
      dryRun: false,
      fetcher,
      liveExecutor,
      shopifyDraftUnlockPhrase: shopifyStorefrontDraftUnlockPhrase
    });

    expect(plan?.status).toBe("executed");
    expect(plan?.actualExternalActionsExecuted).toBe(true);
    expect(plan?.providerContacted).toBe(true);
    expect(plan?.totals.executedActions).toBe(plan?.storefrontActions.length);
    expect(plan?.storefrontActions.some((action) => action.mutationName === "productSet")).toBe(true);
    expect(plan?.storefrontActions.some((action) => action.mutationName === "collectionCreate")).toBe(true);
    expect(plan?.storefrontActions.some((action) => action.mutationName === "pageCreate")).toBe(true);
    expect(plan?.storefrontActions.some((action) => action.mutationName === "menuCreate")).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes((plan?.storefrontActions.length ?? 0) + (plan?.storefrontActions.filter((action) => action.kind !== "upsert_shopify_product_draft").length ?? 0));

    fetcher.mockClear();
    const autonomyRun = await executeFirstBusinessShopifyAutonomyRun({
      autonomousLaunch,
      connectorApproval: true,
      credentials: {
        adminToken: "shpat_test",
        apiVersion: "2026-04",
        shopDomain: "iron-house.myshopify.com"
      },
      dryRun: false,
      fetcher,
      liveExecutor,
      shopifyDraftUnlockPhrase: shopifyStorefrontDraftUnlockPhrase
    });

    expect(autonomyRun?.status).toBe("executed_shopify_draft");
    expect(autonomyRun?.provisioning.status).toBe("connected_existing_shop");
    expect(autonomyRun?.storefrontDraft?.status).toBe("executed");
    expect(autonomyRun?.nextAction).toBe("shopify_draft_complete");
    expect(fetcher).toHaveBeenCalledTimes((autonomyRun?.storefrontDraft?.storefrontActions.length ?? 0) + (autonomyRun?.storefrontDraft?.storefrontActions.filter((action) => action.kind !== "upsert_shopify_product_draft").length ?? 0));
  });
});
