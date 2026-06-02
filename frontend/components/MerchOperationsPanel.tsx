"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, ClipboardCheck, FileText, LineChart, Loader2, LockKeyhole, Megaphone, PackageCheck, RefreshCcw, ShieldAlert, XCircle } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  formatMerchCurrency,
  type GrowthApprovalListResponse,
  type GrowthApprovalRecord,
  type GrowthApprovalResponse,
  type GrowthApprovalReviewResponse,
  type GrowthOrchestrationPreviewResponse,
  type GrowthPlan,
  merchAutomationLevels,
  merchReportTypes,
  pricingPlatformPresets,
  type ClientMerchStore,
  type EntralMerchReport,
  type LaunchPackage,
  type MerchAutomationLevel,
  type MerchReportType,
  type PricingCalculatorInput,
  type PricingCalculatorResponse,
  type PricingPlatformPreset
} from "../lib/merch-store";

type MerchOperationsPanelProps = {
  isLoadingStores: boolean;
  onEvent?: (message: string) => void;
  onRefreshStores: () => void;
  stores: ClientMerchStore[];
};

const automationStorageKey = "entral-merch-automation-level";

function readMerchStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeMerchStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Merch automation level persistence is best-effort.
  }
}

const presetDefaults: Record<PricingPlatformPreset, Pick<PricingCalculatorInput, "listingFee" | "paymentProcessingEstimate" | "platformFeePercent">> = {
  Etsy: {
    listingFee: 0.2,
    paymentProcessingEstimate: 3.25,
    platformFeePercent: 6.5
  },
  Manual: {
    listingFee: 0,
    paymentProcessingEstimate: 0,
    platformFeePercent: 0
  },
  Shopify: {
    listingFee: 0,
    paymentProcessingEstimate: 2.9,
    platformFeePercent: 0
  }
};

function readAutomationLevel(): MerchAutomationLevel {
  if (typeof window === "undefined") {
    return "assisted";
  }

  const stored = readMerchStorage(automationStorageKey);
  return merchAutomationLevels.some((level) => level.value === stored) ? stored as MerchAutomationLevel : "assisted";
}

function defaultPricingForm(preset: PricingPlatformPreset = "Etsy"): PricingCalculatorInput {
  return {
    adSpendEstimate: 0,
    preset,
    retailPrice: 29,
    shippingCost: 4.95,
    supplierCost: 9.8,
    ...presetDefaults[preset]
  };
}

export function MerchOperationsPanel({ isLoadingStores, onEvent, onRefreshStores, stores }: MerchOperationsPanelProps) {
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [automationLevel, setAutomationLevel] = useState<MerchAutomationLevel>(() => readAutomationLevel());
  const [pricingForm, setPricingForm] = useState<PricingCalculatorInput>(() => defaultPricingForm());
  const [pricing, setPricing] = useState<PricingCalculatorResponse | null>(null);
  const [isCalculatingPricing, setIsCalculatingPricing] = useState(false);
  const [launchPackage, setLaunchPackage] = useState<LaunchPackage | null>(null);
  const [growthPlan, setGrowthPlan] = useState<GrowthPlan | null>(null);
  const [growthApprovalResponse, setGrowthApprovalResponse] = useState<GrowthApprovalResponse | null>(null);
  const [growthApprovals, setGrowthApprovals] = useState<GrowthApprovalRecord[]>([]);
  const [growthApprovalSchedule, setGrowthApprovalSchedule] = useState("");
  const [reportType, setReportType] = useState<MerchReportType>("Store Launch Report");
  const [report, setReport] = useState<EntralMerchReport | null>(null);
  const [isGeneratingLaunchPackage, setIsGeneratingLaunchPackage] = useState(false);
  const [isGeneratingGrowthPlan, setIsGeneratingGrowthPlan] = useState(false);
  const [isRequestingGrowthApproval, setIsRequestingGrowthApproval] = useState(false);
  const [isLoadingGrowthApprovals, setIsLoadingGrowthApprovals] = useState(false);
  const [reviewingGrowthApprovalId, setReviewingGrowthApprovalId] = useState<string | null>(null);
  const [growthApprovalMessage, setGrowthApprovalMessage] = useState<string | null>(null);
  const [growthOrchestrationPreview, setGrowthOrchestrationPreview] = useState<GrowthOrchestrationPreviewResponse | null>(null);
  const [previewingGrowthApprovalId, setPreviewingGrowthApprovalId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? stores[0] ?? null,
    [selectedStoreId, stores]
  );
  const selectedAutomationLevel = merchAutomationLevels.find((level) => level.value === automationLevel) ?? merchAutomationLevels[1];

  useEffect(() => {
    if (!selectedStoreId && stores[0]) {
      setSelectedStoreId(stores[0].id);
    }
  }, [selectedStoreId, stores]);

  function updateAutomationLevel(nextLevel: MerchAutomationLevel) {
    setAutomationLevel(nextLevel);
    if (typeof window !== "undefined") {
      writeMerchStorage(automationStorageKey, nextLevel);
    }
    onEvent?.(`Merch automation level set to ${merchAutomationLevels.find((level) => level.value === nextLevel)?.label ?? nextLevel}.`);
  }

  function updatePricingForm<K extends keyof PricingCalculatorInput>(key: K, value: PricingCalculatorInput[K]) {
    setPricingForm((current) => {
      if (key === "preset") {
        const nextPreset = value as PricingPlatformPreset;
        return {
          ...current,
          preset: nextPreset,
          ...presetDefaults[nextPreset]
        };
      }

      return { ...current, [key]: value };
    });
  }

  async function calculatePricing() {
    setIsCalculatingPricing(true);
    setError(null);

    try {
      const response = await apiFetch<PricingCalculatorResponse>("/merch/pricing/calculate", {
        json: pricingForm,
        method: "POST"
      });
      setPricing(response);
      onEvent?.("Pricing calculator updated profit, margin, break-even, and recommended retail price.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pricing calculation failed.");
    } finally {
      setIsCalculatingPricing(false);
    }
  }

  async function generateLaunchPackage() {
    if (!selectedStore) {
      setError("Select a Client Merch Store before generating a launch package.");
      return;
    }

    setIsGeneratingLaunchPackage(true);
    setError(null);

    try {
      const response = await apiFetch<{ package: LaunchPackage }>(`/merch/stores/${selectedStore.id}/launch-package`);
      setLaunchPackage(response.package);
      onEvent?.(`Launch package generated for ${selectedStore.businessName}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Launch package generation failed.");
    } finally {
      setIsGeneratingLaunchPackage(false);
    }
  }

  async function generateReport() {
    if (!selectedStore) {
      setError("Select a Client Merch Store before generating a report.");
      return;
    }

    setIsGeneratingReport(true);
    setError(null);

    try {
      const response = await apiFetch<{ report: EntralMerchReport }>(`/merch/stores/${selectedStore.id}/reports/${encodeURIComponent(reportType)}`);
      setReport(response.report);
      onEvent?.(`${reportType} generated for ${selectedStore.businessName}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Report generation failed.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function generateGrowthPlan() {
    if (!selectedStore) {
      setError("Select a Client Merch Store before generating a growth plan.");
      return;
    }

    setIsGeneratingGrowthPlan(true);
    setError(null);

    try {
      const response = await apiFetch<{ plan: GrowthPlan }>(`/merch/stores/${selectedStore.id}/growth-plan`);
      setGrowthPlan(response.plan);
      setGrowthApprovalResponse(null);
      setGrowthOrchestrationPreview(null);
      onEvent?.(`Mock growth plan generated for ${selectedStore.businessName}. No external systems were contacted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Growth plan generation failed.");
    } finally {
      setIsGeneratingGrowthPlan(false);
    }
  }

  function upsertGrowthApproval(approval: GrowthApprovalRecord) {
    setGrowthApprovals((current) => {
      const withoutExisting = current.filter((item) => item.id !== approval.id);
      return [approval, ...withoutExisting].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  async function loadGrowthApprovals() {
    if (!selectedStore) {
      setError("Select a Client Merch Store before loading growth approvals.");
      return;
    }

    setIsLoadingGrowthApprovals(true);
    setError(null);

    try {
      const response = await apiFetch<GrowthApprovalListResponse>(`/merch/stores/${selectedStore.id}/growth-approvals`);
      setGrowthApprovals(response.items);
      onEvent?.(`Loaded ${response.items.length} growth approval packet${response.items.length === 1 ? "" : "s"} for ${selectedStore.businessName}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Growth approval queue could not be loaded.");
    } finally {
      setIsLoadingGrowthApprovals(false);
    }
  }

  async function requestGrowthApproval() {
    if (!selectedStore || !growthPlan) {
      setError("Build a growth plan before queuing an approval packet.");
      return;
    }

    let scheduledFor: string | undefined;

    if (growthApprovalSchedule) {
      const scheduledDate = new Date(growthApprovalSchedule);

      if (Number.isNaN(scheduledDate.getTime())) {
        setError("Choose a valid approval review time.");
        return;
      }

      scheduledFor = scheduledDate.toISOString();
    }

    setIsRequestingGrowthApproval(true);
    setError(null);

    try {
      const response = await apiFetch<GrowthApprovalResponse>(`/merch/stores/${selectedStore.id}/growth-plan/approval-request`, {
        json: {
          note: "Queued from the Growth & Scale Plan panel for human review.",
          scheduledFor
        },
        method: "POST"
      });
      setGrowthApprovalResponse(response);
      upsertGrowthApproval(response.approval);
      setGrowthApprovalMessage("Approval packet queued. External execution remains locked.");
      onEvent?.(`Growth approval packet queued for ${selectedStore.businessName}. Posting, storefront changes, ad spend, and analytics imports remain locked.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Growth approval packet could not be queued.");
    } finally {
      setIsRequestingGrowthApproval(false);
    }
  }

  async function reviewGrowthApproval(approval: GrowthApprovalRecord, action: "approve" | "reject") {
    if (!selectedStore) {
      setError("Select a Client Merch Store before reviewing growth approvals.");
      return;
    }

    setReviewingGrowthApprovalId(approval.id);
    setError(null);
    setGrowthApprovalMessage(null);

    try {
      const response = await apiFetch<GrowthApprovalReviewResponse>(`/merch/stores/${selectedStore.id}/growth-approvals/${approval.id}/${action}`, {
        json: {
          note: action === "approve"
            ? "Approved for preparation only. External execution remains locked."
            : "Rejected from the Growth & Scale Plan review queue."
        },
        method: "POST"
      });
      upsertGrowthApproval(response.approval);
      setGrowthApprovalMessage(response.message);
      setGrowthOrchestrationPreview(null);
      onEvent?.(response.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Growth approval review failed.");
    } finally {
      setReviewingGrowthApprovalId(null);
    }
  }

  async function previewGrowthOrchestration(approval: GrowthApprovalRecord) {
    if (!selectedStore) {
      setError("Select a Client Merch Store before previewing growth orchestration.");
      return;
    }

    setPreviewingGrowthApprovalId(approval.id);
    setError(null);

    try {
      const response = await apiFetch<GrowthOrchestrationPreviewResponse>(`/merch/stores/${selectedStore.id}/growth-approvals/${approval.id}/orchestration-preview`);
      setGrowthOrchestrationPreview(response);
      setGrowthApprovalMessage("Read-only orchestration preview generated. No external systems were contacted.");
      onEvent?.("Read-only growth orchestration preview generated. External execution remains locked.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Growth orchestration preview failed.");
    } finally {
      setPreviewingGrowthApprovalId(null);
    }
  }

  return (
    <section className="merch-operations-panel" aria-label="Merch service operations">
      <header>
        <span className="product-batch-icon">
          <PackageCheck aria-hidden="true" size={17} />
        </span>
        <div>
          <p className="eyebrow">Merch command</p>
          <h3>Operations, Pricing & Reports</h3>
          <small>Manual approval remains required before publishing, contacting clients, deleting records, or changing launch status.</small>
        </div>
      </header>

      <div className="merch-ops-grid">
        <label>
          <span>Client Merch Store</span>
          <select value={selectedStore?.id ?? ""} onChange={(event) => setSelectedStoreId(event.target.value)} disabled={isLoadingStores}>
            <option value="">{isLoadingStores ? "Loading stores..." : "Select store"}</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.businessName} / {store.clientName}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Automation Level</span>
          <select value={automationLevel} onChange={(event) => updateAutomationLevel(event.target.value as MerchAutomationLevel)}>
            {merchAutomationLevels.map((level) => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="merch-automation-note">
        <strong>{selectedAutomationLevel.label}</strong>
        <span>{selectedAutomationLevel.description}</span>
      </p>

      <div className="merch-ops-actions">
        <button type="button" onClick={onRefreshStores} disabled={isLoadingStores}>
          {isLoadingStores ? <Loader2 aria-hidden="true" size={15} /> : <RefreshCcw aria-hidden="true" size={15} />}
          Refresh stores
        </button>
      </div>

      <div className="merch-pricing-card">
        <div className="merch-tool-title">
          <Calculator aria-hidden="true" size={16} />
          <strong>Pricing Calculator</strong>
        </div>
        <div className="merch-ops-grid compact">
          <label>
            <span>Preset</span>
            <select value={pricingForm.preset} onChange={(event) => updatePricingForm("preset", event.target.value as PricingPlatformPreset)}>
              {pricingPlatformPresets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}
            </select>
          </label>
          <label>
            <span>Supplier Cost</span>
            <input type="number" min={0} step="0.01" value={pricingForm.supplierCost} onChange={(event) => updatePricingForm("supplierCost", Number(event.target.value))} />
          </label>
          <label>
            <span>Shipping Cost</span>
            <input type="number" min={0} step="0.01" value={pricingForm.shippingCost} onChange={(event) => updatePricingForm("shippingCost", Number(event.target.value))} />
          </label>
          <label>
            <span>Retail Price</span>
            <input type="number" min={0} step="0.01" value={pricingForm.retailPrice} onChange={(event) => updatePricingForm("retailPrice", Number(event.target.value))} />
          </label>
          <label>
            <span>Platform Fee %</span>
            <input type="number" min={0} max={95} step="0.1" value={pricingForm.platformFeePercent ?? 0} onChange={(event) => updatePricingForm("platformFeePercent", Number(event.target.value))} />
          </label>
          <label>
            <span>Listing Fee</span>
            <input type="number" min={0} step="0.01" value={pricingForm.listingFee ?? 0} onChange={(event) => updatePricingForm("listingFee", Number(event.target.value))} />
          </label>
          <label>
            <span>Processing</span>
            <input type="number" min={0} step="0.01" value={pricingForm.paymentProcessingEstimate ?? 0} onChange={(event) => updatePricingForm("paymentProcessingEstimate", Number(event.target.value))} />
          </label>
          <label>
            <span>Ad Spend</span>
            <input type="number" min={0} step="0.01" value={pricingForm.adSpendEstimate} onChange={(event) => updatePricingForm("adSpendEstimate", Number(event.target.value))} />
          </label>
        </div>
        <div className="merch-ops-actions">
          <button type="button" className="primary" onClick={calculatePricing} disabled={isCalculatingPricing}>
            {isCalculatingPricing ? <Loader2 aria-hidden="true" size={15} /> : <Calculator aria-hidden="true" size={15} />}
            Calculate
          </button>
        </div>
        {pricing ? (
          <dl className="merch-pricing-results">
            <div>
              <dt>Estimated Profit</dt>
              <dd>{formatMerchCurrency(pricing.pricing.estimatedProfit)}</dd>
            </div>
            <div>
              <dt>Profit Margin</dt>
              <dd>{pricing.pricing.profitMargin.toFixed(1)}%</dd>
            </div>
            <div>
              <dt>Break-even</dt>
              <dd>{formatMerchCurrency(pricing.pricing.breakEvenPrice)}</dd>
            </div>
            <div>
              <dt>Recommended Retail</dt>
              <dd>{formatMerchCurrency(pricing.pricing.recommendedRetailPrice)}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className="merch-report-card">
        <div className="merch-tool-title">
          <FileText aria-hidden="true" size={16} />
          <strong>Launch Package & Reports</strong>
        </div>
        <div className="merch-ops-grid">
          <label>
            <span>Report Type</span>
            <select value={reportType} onChange={(event) => setReportType(event.target.value as MerchReportType)}>
              {merchReportTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
        </div>
        <div className="merch-ops-actions split">
          <button type="button" onClick={generateLaunchPackage} disabled={isGeneratingLaunchPackage || !selectedStore}>
            {isGeneratingLaunchPackage ? <Loader2 aria-hidden="true" size={15} /> : <PackageCheck aria-hidden="true" size={15} />}
            Build package
          </button>
          <button type="button" className="primary" onClick={generateReport} disabled={isGeneratingReport || !selectedStore}>
            {isGeneratingReport ? <Loader2 aria-hidden="true" size={15} /> : <FileText aria-hidden="true" size={15} />}
            Generate report
          </button>
        </div>
        {launchPackage ? (
          <div className="merch-launch-package-result">
            <strong>Launch Package</strong>
            <p>{launchPackage.productCollectionSummary}</p>
            <span>{launchPackage.approvedProducts.length} approved products included</span>
            <span>{launchPackage.listingDrafts.length} listing drafts ready for review</span>
            <span>{launchPackage.complianceNotes.length} compliance notes attached</span>
          </div>
        ) : null}
        {report ? (
          <article className="merch-report-result">
            <strong>{report.title}</strong>
            <p><b>Situation:</b> {report.situation}</p>
            <p><b>Analysis:</b> {report.analysis}</p>
            <p><b>Recommendation:</b> {report.recommendation}</p>
            <div>
              <b>Next Actions:</b>
              {report.nextActions.map((action) => <span key={action}>{action}</span>)}
            </div>
          </article>
        ) : null}
      </div>

      <div className="merch-growth-card">
        <div className="merch-tool-title">
          <Megaphone aria-hidden="true" size={16} />
          <strong>Growth & Scale Plan</strong>
        </div>
        <p className="merch-automation-note">
          <strong>Mock Mode / Approval Required</strong>
          <span>Prepares social, Shopify, ad, and analytics work for review. Posting, store changes, ad spend, and data imports stay locked.</span>
        </p>
        <div className="merch-ops-actions">
          <button type="button" className="primary" onClick={generateGrowthPlan} disabled={isGeneratingGrowthPlan || !selectedStore}>
            {isGeneratingGrowthPlan ? <Loader2 aria-hidden="true" size={15} /> : <LineChart aria-hidden="true" size={15} />}
            Build growth plan
          </button>
          <button type="button" onClick={loadGrowthApprovals} disabled={isLoadingGrowthApprovals || !selectedStore}>
            {isLoadingGrowthApprovals ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
            Load review queue
          </button>
        </div>

        {growthPlan ? (
          <div className="growth-plan-result">
            <div className="growth-readiness">
              <span>Readiness</span>
              <strong>{growthPlan.readinessScore}/100</strong>
              <p>{growthPlan.summary}</p>
            </div>

            <div className="growth-plan-grid">
              <section aria-label="Prepared content drafts">
                <h4>Content drafts</h4>
                {growthPlan.contentDrafts.map((draft) => (
                  <article key={draft.title}>
                    <span>{draft.channel} / {draft.approvalStatus}</span>
                    <strong>{draft.title}</strong>
                    <p>{draft.copy}</p>
                  </article>
                ))}
              </section>

              <section aria-label="Spend-locked ad campaign drafts">
                <h4>Ad drafts</h4>
                {growthPlan.adCampaignDrafts.map((campaign) => (
                  <article key={campaign.name}>
                    <span>{campaign.status}</span>
                    <strong>{campaign.name}</strong>
                    <p>{campaign.objective}</p>
                    <small>{campaign.budgetGuardrail}</small>
                  </article>
                ))}
              </section>

              <section aria-label="Growth approval queue">
                <h4>Approval queue</h4>
                {growthPlan.approvalQueue.map((item) => (
                  <p key={item}><LockKeyhole aria-hidden="true" size={14} /> {item}</p>
                ))}
              </section>

              <section aria-label="Growth analytics loop">
                <h4>Analytics loop</h4>
                {growthPlan.analyticsLoop.map((item) => (
                  <article key={`${item.metric}-${item.cadence}`}>
                    <span>{item.cadence}</span>
                    <strong>{item.metric}</strong>
                    <p>{item.source}</p>
                    <small>{item.guardrail}</small>
                  </article>
                ))}
              </section>
            </div>

            <div className="growth-blocked-actions">
              <strong>Blocked until explicit approval</strong>
              {growthPlan.blockedActions.map((action) => <span key={action}>{action}</span>)}
            </div>

            <div className="growth-approval-request">
              <label>
                <span>Approval review time</span>
                <input
                  aria-label="Growth approval review time"
                  type="datetime-local"
                  value={growthApprovalSchedule}
                  onChange={(event) => setGrowthApprovalSchedule(event.target.value)}
                />
              </label>
              <button type="button" onClick={requestGrowthApproval} disabled={isRequestingGrowthApproval}>
                {isRequestingGrowthApproval ? <Loader2 aria-hidden="true" size={15} /> : <ClipboardCheck aria-hidden="true" size={15} />}
                Queue approval packet
              </button>
              <small>No publishing, storefront updates, ad spend, or analytics imports happen from this packet.</small>
            </div>

            {growthApprovalResponse ? (
              <section className="growth-approval-packet" aria-label="Queued growth approval packet">
                <div>
                  <span>{growthApprovalResponse.packet.mode} / {growthApprovalResponse.packet.status}</span>
                  <strong>Approval packet queued</strong>
                  <p>{growthApprovalResponse.packet.summary}</p>
                  <small>Audit log: {growthApprovalResponse.auditLogId}</small>
                </div>
                <div className="growth-approval-actions">
                  {growthApprovalResponse.packet.actions.map((action) => (
                    <article key={action.id}>
                      <span>{action.channel} / {action.approvalStatus}</span>
                      <strong>{action.title}</strong>
                      <p>{action.executionState}</p>
                    </article>
                  ))}
                </div>
                <p>{growthApprovalResponse.packet.costGuardrail}</p>
              </section>
            ) : null}
          </div>
        ) : null}

        {growthApprovalMessage ? <p className="growth-approval-message" role="status">{growthApprovalMessage}</p> : null}

        {growthApprovals.length > 0 ? (
          <section className="growth-approval-review-list" aria-label="Growth approval review queue">
            <header>
              <strong>Growth approval queue</strong>
              <span>Real review records / external execution locked</span>
            </header>
            {growthApprovals.map((approval) => (
              <article key={approval.id}>
                <div>
                  <span>{approval.mode} / {approval.statusLabel}</span>
                  <strong>{approval.packet.businessName}</strong>
                  <p>{approval.packet.summary}</p>
                  <small>{approval.executionState} / Audit: {approval.reviewAuditLogId ?? approval.auditLogId ?? "pending"}</small>
                </div>
                {approval.status === "pending" ? (
                  <div className="growth-review-actions">
                    <button type="button" onClick={() => reviewGrowthApproval(approval, "approve")} disabled={reviewingGrowthApprovalId === approval.id}>
                      {reviewingGrowthApprovalId === approval.id ? <Loader2 aria-hidden="true" size={14} /> : <CheckCircle2 aria-hidden="true" size={14} />}
                      Approve preparation
                    </button>
                    <button type="button" onClick={() => reviewGrowthApproval(approval, "reject")} disabled={reviewingGrowthApprovalId === approval.id}>
                      <XCircle aria-hidden="true" size={14} />
                      Reject packet
                    </button>
                  </div>
                ) : null}
                {approval.status === "approved" ? (
                  <div className="growth-review-actions">
                    <button type="button" onClick={() => previewGrowthOrchestration(approval)} disabled={previewingGrowthApprovalId === approval.id}>
                      {previewingGrowthApprovalId === approval.id ? <Loader2 aria-hidden="true" size={14} /> : <LineChart aria-hidden="true" size={14} />}
                      Preview locked schedule
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}

        {growthOrchestrationPreview ? (
          <section className="growth-orchestration-preview" aria-label="Locked growth orchestration preview">
            <header>
              <span>{growthOrchestrationPreview.preview.mode} / {growthOrchestrationPreview.preview.status}</span>
              <strong>Locked orchestration preview</strong>
              <p>{growthOrchestrationPreview.preview.summary}</p>
              <small>Audit log: {growthOrchestrationPreview.auditLogId} / External spend: {growthOrchestrationPreview.preview.estimatedExternalSpendCents} cents / AI cost: {growthOrchestrationPreview.preview.estimatedAiCostCents} cents</small>
            </header>
            <div className="growth-orchestration-steps">
              {growthOrchestrationPreview.preview.steps.map((step) => (
                <article key={step.actionId}>
                  <span>{step.channel} / {step.status}</span>
                  <strong>{step.title}</strong>
                  <p>{step.executionState}</p>
                  <small>{step.guardrail}</small>
                </article>
              ))}
            </div>
            <p>{growthOrchestrationPreview.preview.auditEvents.join(" ")}</p>
          </section>
        ) : null}
      </div>

      <p className="merch-compliance-disclaimer">
        <ShieldAlert aria-hidden="true" size={15} />
        Compliance warnings are operational risk signals only, not legal advice. Flagged products require user approval before publishing.
      </p>

      {error ? <p className="merch-ops-error" role="alert">{error}</p> : null}
    </section>
  );
}
