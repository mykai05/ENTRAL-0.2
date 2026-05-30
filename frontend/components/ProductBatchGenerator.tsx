"use client";

import React from "react";
import { Boxes, Loader2, WandSparkles } from "lucide-react";
import {
  formatMerchCurrency,
  productBatchRiskTolerances,
  productBatchSizes,
  type ClientMerchStore,
  type PodProduct,
  type ProductBatchRiskTolerance,
  type ProductBatchSize
} from "../lib/merch-store";

export type ProductBatchFormState = {
  audience: string;
  priceMax: number;
  priceMin: number;
  productCount: ProductBatchSize;
  productTypes: string;
  riskTolerance: ProductBatchRiskTolerance;
  storeId: string;
  styleDirection: string;
};

type ProductBatchGeneratorProps = {
  generatedProducts: PodProduct[];
  isGenerating: boolean;
  isLoadingStores: boolean;
  onChange: (next: ProductBatchFormState) => void;
  onGenerate: () => void;
  onRefreshStores: () => void;
  stores: ClientMerchStore[];
  value: ProductBatchFormState;
  warnings: string[];
};

export function ProductBatchGenerator({
  generatedProducts,
  isGenerating,
  isLoadingStores,
  onChange,
  onGenerate,
  onRefreshStores,
  stores,
  value,
  warnings
}: ProductBatchGeneratorProps) {
  const selectedStore = stores.find((store) => store.id === value.storeId) ?? null;

  function update<K extends keyof ProductBatchFormState>(key: K, nextValue: ProductBatchFormState[K]) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <section
      className="product-batch-tool"
      aria-label="Product batch generator"
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
    >
      <header>
        <span className="product-batch-icon">
          <Boxes aria-hidden="true" size={17} />
        </span>
        <div>
          <p className="eyebrow">Merch tool</p>
          <h3>Product Batch Generator</h3>
          <small>Generate POD product ideas, prompts, listings, pricing, and compliance notes for a selected Client Merch Store.</small>
        </div>
      </header>

      <div className="product-batch-grid">
        <label>
          <span>Store</span>
          <select value={value.storeId} onChange={(event) => update("storeId", event.target.value)} disabled={isLoadingStores}>
            <option value="">{isLoadingStores ? "Loading stores..." : "Select Client Merch Store"}</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.businessName} / {store.clientName}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Product types</span>
          <input value={value.productTypes} onChange={(event) => update("productTypes", event.target.value)} placeholder="T-shirts, Hoodies, Stickers" />
        </label>

        <label>
          <span>Batch size</span>
          <select value={value.productCount} onChange={(event) => update("productCount", Number(event.target.value) as ProductBatchSize)}>
            {productBatchSizes.map((size) => (
              <option key={size} value={size}>{size} products</option>
            ))}
          </select>
        </label>

        <label>
          <span>Risk tolerance</span>
          <select value={value.riskTolerance} onChange={(event) => update("riskTolerance", event.target.value as ProductBatchRiskTolerance)}>
            {productBatchRiskTolerances.map((risk) => (
              <option key={risk} value={risk}>{risk}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Style direction</span>
          <textarea value={value.styleDirection} onChange={(event) => update("styleDirection", event.target.value)} placeholder="Bold cyber-athletic merch with clean typography" />
        </label>

        <label>
          <span>Audience</span>
          <textarea value={value.audience} onChange={(event) => update("audience", event.target.value)} placeholder="Local gym members, founders, event attendees..." />
        </label>

        <label>
          <span>Min price</span>
          <input type="number" min={1} step="0.01" value={value.priceMin} onChange={(event) => update("priceMin", Number(event.target.value))} />
        </label>

        <label>
          <span>Max price</span>
          <input type="number" min={1} step="0.01" value={value.priceMax} onChange={(event) => update("priceMax", Number(event.target.value))} />
        </label>
      </div>

      {selectedStore ? (
        <p className="product-batch-context">
          Selected store uses {selectedStore.storePlatform} + {selectedStore.podProvider}. Current product lanes: {selectedStore.productTypes.length ? selectedStore.productTypes.join(", ") : "none set"}.
        </p>
      ) : (
        <p className="product-batch-context muted">Select a Client Merch Store before generating a product batch.</p>
      )}

      <div className="product-batch-actions">
        <button type="button" onClick={onRefreshStores} disabled={isLoadingStores}>
          {isLoadingStores ? <Loader2 aria-hidden="true" size={15} /> : null}
          Refresh stores
        </button>
        <button type="button" className="primary" onClick={onGenerate} disabled={isGenerating || !value.storeId}>
          {isGenerating ? <Loader2 aria-hidden="true" size={15} /> : <WandSparkles aria-hidden="true" size={15} />}
          Generate batch
        </button>
      </div>

      {warnings.length > 0 ? (
        <div className="product-batch-warnings">
          <strong>Compliance warnings</strong>
          {warnings.slice(0, 4).map((warning) => <span key={warning}>{warning}</span>)}
        </div>
      ) : null}

      {generatedProducts.length > 0 ? (
        <div className="product-batch-results" aria-label="Generated product drafts">
          {generatedProducts.slice(0, 5).map((product) => (
            <article key={product.id}>
              <strong>{product.productName}</strong>
              <span>{product.productType} / {formatMerchCurrency(product.retailPrice)} / {product.profitMargin.toFixed(1)}% margin</span>
              <p>{product.designConcept}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
