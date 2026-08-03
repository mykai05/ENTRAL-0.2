"use client";

import type { PublicProductClaim, TutorialProgress } from "@entral/contracts";
import React, { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Bot, CheckCircle2, ChevronLeft, ChevronRight, Command, Compass, GraduationCap, MonitorUp, Play, ShieldCheck, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Button } from "./Button";
import { useDialogFocus } from "../lib/dialog-focus";
import {
  loadTutorialProgress,
  recordInteractionAnalytics,
  resetTutorialProgress,
  saveTutorialProgress
} from "../lib/interaction-layer";
import { memberSignInPath } from "../lib/member";
import { loadMemberProductTruth } from "../lib/capability-truth";

type AcademyMode = "beginner" | "advanced";

type AcademyStep = {
  capabilityKey: string;
  id: string;
  mode: AcademyMode | "both";
  route: string;
  target?: string;
};

type AcademyState = {
  completedSteps: string[];
  firstLaunchSeen: boolean;
  mode: AcademyMode;
};

type HighlightRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type AcademyPlacement = "bottom" | "center" | "left" | "right" | "top";

type OnboardingContextValue = {
  mode: AcademyMode;
  openLibrary: () => void;
  openTour: (stepId?: string) => void;
  progress: {
    completed: number;
    total: number;
  };
  setMode: (mode: AcademyMode) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);
const authenticatedUserSessionKey = "entral-authenticated-user";
const academyAuthEvent = "entral:user-authenticated";
const academyOrganizationEvent = "entral:organization-context";
const academySignOutEvent = "entral:user-signed-out";

const academySteps: AcademyStep[] = [
  {
    capabilityKey: "capability.tutorial.step.command-overview",
    id: "command-overview",
    mode: "both",
    route: "/dashboard",
    target: "portfolio-dashboard"
  },
  {
    capabilityKey: "capability.tutorial.step.businesses-overview",
    id: "businesses-overview",
    mode: "both",
    route: "/dashboard?destination=businesses",
    target: "portfolio-dashboard"
  },
  {
    capabilityKey: "capability.tutorial.step.universe-navigation",
    id: "universe-navigation",
    mode: "both",
    route: "/graph",
    target: "command-graph"
  },
  {
    capabilityKey: "capability.tutorial.step.infrastructure-records",
    id: "infrastructure-records",
    mode: "both",
    route: "/infrastructure",
    target: "infrastructure-hierarchy"
  },
  {
    capabilityKey: "capability.tutorial.step.entral-assistant",
    id: "entral-assistant",
    mode: "both",
    route: "/dashboard?section=entral",
    target: "entral-workspace"
  }
];

const academyStepCapabilityKeys = new Set(academySteps.map((step) => step.capabilityKey));

function academyUserKey(detail: unknown) {
  if (!detail || typeof detail !== "object") return null;
  const candidate = detail as { email?: unknown; userId?: unknown };
  const value = typeof candidate.userId === "string" && candidate.userId.trim()
    ? candidate.userId
    : typeof candidate.email === "string" && candidate.email.trim()
      ? candidate.email.toLowerCase()
      : null;

  return value;
}

function academyOrganizationId(detail: unknown) {
  if (!detail || typeof detail !== "object") return null;
  const candidate = detail as { organizationId?: unknown };
  return typeof candidate.organizationId === "string" && candidate.organizationId.trim()
    ? candidate.organizationId
    : null;
}

function academyStateFromProgress(progress: TutorialProgress): AcademyState {
  return {
    completedSteps: [...progress.completed_anchor_ids],
    firstLaunchSeen: progress.first_launch_seen,
    mode: progress.mode
  };
}

function readLocalValue(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function removeLocalValue(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore blocked storage; the signed-out event still resets in-memory state.
  }
}

const signedOutAcademyState: AcademyState = {
  completedSteps: [],
  firstLaunchSeen: true,
  mode: "beginner"
};

function visibleStepsFor(mode: AcademyMode) {
  return academySteps.filter((step) => step.mode === "both" || step.mode === mode);
}

function closeSettingsWindow() {
  window.dispatchEvent(new Event("entral:close-settings"));
}

function hasUsableRect(rect: DOMRect) {
  const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
  const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  return visibleWidth >= 12 && visibleHeight >= 12;
}

function isHiddenByAncestor(element: HTMLElement) {
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const closedDetails: HTMLDetailsElement | null = current.closest("details:not([open])");

    if (
      current.hidden ||
      current.getAttribute("aria-hidden") === "true" ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      Number(style.opacity) === 0
    ) {
      return true;
    }

    if (closedDetails && closedDetails !== current && !current.closest("summary")) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

function findVisibleAcademyTarget(target: string) {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-academy="${target}"]`));
  return candidates.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return hasUsableRect(rect) && !isHiddenByAncestor(candidate);
  }) ?? null;
}

function isOversizedTarget(rect: DOMRect) {
  return rect.width > window.innerWidth * 0.72 || rect.height > window.innerHeight * 0.72;
}

function getAcademyPlacement(rect: DOMRect): AcademyPlacement {
  if (isOversizedTarget(rect)) return "center";

  const centerX = Math.max(0, Math.min(window.innerWidth, rect.left + rect.width / 2));
  const centerY = Math.max(0, Math.min(window.innerHeight, rect.top + rect.height / 2));

  if (centerX < window.innerWidth * 0.38) return "right";
  if (centerX > window.innerWidth * 0.62) return "left";
  if (centerY < window.innerHeight * 0.46) return "bottom";
  return "top";
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signedInUserKey, setSignedInUserKey] = useState<string | null>(null);
  const [academyState, setAcademyState] = useState<AcademyState>(signedOutAcademyState);
  const [academySyncStatus, setAcademySyncStatus] = useState<"idle" | "loading" | "synced" | "error">("idle");
  const [academySyncMessage, setAcademySyncMessage] = useState("Sign in to sync Tutorial progress.");
  const [tutorialClaims, setTutorialClaims] = useState<readonly PublicProductClaim[]>([]);
  const [tutorialTruthStatus, setTutorialTruthStatus] = useState<"idle" | "loading" | "ready" | "empty" | "unavailable">("idle");
  const [tutorialTruthMessage, setTutorialTruthMessage] = useState("Sign in to verify published Tutorial lessons.");
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"tour" | "library">("tour");
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [academyPlacement, setAcademyPlacement] = useState<AcademyPlacement>("center");
  const [spotlightStepId, setSpotlightStepId] = useState<string | null>(null);
  const [spotlightMissingTarget, setSpotlightMissingTarget] = useState(false);
  const academyDialogRef = useDialogFocus<HTMLElement>(isOpen, closeAcademy);
  const dismissedInCurrentSessionRef = useRef(false);
  const academyStateRef = useRef(academyState);
  const isOpenRef = useRef(isOpen);
  const signedInUserKeyRef = useRef<string | null>(null);
  const organizationIdRef = useRef<string | null>(null);
  const tutorialRevisionRef = useRef(0);
  const tutorialCurrentAnchorRef = useRef<TutorialProgress["current_anchor_id"]>("command-overview");
  const tutorialLoadGenerationRef = useRef(0);
  const tutorialTruthGenerationRef = useRef(0);
  const tutorialTruthExpiryTimerRef = useRef<number | null>(null);
  const tutorialPersistenceRequestedRef = useRef(false);
  const tutorialPersistenceActiveRef = useRef(false);
  const spotlightStepIdRef = useRef<string | null>(spotlightStepId);
  const tutorialClaimByCapabilityKey = useMemo(
    () => new Map(tutorialClaims.map((claim) => [claim.capability_key, claim])),
    [tutorialClaims]
  );
  const visibleSteps = useMemo(
    () => visibleStepsFor(academyState.mode).filter((step) => tutorialClaimByCapabilityKey.has(step.capabilityKey)),
    [academyState.mode, tutorialClaimByCapabilityKey]
  );
  const safeStepIndex = Math.min(stepIndex, Math.max(visibleSteps.length - 1, 0));
  const currentStep = visibleSteps[safeStepIndex] ?? visibleSteps[0];
  const spotlightStep = spotlightStepId ? academySteps.find((step) => step.id === spotlightStepId) ?? null : null;
  const spotlightStepClaim = spotlightStep ? tutorialClaimByCapabilityKey.get(spotlightStep.capabilityKey) ?? null : null;
  const currentStepClaim = currentStep ? tutorialClaimByCapabilityKey.get(currentStep.capabilityKey) ?? null : null;
  const completedSet = useMemo(() => new Set(academyState.completedSteps), [academyState.completedSteps]);
  const completedVisibleCount = visibleSteps.filter((step) => completedSet.has(step.id)).length;

  useEffect(() => {
    academyStateRef.current = academyState;
  }, [academyState]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    signedInUserKeyRef.current = signedInUserKey;
  }, [signedInUserKey]);

  useEffect(() => {
    spotlightStepIdRef.current = spotlightStepId;
  }, [spotlightStepId]);

  useEffect(() => {
    if (visibleSteps.length === 0) {
      setStepIndex(0);
      return;
    }
    const resumedIndex = tutorialCurrentAnchorRef.current
      ? visibleSteps.findIndex((step) => step.id === tutorialCurrentAnchorRef.current)
      : -1;
    setStepIndex((current) => resumedIndex >= 0 ? resumedIndex : Math.min(current, visibleSteps.length - 1));
  }, [visibleSteps]);

  async function loadServerProgress(organizationId: string, generation: number) {
    setAcademySyncStatus("loading");
    setAcademySyncMessage("Loading server Tutorial progress...");
    try {
      const progress = await loadTutorialProgress(organizationId);
      if (generation !== tutorialLoadGenerationRef.current || organizationId !== organizationIdRef.current) return;
      tutorialRevisionRef.current = progress.revision;
      tutorialCurrentAnchorRef.current = progress.current_anchor_id;
      const nextState = academyStateFromProgress(progress);
      setAcademyState(nextState);
      academyStateRef.current = nextState;
      setAcademySyncStatus("synced");
      setAcademySyncMessage(`Server progress synced · revision ${progress.revision}`);
    } catch {
      if (generation !== tutorialLoadGenerationRef.current || organizationId !== organizationIdRef.current) return;
      setAcademySyncStatus("error");
      setAcademySyncMessage("Tutorial progress is unavailable. Changes are not being reported as saved.");
      void recordInteractionAnalytics({
        eventType: "ROUTE_FAILURE",
        organizationId,
        reasonCode: "TUTORIAL_PROGRESS_LOAD_FAILED",
        route: pathname
      }).catch(() => undefined);
    }
  }

  async function loadPublishedTutorial(organizationId: string, generation: number) {
    try {
      const projection = await loadMemberProductTruth(organizationId, "TUTORIAL");
      if (generation !== tutorialTruthGenerationRef.current || organizationId !== organizationIdRef.current) return;
      const publishedStepClaims = projection.claims.filter((claim) => academyStepCapabilityKeys.has(claim.capability_key));
      if (new Set(publishedStepClaims.map((claim) => claim.capability_key)).size !== publishedStepClaims.length) {
        throw new Error("Tutorial Product Truth contains ambiguous step claims.");
      }
      setTutorialClaims(publishedStepClaims);
      if (publishedStepClaims.length === 0) {
        setTutorialTruthStatus("empty");
        setTutorialTruthMessage("No receipt-backed Tutorial lessons are currently published for this workspace.");
      } else {
        setTutorialTruthStatus("ready");
        setTutorialTruthMessage(`Published Tutorial verified · registry revision ${projection.registry_revision}`);
      }

      if (tutorialTruthExpiryTimerRef.current !== null) {
        window.clearTimeout(tutorialTruthExpiryTimerRef.current);
      }
      const expiresIn = Math.max(0, Date.parse(projection.expires_at) - Date.now());
      tutorialTruthExpiryTimerRef.current = window.setTimeout(() => {
        if (generation !== tutorialTruthGenerationRef.current || organizationId !== organizationIdRef.current) return;
        setTutorialClaims([]);
        setTutorialTruthStatus("unavailable");
        setTutorialTruthMessage("Tutorial publication verification expired. Reopen Tutorial after a fresh Product Truth readback.");
        setSpotlightStepId(null);
        setHighlightRect(null);
      }, Math.min(expiresIn + 1, 2_147_483_647));
    } catch {
      if (generation !== tutorialTruthGenerationRef.current || organizationId !== organizationIdRef.current) return;
      setTutorialClaims([]);
      setTutorialTruthStatus("unavailable");
      setTutorialTruthMessage("Tutorial publication is unavailable. No local or cached lessons are being shown.");
    }
  }

  async function flushAcademyPersistence() {
    if (tutorialPersistenceActiveRef.current) return;
    tutorialPersistenceActiveRef.current = true;
    let persistenceOrganizationId: string | null = null;
    let persistenceGeneration = tutorialLoadGenerationRef.current;
    try {
      while (tutorialPersistenceRequestedRef.current) {
        tutorialPersistenceRequestedRef.current = false;
        const organizationId = organizationIdRef.current;
        if (!organizationId || tutorialRevisionRef.current < 1) continue;
        const generation = tutorialLoadGenerationRef.current;
        persistenceOrganizationId = organizationId;
        persistenceGeneration = generation;
        const snapshot = academyStateRef.current;
        const progress = await saveTutorialProgress(organizationId, {
          contract_version: "1.0.0",
          completed_anchor_ids: snapshot.completedSteps as TutorialProgress["completed_anchor_ids"],
          current_anchor_id: tutorialCurrentAnchorRef.current,
          expected_revision: tutorialRevisionRef.current,
          first_launch_seen: snapshot.firstLaunchSeen,
          idempotency_key: `phase200:tutorial:update:${crypto.randomUUID()}`,
          mode: snapshot.mode,
          schema_version: 1
        });
        if (organizationId !== organizationIdRef.current || generation !== tutorialLoadGenerationRef.current) continue;
        tutorialRevisionRef.current = progress.revision;
        if (!tutorialPersistenceRequestedRef.current) {
          const confirmed = academyStateFromProgress(progress);
          setAcademyState(confirmed);
          academyStateRef.current = confirmed;
        }
        setAcademySyncStatus("synced");
        setAcademySyncMessage(`Server progress synced · revision ${progress.revision}`);
      }
    } catch {
      if (
        persistenceOrganizationId !== organizationIdRef.current
        || persistenceGeneration !== tutorialLoadGenerationRef.current
      ) return;
      const organizationId = organizationIdRef.current;
      setAcademySyncStatus("error");
      setAcademySyncMessage("Tutorial progress changed or could not be saved. Reloading the server record.");
      if (organizationId) {
        const generation = ++tutorialLoadGenerationRef.current;
        await loadServerProgress(organizationId, generation);
      }
    } finally {
      tutorialPersistenceActiveRef.current = false;
      if (tutorialPersistenceRequestedRef.current) void flushAcademyPersistence();
    }
  }

  function updateAcademyState(updater: (current: AcademyState) => AcademyState) {
    const next = updater(academyStateRef.current);
    academyStateRef.current = next;
    setAcademyState(next);
    tutorialPersistenceRequestedRef.current = true;
    void flushAcademyPersistence();
  }

  function requireSignedInForAcademy() {
    if (signedInUserKeyRef.current ?? signedInUserKey) {
      return true;
    }

    const destination = pathname.startsWith("/member/")
      ? pathname
      : pathname.startsWith("/graph")
        ? "/member/graph"
        : pathname.startsWith("/infrastructure")
          ? "/member/infrastructure"
          : "/member/dashboard";
    router.push(memberSignInPath(destination));
    return false;
  }

  function openAt(stepId?: string, nextView: "tour" | "library" = "tour") {
    if (!requireSignedInForAcademy()) return;
    const nextSteps = visibleSteps;
    if (nextView === "tour") {
      const requestedAnchor = stepId ?? tutorialCurrentAnchorRef.current;
      const index = requestedAnchor ? nextSteps.findIndex((step) => step.id === requestedAnchor) : safeStepIndex;
      if (nextSteps.length > 0) {
        tutorialCurrentAnchorRef.current = nextSteps[index >= 0 ? index : 0]!.id as TutorialProgress["current_anchor_id"];
        setStepIndex(index >= 0 ? index : 0);
      }
    }
    closeSettingsWindow();
    setView(nextView);
    setIsOpen(true);
    const organizationId = organizationIdRef.current;
    if (organizationId) {
      if (tutorialTruthExpiryTimerRef.current !== null) {
        window.clearTimeout(tutorialTruthExpiryTimerRef.current);
        tutorialTruthExpiryTimerRef.current = null;
      }
      setTutorialClaims([]);
      setTutorialTruthStatus("loading");
      setTutorialTruthMessage("Checking receipt-backed Tutorial publication...");
      setSpotlightStepId(null);
      setHighlightRect(null);
      const truthGeneration = ++tutorialTruthGenerationRef.current;
      void loadPublishedTutorial(organizationId, truthGeneration);
      void recordInteractionAnalytics({
        controlId: nextView === "library" ? "tutorial-library" : "tutorial-tour",
        eventType: "HELP_USED",
        organizationId,
        route: pathname
      }).catch(() => undefined);
    }
  }

  useEffect(() => {
    function handleAuthenticated(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const userKey = academyUserKey(detail);

      if (!userKey) return;
      if (signedInUserKeyRef.current !== null && signedInUserKeyRef.current !== userKey) {
        organizationIdRef.current = null;
        tutorialRevisionRef.current = 0;
        tutorialCurrentAnchorRef.current = null;
        tutorialLoadGenerationRef.current += 1;
        tutorialTruthGenerationRef.current += 1;
        tutorialPersistenceRequestedRef.current = false;
        if (tutorialTruthExpiryTimerRef.current !== null) {
          window.clearTimeout(tutorialTruthExpiryTimerRef.current);
          tutorialTruthExpiryTimerRef.current = null;
        }
        setAcademyState(signedOutAcademyState);
        academyStateRef.current = signedOutAcademyState;
        setTutorialClaims([]);
        setTutorialTruthStatus("idle");
        setTutorialTruthMessage("Select a workspace to verify published Tutorial lessons.");
        setSpotlightStepId(null);
        setHighlightRect(null);
      }
      signedInUserKeyRef.current = userKey;
      setSignedInUserKey(userKey);
    }

    function handleOrganizationContext(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const userKey = academyUserKey(detail);
      const organizationId = academyOrganizationId(detail);
      if (!userKey || !organizationId) return;
      signedInUserKeyRef.current = userKey;
      organizationIdRef.current = organizationId;
      setSignedInUserKey(userKey);
      tutorialRevisionRef.current = 0;
      tutorialCurrentAnchorRef.current = null;
      tutorialPersistenceRequestedRef.current = false;
      setAcademyState(signedOutAcademyState);
      academyStateRef.current = signedOutAcademyState;
      if (tutorialTruthExpiryTimerRef.current !== null) {
        window.clearTimeout(tutorialTruthExpiryTimerRef.current);
        tutorialTruthExpiryTimerRef.current = null;
      }
      setTutorialClaims([]);
      setTutorialTruthStatus("loading");
      setTutorialTruthMessage("Checking receipt-backed Tutorial publication...");
      setSpotlightStepId(null);
      setHighlightRect(null);
      const generation = ++tutorialLoadGenerationRef.current;
      const truthGeneration = ++tutorialTruthGenerationRef.current;
      void loadServerProgress(organizationId, generation);
      void loadPublishedTutorial(organizationId, truthGeneration);
    }

    function handleSignedOut() {
      dismissedInCurrentSessionRef.current = false;
      signedInUserKeyRef.current = null;
      organizationIdRef.current = null;
      tutorialRevisionRef.current = 0;
      tutorialCurrentAnchorRef.current = "command-overview";
      tutorialLoadGenerationRef.current += 1;
      tutorialTruthGenerationRef.current += 1;
      if (tutorialTruthExpiryTimerRef.current !== null) {
        window.clearTimeout(tutorialTruthExpiryTimerRef.current);
        tutorialTruthExpiryTimerRef.current = null;
      }
      setSignedInUserKey(null);
      setAcademyState(signedOutAcademyState);
      academyStateRef.current = signedOutAcademyState;
      setTutorialClaims([]);
      setTutorialTruthStatus("idle");
      setTutorialTruthMessage("Sign in to verify published Tutorial lessons.");
      setAcademySyncStatus("idle");
      setAcademySyncMessage("Sign in to sync Tutorial progress.");
      setIsOpen(false);
      setSpotlightStepId(null);
      setHighlightRect(null);
    }

    window.addEventListener(academyAuthEvent, handleAuthenticated);
    window.addEventListener(academyOrganizationEvent, handleOrganizationContext);
    window.addEventListener(academySignOutEvent, handleSignedOut);

    try {
      const storedAuthDetail = JSON.parse(readLocalValue(window.sessionStorage, authenticatedUserSessionKey) ?? "null") as unknown;
      if (academyUserKey(storedAuthDetail)) {
        handleAuthenticated(new CustomEvent(academyAuthEvent, { detail: storedAuthDetail }));
      }
    } catch {
      removeLocalValue(window.sessionStorage, authenticatedUserSessionKey);
    }

    return () => {
      window.removeEventListener(academyAuthEvent, handleAuthenticated);
      window.removeEventListener(academyOrganizationEvent, handleOrganizationContext);
      window.removeEventListener(academySignOutEvent, handleSignedOut);
      if (tutorialTruthExpiryTimerRef.current !== null) {
        window.clearTimeout(tutorialTruthExpiryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function openFromShortcut(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail as { section?: string; view?: "tour" | "library" } | undefined : undefined;
      openAt(detail?.section, detail?.view ?? "tour");
    }

    function openLibrary() {
      openAt(undefined, "library");
    }

    window.addEventListener("entral:open-tutorial", openFromShortcut);
    window.addEventListener("entral:open-academy", openLibrary);

    return () => {
      window.removeEventListener("entral:open-tutorial", openFromShortcut);
      window.removeEventListener("entral:open-academy", openLibrary);
    };
  }, [academyState.mode, pathname, signedInUserKey, visibleSteps]);

  useEffect(() => {
    const target = spotlightStep?.target;

    if (!spotlightStep || !target) {
      setHighlightRect(null);
      setAcademyPlacement("center");
      setSpotlightMissingTarget(false);
      return undefined;
    }

    const targetId: string = target;
    let frameId = 0;
    let attempts = 0;

    function updateHighlight() {
      const element = findVisibleAcademyTarget(targetId);
      attempts += 1;

      if (!element) {
        setHighlightRect(null);
        setAcademyPlacement("center");
        setSpotlightMissingTarget(attempts > 4);
        return;
      }

      element.scrollIntoView({ block: "nearest", inline: "nearest" });
      const rect = element.getBoundingClientRect();
      const placement = getAcademyPlacement(rect);
      setAcademyPlacement(placement);
      setSpotlightMissingTarget(false);

      if (isOversizedTarget(rect) || !hasUsableRect(rect)) {
        setHighlightRect(null);
        return;
      }

      setHighlightRect({
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width
      });
    }

    frameId = window.requestAnimationFrame(updateHighlight);
    const retryTimer = window.setInterval(updateHighlight, 250);
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(retryTimer);
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight, true);
    };
  }, [spotlightStep?.target, spotlightStep?.id]);

  useEffect(() => {
    if (!spotlightStep) return undefined;
    const stepId = spotlightStep.id;
    const target = spotlightStep.target;

    function prepareTarget() {
      window.dispatchEvent(new CustomEvent("entral:academy-prepare-target", {
        detail: {
          stepId,
          target
        }
      }));
    }

    prepareTarget();
    const retryTimer = window.setInterval(prepareTarget, 300);
    const stopTimer = window.setTimeout(() => window.clearInterval(retryTimer), 1500);

    return () => {
      window.clearInterval(retryTimer);
      window.clearTimeout(stopTimer);
    };
  }, [spotlightStep]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (spotlightStep) {
          returnToAcademy(false);
        } else {
          closeAcademy();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, spotlightStep]);

  function markStepComplete(stepId = currentStep?.id) {
    if (!stepId) return;
    updateAcademyState((current) => ({
      ...current,
      completedSteps: Array.from(new Set([...current.completedSteps, stepId]))
    }));
  }

  function closeAcademy() {
    dismissedInCurrentSessionRef.current = true;
    updateAcademyState((current) => ({ ...current, firstLaunchSeen: true }));
    setIsOpen(false);
    setView("tour");
    const organizationId = organizationIdRef.current;
    if (organizationId && completedVisibleCount < visibleSteps.length) {
      void recordInteractionAnalytics({
        controlId: "academy-close",
        eventType: "TUTORIAL_ABANDONED",
        organizationId,
        reasonCode: "USER_CLOSED",
        route: pathname
      }).catch(() => undefined);
    }
  }

  async function resetAcademyProgress() {
    const organizationId = organizationIdRef.current;
    if (!organizationId || tutorialRevisionRef.current < 1) return;
    const generation = tutorialLoadGenerationRef.current;
    setAcademySyncStatus("loading");
    setAcademySyncMessage("Resetting server Tutorial progress...");
    try {
      const progress = await resetTutorialProgress(organizationId, {
        contract_version: "1.0.0",
        expected_revision: tutorialRevisionRef.current,
        idempotency_key: `phase200:tutorial:reset:${crypto.randomUUID()}`,
        schema_version: 1
      });
      if (organizationId !== organizationIdRef.current || generation !== tutorialLoadGenerationRef.current) return;
      tutorialRevisionRef.current = progress.revision;
      const resetState = academyStateFromProgress(progress);
      tutorialCurrentAnchorRef.current = progress.current_anchor_id;
      setAcademyState(resetState);
      academyStateRef.current = resetState;
      setStepIndex(0);
      setAcademySyncStatus("synced");
      setAcademySyncMessage(`Tutorial reset on the server · revision ${progress.revision}`);
    } catch {
      if (organizationId !== organizationIdRef.current || generation !== tutorialLoadGenerationRef.current) return;
      setAcademySyncStatus("error");
      setAcademySyncMessage("Tutorial reset was not applied. Reload the server progress and try again.");
      void recordInteractionAnalytics({
        controlId: "tutorial-reset",
        eventType: "CONTROL_FAILED",
        organizationId,
        reasonCode: "TUTORIAL_RESET_FAILED",
        route: pathname
      }).catch(() => undefined);
    }
  }

  function finishTour() {
    dismissedInCurrentSessionRef.current = true;
    tutorialCurrentAnchorRef.current = (visibleSteps[0]?.id ?? null) as TutorialProgress["current_anchor_id"];
    updateAcademyState((current) => ({
      ...current,
      completedSteps: Array.from(new Set([...current.completedSteps, ...visibleSteps.map((step) => step.id)])),
      firstLaunchSeen: true
    }));
    setIsOpen(false);
    setView("tour");
    setStepIndex(0);
  }

  function nextStep() {
    const nextIndex = safeStepIndex < visibleSteps.length - 1 ? safeStepIndex + 1 : 0;
    tutorialCurrentAnchorRef.current = (visibleSteps[nextIndex]?.id ?? null) as TutorialProgress["current_anchor_id"];
    markStepComplete();
    if (safeStepIndex < visibleSteps.length - 1) {
      setStepIndex(safeStepIndex + 1);
    } else {
      finishTour();
    }
  }

  function previousStep() {
    const previousIndex = Math.max(safeStepIndex - 1, 0);
    tutorialCurrentAnchorRef.current = (visibleSteps[previousIndex]?.id ?? null) as TutorialProgress["current_anchor_id"];
    setStepIndex(previousIndex);
    updateAcademyState((current) => current);
  }

  function setMode(mode: AcademyMode) {
    const nextSteps = visibleStepsFor(mode).filter((step) => tutorialClaimByCapabilityKey.has(step.capabilityKey));
    tutorialCurrentAnchorRef.current = (nextSteps[0]?.id ?? null) as TutorialProgress["current_anchor_id"];
    updateAcademyState((current) => ({ ...current, mode }));
    setStepIndex(0);
  }

  function startWalkthrough(step = currentStep) {
    if (!step || !tutorialClaimByCapabilityKey.has(step.capabilityKey)) return;

    tutorialCurrentAnchorRef.current = step.id as TutorialProgress["current_anchor_id"];

    setIsOpen(false);
    setView("tour");
    closeSettingsWindow();
    setSpotlightStepId(step.id);
    setSpotlightMissingTarget(false);
    setHighlightRect(null);
    setAcademyPlacement("center");
    updateAcademyState((current) => ({ ...current, firstLaunchSeen: true }));

    const targetRoute = pathname.startsWith("/member/")
      ? `/member${step.route}`
      : step.route;
    const targetPathname = targetRoute.split("?")[0];
    if (pathname !== targetPathname || targetRoute.includes("?")) {
      router.push(targetRoute);
    }
  }

  function returnToAcademy(completeStep: boolean) {
    const step = spotlightStep;
    setSpotlightStepId(null);
    setSpotlightMissingTarget(false);
    setHighlightRect(null);
    setAcademyPlacement("center");

    if (step) {
      const index = visibleSteps.findIndex((candidate) => candidate.id === step.id);
      setStepIndex(index >= 0 ? index : 0);
      if (completeStep) {
        markStepComplete(step.id);
      }
    }

    closeSettingsWindow();
    setView("tour");
    setIsOpen(true);
  }

  const value = useMemo<OnboardingContextValue>(() => ({
    mode: academyState.mode,
    openLibrary: () => openAt(undefined, "library"),
    openTour: (stepId?: string) => openAt(stepId),
    progress: {
      completed: completedVisibleCount,
      total: visibleSteps.length
    },
    setMode
  }), [academyState.mode, completedVisibleCount, pathname, signedInUserKey, visibleSteps]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {spotlightStep && spotlightStepClaim ? (
        <div className={`academy-spotlight-layer academy-backdrop--${academyPlacement}`} role="presentation">
          {highlightRect ? (
            <div
              aria-hidden="true"
              className="academy-highlight"
              style={{
                height: highlightRect.height + 14,
                left: highlightRect.left - 7,
                top: highlightRect.top - 7,
                width: highlightRect.width + 14
              }}
            />
          ) : null}

          <section className={`academy-spotlight-card academy-spotlight-card--${academyPlacement}`} role="dialog" aria-label={`${spotlightStepClaim.display_name} walkthrough`} aria-modal="false">
            <p className="eyebrow">Live walkthrough</p>
            <h2>{spotlightStepClaim.display_name}</h2>
            <p>{spotlightStepClaim.approved_language}</p>
            {spotlightMissingTarget ? (
              <p className="academy-spotlight-note" role="status">
                I opened the right area, but the exact control is currently hidden. Open the related panel or return to the Academy when ready.
              </p>
            ) : null}
            <div className="academy-actions">
              <Button type="button" onClick={() => returnToAcademy(true)}>
                <ChevronLeft aria-hidden="true" size={17} />
                Return to Academy
              </Button>
              <Button type="button" variant="secondary" onClick={() => returnToAcademy(false)}>
                Skip spotlight
              </Button>
            </div>
          </section>
        </div>
      ) : null}
      {isOpen ? (
        <div className={`overlay-backdrop onboarding-backdrop academy-backdrop academy-backdrop--${academyPlacement}`} role="presentation">
          <section className={`onboarding-tour academy-shell academy-shell--${academyPlacement}`} ref={academyDialogRef} role="dialog" aria-label="ENTRAL Academy" aria-modal="true" tabIndex={-1}>
            <button className="icon-button tour-close" type="button" onClick={closeAcademy} aria-label="Close ENTRAL Academy">
              <X aria-hidden="true" size={18} />
            </button>

            <header className="academy-header">
              <div className="tour-orbit">
                <GraduationCap aria-hidden="true" size={34} />
              </div>
              <div>
                <p className="eyebrow">ENTRAL Academy</p>
                <h2>{view === "library" ? "Tutorial library" : currentStepClaim?.display_name ?? "Tutorial"}</h2>
                <p>{view === "library" ? "Only receipt-backed, currently SELLABLE lessons are published here." : currentStepClaim?.approved_language}</p>
              </div>
            </header>

            <p
              className="academy-sync-status"
              data-state={academySyncStatus}
              role={academySyncStatus === "error" ? "alert" : "status"}
            >
              <MonitorUp aria-hidden="true" size={15} /> {academySyncMessage}
            </p>

            <p
              className="academy-sync-status"
              data-state={tutorialTruthStatus === "unavailable" || tutorialTruthStatus === "idle" ? "error" : tutorialTruthStatus}
              role="status"
            >
              <ShieldCheck aria-hidden="true" size={15} /> {tutorialTruthMessage}
            </p>

            <div className="academy-mode-switch" role="group" aria-label="Academy mode">
              <button className={academyState.mode === "beginner" ? "active" : ""} type="button" onClick={() => setMode("beginner")}>
                <Compass aria-hidden="true" size={16} />
                Beginner
              </button>
              <button className={academyState.mode === "advanced" ? "active" : ""} type="button" onClick={() => setMode("advanced")}>
                <Sparkles aria-hidden="true" size={16} />
                Advanced
              </button>
            </div>

            <div className="academy-progress" aria-label={`${completedVisibleCount} of ${visibleSteps.length} Academy lessons completed`}>
              <span style={{ width: `${visibleSteps.length > 0 ? (completedVisibleCount / visibleSteps.length) * 100 : 0}%` }} />
            </div>

            <div className="academy-content">
              {tutorialTruthStatus !== "ready" ? (
                <section
                  className="academy-step-card"
                  role={tutorialTruthStatus === "unavailable" || tutorialTruthStatus === "idle" ? "alert" : "status"}
                >
                  <h3>
                    {tutorialTruthStatus === "loading"
                      ? "Verifying published Tutorial lessons"
                      : tutorialTruthStatus === "empty"
                        ? "No published Tutorial lessons"
                        : "Tutorial publication unavailable"}
                  </h3>
                  <p>{tutorialTruthMessage}</p>
                  <Button type="button" variant="secondary" onClick={closeAcademy}>
                    Enter Command Center
                  </Button>
                </section>
              ) : view === "library" ? (
                <div className="academy-library">
                  <article>
                    <header>
                      <BookOpen aria-hidden="true" size={18} />
                      <div>
                        <strong>Published lessons</strong>
                        <small>{completedVisibleCount}/{visibleSteps.length} complete</small>
                      </div>
                    </header>
                    <div>
                      {visibleSteps.map((step) => (
                        <button key={step.id} type="button" onClick={() => {
                          setStepIndex(visibleSteps.findIndex((candidate) => candidate.id === step.id));
                          setView("tour");
                        }}>
                          {completedSet.has(step.id) ? <CheckCircle2 aria-hidden="true" size={15} /> : <Play aria-hidden="true" size={15} />}
                          {tutorialClaimByCapabilityKey.get(step.capabilityKey)?.display_name}
                        </button>
                      ))}
                    </div>
                  </article>
                </div>
              ) : (
                <div className="academy-step-grid">
                  <aside className="academy-section-nav" aria-label="Academy jump navigation">
                    <div>
                      <strong>Published lessons</strong>
                      <small>{completedVisibleCount}/{visibleSteps.length}</small>
                      {visibleSteps.map((step) => (
                        <button
                          className={currentStep?.id === step.id ? "active" : ""}
                          key={step.id}
                          type="button"
                          onClick={() => setStepIndex(visibleSteps.findIndex((candidate) => candidate.id === step.id))}
                        >
                          {completedSet.has(step.id) ? <CheckCircle2 aria-hidden="true" size={14} /> : <span aria-hidden="true" />}
                          {tutorialClaimByCapabilityKey.get(step.capabilityKey)?.display_name}
                        </button>
                      ))}
                    </div>
                  </aside>

                  <article className="academy-step-card">
                    <p className="eyebrow">Lesson {safeStepIndex + 1} of {visibleSteps.length}</p>
                    <h3>{currentStepClaim?.display_name}</h3>
                    <p>{currentStepClaim?.approved_language}</p>
                    <div className="tour-progress" aria-hidden="true">
                      {visibleSteps.map((step) => (
                        <span className={completedSet.has(step.id) || step.id === currentStep?.id ? "active" : ""} key={step.id} />
                      ))}
                    </div>
                  </article>
                </div>
              )}
            </div>

            {view === "tour" && tutorialTruthStatus === "ready" && currentStepClaim ? (
                <div className="academy-actions">
                  <Button className="academy-enter-button" type="button" variant="secondary" onClick={closeAcademy}>
                    Enter Command Center
                  </Button>
                  <Button className="academy-library-button" type="button" variant="secondary" onClick={() => setView("library")}>
                    <BookOpen aria-hidden="true" size={17} />
                    Library
                  </Button>
                  <Button className="academy-back-button" type="button" variant="secondary" onClick={previousStep} disabled={safeStepIndex === 0}>
                    <ChevronLeft aria-hidden="true" size={17} />
                    Back
                  </Button>
                  <Button className="academy-complete-button" type="button" variant="secondary" onClick={() => markStepComplete()}>
                    <CheckCircle2 aria-hidden="true" size={17} />
                    Mark complete
                  </Button>
                  <Button className="academy-show-button" type="button" onClick={() => startWalkthrough()}>
                    <Play aria-hidden="true" size={17} />
                    Show me
                  </Button>
                  <Button className="academy-next-button" type="button" onClick={nextStep}>
                    {safeStepIndex < visibleSteps.length - 1 ? <ChevronRight aria-hidden="true" size={17} /> : <ShieldCheck aria-hidden="true" size={17} />}
                    {safeStepIndex < visibleSteps.length - 1 ? "Next lesson" : "Complete Academy"}
                  </Button>
                </div>
            ) : null}

            <footer className="academy-footer">
              <span><Command aria-hidden="true" size={14} /> Replay from Command Palette</span>
              <span><SlidersHorizontal aria-hidden="true" size={14} /> Mode and completion are server-backed</span>
              <button disabled={academySyncStatus === "loading" || tutorialRevisionRef.current < 1} onClick={() => void resetAcademyProgress()} type="button">
                Reset Tutorial progress
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);

  if (!value) {
    throw new Error("useOnboarding must be used inside OnboardingProvider.");
  }

  return value;
}
