import {
  parseBusinessFullRecordResponse,
  parseCanonicalPortfolioEventsResponse,
  parsePortfolioSummaryResponse,
  type BusinessFullRecordResponse,
  type CanonicalPortfolioEvent,
  type CanonicalPortfolioEventsResponse,
  type PortfolioSummaryResponse
} from "@entral/contracts";
import { apiFetch } from "./api";

export type CanonicalPortfolioSource = {
  readonly organizationId?: string;
};

export type CanonicalQueryKey =
  | readonly ["canonical-portfolio", string]
  | readonly ["canonical-business", string, string]
  | readonly ["canonical-events", string];

function sourceId(source: CanonicalPortfolioSource) {
  return source.organizationId ? `organization:${source.organizationId}` : "internal-human";
}

function basePath(source: CanonicalPortfolioSource) {
  return source.organizationId
    ? `/member/organizations/${encodeURIComponent(source.organizationId)}`
    : "/control-plane";
}

export const canonicalQueryKeys = {
  business(source: CanonicalPortfolioSource, businessId: string): CanonicalQueryKey {
    return ["canonical-business", sourceId(source), businessId];
  },
  events(source: CanonicalPortfolioSource): CanonicalQueryKey {
    return ["canonical-events", sourceId(source)];
  },
  portfolio(source: CanonicalPortfolioSource): CanonicalQueryKey {
    return ["canonical-portfolio", sourceId(source)];
  }
} as const;

function serializedKey(key: CanonicalQueryKey) {
  return JSON.stringify(key);
}

class CanonicalQueryCache {
  readonly #entries = new Map<string, unknown>();

  get<T>(key: CanonicalQueryKey): T | undefined {
    return this.#entries.get(serializedKey(key)) as T | undefined;
  }

  set<T>(key: CanonicalQueryKey, value: T): T {
    this.#entries.set(serializedKey(key), value);
    return value;
  }

  invalidate(key: CanonicalQueryKey): void {
    this.#entries.delete(serializedKey(key));
  }

  clear(): void {
    this.#entries.clear();
  }
}

export const canonicalPortfolioCache = new CanonicalQueryCache();

export async function loadCanonicalPortfolio(
  source: CanonicalPortfolioSource,
  options: { readonly signal?: AbortSignal } = {}
): Promise<PortfolioSummaryResponse> {
  const payload = await apiFetch<unknown>(`${basePath(source)}/portfolio/summary`, {
    signal: options.signal
  });
  return canonicalPortfolioCache.set(
    canonicalQueryKeys.portfolio(source),
    parsePortfolioSummaryResponse(payload)
  );
}

export async function loadCanonicalBusiness(
  source: CanonicalPortfolioSource,
  businessId: string,
  options: { readonly signal?: AbortSignal } = {}
): Promise<BusinessFullRecordResponse> {
  const payload = await apiFetch<unknown>(
    `${basePath(source)}/businesses/${encodeURIComponent(businessId)}/full`,
    { signal: options.signal }
  );
  return canonicalPortfolioCache.set(
    canonicalQueryKeys.business(source, businessId),
    parseBusinessFullRecordResponse(payload)
  );
}

export async function loadCanonicalEvents(
  source: CanonicalPortfolioSource,
  afterSequence: number,
  options: { readonly signal?: AbortSignal } = {}
): Promise<CanonicalPortfolioEventsResponse> {
  const payload = await apiFetch<unknown>(
    `${basePath(source)}/events?afterSequence=${encodeURIComponent(String(afterSequence))}`,
    { signal: options.signal }
  );
  return parseCanonicalPortfolioEventsResponse(payload);
}

export function applyCanonicalEventInvalidation(
  source: CanonicalPortfolioSource,
  events: readonly CanonicalPortfolioEvent[]
): Set<string> {
  const changedBusinessIds = new Set<string>();
  if (!events.length) return changedBusinessIds;

  canonicalPortfolioCache.invalidate(canonicalQueryKeys.portfolio(source));
  for (const event of events) {
    const businessId = event.business_id
      ?? (event.aggregate_type.toUpperCase() === "BUSINESS" ? event.aggregate_id : null);
    if (!businessId) continue;
    changedBusinessIds.add(businessId);
    canonicalPortfolioCache.invalidate(canonicalQueryKeys.business(source, businessId));
  }
  return changedBusinessIds;
}

export function subscribeCanonicalPortfolioEvents(
  source: CanonicalPortfolioSource,
  options: {
    readonly afterSequence: number;
    readonly intervalMs?: number;
    readonly onEvents: (
      response: CanonicalPortfolioEventsResponse,
      changedBusinessIds: ReadonlySet<string>
    ) => void;
    readonly onError?: (error: unknown) => void;
  }
): () => void {
  const intervalMs = options.intervalMs ?? 5_000;
  const controller = new AbortController();
  let cursor = options.afterSequence;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (!controller.signal.aborted) {
      timer = setTimeout(() => void poll(), intervalMs);
    }
  };

  const poll = async () => {
    try {
      const response = await loadCanonicalEvents(source, cursor, {
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      cursor = response.next_sequence;
      const changedBusinessIds = applyCanonicalEventInvalidation(source, response.events);
      if (response.events.length) {
        options.onEvents(response, changedBusinessIds);
      }
    } catch (error) {
      if (!controller.signal.aborted) options.onError?.(error);
    } finally {
      schedule();
    }
  };

  schedule();
  return () => {
    controller.abort();
    if (timer) clearTimeout(timer);
  };
}
