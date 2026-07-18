"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ClipboardList,
  FileText,
  HeartPulse,
  Network,
  Pause,
  Play,
  SearchCheck,
  Target,
  Users
} from "lucide-react";
import type { MemberOverviewResponse } from "../lib/member";

type MemberNeuronKind = "core" | "finding" | "health" | "priority" | "summary" | "team" | "work";

export type MemberNeuron = {
  detail: string;
  id: MemberNeuronKind;
  label: string;
  metric: string;
  status: "active" | "attention" | "quiet" | "stable" | "watch";
  supportingItems: string[];
  x: number;
  y: number;
};

const positions: Record<Exclude<MemberNeuronKind, "core">, { x: number; y: number }> = {
  health: { x: 50, y: 12 },
  priority: { x: 78, y: 28 },
  work: { x: 80, y: 69 },
  team: { x: 50, y: 86 },
  summary: { x: 20, y: 69 },
  finding: { x: 22, y: 28 }
};

function statusForWork(overview: MemberOverviewResponse): MemberNeuron["status"] {
  if (overview.taskSummary.overdue > 0) return "attention";
  if (overview.taskSummary.inProgress > 0) return "active";
  return overview.taskSummary.total > 0 ? "stable" : "quiet";
}

export function buildMemberNeurons(overview: MemberOverviewResponse): MemberNeuron[] {
  const health = overview.workspace?.businessHealth ?? null;
  const priorities = overview.workspace?.objectivesAndPriorities ?? [];
  const findings = overview.workspace?.findingsAndRecommendations ?? [];
  const summary = overview.workspace?.monthlyOperatingSummary ?? null;
  const activePriorities = priorities.filter((priority) => priority.status === "active");
  const riskFindings = findings.filter((finding) => finding.severity === "risk");

  return [
    {
      detail: `${overview.organization.name}'s organization-scoped Entral environment.`,
      id: "core",
      label: overview.organization.name,
      metric: "Entral core",
      status: "active",
      supportingItems: [
        `${overview.organization.memberCount} of ${overview.organization.memberLimit} member seats`,
        `${overview.taskSummary.total} visible work records`,
        overview.workspace ? `Operating view version ${overview.workspace.version}` : "Operating view awaiting publication"
      ],
      x: 50,
      y: 50
    },
    {
      detail: health?.summary ?? "No approved business-health assessment has been published yet.",
      id: "health",
      label: "Business health",
      metric: health ? `${health.score}/100` : "Awaiting data",
      status: health?.status ?? "quiet",
      supportingItems: health ? [`Status: ${health.status}`] : ["Ready for the first approved assessment"],
      ...positions.health
    },
    {
      detail: priorities.length
        ? "Approved objectives and priorities connected to the organization core."
        : "No approved objectives or priorities have been published yet.",
      id: "priority",
      label: "Priorities",
      metric: priorities.length ? `${activePriorities.length} active` : "Awaiting data",
      status: activePriorities.length ? "active" : priorities.length ? "stable" : "quiet",
      supportingItems: priorities.length
        ? priorities.slice(0, 5).map((priority) => `${priority.title} - ${priority.progress}%`)
        : ["Ready for organization priorities"],
      ...positions.priority
    },
    {
      detail: overview.taskSummary.total
        ? "Member-visible work connected to this organization."
        : "No member-visible work records are available yet.",
      id: "work",
      label: "Active work",
      metric: overview.taskSummary.total ? `${overview.taskSummary.inProgress} in progress` : "No records",
      status: statusForWork(overview),
      supportingItems: overview.recentTasks.length
        ? overview.recentTasks.slice(0, 5).map((task) => `${task.title} - ${task.status.replaceAll("_", " ").toLowerCase()}`)
        : ["Ready for approved organization work"],
      ...positions.work
    },
    {
      detail: "People with verified access to this organization workspace.",
      id: "team",
      label: "Organization team",
      metric: `${overview.members.length} member${overview.members.length === 1 ? "" : "s"}`,
      status: overview.members.length ? "stable" : "quiet",
      supportingItems: overview.members.length
        ? overview.members.slice(0, 5).map((member) => `${member.name} - ${member.role}`)
        : ["No organization members are available"],
      ...positions.team
    },
    {
      detail: summary?.summary ?? "No approved monthly operating summary has been published yet.",
      id: "summary",
      label: "Operating summary",
      metric: summary?.period ?? "Awaiting data",
      status: summary ? "stable" : "quiet",
      supportingItems: summary
        ? [summary.headline, ...summary.nextPriorities.slice(0, 3)]
        : ["Ready for the first monthly summary"],
      ...positions.summary
    },
    {
      detail: findings.length
        ? "Approved findings and recommendations connected to this organization."
        : "No approved findings or recommendations have been published yet.",
      id: "finding",
      label: "Findings",
      metric: findings.length ? `${findings.length} published` : "Awaiting data",
      status: riskFindings.length ? "attention" : findings.length ? "watch" : "quiet",
      supportingItems: findings.length
        ? findings.slice(0, 5).map((finding) => `${finding.title} - ${finding.severity}`)
        : ["Ready for approved findings"],
      ...positions.finding
    }
  ];
}

function NeuronIcon({ kind }: { kind: MemberNeuronKind }) {
  const props = { "aria-hidden": true, size: 18 } as const;
  if (kind === "health") return <HeartPulse {...props} />;
  if (kind === "priority") return <Target {...props} />;
  if (kind === "work") return <ClipboardList {...props} />;
  if (kind === "team") return <Users {...props} />;
  if (kind === "summary") return <FileText {...props} />;
  if (kind === "finding") return <SearchCheck {...props} />;
  return <Network {...props} />;
}

export function MemberNeuronGraph({ overview }: { overview: MemberOverviewResponse }) {
  const neurons = useMemo(() => buildMemberNeurons(overview), [overview]);
  const [selectedId, setSelectedId] = useState<MemberNeuronKind>("core");
  const [isMotionPreferencePaused, setIsMotionPreferencePaused] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const mapRef = useRef<HTMLElement | null>(null);
  const selectedNeuron = neurons.find((neuron) => neuron.id === selectedId) ?? neurons[0];
  const core = neurons[0];
  const isMotionPaused = isMotionPreferencePaused || !isMapVisible || !isPageVisible;

  useEffect(() => {
    setSelectedId("core");
  }, [overview.organization.id]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) setIsMotionPreferencePaused(true);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => setIsMapVisible(entry?.isIntersecting ?? true), {
      rootMargin: "120px"
    });
    observer.observe(map);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const syncVisibility = () => setIsPageVisible(document.visibilityState !== "hidden");
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  return (
    <section
      className={`member-neural-map${isMotionPaused ? " motion-paused" : ""}`}
      aria-labelledby="member-neural-map-heading"
      ref={mapRef}
    >
      <div className="member-neural-map-heading">
        <div>
          <p className="eyebrow">Organization neural map</p>
          <h2 id="member-neural-map-heading">Entral command field</h2>
          <p>Your organization&apos;s approved operating signals, connected in one current view.</p>
        </div>
        <div className="member-neural-map-controls">
          <span className="member-access-badge"><Activity aria-hidden="true" size={15} />{overview.organization.role} access</span>
          <button
            aria-pressed={isMotionPreferencePaused}
            className="member-motion-toggle"
            onClick={() => setIsMotionPreferencePaused((paused) => !paused)}
            type="button"
          >
            {isMotionPreferencePaused ? <Play aria-hidden="true" size={15} /> : <Pause aria-hidden="true" size={15} />}
            {isMotionPreferencePaused ? "Resume motion" : "Pause motion"}
          </button>
        </div>
      </div>

      <div className="member-neural-layout">
        <div className="member-neural-stage" aria-label={`${overview.organization.name} organization neural map`}>
          <div className="member-neural-atmosphere" aria-hidden="true" />
          <svg aria-hidden="true" className="member-neural-connections" preserveAspectRatio="none" viewBox="0 0 100 100">
            <circle className="member-neural-orbit orbit-one" cx="50" cy="50" r="27" />
            <circle className="member-neural-orbit orbit-two" cx="50" cy="50" r="38" />
            {neurons.slice(1).map((neuron) => (
              <line key={neuron.id} x1={core.x} y1={core.y} x2={neuron.x} y2={neuron.y} />
            ))}
          </svg>
          {neurons.map((neuron) => (
            <button
              aria-label={`${neuron.label}: ${neuron.metric}`}
              aria-pressed={selectedNeuron.id === neuron.id}
              className={`member-neuron member-neuron-${neuron.id} status-${neuron.status}`}
              key={neuron.id}
              onClick={() => setSelectedId(neuron.id)}
              style={{ left: `${neuron.x}%`, top: `${neuron.y}%` }}
              type="button"
            >
              <span className="member-neuron-icon"><NeuronIcon kind={neuron.id} /></span>
              <span><strong>{neuron.label}</strong><small>{neuron.metric}</small></span>
            </button>
          ))}
        </div>

        <aside className={`member-neuron-inspector status-${selectedNeuron.status}`}>
          <span className="sr-only" role="status" aria-live="polite">Selected {selectedNeuron.label} neuron.</span>
          <div className="member-neuron-inspector-title">
            <span className="member-neuron-icon"><NeuronIcon kind={selectedNeuron.id} /></span>
            <div><p className="eyebrow">Selected neuron</p><h3>{selectedNeuron.id === "core" ? selectedNeuron.metric : selectedNeuron.label}</h3></div>
          </div>
          <strong className="member-neuron-metric">{selectedNeuron.id === "core" ? selectedNeuron.label : selectedNeuron.metric}</strong>
          <p>{selectedNeuron.detail}</p>
          <ul>
            {selectedNeuron.supportingItems.map((item, index) => <li key={`${selectedNeuron.id}-${index}-${item}`}>{item}</li>)}
          </ul>
          <div className="member-neuron-boundary">
            <Network aria-hidden="true" size={16} />
            <span>Bound to {overview.organization.name}</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
