"use client";

import type {
  CanonicalEntralConversationMessage,
  CanonicalHierarchyResponse,
  MemberOrganizationsResponse,
  PortfolioSummaryResponse
} from "@entral/contracts";
import {
  AlertTriangle,
  BookOpen,
  ChevronUp,
  LogOut,
  RefreshCw,
  Settings
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiFetch } from "../lib/api";
import { clearAuthenticatedUserSession, writeAuthenticatedUserIdentity } from "../lib/auth-session";
import {
  loadCanonicalEntralConversation,
  loadCanonicalHierarchy,
  loadCanonicalPortfolio,
  subscribeCanonicalPortfolioEvents,
  type CanonicalPortfolioSource
} from "../lib/canonical-portfolio";
import { entitiesForBusinessScope } from "../lib/canonical-universe";
import { BrandMark } from "./BrandMark";
import { CanonicalEntralAssistant } from "./CanonicalEntralAssistant";
import {
  CanonicalGraphWorkspace,
  type CanonicalGraphAssistantCommand,
  type CanonicalGraphAssistantCommandInput,
  type CanonicalGraphDimension
} from "./CanonicalGraphWorkspace";
import { CanonicalInfrastructure } from "./CanonicalInfrastructure";
import { CanonicalPortfolioDashboard } from "./CanonicalPortfolioDashboard";
import { type MemberDestination, MemberDestinationNav } from "./MemberDestinationNav";

const organizationStorageKey = "entral-phase180-organization";
const scopeStorageKey = "entral-phase180-business-scope";
const selectedEntityStorageKey = "entral-phase180-selected-entity";
const pendingAssistantCommandStorageKey = "entral-phase180-pending-assistant-command";

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const payload = error.details as { message?: string; requestId?: string } | null;
    return `${payload?.message ?? error.message}${payload?.requestId ? ` Request ${payload.requestId}.` : ""}`;
  }
  return error instanceof Error ? error.message : "The canonical workspace could not be synchronized.";
}

export function CanonicalMemberShell({
  initialDestination,
  initialSession
}: {
  initialDestination: MemberDestination;
  initialSession: MemberOrganizationsResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeBusinessId = searchParams.get("business");
  const routeEntityId = searchParams.get("entity");
  const preferredGraphDimension = searchParams.get("graph") === "2d" || searchParams.get("graph") === "3d"
    ? searchParams.get("graph") as CanonicalGraphDimension
    : null;
  const [organizationId, setOrganizationId] = useState(initialSession.organizations[0]?.id ?? "");
  const [businessScopeId, setBusinessScopeId] = useState<string | null>(routeBusinessId);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(routeEntityId);
  const [portfolio, setPortfolio] = useState<PortfolioSummaryResponse | null>(null);
  const [hierarchy, setHierarchy] = useState<CanonicalHierarchyResponse | null>(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Connecting to canonical events");
  const [syncState, setSyncState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [conversationMessages, setConversationMessages] = useState<readonly CanonicalEntralConversationMessage[]>([]);
  const [assistantCommand, setAssistantCommand] = useState<CanonicalGraphAssistantCommand | null>(null);
  const assistantCommandSequenceRef = useRef(0);
  const activeOrganizationRef = useRef(organizationId);
  const refreshGenerationRef = useRef(0);
  const alignedEventSequenceRef = useRef<number | null>(null);
  const pendingEventSequenceRef = useRef<number | null>(null);
  const eventRefreshOrganizationRef = useRef<string | null>(null);
  const source = useMemo<CanonicalPortfolioSource>(() => ({ organizationId }), [organizationId]);
  const selectedOrganization = initialSession.organizations.find((organization) => organization.id === organizationId)
    ?? initialSession.organizations[0]
    ?? null;
  const selectedBusiness = portfolio?.businesses.find((business) => business.business_id === businessScopeId) ?? null;
  const isEntralRoom = initialDestination === "dashboard" && searchParams.get("section") === "entral";
  const scopeLabel = selectedBusiness
    ? `Business · ${selectedBusiness.business_name}`
    : portfolio?.scope.label ?? "Resolving canonical scope";
  const scopedEntities = useMemo(
    () => entitiesForBusinessScope(hierarchy?.entities ?? [], businessScopeId),
    [businessScopeId, hierarchy?.entities]
  );

  const refreshWorkspace = useCallback(async (
    signal?: AbortSignal,
    minimumEventSequence = pendingEventSequenceRef.current ?? 0
  ) => {
    if (!organizationId) return;
    const requestedOrganizationId = organizationId;
    const refreshGeneration = ++refreshGenerationRef.current;
    const isCurrentRefresh = () => (
      !signal?.aborted
      && refreshGeneration === refreshGenerationRef.current
      && activeOrganizationRef.current === requestedOrganizationId
    );
    setWorkspaceError("");
    setIsLoading(true);
    setSyncState("connecting");
    try {
      let accepted: { hierarchy: CanonicalHierarchyResponse; portfolio: PortfolioSummaryResponse } | null = null;
      for (let attempt = 0; attempt < 3 && !signal?.aborted; attempt += 1) {
        const [nextPortfolio, nextHierarchy] = await Promise.all([
          loadCanonicalPortfolio(source, { signal }),
          loadCanonicalHierarchy(source, { signal })
        ]);
        if (
          nextPortfolio.event_sequence === nextHierarchy.event_sequence
          && nextPortfolio.event_sequence >= minimumEventSequence
        ) {
          accepted = { hierarchy: nextHierarchy, portfolio: nextPortfolio };
          break;
        }
      }
      if (!accepted) {
        throw new Error("Canonical surfaces changed during snapshot assembly. Entral will retry before displaying mixed versions.");
      }
      if (!isCurrentRefresh()) return;
      const conversation = await loadCanonicalEntralConversation(source, businessScopeId, { signal });
      if (conversation.event_sequence < accepted.portfolio.event_sequence) {
        throw new Error("ENTRAL conversation history is behind the accepted canonical workspace snapshot.");
      }
      if (!isCurrentRefresh()) return;
      setPortfolio(accepted.portfolio);
      setHierarchy(accepted.hierarchy);
      alignedEventSequenceRef.current = accepted.portfolio.event_sequence;
      if (
        pendingEventSequenceRef.current !== null
        && accepted.portfolio.event_sequence >= pendingEventSequenceRef.current
      ) {
        pendingEventSequenceRef.current = null;
      }
      setConversationMessages(conversation.messages.filter(
        (message) => message.event_sequence === null
          || message.event_sequence <= accepted!.portfolio.event_sequence
      ));
      setSyncStatus(`Canonical event ${accepted.portfolio.event_sequence}`);
      setSyncState(pendingEventSequenceRef.current === null ? "connected" : "connecting");
      setBusinessScopeId((current) =>
        current && accepted!.portfolio.businesses.some((business) => business.business_id === current)
          ? current
          : null
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      if (!isCurrentRefresh()) return;
      setWorkspaceError(errorMessage(error));
      setSyncState("disconnected");
    } finally {
      if (isCurrentRefresh()) setIsLoading(false);
    }
  }, [businessScopeId, organizationId, source]);

  const refreshPendingEvents = useCallback(() => {
    const pendingSequence = pendingEventSequenceRef.current;
    const requestedOrganizationId = source.organizationId ?? "";
    if (pendingSequence === null || eventRefreshOrganizationRef.current === requestedOrganizationId) return;
    eventRefreshOrganizationRef.current = requestedOrganizationId;
    void refreshWorkspace(undefined, pendingSequence).finally(() => {
      if (eventRefreshOrganizationRef.current === requestedOrganizationId) {
        eventRefreshOrganizationRef.current = null;
      }
    });
  }, [refreshWorkspace, source.organizationId]);

  useEffect(() => {
    try {
      const storedOrganization = window.localStorage.getItem(organizationStorageKey);
      const validOrganization = initialSession.organizations.some((organization) => organization.id === storedOrganization);
      if (storedOrganization && validOrganization) {
        activeOrganizationRef.current = storedOrganization;
        alignedEventSequenceRef.current = null;
        pendingEventSequenceRef.current = null;
        eventRefreshOrganizationRef.current = null;
        setOrganizationId(storedOrganization);
      }
      const storedScope = window.localStorage.getItem(scopeStorageKey);
      if (initialDestination !== "dashboard" && !routeBusinessId && storedScope) setBusinessScopeId(storedScope);
      const storedEntity = window.sessionStorage.getItem(selectedEntityStorageKey);
      if (routeEntityId) setSelectedEntityId(routeEntityId);
      else if (storedEntity) setSelectedEntityId(storedEntity);
      if (initialDestination === "graph") {
        const storedCommand = window.sessionStorage.getItem(pendingAssistantCommandStorageKey);
        if (storedCommand) {
          const command = JSON.parse(storedCommand) as CanonicalGraphAssistantCommandInput;
          assistantCommandSequenceRef.current += 1;
          setAssistantCommand({ ...command, id: assistantCommandSequenceRef.current } as CanonicalGraphAssistantCommand);
          window.sessionStorage.removeItem(pendingAssistantCommandStorageKey);
        }
      }
    } catch {
      // Canonical server state remains usable when browser storage is unavailable.
    }
    writeAuthenticatedUserIdentity({ userId: initialSession.user.id });
  }, [initialDestination, initialSession.organizations, initialSession.user.id, routeBusinessId, routeEntityId]);

  useEffect(() => {
    if (initialDestination === "dashboard") setBusinessScopeId(routeBusinessId);
    else if (routeBusinessId) setBusinessScopeId(routeBusinessId);
  }, [initialDestination, routeBusinessId]);

  useEffect(() => {
    if (initialDestination === "infrastructure" && routeEntityId) {
      setSelectedEntityId(routeEntityId);
    }
  }, [initialDestination, routeEntityId]);

  useEffect(() => {
    const controller = new AbortController();
    setConversationMessages([]);
    void refreshWorkspace(controller.signal);
    return () => {
      controller.abort();
      refreshGenerationRef.current += 1;
    };
  }, [refreshWorkspace]);

  useEffect(() => {
    if (!portfolio || !hierarchy || portfolio.event_sequence !== hierarchy.event_sequence) return;
    const subscribedOrganizationId = source.organizationId ?? "";
    return subscribeCanonicalPortfolioEvents(source, {
      afterSequence: portfolio.event_sequence,
      onError: () => {
        if (activeOrganizationRef.current !== subscribedOrganizationId) return;
        setSyncState("disconnected");
        setSyncStatus("Disconnected · retrying canonical events");
      },
      onEvents: (response) => {
        if (activeOrganizationRef.current !== subscribedOrganizationId) return;
        pendingEventSequenceRef.current = Math.max(
          pendingEventSequenceRef.current ?? 0,
          response.next_sequence
        );
        setSyncState("connecting");
        setSyncStatus(`Refreshing through canonical event ${response.next_sequence}`);
        refreshPendingEvents();
      },
      onPoll: (response) => {
        if (activeOrganizationRef.current !== subscribedOrganizationId) return;
        if (response.events.length) return;
        const alignedSequence = alignedEventSequenceRef.current;
        if (
          pendingEventSequenceRef.current !== null
          || alignedSequence === null
          || response.next_sequence > alignedSequence
        ) {
          pendingEventSequenceRef.current = Math.max(
            pendingEventSequenceRef.current ?? 0,
            response.next_sequence
          );
          setSyncState("connecting");
          setSyncStatus(
            `Event channel connected · refreshing canonical snapshot through event ${pendingEventSequenceRef.current}`
          );
          refreshPendingEvents();
          return;
        }
        setSyncState("connected");
        setSyncStatus(`Connected · canonical event ${response.next_sequence}`);
      }
    });
  }, [hierarchy?.event_sequence, portfolio?.event_sequence, refreshPendingEvents, source]);

  useEffect(() => {
    try {
      if (organizationId) window.localStorage.setItem(organizationStorageKey, organizationId);
      if (businessScopeId) window.localStorage.setItem(scopeStorageKey, businessScopeId);
      else window.localStorage.removeItem(scopeStorageKey);
      if (selectedEntityId) window.sessionStorage.setItem(selectedEntityStorageKey, selectedEntityId);
      else window.sessionStorage.removeItem(selectedEntityStorageKey);
    } catch {
      // Navigation state is an enhancement; server canonical data is unaffected.
    }
  }, [businessScopeId, organizationId, selectedEntityId]);

  async function handleLogout() {
    try {
      await apiFetch("/logout", { method: "POST" });
      clearAuthenticatedUserSession();
      router.replace("/member/sign-in");
      router.refresh();
    } catch {
      window.alert("Sign out could not be completed. Please try again.");
    }
  }

  function changeScope(nextBusinessId: string) {
    const value = nextBusinessId || null;
    setBusinessScopeId(value);
    setSelectedEntityId(null);
    if (initialDestination === "dashboard") {
      router.replace(value ? `/member/dashboard?business=${encodeURIComponent(value)}` : "/member/dashboard", { scroll: false });
    }
  }

  function openFullRecord(entityId: string) {
    setSelectedEntityId(entityId);
    try {
      window.sessionStorage.setItem(selectedEntityStorageKey, entityId);
    } catch {
      // The Infrastructure route still opens when storage is unavailable.
    }
    router.push("/member/infrastructure", { scroll: false });
  }

  function changePreferredGraphDimension(nextDimension: CanonicalGraphDimension) {
    const nextSearch = new URLSearchParams(searchParams.toString());
    nextSearch.set("graph", nextDimension);
    router.replace(`/member/graph?${nextSearch.toString()}`, { scroll: false });
  }

  function handleAssistantGraphCommand(command: CanonicalGraphAssistantCommandInput) {
    assistantCommandSequenceRef.current += 1;
    const sequenced = {
      ...command,
      id: assistantCommandSequenceRef.current
    } as CanonicalGraphAssistantCommand;
    if (command.type === "select") setSelectedEntityId(command.entityId);
    if (initialDestination === "graph") {
      setAssistantCommand(sequenced);
      return;
    }
    try {
      window.sessionStorage.setItem(pendingAssistantCommandStorageKey, JSON.stringify(command));
    } catch {
      // Navigation still opens the graph when storage is unavailable.
    }
    const dimension = command.type === "fullscreen" && command.dimension
      ? `?graph=${command.dimension}`
      : "";
    router.push(`/member/graph${dimension}`);
  }

  return (
    <main className="phase180-shell" id="main-content">
      <header className="phase180-shell-header">
        <BrandMark href="/member/dashboard" label="Entral member dashboard" />
        <MemberDestinationNav current={initialDestination} surface="member" />
        <div className="phase180-account-actions">
          <button onClick={() => window.dispatchEvent(new Event("entral:open-academy"))} type="button"><BookOpen size={17} /> Academy</button>
          <button onClick={() => window.dispatchEvent(new Event("entral:open-settings"))} type="button"><Settings size={17} /> Settings</button>
          <button onClick={() => void handleLogout()} type="button"><LogOut size={17} /> Sign out</button>
        </div>
      </header>

      <section className="phase180-scope-bar" aria-label="Inherited canonical scope">
        <div>
          <span>Member access organization</span>
          {initialSession.organizations.length > 1 ? (
            <select
              aria-label="Member access organization"
              onChange={(event) => {
                activeOrganizationRef.current = event.target.value;
                refreshGenerationRef.current += 1;
                alignedEventSequenceRef.current = null;
                pendingEventSequenceRef.current = null;
                eventRefreshOrganizationRef.current = null;
                setOrganizationId(event.target.value);
                setBusinessScopeId(null);
                setSelectedEntityId(null);
                setConversationMessages([]);
                setPortfolio(null);
                setHierarchy(null);
                setWorkspaceError("");
                setIsLoading(true);
                setSyncState("connecting");
                setSyncStatus("Switching member access context");
              }}
              value={organizationId}
            >
              {initialSession.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          ) : <strong>{selectedOrganization?.name ?? "Unavailable"}</strong>}
          <small>Access context only; canonical data scope comes from the signed-in identity and database grants.</small>
        </div>
        <ChevronUp aria-hidden="true" size={16} />
        <div>
          <span>Inherited scope</span>
          <select aria-label="Canonical business scope" onChange={(event) => changeScope(event.target.value)} value={businessScopeId ?? ""}>
            <option value="">Portfolio · all visible businesses</option>
            {(portfolio?.businesses ?? []).map((business) => (
              <option key={business.business_id} value={business.business_id}>{business.business_name}</option>
            ))}
          </select>
        </div>
        <div className="phase180-sync-status" role="status">
          <i data-state={workspaceError ? "error" : syncState} />
          <span>{workspaceError ? "Canonical sync blocked" : syncStatus}</span>
        </div>
      </section>

      {workspaceError ? (
        <section className="phase180-workspace-error" role="alert">
          <AlertTriangle size={22} />
          <div><strong>Canonical workspace unavailable</strong><p>{workspaceError}</p></div>
          <button onClick={() => void refreshWorkspace()} type="button"><RefreshCw size={17} /> Retry</button>
        </section>
      ) : null}

      {isLoading && (!portfolio || !hierarchy) ? (
        <section className="phase180-loading" role="status"><RefreshCw className="spin" size={24} /> Synchronizing one canonical workspace...</section>
      ) : null}

      {!workspaceError && portfolio && hierarchy ? (
        <div className="phase180-shell-content">
          {initialDestination === "dashboard" && isEntralRoom ? (
            <CanonicalEntralAssistant
              businessId={businessScopeId}
              canonicalMessages={conversationMessages}
              destination={initialDestination}
              entities={scopedEntities}
              eventSequence={portfolio.event_sequence}
              humanUserId={portfolio.scope.user_id}
              mode="room"
              onGraphCommand={handleAssistantGraphCommand}
              onRefresh={() => void refreshWorkspace()}
              organizationId={organizationId}
              scopeLabel={scopeLabel}
              selectedEntityId={selectedEntityId}
            />
          ) : initialDestination === "dashboard" ? (
            <CanonicalPortfolioDashboard
              organizationId={organizationId}
              scopeBusinessId={businessScopeId}
              userName={initialSession.user.name}
              workspacePortfolio={portfolio}
              workspaceStatus={syncStatus}
            />
          ) : initialDestination === "graph" ? (
            <CanonicalGraphWorkspace
              assistantCommand={assistantCommand}
              entities={scopedEntities}
              eventSequence={hierarchy.event_sequence}
              onOpenFullRecord={openFullRecord}
              onPreferredDimensionChange={changePreferredGraphDimension}
              onSelectedEntityChange={setSelectedEntityId}
              preferredDimension={preferredGraphDimension}
              selectedEntityId={selectedEntityId}
            />
          ) : (
            <CanonicalInfrastructure
              entities={scopedEntities}
              eventSequence={hierarchy.event_sequence}
              humanUserId={portfolio.scope.user_id}
              onRefresh={() => void refreshWorkspace()}
              onSelectedEntityChange={setSelectedEntityId}
              organizationId={organizationId}
              scopeLabel={scopeLabel}
              selectedEntityId={selectedEntityId}
            />
          )}
        </div>
      ) : null}

      {!isEntralRoom && portfolio && hierarchy ? (
        <CanonicalEntralAssistant
          businessId={businessScopeId}
          canonicalMessages={conversationMessages}
          destination={initialDestination}
          entities={scopedEntities}
          eventSequence={portfolio.event_sequence}
          humanUserId={portfolio.scope.user_id}
          onGraphCommand={handleAssistantGraphCommand}
          onRefresh={() => void refreshWorkspace()}
          organizationId={organizationId}
          scopeLabel={scopeLabel}
          selectedEntityId={selectedEntityId}
        />
      ) : null}
    </main>
  );
}
