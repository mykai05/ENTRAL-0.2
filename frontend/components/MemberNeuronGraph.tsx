"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  Lightbulb,
  ListTodo,
  Network,
  Pause,
  Play,
  SearchCheck,
  Sparkles,
  Target,
  UserRound,
  Users
} from "lucide-react";
import type { MemberOverviewResponse } from "../lib/member";
import {
  buildMemberGraphModel,
  buildMemberSummaryNeurons,
  type MemberGraphKind,
  type MemberGraphNode
} from "./member-graph-model";

export type MemberNeuron = MemberGraphNode;
export const buildMemberNeurons = buildMemberSummaryNeurons;

function NeuronIcon({ kind }: { kind: MemberGraphKind }) {
  const props = { "aria-hidden": true, size: 18 } as const;
  if (kind === "health" || kind === "health-assessment") return <HeartPulse {...props} />;
  if (kind === "priorities" || kind === "priority") return <Target {...props} />;
  if (kind === "work") return <ClipboardList {...props} />;
  if (kind === "task" || kind === "task-rollup") return <ListTodo {...props} />;
  if (kind === "team") return <Users {...props} />;
  if (kind === "member") return <UserRound {...props} />;
  if (kind === "summary" || kind === "summary-record") return <FileText {...props} />;
  if (kind === "accomplishment") return <CheckCircle2 {...props} />;
  if (kind === "next-priority") return <ArrowUpRight {...props} />;
  if (kind === "findings" || kind === "finding") return <SearchCheck {...props} />;
  if (kind === "recommendation") return <Lightbulb {...props} />;
  if (kind === "core") return <Network {...props} />;
  return <Sparkles {...props} />;
}

export function MemberNeuronGraph({
  overview,
  variant = "summary"
}: {
  overview: MemberOverviewResponse;
  variant?: "full" | "summary";
}) {
  const model = useMemo(() => buildMemberGraphModel(overview), [overview]);
  const nodes = useMemo(
    () => variant === "full" ? model.nodes : model.nodes.filter((node) => node.depth < 2),
    [model.nodes, variant]
  );
  const nodeIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);
  const edges = useMemo(
    () => model.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)),
    [model.edges, nodeIds]
  );
  const [selectedId, setSelectedId] = useState("core");
  const [isMotionPreferencePaused, setIsMotionPreferencePaused] = useState(false);
  const [isSystemReducedMotion, setIsSystemReducedMotion] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const mapRef = useRef<HTMLElement | null>(null);
  const selectedNeuron = nodes.find((neuron) => neuron.id === selectedId) ?? nodes[0];
  const isMotionPaused = isMotionPreferencePaused || !isMapVisible || !isPageVisible;
  const headingId = variant === "full" ? "member-full-graph-heading" : "member-neural-map-heading";

  useEffect(() => {
    setSelectedId("core");
  }, [overview.organization.id, variant]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) {
      setIsSystemReducedMotion(true);
      setIsMotionPreferencePaused(true);
    }
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
      className={`member-neural-map member-neural-map-${variant}${isMotionPaused ? " motion-paused" : ""}`}
      aria-labelledby={headingId}
      ref={mapRef}
    >
      <div className="member-neural-map-heading">
        <div>
          <p className="eyebrow">{variant === "full" ? "Complete organization network" : "Organization neural map"}</p>
          <h2 id={headingId}>{variant === "full" ? "Full organization graph" : "Entral command field"}</h2>
          <p>
            {variant === "full"
              ? "Every approved signal currently available to this organization, mapped without internal Sovereign data."
              : "Your organization’s approved operating signals, connected in one current view."}
          </p>
        </div>
        <div className="member-neural-map-controls">
          {variant === "full" ? <span className="member-graph-count">{nodes.length} nodes <span aria-hidden="true">·</span> {edges.length} links</span> : null}
          <span className="member-access-badge"><Activity aria-hidden="true" size={15} />{overview.organization.role === "OWNER" ? "Owner" : "Member"} access</span>
          {isSystemReducedMotion ? (
            <span className="member-motion-state"><Pause aria-hidden="true" size={15} />Reduced motion</span>
          ) : (
            <button
              aria-pressed={isMotionPreferencePaused}
              className="member-motion-toggle"
              onClick={() => setIsMotionPreferencePaused((paused) => !paused)}
              type="button"
            >
              {isMotionPreferencePaused ? <Play aria-hidden="true" size={15} /> : <Pause aria-hidden="true" size={15} />}
              {isMotionPreferencePaused ? "Resume motion" : "Pause motion"}
            </button>
          )}
        </div>
      </div>

      <div className="member-neural-layout">
        <div className="member-neural-stage" aria-label={`${overview.organization.name} organization neural map`} role="group">
          <div className="member-neural-atmosphere" aria-hidden="true" />
          <svg aria-hidden="true" className="member-neural-connections" preserveAspectRatio="none" viewBox="0 0 100 100">
            <circle className="member-neural-orbit orbit-one" cx="50" cy="50" r="27" />
            <circle className="member-neural-orbit orbit-two" cx="50" cy="50" r="38" />
            {variant === "full" ? <circle className="member-neural-orbit orbit-three" cx="50" cy="50" r="47" /> : null}
            {edges.map((graphEdge) => {
              const from = nodes.find((node) => node.id === graphEdge.from);
              const to = nodes.find((node) => node.id === graphEdge.to);
              return from && to ? (
                <line
                  className={graphEdge.kind === "assignment" ? "assignment-edge" : undefined}
                  key={graphEdge.id}
                  x1={from.x}
                  x2={to.x}
                  y1={from.y}
                  y2={to.y}
                />
              ) : null;
            })}
          </svg>
          {nodes.map((neuron) => (
            <button
              aria-label={`${neuron.label}: ${neuron.metric}. Status: ${neuron.status}`}
              aria-pressed={selectedNeuron.id === neuron.id}
              className={`member-neuron member-neuron-${neuron.kind} member-neuron-depth-${neuron.depth} status-${neuron.status}`}
              key={neuron.id}
              onClick={() => setSelectedId(neuron.id)}
              style={{ left: `${neuron.x}%`, top: `${neuron.y}%` }}
              type="button"
            >
              <span className="member-neuron-icon"><NeuronIcon kind={neuron.kind} /></span>
              <span className="member-neuron-copy"><strong>{neuron.label}</strong><small>{neuron.metric} <span aria-hidden="true">·</span> {neuron.status}</small></span>
            </button>
          ))}
        </div>

        <aside className={`member-neuron-inspector status-${selectedNeuron.status}`}>
          <span className="sr-only" role="status" aria-live="polite">Selected {selectedNeuron.label} neuron.</span>
          <div className="member-neuron-inspector-title">
            <span className="member-neuron-icon"><NeuronIcon kind={selectedNeuron.kind} /></span>
            <div><p className="eyebrow">Selected neuron</p><h3>{selectedNeuron.kind === "core" ? selectedNeuron.metric : selectedNeuron.label}</h3></div>
          </div>
          <strong className="member-neuron-metric">{selectedNeuron.kind === "core" ? selectedNeuron.label : selectedNeuron.metric}</strong>
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
      {variant === "full" ? (
        <p className="member-graph-disclosure">
          This graph contains approved organization records only. Internal agents, prompts, connectors, diagnostics, and other organizations are not part of this view.
        </p>
      ) : null}
    </section>
  );
}
