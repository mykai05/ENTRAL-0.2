import React from "react";
import { CheckCircle2, Eye, FlaskConical, type LucideIcon } from "lucide-react";

export type ModeStatusKind = "real" | "mock" | "read-only";

export type ModeStatusItem = {
  description: string;
  label: string;
  mode: ModeStatusKind;
};

type ModeStatusStripProps = {
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
  items: ModeStatusItem[];
};

type ModeBadgeProps = {
  children?: React.ReactNode;
  className?: string;
  mode: ModeStatusKind;
};

const modeIcons: Record<ModeStatusKind, LucideIcon> = {
  real: CheckCircle2,
  mock: FlaskConical,
  "read-only": Eye
};

const modeLabels: Record<ModeStatusKind, string> = {
  real: "Real",
  mock: "Mock",
  "read-only": "Read-only"
};

export const authenticatedModeItems: ModeStatusItem[] = [
  {
    description: "Signed-in workspace data is saved through ENTRAL APIs.",
    label: "Real account",
    mode: "real"
  },
  {
    description: "Disconnected providers stay clearly simulated before trust.",
    label: "Mock when disconnected",
    mode: "mock"
  },
  {
    description: "External writes require scoped permission and approval.",
    label: "Read-only until approved",
    mode: "read-only"
  }
];

export function ModeBadge({ children, className = "", mode }: ModeBadgeProps) {
  const Icon = modeIcons[mode];

  return (
    <span className={["mode-badge", `mode-${mode}`, className].filter(Boolean).join(" ")}>
      <Icon aria-hidden="true" size={13} />
      {children ?? modeLabels[mode]}
    </span>
  );
}

export function ModeStatusStrip({ ariaLabel = "Mode status", className = "", compact = false, items }: ModeStatusStripProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={["mode-status-strip", compact ? "compact" : "", className].filter(Boolean).join(" ")}
      role="group"
    >
      {items.map((item) => (
        <div className={["mode-status-item", `mode-${item.mode}`].join(" ")} key={`${item.mode}-${item.label}`}>
          <ModeBadge mode={item.mode}>{item.label}</ModeBadge>
          <span>{item.description}</span>
        </div>
      ))}
    </div>
  );
}
