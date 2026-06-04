import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MerchProductSnapshot, MerchStoreSnapshot } from "../src/services/merchReports.js";

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

describe("Shopify Autonomy Run", () => {
  beforeEach(resetEnv);

  it("blocks at store creation and connection when no Shopify shop is connected", async () => {
    const { executeShopifyAutonomyRun } = await import("../src/services/shopifyAutonomyRun.js");
    const plan = await executeShopifyAutonomyRun({
      dryRun: false,
      products,
      store,
      storeId: "store-1"
    });

    expect(plan.status).toBe("blocked_store_creation_required");
    expect(plan.nextAction).toBe("connect_shopify_admin");
    expect(plan.storefrontDraft).toBeNull();
    expect(plan.providerContacted).toBe(false);
    expect(plan.externalExecution).toBe(false);
  });

  it("chains into Shopify draft execution when credentials and owner gates are present", async () => {
    const { executeShopifyAutonomyRun } = await import("../src/services/shopifyAutonomyRun.js");
    const { shopifyStorefrontDraftUnlockPhrase } = await import("../src/services/shopifyStorefrontExecutor.js");
    const fetcher = vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as {
        query: string;
        variables?: {
          handle?: string;
          identifier?: { handle?: string };
          input?: { handle?: string };
          page?: { handle?: string; title?: string };
          query?: string;
          title?: string;
        };
      };

      if (body.query.includes("collectionByIdentifier")) {
        return {
          json: async () => ({
            data: {
              collectionByIdentifier: null
            }
          }),
          ok: true,
          status: 200
        };
      }

      if (body.query.includes("pages(")) {
        return {
          json: async () => ({
            data: {
              pages: {
                nodes: []
              }
            }
          }),
          ok: true,
          status: 200
        };
      }

      if (body.query.includes("menus(")) {
        return {
          json: async () => ({
            data: {
              menus: {
                nodes: []
              }
            }
          }),
          ok: true,
          status: 200
        };
      }

      if (body.query.includes("pageCreate")) {
        return {
          json: async () => ({
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
          }),
          ok: true,
          status: 200
        };
      }

      if (body.query.includes("menuCreate")) {
        return {
          json: async () => ({
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
          }),
          ok: true,
          status: 200
        };
      }

      const isProduct = body.variables?.input?.handle === "entral-store-1-iron-house-core-tee";

      return {
        json: async () => isProduct ? {
          data: {
            productSet: {
              product: {
                handle: "entral-store-1-iron-house-core-tee",
                id: "gid://shopify/Product/1"
              },
              userErrors: []
            }
          }
        } : {
          data: {
            collectionCreate: {
              collection: {
                handle: "entral-store-1-launch",
                id: "gid://shopify/Collection/1"
              },
              userErrors: []
            }
          }
        },
        ok: true,
        status: 200
      };
    });

    const plan = await executeShopifyAutonomyRun({
      connectorApproval: true,
      credentials: {
        adminToken: "shpat_test_token",
        apiVersion: "2026-04",
        shopDomain: "iron-house.myshopify.com"
      },
      dryRun: false,
      fetcher,
      liveUnlockPhrase: shopifyStorefrontDraftUnlockPhrase,
      products,
      store,
      storeId: "store-1"
    });

    expect(plan.status).toBe("executed_shopify_draft");
    expect(plan.nextAction).toBe("shopify_draft_complete");
    expect(plan.provisioning.status).toBe("connected_existing_shop");
    expect(plan.storefrontDraft?.status).toBe("executed");
    expect(plan.storefrontDraft?.launchReadiness.status).toBe("ready_for_review");
    expect(plan.storefrontDraft?.launchReadiness.nextAutonomousStep).toBe("review_draft_resources");
    expect(plan.actualExternalActionsExecuted).toBe(true);
    expect(plan.providerContacted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(11);
  });
});
