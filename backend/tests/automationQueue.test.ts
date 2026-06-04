import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
});

describe("automation queue Shopify browser recovery", () => {
  it("reserves pending queue capacity for recovered Shopify browser jobs", async () => {
    const { automationPendingSlotsAfterRecoveredBrowserJobs } = await import("../src/services/automationQueue.js");

    expect(automationPendingSlotsAfterRecoveredBrowserJobs(3, 0)).toBe(3);
    expect(automationPendingSlotsAfterRecoveredBrowserJobs(3, 2)).toBe(1);
    expect(automationPendingSlotsAfterRecoveredBrowserJobs(3, 4)).toBe(0);
  });

  it("parses Shopify browser task payloads without throwing on unreadable evidence", async () => {
    const { parseShopifyStoreCreationBrowserTaskPayloadJson } = await import("../src/services/automationQueue.js");

    expect(parseShopifyStoreCreationBrowserTaskPayloadJson("{not-json")).toEqual({
      ok: false,
      reason: "payload_json_unreadable"
    });
    expect(parseShopifyStoreCreationBrowserTaskPayloadJson(JSON.stringify({}))).toEqual({
      ok: false,
      reason: "payload_schema_invalid"
    });
  });

  it("parses Shopify store-creation browser receipt status from job results", async () => {
    const { shopifyStoreCreationBrowserTaskReceiptStatusFromResultJson } = await import("../src/services/automationQueue.js");

    expect(shopifyStoreCreationBrowserTaskReceiptStatusFromResultJson(JSON.stringify({
      receipt: {
        status: "blocked_operator_gate"
      }
    }))).toBe("blocked_operator_gate");
    expect(shopifyStoreCreationBrowserTaskReceiptStatusFromResultJson("{not-json")).toBeNull();
    expect(shopifyStoreCreationBrowserTaskReceiptStatusFromResultJson(null)).toBeNull();
  });

  it("auto-requeues completed recoverable Shopify browser tasks only when dashboard session is ready", async () => {
    const { shouldAutoRequeueShopifyStoreCreationBrowserTask } = await import("../src/services/automationQueue.js");
    const recoverableResultJson = JSON.stringify({
      receipt: {
        status: "blocked_operator_gate"
      }
    });

    expect(shouldAutoRequeueShopifyStoreCreationBrowserTask({
      recoveryLogCount: 0,
      resultJson: recoverableResultJson,
      sessionStorageStateStatus: "ready",
      status: "completed",
      type: "shopify_store_creation_browser_task"
    })).toBe(true);
    expect(shouldAutoRequeueShopifyStoreCreationBrowserTask({
      recoveryLogCount: 0,
      resultJson: recoverableResultJson,
      sessionStorageStateStatus: "missing",
      status: "completed",
      type: "shopify_store_creation_browser_task"
    })).toBe(false);
    expect(shouldAutoRequeueShopifyStoreCreationBrowserTask({
      recoveryLogCount: 1,
      resultJson: recoverableResultJson,
      sessionStorageStateStatus: "ready",
      status: "completed",
      type: "shopify_store_creation_browser_task"
    })).toBe(false);
  });

  it("does not auto-requeue completed Shopify browser hard stops", async () => {
    const { shouldAutoRequeueShopifyStoreCreationBrowserTask } = await import("../src/services/automationQueue.js");

    expect(shouldAutoRequeueShopifyStoreCreationBrowserTask({
      recoveryLogCount: 0,
      resultJson: JSON.stringify({
        receipt: {
          status: "blocked_hard_stop"
        }
      }),
      sessionStorageStateStatus: "ready",
      status: "completed",
      type: "shopify_store_creation_browser_task"
    })).toBe(false);
  });

  it("recovers capture-ready Shopify browser evidence only after OAuth app credentials exist", async () => {
    const { shouldRecoverShopifyStoreCreationBrowserTaskAutoCapture } = await import("../src/services/automationQueue.js");
    const captureReadyResultJson = JSON.stringify({
      receipt: {
        autoCapture: null,
        autoCaptureError: "Shopify OAuth app credentials are missing: SHOPIFY_APP_API_KEY.",
        detectedDomain: "iron-house-gym.myshopify.com",
        status: "capture_ready"
      }
    });

    expect(shouldRecoverShopifyStoreCreationBrowserTaskAutoCapture({
      captureRecoveryLogCount: 0,
      oauthAppConfigured: true,
      resultJson: captureReadyResultJson,
      status: "completed",
      type: "shopify_store_creation_browser_task"
    })).toBe(true);
    expect(shouldRecoverShopifyStoreCreationBrowserTaskAutoCapture({
      captureRecoveryLogCount: 0,
      oauthAppConfigured: false,
      resultJson: captureReadyResultJson,
      status: "completed",
      type: "shopify_store_creation_browser_task"
    })).toBe(false);
    expect(shouldRecoverShopifyStoreCreationBrowserTaskAutoCapture({
      captureRecoveryLogCount: 1,
      oauthAppConfigured: true,
      resultJson: captureReadyResultJson,
      status: "completed",
      type: "shopify_store_creation_browser_task"
    })).toBe(false);
  });

  it("does not recover capture-ready Shopify browser evidence after auto-capture is done", async () => {
    const {
      shouldRecoverShopifyStoreCreationBrowserTaskAutoCapture,
      shopifyStoreCreationBrowserTaskAutoCaptureStateFromResultJson
    } = await import("../src/services/automationQueue.js");
    const capturedResultJson = JSON.stringify({
      receipt: {
        autoCapture: {
          auditLogId: "audit_1"
        },
        autoCaptureError: null,
        detectedDomain: "iron-house-gym.myshopify.com",
        status: "capture_ready"
      }
    });

    expect(shopifyStoreCreationBrowserTaskAutoCaptureStateFromResultJson(capturedResultJson)).toMatchObject({
      autoCaptureDone: true,
      detectedDomain: "iron-house-gym.myshopify.com",
      status: "capture_ready"
    });
    expect(shouldRecoverShopifyStoreCreationBrowserTaskAutoCapture({
      captureRecoveryLogCount: 0,
      oauthAppConfigured: true,
      resultJson: capturedResultJson,
      status: "completed",
      type: "shopify_store_creation_browser_task"
    })).toBe(false);
  });
});
