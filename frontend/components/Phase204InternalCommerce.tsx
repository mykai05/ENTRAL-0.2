"use client";

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Database,
  ExternalLink,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Store,
  X
} from "lucide-react";
import React, { useState } from "react";
import {
  PHASE204_INTERNAL_BUSINESS_CODE,
  PHASE204_METRIC_CODES,
  PHASE204_PRODUCTS,
  phase204MetricCells,
  phase204ProductTitle,
  phase204PublicationActionAllowed,
  phase204ScopeLabel,
  validatePhase204InternalCommerceReadback,
  type Phase204CommerceControl,
  type Phase204ControlAction,
  type Phase204InternalCommerceReadback,
  type Phase204InternalCommerceProduct,
  type Phase204MetricCell,
  type Phase204MfaState,
  type Phase204OperationalMetric,
  type Phase204ProductCode
} from "../lib/phase204-internal-commerce";
import { Button } from "./Button";

type PanelAction = Phase204ControlAction | "PUBLISH_APPROVED_STOREFRONT";

export type Phase204ControlCommand = {
  readonly action: Phase204ControlAction;
  readonly businessBoundaryId: string;
  readonly reason: string;
};

export type Phase204ApprovedPublicationCommand = {
  readonly ownerApprovalId: string;
  readonly storefrontId: string;
};

export type Phase204InternalCommerceProps = {
  readonly errorMessage?: string;
  readonly mfaState?: Partial<Record<PanelAction, Phase204MfaState>>;
  readonly onControlAction?: (command: Phase204ControlCommand) => Promise<void> | void;
  readonly onPublishApprovedStorefront?: (command: Phase204ApprovedPublicationCommand) => Promise<void> | void;
  readonly onRefresh?: () => Promise<void> | void;
  readonly pendingAction?: PanelAction | "REFRESH" | null;
  readonly readback?: unknown;
  readonly status: "error" | "loading" | "ready";
};

const actionContent: Readonly<Record<Phase204ControlAction, {
  buttonLabel: string;
  confirmation: string;
  description: string;
  title: string;
}>> = {
  DISABLE_PUBLICATION: {
    buttonLabel: "Disable publication",
    confirmation: "Confirm publication disable",
    description: "Keep every listing unavailable for publication while preserving provider and evidence history.",
    title: "Publication disable"
  },
  KILL_BUSINESS: {
    buttonLabel: "Kill business",
    confirmation: "Confirm permanent kill",
    description: "Retire the canonical business and its mission-owned operating hierarchy. Evidence remains immutable.",
    title: "Business kill"
  },
  PAUSE_BUSINESS: {
    buttonLabel: "Pause business",
    confirmation: "Confirm business pause",
    description: "Pause active commerce work without deleting canonical business, mission, task, or evidence records.",
    title: "Business pause"
  }
};

const styles = `
  .phase204-commerce {
    --p204-accent: #a7f3d0;
    --p204-border: rgba(148, 163, 184, .24);
    --p204-danger: #fca5a5;
    --p204-muted: #94a3b8;
    --p204-panel: rgba(15, 23, 42, .72);
    container: phase204 / inline-size;
    display: grid;
    gap: 1rem;
    min-width: 0;
  }
  .phase204-commerce * { box-sizing: border-box; }
  .phase204-commerce > header,
  .phase204-commerce-card,
  .phase204-state,
  .phase204-confirmation {
    background: var(--p204-panel);
    border: 1px solid var(--p204-border);
    border-radius: 1rem;
  }
  .phase204-commerce > header {
    align-items: flex-start;
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    padding: 1rem;
  }
  .phase204-commerce h2,
  .phase204-commerce h3,
  .phase204-commerce h4,
  .phase204-commerce p { margin-top: 0; }
  .phase204-commerce > header p,
  .phase204-commerce-card > header p { color: var(--p204-muted); margin-bottom: 0; }
  .phase204-eyebrow {
    color: var(--p204-accent);
    font-size: .72rem;
    font-weight: 800;
    letter-spacing: .12em;
    margin-bottom: .35rem;
    text-transform: uppercase;
  }
  .phase204-commerce-grid {
    display: grid;
    gap: .85rem;
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .phase204-commerce-card { grid-column: span 12; min-width: 0; padding: 1rem; }
  .phase204-commerce-card.half { grid-column: span 6; }
  .phase204-commerce-card > header {
    align-items: flex-start;
    display: flex;
    gap: .65rem;
    justify-content: space-between;
    margin-bottom: .9rem;
  }
  .phase204-commerce-card > header svg { color: var(--p204-accent); flex: 0 0 auto; }
  .phase204-facts,
  .phase204-product-grid,
  .phase204-capability-grid,
  .phase204-control-grid,
  .phase204-metric-grid {
    display: grid;
    gap: .7rem;
    grid-template-columns: repeat(auto-fit, minmax(13.5rem, 1fr));
  }
  .phase204-fact,
  .phase204-product,
  .phase204-capability,
  .phase204-control,
  .phase204-metric {
    background: rgba(15, 23, 42, .52);
    border: 1px solid var(--p204-border);
    border-radius: .8rem;
    min-width: 0;
    padding: .8rem;
  }
  .phase204-fact span,
  .phase204-product small,
  .phase204-capability small,
  .phase204-control small,
  .phase204-metric small,
  .phase204-listing small { color: var(--p204-muted); display: block; }
  .phase204-fact strong,
  .phase204-product strong,
  .phase204-capability strong,
  .phase204-control strong,
  .phase204-metric strong { display: block; overflow-wrap: anywhere; }
  .phase204-badge {
    align-items: center;
    border: 1px solid var(--p204-border);
    border-radius: 999px;
    display: inline-flex;
    font-size: .72rem;
    font-weight: 750;
    gap: .3rem;
    line-height: 1;
    padding: .35rem .55rem;
    white-space: nowrap;
  }
  .phase204-badge.ready { border-color: rgba(52, 211, 153, .45); color: var(--p204-accent); }
  .phase204-badge.blocked { border-color: rgba(252, 165, 165, .42); color: var(--p204-danger); }
  .phase204-badge.pending { color: #fde68a; }
  .phase204-product header,
  .phase204-control header,
  .phase204-listing header {
    align-items: flex-start;
    display: flex;
    gap: .5rem;
    justify-content: space-between;
    margin-bottom: .55rem;
  }
  .phase204-product dl,
  .phase204-storefront dl { display: grid; gap: .35rem .8rem; grid-template-columns: max-content 1fr; margin-bottom: 0; }
  .phase204-product dt,
  .phase204-storefront dt { color: var(--p204-muted); }
  .phase204-product dd,
  .phase204-storefront dd { margin: 0; overflow-wrap: anywhere; }
  .phase204-truth-note {
    align-items: flex-start;
    background: rgba(16, 185, 129, .08);
    border: 1px solid rgba(52, 211, 153, .28);
    border-radius: .75rem;
    display: flex;
    gap: .55rem;
    margin-bottom: .8rem;
    padding: .75rem;
  }
  .phase204-truth-note svg { color: var(--p204-accent); flex: 0 0 auto; }
  .phase204-metric-groups { display: grid; gap: .65rem; }
  .phase204-metric-group { border: 1px solid var(--p204-border); border-radius: .8rem; overflow: clip; }
  .phase204-metric-group > summary { cursor: pointer; font-weight: 750; padding: .8rem; }
  .phase204-metric-group .phase204-metric-grid { padding: 0 .8rem .8rem; }
  .phase204-metric[data-truth-state="UNAVAILABLE"],
  .phase204-metric[data-truth-state="MISSING"] { border-style: dashed; }
  .phase204-metric p { color: var(--p204-muted); font-size: .8rem; margin: .4rem 0 0; }
  .phase204-list { display: grid; gap: .6rem; list-style: none; margin: 0; padding: 0; }
  .phase204-listing { border-bottom: 1px solid var(--p204-border); padding: .3rem 0 .8rem; }
  .phase204-listing:last-child { border-bottom: 0; padding-bottom: 0; }
  .phase204-control .button { margin-top: .7rem; width: 100%; }
  .phase204-control[data-control="KILL_BUSINESS"] { border-color: rgba(252, 165, 165, .32); }
  .phase204-state { align-items: center; display: grid; justify-items: center; min-height: 13rem; padding: 1.25rem; text-align: center; }
  .phase204-state svg { color: var(--p204-muted); margin-bottom: .7rem; }
  .phase204-state[role="alert"] { border-color: rgba(252, 165, 165, .45); }
  .phase204-confirmation-backdrop {
    align-items: center;
    background: rgba(2, 6, 23, .78);
    display: flex;
    inset: 0;
    justify-content: center;
    padding: 1rem;
    position: fixed;
    z-index: 1000;
  }
  .phase204-confirmation { box-shadow: 0 24px 80px rgba(0, 0, 0, .45); max-width: 32rem; padding: 1rem; width: 100%; }
  .phase204-confirmation > header { align-items: flex-start; display: flex; gap: .75rem; justify-content: space-between; }
  .phase204-confirmation textarea { min-height: 6rem; resize: vertical; width: 100%; }
  .phase204-confirmation-actions { display: flex; flex-wrap: wrap; gap: .65rem; justify-content: flex-end; margin-top: .8rem; }
  .phase204-mfa-warning { color: #fde68a; }
  .phase204-inline-error { color: var(--p204-danger); }
  .phase204-provider-action { align-items: center; display: flex; flex-wrap: wrap; gap: .65rem; margin-top: .9rem; }
  @container phase204 (max-width: 48rem) {
    .phase204-commerce-card.half { grid-column: span 12; }
    .phase204-commerce > header { align-items: stretch; flex-direction: column; }
    .phase204-commerce > header .button { width: 100%; }
    .phase204-facts,
    .phase204-product-grid,
    .phase204-capability-grid,
    .phase204-control-grid,
    .phase204-metric-grid { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 720px) {
    .phase204-commerce-card.half { grid-column: span 12; }
    .phase204-commerce > header { align-items: stretch; flex-direction: column; }
    .phase204-commerce > header .button { width: 100%; }
    .phase204-facts,
    .phase204-product-grid,
    .phase204-capability-grid,
    .phase204-control-grid,
    .phase204-metric-grid { grid-template-columns: minmax(0, 1fr); }
    .phase204-product dl,
    .phase204-storefront dl { grid-template-columns: minmax(0, 1fr); }
  }
`;

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function dateTime(value: string | null | undefined) {
  if (!value) return "Unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function moneyFromCents(value: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(value / 100);
}

function metricValue(metric: Phase204OperationalMetric) {
  if (metric.truth_state !== "OBSERVED" || metric.value === null) return null;
  switch (metric.unit) {
    case "USD_CENTS": return moneyFromCents(metric.value);
    case "RATIO": return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: "percent" }).format(metric.value);
    case "COUNT": return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(metric.value);
    case "SCORE": return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(metric.value);
  }
}

function MetricCell({ cell }: { cell: Phase204MetricCell }) {
  const value = cell.record ? metricValue(cell.record) : null;
  const truthState = cell.record?.truth_state ?? "MISSING";
  return (
    <article className="phase204-metric" data-truth-state={truthState}>
      <small>{humanize(cell.code)}</small>
      {value === null ? (
        <>
          <strong>Unavailable</strong>
          <p>{cell.unavailableReason}</p>
        </>
      ) : (
        <>
          <strong>{value}</strong>
          <p>Observed {dateTime(cell.record?.observed_at)}</p>
        </>
      )}
    </article>
  );
}

function ProductCard({ product }: { product: Phase204InternalCommerceProduct }) {
  return (
    <article className="phase204-product" data-product-code={product.product_code}>
      <header>
        <div>
          <small>{product.product_kind === "BUNDLE" ? "Bundle" : "Digital product"}</small>
          <strong>{product.title}</strong>
        </div>
        <span className={`phase204-badge ${product.ready ? "ready" : "pending"}`}>
          {product.ready ? <CheckCircle2 aria-hidden="true" size={13} /> : <AlertTriangle aria-hidden="true" size={13} />}
          {product.ready ? "Delivery ready" : "Gates pending"}
        </span>
      </header>
      <dl>
        <dt>Initial price</dt><dd>{moneyFromCents(product.price_cents)}</dd>
        <dt>Version</dt><dd>{product.product_version}</dd>
        <dt>Asset roles</dt><dd>{product.asset_role_count} verified roles</dd>
        <dt>Passed gates</dt><dd>{product.latest_passed_gate_count} of 6</dd>
      </dl>
    </article>
  );
}

function ControlCard({
  control,
  disabled,
  onSelect
}: {
  control: Phase204CommerceControl;
  disabled: boolean;
  onSelect: (action: Phase204ControlAction) => void;
}) {
  const content = actionContent[control.control_code];
  const engaged = control.state === "ENGAGED";
  return (
    <article className="phase204-control" data-control={control.control_code}>
      <header>
        <div><small>{humanize(control.control_code)}</small><strong>{content.title}</strong></div>
        <span className={`phase204-badge ${engaged ? "blocked" : "ready"}`}>{engaged ? "Engaged" : "Armed"}</span>
      </header>
      <p>{content.description}</p>
      <small>{control.reason ?? "No control action has been recorded."}</small>
      <Button
        disabled={disabled || engaged || control.availability !== "AVAILABLE"}
        onClick={() => onSelect(control.control_code)}
        type="button"
        variant={control.control_code === "KILL_BUSINESS" ? "danger" : "secondary"}
      >
        {content.buttonLabel}
      </Button>
    </article>
  );
}

function Confirmation({
  action,
  error,
  isPending,
  mfaState,
  onCancel,
  onConfirm
}: {
  action: PanelAction;
  error: string;
  isPending: boolean;
  mfaState: Phase204MfaState;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const isPublication = action === "PUBLISH_APPROVED_STOREFRONT";
  const content = isPublication ? {
    confirmation: "Confirm approved storefront publication",
    description: "Publish only the exact owner-approved provider, brand, products, prices, files, claims, and delivery envelope.",
    title: "Approved publication"
  } : actionContent[action];
  const mfaBlocked = mfaState === "REQUIRED";

  return (
    <div className="phase204-confirmation-backdrop">
      <section
        aria-describedby="phase204-confirmation-description"
        aria-labelledby="phase204-confirmation-title"
        aria-modal="true"
        className="phase204-confirmation"
        role="alertdialog"
      >
        <header>
          <div>
            <p className="phase204-eyebrow">Controlled action</p>
            <h3 id="phase204-confirmation-title">{content.title}</h3>
          </div>
          <Button aria-label="Close confirmation" autoFocus disabled={isPending} onClick={onCancel} variant="ghost"><X aria-hidden="true" size={18} /></Button>
        </header>
        <p id="phase204-confirmation-description">{content.description}</p>
        {mfaBlocked ? (
          <p className="phase204-mfa-warning" role="status"><LockKeyhole aria-hidden="true" size={16} /> Recent MFA verification is required by the caller before this action can run.</p>
        ) : null}
        {!isPublication ? (
          <label>
            Reason
            <textarea
              disabled={isPending}
              maxLength={2_000}
              onChange={(event) => setReason(event.currentTarget.value)}
              placeholder="Record the bounded operating reason."
              required
              value={reason}
            />
          </label>
        ) : null}
        {error ? <p className="phase204-inline-error" role="alert">{error}</p> : null}
        <div className="phase204-confirmation-actions">
          <Button disabled={isPending} onClick={onCancel} variant="ghost">Cancel</Button>
          <Button
            disabled={mfaBlocked || (!isPublication && reason.trim().length === 0)}
            isLoading={isPending}
            onClick={() => onConfirm(reason.trim())}
            variant={action === "KILL_BUSINESS" ? "danger" : "primary"}
          >
            {isPublication ? "Publish approved envelope" : content.confirmation}
          </Button>
        </div>
      </section>
    </div>
  );
}

function ReadbackPanel({
  mfaState,
  onControlAction,
  onPublishApprovedStorefront,
  pendingAction,
  readback
}: Pick<Phase204InternalCommerceProps,
  "mfaState" | "onControlAction" | "onPublishApprovedStorefront" | "pendingAction"
> & { readback: Phase204InternalCommerceReadback }) {
  const [confirmation, setConfirmation] = useState<PanelAction | null>(null);
  const [localPending, setLocalPending] = useState<PanelAction | null>(null);
  const [commandError, setCommandError] = useState("");
  const business = readback.business;

  if (!business) {
    return (
      <section className="phase204-state" role="status">
        <Database aria-hidden="true" size={30} />
        <h3>Internal commerce is not activated</h3>
        <p>No canonical Phase 204 commerce business exists in this organization. No local or sample state is shown.</p>
      </section>
    );
  }
  const activeBusiness = business;

  const products = readback.products ?? [];
  const capabilities = readback.capabilities ?? [];
  const storefront = readback.storefront;
  const controls = readback.controls ?? [];
  const metricCells = phase204MetricCells(readback.operational_metrics ?? []);
  const publicationAvailable = phase204PublicationActionAllowed(readback) && Boolean(onPublishApprovedStorefront);
  const effectivePending = pendingAction ?? localPending;

  async function runAction(reason: string) {
    if (!confirmation) return;
    setCommandError("");
    setLocalPending(confirmation);
    try {
      if (confirmation === "PUBLISH_APPROVED_STOREFRONT") {
        if (!publicationAvailable || !storefront?.owner_approval_id || !onPublishApprovedStorefront) {
          throw new Error("The exact approved publication envelope is not available.");
        }
        await onPublishApprovedStorefront({
          ownerApprovalId: storefront.owner_approval_id,
          storefrontId: storefront.storefront_id
        });
      } else {
        if (!onControlAction) throw new Error("This control is read-only in the current session.");
        await onControlAction({ action: confirmation, businessBoundaryId: activeBusiness.business_boundary_id, reason });
      }
      setConfirmation(null);
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : "The controlled action failed without changing canonical state.");
    } finally {
      setLocalPending(null);
    }
  }

  const groupedMetrics = [PHASE204_INTERNAL_BUSINESS_CODE, ...PHASE204_PRODUCTS.map((product) => product.code)]
    .map((scopeCode) => ({ scopeCode, cells: metricCells.filter((cell) => cell.scopeCode === scopeCode) }));

  return (
    <>
      <div className="phase204-commerce-grid phase204-responsive-grid" data-layout="responsive-commerce-truth">
        <section className="phase204-commerce-card" aria-labelledby="phase204-business-title">
          <header>
            <div>
              <p className="phase204-eyebrow">Canonical internal business</p>
              <h3 id="phase204-business-title">{activeBusiness.working_name}</h3>
              <p>{activeBusiness.internal_code} / {humanize(activeBusiness.status)}</p>
            </div>
            <span className={`phase204-badge ${activeBusiness.status === "OPERATING" ? "ready" : "pending"}`}>{humanize(activeBusiness.boundary_status)}</span>
          </header>
          <div className="phase204-facts">
            <article className="phase204-fact"><span>Authority</span><strong>Digital and Software Marshal</strong><small>Canonical Marshal {activeBusiness.marshal_id}</small></article>
            <article className="phase204-fact"><span>Operating General</span><strong>Digital Products General</strong><small>Canonical General {activeBusiness.general_id}</small></article>
            <article className="phase204-fact"><span>Commander</span><strong>Mission-owned business Commander</strong><small>{activeBusiness.commander_id}</small></article>
            <article className="phase204-fact"><span>Launch mission</span><strong>Canonical activation mission</strong><small>{activeBusiness.launch_mission_id}</small></article>
          </div>
        </section>

        <section className="phase204-commerce-card" aria-labelledby="phase204-products-title">
          <header>
            <div><p className="phase204-eyebrow">Finished delivery line</p><h3 id="phase204-products-title">Products and readiness</h3></div>
            <span className={`phase204-badge ${readback.readiness?.all_products_ready ? "ready" : "pending"}`}>
              {readback.readiness?.all_products_ready ? "All gates passed" : "Publication blocked"}
            </span>
          </header>
          <div className="phase204-product-grid">
            {products.map((product) => <ProductCard key={product.product_id} product={product} />)}
          </div>
        </section>

        <section className="phase204-commerce-card half" aria-labelledby="phase204-capabilities-title">
          <header><div><p className="phase204-eyebrow">Capability Truth</p><h3 id="phase204-capabilities-title">Internal tenant capabilities</h3></div><ShieldCheck aria-hidden="true" size={22} /></header>
          <div className="phase204-truth-note">
            <ShieldCheck aria-hidden="true" size={18} />
            <p>These capabilities are scoped to this production tenant for internal operation. They are not presented as customer software.</p>
          </div>
          {capabilities.length === 0 ? <p role="status">No tenant capability activations are recorded.</p> : (
            <div className="phase204-capability-grid">
              {capabilities.map((capability) => (
                <article className="phase204-capability" key={capability.tenant_capability_id}>
                  <small>Internal tenant / Production</small>
                  <strong>{capability.name}</strong>
                  <p>{humanize(capability.lifecycle_state)} / Installation {humanize(capability.installation_state ?? "NOT_INSTALLED")}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="phase204-commerce-card half phase204-storefront" aria-labelledby="phase204-storefront-title">
          <header><div><p className="phase204-eyebrow">Provider truth</p><h3 id="phase204-storefront-title">Storefront and owner action</h3></div><Store aria-hidden="true" size={22} /></header>
          {storefront ? (
            <>
              <dl>
                <dt>Preferred provider</dt><dd>{storefront.preferred_provider === "ETSY" ? "Etsy" : storefront.preferred_provider}</dd>
                <dt>Current provider</dt><dd>{storefront.provider === "ETSY" ? "Etsy" : "Gumroad"}</dd>
                <dt>Public brand</dt><dd>{storefront.public_brand ?? "Not selected — owner or provider action required"}</dd>
                <dt>Provider state</dt><dd>{humanize(storefront.state)}</dd>
                <dt>Owner approval</dt><dd>{storefront.owner_approval_id ? "Exact approval recorded" : "Required before first publication"}</dd>
                <dt>Publication authority</dt><dd>{storefront.publication_allowed ? "Backend gate passed" : "Blocked fail closed"}</dd>
                <dt>Provider mutation</dt><dd>{storefront.external_provider_mutation_available ? "Available" : "Unavailable"}</dd>
              </dl>
              <p>{storefront.state_reason}</p>
              {publicationAvailable ? (
                <div className="phase204-provider-action">
                  <Button onClick={() => { setCommandError(""); setConfirmation("PUBLISH_APPROVED_STOREFRONT"); }}>
                    <ExternalLink aria-hidden="true" size={16} /> Publish exact approved envelope
                  </Button>
                  <small>Only the receipt-bound owner approval can be published.</small>
                </div>
              ) : (
                <p className="phase204-truth-note" role="status"><Ban aria-hidden="true" size={18} /> No external publication action is available from the current backend truth.</p>
              )}
            </>
          ) : <p role="status">No canonical storefront record is available.</p>}
        </section>

        <section className="phase204-commerce-card half" aria-labelledby="phase204-listings-title">
          <header><div><p className="phase204-eyebrow">Provider listings</p><h3 id="phase204-listings-title">Listing truth</h3></div><Store aria-hidden="true" size={22} /></header>
          {!storefront?.listings.length ? <p role="status">No provider listings are recorded. Unpublished products are not shown as live.</p> : (
            <ul className="phase204-list">
              {storefront.listings.map((listing) => (
                <li className="phase204-listing" key={listing.listing_record_id}>
                  <header><strong>{phase204ProductTitle(listing.product_code)}</strong><span className="phase204-badge">{humanize(listing.status)}</span></header>
                  <small>{moneyFromCents(listing.price_cents)} / {listing.published_at ? `Published ${dateTime(listing.published_at)}` : "Not published"}</small>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="phase204-commerce-card half" aria-labelledby="phase204-provider-facts-title">
          <header><div><p className="phase204-eyebrow">Last 24 hours</p><h3 id="phase204-provider-facts-title">Provider facts</h3></div><Database aria-hidden="true" size={22} /></header>
          <div className="phase204-facts">
            <article className="phase204-fact"><span>Observed facts</span><strong>{readback.daily_operating_summary?.observed_provider_fact_count ?? "Unavailable"}</strong></article>
            <article className="phase204-fact"><span>Unavailable facts</span><strong>{readback.daily_operating_summary?.unavailable_provider_fact_count ?? "Unavailable"}</strong></article>
          </div>
          {!readback.provider_facts?.length ? <p>Detailed provider fact rows are unavailable in this readback. No transaction data is inferred.</p> : (
            <ul className="phase204-list">
              {readback.provider_facts.map((fact, index) => (
                <li className="phase204-listing" key={`${fact.fact_type}:${fact.captured_at}:${index}`}>
                  <strong>{humanize(fact.fact_type)} / {fact.state === "OBSERVED" ? "Observed" : "Unavailable"}</strong>
                  <small>{fact.product_code ? phase204ProductTitle(fact.product_code) : "Business-level fact"} / {dateTime(fact.captured_at)}</small>
                  <p>{fact.state === "OBSERVED" ? fact.outcome : fact.unavailable_reason}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="phase204-commerce-card" aria-labelledby="phase204-metrics-title">
          <header>
            <div><p className="phase204-eyebrow">No estimated economics</p><h3 id="phase204-metrics-title">Operational metric truth — 54 cells</h3></div>
            <CircleDollarSign aria-hidden="true" size={22} />
          </header>
          <div className="phase204-truth-note"><ShieldCheck aria-hidden="true" size={18} /><p>Every cell is either provider-observed with evidence or explicitly unavailable. Missing observations are never rendered as numeric zero.</p></div>
          <div className="phase204-metric-groups">
            {groupedMetrics.map(({ cells, scopeCode }, index) => (
              <details className="phase204-metric-group" key={scopeCode} open={index === 0}>
                <summary>{phase204ScopeLabel(scopeCode)}</summary>
                <div className="phase204-metric-grid" data-metric-scope={scopeCode}>
                  {cells.map((cell) => <MetricCell cell={cell} key={`${scopeCode}:${cell.code}`} />)}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="phase204-commerce-card half" aria-labelledby="phase204-summary-title">
          <header><div><p className="phase204-eyebrow">Evidence-only operations</p><h3 id="phase204-summary-title">Daily operating summary</h3></div><CheckCircle2 aria-hidden="true" size={22} /></header>
          {readback.daily_operating_summary ? (
            <>
              <p>{dateTime(readback.daily_operating_summary.period_start)} to {dateTime(readback.daily_operating_summary.period_end)}</p>
              <div className="phase204-facts">
                <article className="phase204-fact"><span>Observed provider facts</span><strong>{readback.daily_operating_summary.observed_provider_fact_count}</strong></article>
                <article className="phase204-fact"><span>Unavailable provider facts</span><strong>{readback.daily_operating_summary.unavailable_provider_fact_count}</strong></article>
                <article className="phase204-fact"><span>Estimated values</span><strong>{readback.daily_operating_summary.estimated_values_included ? "Present" : "None"}</strong></article>
              </div>
            </>
          ) : <p role="status">Daily operating truth is unavailable. No summary is inferred.</p>}
        </section>

        <section className="phase204-commerce-card half" aria-labelledby="phase204-controls-title">
          <header><div><p className="phase204-eyebrow">Fail-closed operations</p><h3 id="phase204-controls-title">Business controls</h3></div><AlertTriangle aria-hidden="true" size={22} /></header>
          <div className="phase204-control-grid">
            {controls.map((control) => (
              <ControlCard
                control={control}
                disabled={!onControlAction || Boolean(effectivePending)}
                key={control.control_id}
                onSelect={(action) => { setCommandError(""); setConfirmation(action); }}
              />
            ))}
          </div>
        </section>
      </div>

      {confirmation ? (
        <Confirmation
          action={confirmation}
          error={commandError}
          isPending={effectivePending === confirmation}
          mfaState={mfaState?.[confirmation] ?? (confirmation === "KILL_BUSINESS" || confirmation === "PUBLISH_APPROVED_STOREFRONT" ? "REQUIRED" : "NOT_REQUIRED")}
          onCancel={() => { if (!effectivePending) { setCommandError(""); setConfirmation(null); } }}
          onConfirm={(reason) => void runAction(reason)}
        />
      ) : null}
    </>
  );
}

export function Phase204InternalCommerce({
  errorMessage,
  mfaState,
  onControlAction,
  onPublishApprovedStorefront,
  onRefresh,
  pendingAction = null,
  readback,
  status
}: Phase204InternalCommerceProps) {
  let verifiedReadback: Phase204InternalCommerceReadback | null = null;
  let validationError = "";
  if (status === "ready") {
    try {
      verifiedReadback = validatePhase204InternalCommerceReadback(readback);
    } catch (error) {
      validationError = error instanceof Error ? error.message : "The internal commerce readback is malformed.";
    }
  }

  return (
    <section className="phase204-commerce" aria-labelledby="phase204-commerce-title" data-phase204-responsive="mobile-single-column desktop-twelve-column">
      <style>{styles}</style>
      <header>
        <div>
          <p className="phase204-eyebrow">Revenue activation truth</p>
          <h2 id="phase204-commerce-title">Internal Commerce</h2>
          <p>Canonical business, product, capability, provider, and operating evidence for {PHASE204_INTERNAL_BUSINESS_CODE}.</p>
        </div>
        {onRefresh ? (
          <Button disabled={status === "loading" || pendingAction === "REFRESH"} isLoading={pendingAction === "REFRESH"} onClick={() => void onRefresh()} variant="secondary">
            <RefreshCw aria-hidden="true" size={16} /> Refresh truth
          </Button>
        ) : null}
      </header>

      {status === "loading" ? (
        <section aria-busy="true" aria-live="polite" className="phase204-state" role="status">
          <Loader2 aria-hidden="true" className="spinner" size={30} />
          <h3>Loading internal commerce truth</h3>
          <p>Waiting for the tenant-scoped canonical readback.</p>
        </section>
      ) : null}
      {status === "error" || validationError ? (
        <section className="phase204-state" role="alert">
          <AlertTriangle aria-hidden="true" size={30} />
          <h3>Internal commerce truth unavailable</h3>
          <p>{validationError || errorMessage || "The canonical readback could not be verified. No cached, local, or inferred commerce state is shown."}</p>
        </section>
      ) : null}
      {status === "ready" && verifiedReadback ? (
        <ReadbackPanel
          mfaState={mfaState}
          onControlAction={onControlAction}
          onPublishApprovedStorefront={onPublishApprovedStorefront}
          pendingAction={pendingAction}
          readback={verifiedReadback}
        />
      ) : null}
    </section>
  );
}
