"use client";

import React, { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Bot, CheckCircle2, ChevronLeft, ChevronRight, Command, Compass, GraduationCap, Layers3, MonitorUp, Play, ShieldCheck, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Button } from "./Button";

type AcademyMode = "beginner" | "advanced";

type AcademyModule = {
  description: string;
  id: string;
  title: string;
};

type AcademyStep = {
  description: string;
  guidedTask: string;
  id: string;
  mode: AcademyMode | "both";
  moduleId: string;
  route: string;
  target?: string;
  title: string;
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
const legacyCompleteKey = "entral-onboarding-complete";
const academyStorageKey = "entral-academy-state-v1";
const authenticatedUserSessionKey = "entral-authenticated-user";
const academyAuthEvent = "entral:user-authenticated";
const academySignOutEvent = "entral:user-signed-out";

const modules: AcademyModule[] = [
  {
    description: "The fastest path from a blank command center to first useful action.",
    id: "quick-start",
    title: "Quick Start"
  },
  {
    description: "Learn how to speak to ENTRAL and issue operational directives.",
    id: "command-guide",
    title: "Command Guide"
  },
  {
    description: "Understand ENTRAL, Marshals, Generals, Commanders, and Soldiers.",
    id: "hierarchy-guide",
    title: "Hierarchy Guide"
  },
  {
    description: "Create a business General from templates without memorizing structure.",
    id: "business-guide",
    title: "Business Creation"
  },
  {
    description: "Operate ENTRAL from a phone or tablet without desktop sidebars.",
    id: "mobile-guide",
    title: "Mobile Guide"
  },
  {
    description: "Use push-to-talk, reports-only voice, and spoken command feedback.",
    id: "voice-guide",
    title: "Voice Guide"
  },
  {
    description: "Learn the Merch/POD launch structure and approval-gated workflow.",
    id: "merch-guide",
    title: "Merch/POD Guide"
  },
  {
    description: "Advanced operators can review recovery, settings, shortcuts, and screen sharing.",
    id: "advanced-tools",
    title: "Advanced Tools"
  }
];

const academySteps: AcademyStep[] = [
  {
    description: "ENTRAL begins as a central command system with no fake hierarchy. Your first job is to create the operating structure it will command.",
    guidedTask: "Notice the ENTRAL status at the top of the dashboard. A new user should see ENTRAL online and awaiting directives.",
    id: "welcome",
    mode: "both",
    moduleId: "quick-start",
    route: "/dashboard",
    target: "command-brand",
    title: "Start from ENTRAL"
  },
  {
    description: "The command console is the primary control path. You can ask questions, request reports, create structure, or route work from one place.",
    guidedTask: "Look at the command console. Try commands like Help, Create a Marshal, Create my first business, or ENTRAL report.",
    id: "command-console",
    mode: "both",
    moduleId: "command-guide",
    route: "/dashboard",
    target: "command-console",
    title: "Command through ENTRAL"
  },
  {
    description: "The visible command menu is the replacement for hidden shortcut discovery. Keyboard shortcuts still work, but no essential action should depend on them.",
    guidedTask: "Open the Command button and look for actions such as Academy, tasks, settings, business setup, and reports.",
    id: "command-menu",
    mode: "both",
    moduleId: "command-guide",
    route: "/dashboard",
    target: "command-palette",
    title: "Find actions without guessing"
  },
  {
    description: "The 3D graph is the live command view. ENTRAL sits at the center. Marshals, Generals, Commanders, and Soldiers appear only when you create them.",
    guidedTask: "Read the graph as a chain of command: ENTRAL -> Marshal -> General -> Commander -> Soldier.",
    id: "graph",
    mode: "both",
    moduleId: "hierarchy-guide",
    route: "/dashboard",
    target: "command-graph",
    title: "Read the graph"
  },
  {
    description: "Marshals are strategic theaters or portfolios. A Merch Marshal, Website Marshal, or Marketing Marshal can contain multiple business Generals.",
    guidedTask: "Use the navigation to inspect Marshals. If no Marshals exist yet, create one before creating a business General.",
    id: "navigation",
    mode: "both",
    moduleId: "hierarchy-guide",
    route: "/dashboard",
    target: "command-nav",
    title: "Understand Marshals"
  },
  {
    description: "Generals represent actual businesses, clients, brands, stores, or operations. Commanders are departments inside a General. Soldiers execute under Commanders.",
    guidedTask: "Open the inspector and review the command path, direct reports, memory, tasks, and suggested actions for the selected entity.",
    id: "inspector",
    mode: "both",
    moduleId: "hierarchy-guide",
    route: "/dashboard",
    target: "command-inspector",
    title: "Inspect the hierarchy"
  },
  {
    description: "Use the structure controls when you want to build manually. ENTRAL enforces the official order: Marshals under ENTRAL, Generals under Marshals, Commanders under Generals, Soldiers under Commanders.",
    guidedTask: "Open Unified controls and locate Add Marshal, Add General, Add Commander, Add Soldier, and Remove Selected.",
    id: "create-entities",
    mode: "both",
    moduleId: "hierarchy-guide",
    route: "/dashboard",
    target: "command-structure-actions",
    title: "Create the chain of command"
  },
  {
    description: "The business wizard turns a business idea into a Marshal, business General, operating Commanders, Soldiers, and an initial task.",
    guidedTask: "Open Business setup, choose a template, enter a business name, and preview the creation plan before approval.",
    id: "first-business",
    mode: "both",
    moduleId: "business-guide",
    route: "/dashboard",
    target: "business-wizard",
    title: "Create your first business"
  },
  {
    description: "Templates reduce setup time. ENTRAL currently supports POD/Merch, Website Agency, Content Agency, E-commerce Brand, SaaS Startup, Local Service Business, and Custom Blank Structure.",
    guidedTask: "Review the template buttons and choose the one closest to your business model.",
    id: "templates",
    mode: "both",
    moduleId: "business-guide",
    route: "/dashboard",
    target: "business-wizard",
    title: "Use business templates"
  },
  {
    description: "Tasks are delegated through the hierarchy and reports preserve what happened. Reports use Situation, Analysis, Recommendation, and Next Actions.",
    guidedTask: "Generate an ENTRAL report or assign a task. Then review the command feed and selected entity report history.",
    id: "tasks-reports",
    mode: "both",
    moduleId: "command-guide",
    route: "/dashboard",
    target: "command-task-list",
    title: "Use tasks and reports"
  },
  {
    description: "On mobile, use bottom tabs instead of desktop sidebars. Command, Hierarchy, Tasks, Reports, and More are the main surfaces.",
    guidedTask: "Open the bottom tabs on a narrow screen. Use Hierarchy for structure, Tasks for work, Reports for briefings, and Command for directives.",
    id: "mobile",
    mode: "both",
    moduleId: "mobile-guide",
    route: "/dashboard",
    target: "command-nav",
    title: "Operate from mobile"
  },
  {
    description: "Voice mode lets ENTRAL hear push-to-talk directives and speak reports based on your settings.",
    guidedTask: "Find the microphone status and try a safe text version first: ENTRAL, report. Then enable voice if desired.",
    id: "voice",
    mode: "both",
    moduleId: "voice-guide",
    route: "/dashboard",
    target: "voice-controls",
    title: "Use voice commands"
  },
  {
    description: "The Merch/POD template creates the operating lane for client merch: intake, brand, design, listing, compliance, launch, marketing, and reporting.",
    guidedTask: "Open Business setup and choose POD / Merch Business. Review the generated Commanders and Soldiers before approving anything.",
    id: "merch-pod",
    mode: "both",
    moduleId: "merch-guide",
    route: "/dashboard",
    target: "business-wizard",
    title: "Launch a Merch/POD structure"
  },
  {
    description: "ENTRAL repairs local state on refresh: broken edges are rebuilt and interrupted active tasks are marked failed for review.",
    guidedTask: "Review task history after a refresh. Interrupted local tasks should never silently pretend they completed.",
    id: "recovery",
    mode: "advanced",
    moduleId: "advanced-tools",
    route: "/dashboard",
    target: "command-task-list",
    title: "Understand recovery"
  },
  {
    description: "Share Screen is optional and consent-based. ENTRAL should only see your screen when you explicitly allow it.",
    guidedTask: "Open Chat, find Share Screen, read the privacy notice, then stop before granting permission unless you need it.",
    id: "screen-sharing",
    mode: "both",
    moduleId: "advanced-tools",
    route: "/chat",
    target: "screen-share",
    title: "Use screen view safely"
  },
  {
    description: "Settings contain appearance, account, Command AI behavior, voice, and Academy controls including replay and mode selection.",
    guidedTask: "Open Settings, switch to Academy, and replay the tutorial library whenever you need a refresher.",
    id: "settings",
    mode: "both",
    moduleId: "advanced-tools",
    route: "/dashboard",
    target: "settings",
    title: "Replay and customize"
  },
  {
    description: "Beginner mode keeps the Academy focused. Advanced mode adds system recovery, screen sharing, task state, and governance details.",
    guidedTask: "Switch modes here or in Settings whenever you want a lighter or deeper training path.",
    id: "modes",
    mode: "both",
    moduleId: "advanced-tools",
    route: "/dashboard",
    target: "settings",
    title: "Choose your training depth"
  },
  {
    description: "Advanced operators should use the visible command menu, keyboard help, governance, and task recovery together.",
    guidedTask: "Open keyboard help, then use the command menu to jump to governance or automations.",
    id: "advanced-flow",
    mode: "advanced",
    moduleId: "advanced-tools",
    route: "/dashboard",
    target: "command-palette",
    title: "Operate like a power user"
  }
];

function academyStorageKeyFor(userKey: string) {
  return `${academyStorageKey}:${encodeURIComponent(userKey)}`;
}

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

function readLocalValue(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalValue(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Academy progress should never block access to the Command Center.
  }
}

function removeLocalValue(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore blocked storage; the signed-out event still resets in-memory state.
  }
}

function readAcademyState(userKey: string | null): AcademyState {
  if (!userKey) {
    return { completedSteps: [], firstLaunchSeen: true, mode: "beginner" };
  }

  if (typeof window === "undefined") {
    return { completedSteps: [], firstLaunchSeen: false, mode: "beginner" };
  }

  try {
    const parsed = JSON.parse(readLocalValue(window.localStorage, academyStorageKeyFor(userKey)) ?? "{}") as Partial<AcademyState>;
    return {
      completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps.filter((step): step is string => typeof step === "string") : [],
      firstLaunchSeen: Boolean(parsed.firstLaunchSeen),
      mode: parsed.mode === "advanced" ? "advanced" : "beginner"
    };
  } catch {
    return {
      completedSteps: [],
      firstLaunchSeen: false,
      mode: "beginner"
    };
  }
}

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
  const [academyState, setAcademyState] = useState<AcademyState>(() => readAcademyState(null));
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"tour" | "library">("tour");
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [academyPlacement, setAcademyPlacement] = useState<AcademyPlacement>("center");
  const [spotlightStepId, setSpotlightStepId] = useState<string | null>(null);
  const [spotlightMissingTarget, setSpotlightMissingTarget] = useState(false);
  const dismissedInCurrentSessionRef = useRef(false);
  const academyStateRef = useRef(academyState);
  const isOpenRef = useRef(isOpen);
  const signedInUserKeyRef = useRef<string | null>(null);
  const spotlightStepIdRef = useRef<string | null>(spotlightStepId);
  const userInteractedBeforeAutoOpenRef = useRef(false);
  const visibleSteps = useMemo(() => visibleStepsFor(academyState.mode), [academyState.mode]);
  const safeStepIndex = Math.min(stepIndex, Math.max(visibleSteps.length - 1, 0));
  const currentStep = visibleSteps[safeStepIndex] ?? visibleSteps[0];
  const spotlightStep = spotlightStepId ? academySteps.find((step) => step.id === spotlightStepId) ?? null : null;
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
    function markOperatorInteraction() {
      if (!isOpenRef.current && !spotlightStepIdRef.current && document.querySelector(".command-center-page")) {
        userInteractedBeforeAutoOpenRef.current = true;
      }
    }

    window.addEventListener("keydown", markOperatorInteraction, true);
    window.addEventListener("pointerdown", markOperatorInteraction, true);
    window.addEventListener("input", markOperatorInteraction, true);

    return () => {
      window.removeEventListener("keydown", markOperatorInteraction, true);
      window.removeEventListener("pointerdown", markOperatorInteraction, true);
      window.removeEventListener("input", markOperatorInteraction, true);
    };
  }, []);

  function updateAcademyState(updater: (current: AcademyState) => AcademyState) {
    setAcademyState((current) => {
      const next = updater(current);
      academyStateRef.current = next;
      const userKey = signedInUserKeyRef.current ?? signedInUserKey;

      if (userKey) {
        writeLocalValue(window.localStorage, academyStorageKeyFor(userKey), JSON.stringify(next));
        writeLocalValue(window.localStorage, legacyCompleteKey, next.firstLaunchSeen ? "true" : "false");
      }
      return next;
    });
  }

  function requireSignedInForAcademy() {
    if (signedInUserKey) return true;
    router.push("/login?next=/dashboard");
    return false;
  }

  function openAt(stepId?: string, nextView: "tour" | "library" = "tour") {
    if (!requireSignedInForAcademy()) return;
    const nextSteps = visibleStepsFor(academyState.mode);
    const index = stepId ? nextSteps.findIndex((step) => step.id === stepId) : 0;
    closeSettingsWindow();
    setStepIndex(index >= 0 ? index : 0);
    setView(nextView);
    setIsOpen(true);
  }

  useEffect(() => {
    function handleAuthenticated(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const userKey = academyUserKey(detail);
      const storedState = readAcademyState(userKey);
      const nextState = dismissedInCurrentSessionRef.current
        ? { ...storedState, firstLaunchSeen: true }
        : storedState;

      if (!userKey) return;
      signedInUserKeyRef.current = userKey;
      setSignedInUserKey(userKey);
      setAcademyState(nextState);
      academyStateRef.current = nextState;
      if (dismissedInCurrentSessionRef.current) {
        writeLocalValue(window.localStorage, academyStorageKeyFor(userKey), JSON.stringify(nextState));
        writeLocalValue(window.localStorage, legacyCompleteKey, "true");
      }
    }

    function handleSignedOut() {
      dismissedInCurrentSessionRef.current = false;
      userInteractedBeforeAutoOpenRef.current = false;
      signedInUserKeyRef.current = null;
      setSignedInUserKey(null);
      const signedOutState = readAcademyState(null);
      setAcademyState(signedOutState);
      academyStateRef.current = signedOutState;
      setIsOpen(false);
      setSpotlightStepId(null);
      setHighlightRect(null);
    }

    window.addEventListener(academyAuthEvent, handleAuthenticated);
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
      window.removeEventListener(academySignOutEvent, handleSignedOut);
    };
  }, []);

  useEffect(() => {
    function openFromShortcut(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail as { section?: string; view?: "tour" | "library" } | undefined : undefined;
      openAt(detail?.section, detail?.view ?? "tour");
    }

    function openLibrary() {
      if (!requireSignedInForAcademy()) return;
      closeSettingsWindow();
      setView("library");
      setIsOpen(true);
    }

    window.addEventListener("entral:open-tutorial", openFromShortcut);
    window.addEventListener("entral:open-academy", openLibrary);

    if (signedInUserKey && !academyState.firstLaunchSeen) {
      const timer = window.setTimeout(() => {
        if (dismissedInCurrentSessionRef.current || academyStateRef.current.firstLaunchSeen) {
          return;
        }

        if (userInteractedBeforeAutoOpenRef.current) {
          dismissedInCurrentSessionRef.current = true;
          updateAcademyState((current) => ({ ...current, firstLaunchSeen: true }));
          return;
        }

        closeSettingsWindow();
        setView("tour");
        setIsOpen(true);
      }, 650);

      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("entral:open-tutorial", openFromShortcut);
        window.removeEventListener("entral:open-academy", openLibrary);
      };
    }

    return () => {
      window.removeEventListener("entral:open-tutorial", openFromShortcut);
      window.removeEventListener("entral:open-academy", openLibrary);
    };
  }, [academyState.firstLaunchSeen, academyState.mode, signedInUserKey]);

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
  }

  function finishTour() {
    dismissedInCurrentSessionRef.current = true;
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
    markStepComplete();
    if (safeStepIndex < visibleSteps.length - 1) {
      setStepIndex(safeStepIndex + 1);
    } else {
      finishTour();
    }
  }

  function previousStep() {
    setStepIndex(Math.max(safeStepIndex - 1, 0));
  }

  function setMode(mode: AcademyMode) {
    updateAcademyState((current) => ({ ...current, mode }));
    setStepIndex(0);
  }

  function startWalkthrough(step = currentStep) {
    if (!step) return;

    setIsOpen(false);
    setView("tour");
    closeSettingsWindow();
    setSpotlightStepId(step.id);
    setSpotlightMissingTarget(false);
    setHighlightRect(null);
    setAcademyPlacement("center");
    updateAcademyState((current) => ({ ...current, firstLaunchSeen: true }));

    if (pathname !== step.route) {
      router.push(step.route);
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
    openLibrary: () => {
      if (!requireSignedInForAcademy()) return;
      closeSettingsWindow();
      setView("library");
      setIsOpen(true);
    },
    openTour: (stepId?: string) => openAt(stepId),
    progress: {
      completed: completedVisibleCount,
      total: visibleSteps.length
    },
    setMode
  }), [academyState.mode, completedVisibleCount, signedInUserKey, visibleSteps.length]);

  const moduleProgress = modules.map((module) => {
    const moduleSteps = visibleSteps.filter((step) => step.moduleId === module.id);
    const completed = moduleSteps.filter((step) => completedSet.has(step.id)).length;
    return { completed, module, steps: moduleSteps, total: moduleSteps.length };
  }).filter((item) => item.total > 0);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {spotlightStep ? (
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

          <section className={`academy-spotlight-card academy-spotlight-card--${academyPlacement}`} role="dialog" aria-label={`${spotlightStep.title} walkthrough`} aria-modal="false">
            <p className="eyebrow">Live walkthrough</p>
            <h2>{spotlightStep.title}</h2>
            <p>{spotlightStep.description}</p>
            <div className="academy-guided-task">
              <Layers3 aria-hidden="true" size={18} />
              <span>
                <strong>What to notice</strong>
                {spotlightStep.guidedTask}
              </span>
            </div>
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
          <section className={`onboarding-tour academy-shell academy-shell--${academyPlacement}`} role="dialog" aria-label="ENTRAL Academy" aria-modal="true">
            <button className="icon-button tour-close" type="button" onClick={closeAcademy} aria-label="Close ENTRAL Academy">
              <X aria-hidden="true" size={18} />
            </button>

            <header className="academy-header">
              <div className="tour-orbit">
                <GraduationCap aria-hidden="true" size={34} />
              </div>
              <div>
                <p className="eyebrow">ENTRAL Academy</p>
                <h2>{view === "library" ? "Tutorial library" : currentStep?.title ?? "Tutorial"}</h2>
                <p>{view === "library" ? "Jump into any section, replay lessons, and track what you have completed." : currentStep?.description}</p>
              </div>
            </header>

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
              {view === "library" ? (
                <div className="academy-library">
                  {moduleProgress.map(({ completed, module, steps: moduleSteps, total }) => (
                    <article key={module.id}>
                      <header>
                        <BookOpen aria-hidden="true" size={18} />
                        <div>
                          <strong>{module.title}</strong>
                          <small>{completed}/{total} complete</small>
                        </div>
                      </header>
                      <p>{module.description}</p>
                      <div>
                        {moduleSteps.map((step) => (
                          <button key={step.id} type="button" onClick={() => {
                            setStepIndex(visibleSteps.findIndex((candidate) => candidate.id === step.id));
                            setView("tour");
                          }}>
                            {completedSet.has(step.id) ? <CheckCircle2 aria-hidden="true" size={15} /> : <Play aria-hidden="true" size={15} />}
                            {step.title}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="academy-step-grid">
                  <aside className="academy-section-nav" aria-label="Academy jump navigation">
                    {moduleProgress.map(({ completed, module, steps: moduleSteps, total }) => (
                      <div key={module.id}>
                        <strong>{module.title}</strong>
                        <small>{completed}/{total}</small>
                        {moduleSteps.map((step) => (
                          <button
                            className={currentStep?.id === step.id ? "active" : ""}
                            key={step.id}
                            type="button"
                            onClick={() => setStepIndex(visibleSteps.findIndex((candidate) => candidate.id === step.id))}
                          >
                            {completedSet.has(step.id) ? <CheckCircle2 aria-hidden="true" size={14} /> : <span aria-hidden="true" />}
                            {step.title}
                          </button>
                        ))}
                      </div>
                    ))}
                  </aside>

                  <article className="academy-step-card">
                    <p className="eyebrow">Lesson {safeStepIndex + 1} of {visibleSteps.length}</p>
                    <h3>{currentStep?.title}</h3>
                    <p>{currentStep?.description}</p>
                    <div className="academy-guided-task">
                      <Layers3 aria-hidden="true" size={18} />
                      <span>
                        <strong>Guided task</strong>
                        {currentStep?.guidedTask}
                      </span>
                    </div>
                    <div className="tour-progress" aria-hidden="true">
                      {visibleSteps.map((step) => (
                        <span className={completedSet.has(step.id) || step.id === currentStep?.id ? "active" : ""} key={step.id} />
                      ))}
                    </div>
                  </article>
                </div>
              )}
            </div>

            {view === "tour" ? (
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
              <span><SlidersHorizontal aria-hidden="true" size={14} /> Mode saved locally</span>
              <span><MonitorUp aria-hidden="true" size={14} /> No external docs required</span>
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
