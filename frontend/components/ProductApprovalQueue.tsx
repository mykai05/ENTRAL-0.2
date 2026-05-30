"use client";

import React from "react";
import { Archive, Check, Loader2, RotateCcw, ShieldAlert, X } from "lucide-react";
import { formatMerchCurrency, type PodProduct, type PodProductStatus } from "../lib/merch-store";

export type ProductApprovalAction = "approve" | "revise" | "reject" | "archive";

type ProductApprovalQueueProps = {
  isLoading: boolean;
  onAction: (product: PodProduct, action: ProductApprovalAction) => void;
  onRefresh: () => void;
  products: PodProduct[];
  updatingProductIds: Set<string>;
};

const actionStatus: Record<ProductApprovalAction, PodProductStatus> = {
  approve: "Approved",
  archive: "Archived",
  reject: "Rejected",
  revise: "Needs Revision"
};

function complianceRiskFor(product: PodProduct) {
  const notes = product.complianceNotes?.toLowerCase() ?? "";

  if (product.status === "Rejected" || notes.includes("high risk") || notes.includes("manual compliance review")) {
    return "High";
  }

  if (notes.includes("trademark") || notes.includes("copyright") || product.aiDisclosureNeeded || product.productionPartnerDisclosureNeeded) {
    return "Medium";
  }

  return "Low";
}

function readinessLabel(product: PodProduct) {
  if (product.status === "Approved") {
    return "Approved for publishing";
  }

  if (product.status === "Archived" || product.status === "Rejected") {
    return "Removed from publishing path";
  }

  return "Not publishing-ready";
}

export function ProductApprovalQueue({ isLoading, onAction, onRefresh, products, updatingProductIds }: ProductApprovalQueueProps) {
  return (
    <section className="product-approval-queue" aria-label="Generated product approval queue">
      <header>
        <div>
          <p className="eyebrow">Approval queue</p>
          <h3>Generated Products</h3>
          <small>Products remain blocked from publishing until they are explicitly approved.</small>
        </div>
        <button type="button" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? <Loader2 aria-hidden="true" size={15} /> : null}
          Refresh
        </button>
      </header>

      {products.length > 0 ? (
        <div className="product-approval-list">
          {products.map((product) => {
            const risk = complianceRiskFor(product);
            const isUpdating = updatingProductIds.has(product.id);

            return (
              <article className={`product-approval-card status-${product.status.toLowerCase().replace(/\s+/g, "-")}`} key={product.id}>
                <div className="product-approval-card-header">
                  <div>
                    <strong>{product.productName}</strong>
                    <span>{product.productType} / {product.status}</span>
                  </div>
                  <span className={`product-risk risk-${risk.toLowerCase()}`}>{risk} risk</span>
                </div>

                <dl>
                  <div>
                    <dt>Design Concept</dt>
                    <dd>{product.designConcept}</dd>
                  </div>
                  <div>
                    <dt>Prompt</dt>
                    <dd>{product.designPrompt}</dd>
                  </div>
                  <div>
                    <dt>Listing Title</dt>
                    <dd>{product.listingTitle ?? "Listing title pending"}</dd>
                  </div>
                  <div>
                    <dt>Price</dt>
                    <dd>{formatMerchCurrency(product.retailPrice)}</dd>
                  </div>
                  <div>
                    <dt>Estimated Profit</dt>
                    <dd>{formatMerchCurrency(product.estimatedProfit)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{readinessLabel(product)}</dd>
                  </div>
                </dl>

                {product.complianceNotes ? (
                  <div className="product-compliance-note">
                    <ShieldAlert aria-hidden="true" size={15} />
                    <p>{product.complianceNotes}</p>
                  </div>
                ) : null}

                <div className="product-approval-actions" aria-label={`Approval actions for ${product.productName}`}>
                  {([
                    ["approve", "Approve", Check],
                    ["revise", "Revise", RotateCcw],
                    ["reject", "Reject", X],
                    ["archive", "Archive", Archive]
                  ] as const).map(([action, label, Icon]) => (
                    <button
                      key={action}
                      type="button"
                      disabled={isUpdating || product.status === actionStatus[action]}
                      onClick={() => onAction(product, action)}
                    >
                      {isUpdating ? <Loader2 aria-hidden="true" size={14} /> : <Icon aria-hidden="true" size={14} />}
                      {label}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="product-approval-empty">{isLoading ? "Loading generated products..." : "No generated products are waiting in the approval queue."}</p>
      )}
    </section>
  );
}
