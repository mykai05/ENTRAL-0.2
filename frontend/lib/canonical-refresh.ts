type CanonicalRefreshIdentity = {
  currentGeneration: number;
  currentOrganizationId: string;
  requestedGeneration: number;
  requestedOrganizationId: string;
  signal?: Pick<AbortSignal, "aborted">;
};

export function isCanonicalRefreshCurrent({
  currentGeneration,
  currentOrganizationId,
  requestedGeneration,
  requestedOrganizationId,
  signal
}: CanonicalRefreshIdentity) {
  return !signal?.aborted
    && requestedGeneration === currentGeneration
    && requestedOrganizationId === currentOrganizationId;
}

export function canonicalOrganizationSwitchPresentation() {
  return {
    conversationMessages: [] as const,
    graphPreferences: null,
    graphProjection: null,
    hierarchy: null,
    isLoading: true,
    portfolio: null,
    syncState: "connecting" as const,
    syncStatus: "Switching member access context",
    workspaceError: ""
  };
}
