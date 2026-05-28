"use client";

import React, { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, MessageSquare, MonitorUp, Play, X } from "lucide-react";
import { Button } from "./Button";

type OnboardingContextValue = {
  openTour: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);
const storageKey = "entral-onboarding-complete";

const steps = [
  {
    description: "Ask ENTRAL to plan, summarize, or inspect your shared screen.",
    icon: MessageSquare,
    title: "Chat first"
  },
  {
    description: "Capture repeatable jobs as clean tasks instead of dense to-do clutter.",
    icon: CheckCircle2,
    title: "Create tasks"
  },
  {
    description: "Build agents for research, posting, monitoring, and scheduled background work.",
    icon: Bot,
    title: "Make agents"
  },
  {
    description: "Share your screen only when you choose. You can stop sharing at any time.",
    icon: MonitorUp,
    title: "Use screen view safely"
  }
];

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex];
  const Icon = currentStep.icon;

  useEffect(() => {
    function openFromShortcut() {
      setStepIndex(0);
      setIsOpen(true);
    }

    window.addEventListener("entral:open-tutorial", openFromShortcut);

    if (window.localStorage.getItem(storageKey) !== "true") {
      const timer = window.setTimeout(() => setIsOpen(true), 500);

      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("entral:open-tutorial", openFromShortcut);
      };
    }

    return () => window.removeEventListener("entral:open-tutorial", openFromShortcut);
  }, []);

  function finishTour() {
    window.localStorage.setItem(storageKey, "true");
    setIsOpen(false);
    setStepIndex(0);
  }

  const value = useMemo(() => ({
    openTour: () => {
      setStepIndex(0);
      setIsOpen(true);
    }
  }), []);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {isOpen ? (
        <div className="overlay-backdrop onboarding-backdrop" role="presentation">
          <section className="onboarding-tour" role="dialog" aria-label="Entral tutorial" aria-modal="true">
            <button className="icon-button tour-close" type="button" onClick={finishTour} aria-label="Skip tutorial">
              <X aria-hidden="true" size={18} />
            </button>
            <div className="tour-orbit">
              <Icon aria-hidden="true" size={34} />
            </div>
            <p className="eyebrow">Step {stepIndex + 1} of {steps.length}</p>
            <h2>{currentStep.title}</h2>
            <p>{currentStep.description}</p>
            <div className="tour-progress" aria-hidden="true">
              {steps.map((step, index) => (
                <span className={index <= stepIndex ? "active" : ""} key={step.title} />
              ))}
            </div>
            <div className="row-actions">
              {stepIndex < steps.length - 1 ? (
                <Button type="button" onClick={() => setStepIndex((current) => current + 1)}>
                  <Play aria-hidden="true" size={18} />
                  Next
                </Button>
              ) : (
                <Button type="button" onClick={finishTour}>
                  Start using ENTRAL
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={finishTour}>
                Skip
              </Button>
            </div>
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
