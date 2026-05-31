"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calculator, FileText, Loader2, PackageCheck, RefreshCcw, ShieldAlert } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  formatMerchCurrency,
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
  const [reportType, setReportType] = useState<MerchReportType>("Store Launch Report");
  const [report, setReport] = useState<EntralMerchReport | null>(null);
  const [isGeneratingLaunchPackage, setIsGeneratingLaunchPackage] = useState(false);
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

      <p className="merch-compliance-disclaimer">
        <ShieldAlert aria-hidden="true" size={15} />
        Compliance warnings are operational risk signals only, not legal advice. Flagged products require user approval before publishing.
      </p>

      {error ? <p className="merch-ops-error" role="alert">{error}</p> : null}
    </section>
  );
}
