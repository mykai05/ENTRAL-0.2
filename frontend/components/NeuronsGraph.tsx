"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Crosshair, Eye, Maximize2, MousePointer2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Pause, Play, Plus, Search, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "./Button";

type GraphStatus = "idle" | "running" | "paused" | "error";

type GraphNode = {
  currentTask: string;
  groupId: string;
  id: string;
  logs: string[];
  metrics: {
    cost: number;
    roi: number;
    successRate: number;
  };
  name: string;
  reasoning: string;
  status: GraphStatus;
  type: "core" | "agent";
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type GraphEdge = {
  id: string;
  label: string;
  source: string;
  target: string;
};

type GraphGroup = {
  color: string;
  collapsed?: boolean;
  id: string;
  name: string;
};

type GraphState = {
  edges: GraphEdge[];
  groups: GraphGroup[];
  nodes: GraphNode[];
};

type PointerMode = "node" | "pan" | "drag-node";

const initialGroups: GraphGroup[] = [
  { color: "#00F0FF", id: "core", name: "ENTRAL Core" },
  { color: "#FF00FF", id: "ads", name: "Advertisement Campaign" },
  { color: "#39FF14", id: "pod", name: "POD Business" },
  { color: "#9B5CFF", id: "research", name: "Research" },
  { color: "#00BFFF", id: "ops", name: "Operations" }
];

const initialNodes: Omit<GraphNode, "vx" | "vy">[] = [
  {
    currentTask: "Supervising agent routing and graph synchronization.",
    groupId: "core",
    id: "entral",
    logs: ["Core graph model initialized.", "Streaming protocol ready for agent update events."],
    metrics: { cost: 0, roi: 100, successRate: 99 },
    name: "ENTRAL",
    reasoning: "Central planning node. Keeps the graph, chat, and autonomous workers in sync.",
    status: "running",
    type: "core",
    x: 0,
    y: 0
  },
  {
    currentTask: "Monitoring paid social campaign signals.",
    groupId: "ads",
    id: "instagram-bot",
    logs: ["Pulled latest campaign queue.", "Waiting for creative approval."],
    metrics: { cost: 12, roi: 72, successRate: 91 },
    name: "Instagram Bot",
    reasoning: "Prioritize high-ROI posts and redirect creative requests to the active campaign group.",
    status: "running",
    type: "agent",
    x: -240,
    y: -120
  },
  {
    currentTask: "Preparing short-form content ideas.",
    groupId: "ads",
    id: "tiktok-poster",
    logs: ["Generated three hook variants.", "Queued one draft for review."],
    metrics: { cost: 8, roi: 64, successRate: 86 },
    name: "TikTok Poster",
    reasoning: "Use campaign memory and recent engagement metrics to suggest concise creative variants.",
    status: "idle",
    type: "agent",
    x: -310,
    y: 40
  },
  {
    currentTask: "Watching POD store pricing and fulfillment updates.",
    groupId: "pod",
    id: "pod-monitor",
    logs: ["Detected one product price change.", "No fulfillment delays found."],
    metrics: { cost: 6, roi: 88, successRate: 94 },
    name: "POD Monitor",
    reasoning: "Track production changes and summarize anything that affects margin or delivery.",
    status: "running",
    type: "agent",
    x: 250,
    y: -130
  },
  {
    currentTask: "Drafting product listing improvements.",
    groupId: "pod",
    id: "listing-optimizer",
    logs: ["Scored five titles.", "Recommended two keyword swaps."],
    metrics: { cost: 9, roi: 81, successRate: 90 },
    name: "Listing Optimizer",
    reasoning: "Improve conversion by balancing search terms, readability, and visual merchandising.",
    status: "idle",
    type: "agent",
    x: 310,
    y: 55
  },
  {
    currentTask: "Collecting daily market intelligence.",
    groupId: "research",
    id: "market-researcher",
    logs: ["Compiled competitor notes.", "Summarized three trend signals."],
    metrics: { cost: 15, roi: 69, successRate: 89 },
    name: "Market Researcher",
    reasoning: "Convert public signals into a compact brief for strategy and agent routing.",
    status: "running",
    type: "agent",
    x: -40,
    y: 230
  },
  {
    currentTask: "Checking local app health and agent logs.",
    groupId: "ops",
    id: "code-monitor",
    logs: ["Frontend reachable.", "Backend memory mode active."],
    metrics: { cost: 4, roi: 78, successRate: 96 },
    name: "Code Monitor",
    reasoning: "Watch service readiness and turn failures into clear next actions.",
    status: "idle",
    type: "agent",
    x: 100,
    y: -285
  }
];

const initialEdges: GraphEdge[] = [
  { id: "e-core-instagram", label: "campaign routing", source: "entral", target: "instagram-bot" },
  { id: "e-core-tiktok", label: "creative queue", source: "entral", target: "tiktok-poster" },
  { id: "e-core-pod", label: "commerce watch", source: "entral", target: "pod-monitor" },
  { id: "e-core-listing", label: "listing analysis", source: "entral", target: "listing-optimizer" },
  { id: "e-core-research", label: "research brief", source: "entral", target: "market-researcher" },
  { id: "e-core-code", label: "system health", source: "entral", target: "code-monitor" },
  { id: "e-instagram-tiktok", label: "creative sync", source: "instagram-bot", target: "tiktok-poster" },
  { id: "e-pod-listing", label: "product intelligence", source: "pod-monitor", target: "listing-optimizer" },
  { id: "e-research-ads", label: "market signal", source: "market-researcher", target: "instagram-bot" }
];

function createInitialState(): GraphState {
  return {
    edges: initialEdges,
    groups: initialGroups,
    nodes: initialNodes.map((node) => ({ ...node, vx: 0, vy: 0 }))
  };
}

function nodeRadius(node: GraphNode) {
  return node.type === "core" ? 34 : 18;
}

function statusLabel(status: GraphStatus) {
  if (status === "running") return "Running";
  if (status === "paused") return "Paused";
  if (status === "error") return "Needs attention";
  return "Idle";
}

function matchesQuery(node: GraphNode, query: string, group?: GraphGroup) {
  const haystack = `${node.name} ${node.status} ${node.currentTask} ${node.reasoning} ${group?.name ?? ""}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function commandTextToGroup(text: string, groups: GraphGroup[]) {
  const normalized = text.toLowerCase();
  return groups.find((group) => normalized.includes(group.name.toLowerCase()) || normalized.includes(group.id.toLowerCase()));
}

export function NeuronsGraph() {
  const [graph, setGraph] = useState<GraphState>(() => createInitialState());
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState("entral");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [command, setCommand] = useState("");
  const [statusMessage, setStatusMessage] = useState("Graph ready. Pan, zoom, search, or issue a command.");
  const [pointerMode, setPointerMode] = useState<PointerMode>("node");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ height: 640, width: 900 });
  const [areControlsOpen, setAreControlsOpen] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    lastX: number;
    lastY: number;
    nodeId?: string;
    type: PointerMode;
  } | null>(null);

  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const groupMap = useMemo(() => new Map(graph.groups.map((group) => [group.id, group])), [graph.groups]);
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null;
  const selectedEdge = selectedEdgeId ? graph.edges.find((edge) => edge.id === selectedEdgeId) ?? null : null;
  const emphasizedNodeIds = useMemo(() => {
    const ids = new Set<string>();

    if (selectedNodeId) ids.add(selectedNodeId);
    if (hoveredNodeId) ids.add(hoveredNodeId);

    for (const edge of graph.edges) {
      if (edge.source === selectedNodeId || edge.target === selectedNodeId || edge.source === hoveredNodeId || edge.target === hoveredNodeId) {
        ids.add(edge.source);
        ids.add(edge.target);
      }
    }

    if (search.trim()) {
      for (const node of graph.nodes) {
        if (matchesQuery(node, search, groupMap.get(node.groupId))) {
          ids.add(node.id);
        }
      }
    }

    if (activeGroupId) {
      for (const node of graph.nodes) {
        if (node.groupId === activeGroupId) ids.add(node.id);
      }
    }

    return ids;
  }, [activeGroupId, graph.edges, graph.nodes, groupMap, hoveredNodeId, search, selectedNodeId]);

  const visibleNodes = graph.nodes.filter((node) => node.type === "core" || !groupMap.get(node.groupId)?.collapsed);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = graph.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();

    if (!rect) return { x: 0, y: 0 };

    return {
      x: (clientX - rect.left - rect.width / 2 - view.x) / view.scale,
      y: (clientY - rect.top - rect.height / 2 - view.y) / view.scale
    };
  }, [view]);

  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) return undefined;

    const updateViewport = () => {
      const rect = svg.getBoundingClientRect();
      setViewport({ height: rect.height || 640, width: rect.width || 900 });
    };

    updateViewport();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateViewport);
      return () => window.removeEventListener("resize", updateViewport);
    }

    const observer = new ResizeObserver(updateViewport);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const fitToNodes = useCallback((nodes = visibleNodes) => {
    const rect = svgRef.current?.getBoundingClientRect();

    if (!rect || nodes.length === 0) {
      setView({ x: 0, y: 0, scale: 1 });
      return;
    }

    const minX = Math.min(...nodes.map((node) => node.x)) - 90;
    const maxX = Math.max(...nodes.map((node) => node.x)) + 90;
    const minY = Math.min(...nodes.map((node) => node.y)) - 90;
    const maxY = Math.max(...nodes.map((node) => node.y)) + 90;
    const graphWidth = Math.max(maxX - minX, 200);
    const graphHeight = Math.max(maxY - minY, 200);
    const scale = Math.min(rect.width / graphWidth, rect.height / graphHeight, 1.35);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setView({
      scale,
      x: -centerX * scale,
      y: -centerY * scale
    });
  }, [visibleNodes]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGraph((current) => {
        const groups = current.groups.filter((group) => group.id !== "core");
        const centers = new Map(groups.map((group, index) => {
          const angle = (index / Math.max(groups.length, 1)) * Math.PI * 2 - Math.PI / 2;
          return [group.id, { x: Math.cos(angle) * 250, y: Math.sin(angle) * 210 }];
        }));

        return {
          ...current,
          nodes: current.nodes.map((node) => {
            if (node.type === "core") {
              return { ...node, vx: 0, vy: 0, x: 0, y: 0 };
            }

            const center = centers.get(node.groupId) ?? { x: 0, y: 0 };
            let fx = (center.x - node.x) * 0.012;
            let fy = (center.y - node.y) * 0.012;

            for (const other of current.nodes) {
              if (other.id === node.id) continue;
              const dx = node.x - other.x;
              const dy = node.y - other.y;
              const distanceSq = Math.max(dx * dx + dy * dy, 1600);
              const force = node.groupId === other.groupId ? 34 / distanceSq : 80 / distanceSq;
              fx += dx * force;
              fy += dy * force;
            }

            const vx = (node.vx + fx) * 0.78;
            const vy = (node.vy + fy) * 0.78;

            return {
              ...node,
              vx,
              vy,
              x: node.x + vx,
              y: node.y + vy
            };
          })
        };
      });
    }, 32);

    return () => window.clearInterval(timer);
  }, []);

  function handleWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const nextScale = Math.min(Math.max(view.scale * (event.deltaY > 0 ? 0.9 : 1.1), 0.35), 2.6);
    setView((current) => ({ ...current, scale: nextScale }));
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.target === svgRef.current) {
      dragRef.current = {
        lastX: event.clientX,
        lastY: event.clientY,
        type: "pan"
      };
      setPointerMode("pan");
    }
  }

  function handleNodePointerDown(event: React.PointerEvent<SVGGElement>, nodeId: string) {
    event.stopPropagation();
    dragRef.current = {
      lastX: event.clientX,
      lastY: event.clientY,
      nodeId,
      type: "drag-node"
    };
    setPointerMode("drag-node");
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;

    if (!drag) return;

    if (drag.type === "pan") {
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      return;
    }

    if (drag.type === "drag-node" && drag.nodeId && drag.nodeId !== "entral") {
      const world = screenToWorld(event.clientX, event.clientY);
      setGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) => (node.id === drag.nodeId ? { ...node, vx: 0, vy: 0, x: world.x, y: world.y } : node))
      }));
    }
  }

  function endPointer() {
    dragRef.current = null;
    setPointerMode("node");
  }

  function updateGroupColor(groupId: string, color: string) {
    setGraph((current) => ({
      ...current,
      groups: current.groups.map((group) => (group.id === groupId ? { ...group, color } : group))
    }));
  }

  function toggleGroup(groupId: string) {
    setGraph((current) => ({
      ...current,
      groups: current.groups.map((group) => (group.id === groupId && group.id !== "core" ? { ...group, collapsed: !group.collapsed } : group))
    }));
  }

  function renameGroup(groupId: string, name: string) {
    setGraph((current) => ({
      ...current,
      groups: current.groups.map((group) => (group.id === groupId ? { ...group, name } : group))
    }));
  }

  function focusGroup(groupId: string) {
    setActiveGroupId(groupId);
    const nodes = visibleNodes.filter((node) => node.groupId === groupId || node.id === "entral");
    fitToNodes(nodes);
    setStatusMessage(`Focused ${groupMap.get(groupId)?.name ?? "group"}.`);
  }

  function mutateNode(nodeId: string, changes: Partial<GraphNode>) {
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...changes, logs: changes.logs ?? node.logs } : node))
    }));
  }

  function createAgent(name: string, groupId: string) {
    const group = groupMap.get(groupId);
    const newNode: GraphNode = {
      currentTask: `New ${group?.name ?? "group"} task is waiting for instructions.`,
      groupId,
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `agent-${Date.now()}`,
      logs: ["Created from neuron command center."],
      metrics: { cost: 0, roi: 0, successRate: 100 },
      name,
      reasoning: "New agent node created from a command. It is ready for assignment.",
      status: "idle",
      type: "agent",
      vx: 0,
      vy: 0,
      x: 80,
      y: 80
    };

    setGraph((current) => ({
      ...current,
      edges: [...current.edges, { id: `e-entral-${newNode.id}`, label: "new command link", source: "entral", target: newNode.id }],
      nodes: [...current.nodes.filter((node) => node.id !== newNode.id), newNode]
    }));
    setSelectedNodeId(newNode.id);
    setStatusMessage(`Created ${name} in ${group?.name ?? "selected group"}.`);
  }

  function runCommand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = command.toLowerCase();
    const group = commandTextToGroup(command, graph.groups);

    if (normalized.includes("create")) {
      const nameMatch = /agent (?:for |called |named )?([^,.;]+)/i.exec(command);
      createAgent(nameMatch?.[1]?.trim() ? `${nameMatch[1].trim()} Agent` : "New Agent", group?.id ?? "research");
    } else if (normalized.includes("redirect") || normalized.includes("move")) {
      const target = graph.nodes.find((node) => node.type !== "core" && normalized.includes(node.name.toLowerCase().split(" ")[0]));

      if (target && group) {
        mutateNode(target.id, {
          groupId: group.id,
          logs: [`Redirected to ${group.name}.`, ...target.logs],
          reasoning: `ENTRAL command redirected this neuron into ${group.name}.`
        });
        focusGroup(group.id);
      } else {
        setStatusMessage("I could not find a matching agent and group to redirect.");
      }
    } else if (normalized.includes("pause") && selectedNode) {
      mutateNode(selectedNode.id, { logs: ["Paused from command center.", ...selectedNode.logs], status: "paused" });
      setStatusMessage(`${selectedNode.name} paused.`);
    } else if ((normalized.includes("resume") || normalized.includes("run")) && selectedNode) {
      mutateNode(selectedNode.id, { logs: ["Resumed from command center.", ...selectedNode.logs], status: "running" });
      setStatusMessage(`${selectedNode.name} resumed.`);
    } else if (normalized.includes("show") || normalized.includes("pull up") || normalized.includes("highlight") || normalized.includes("zoom")) {
      if (group) {
        focusGroup(group.id);
      } else if (normalized.includes("running")) {
        const running = visibleNodes.filter((node) => node.status === "running");
        fitToNodes(running);
        setStatusMessage("Focused running agents.");
      } else {
        fitToNodes();
        setStatusMessage("Fit graph to view.");
      }
    } else {
      setStatusMessage("Try: 'show Research', 'redirect Instagram to POD Business', or 'create agent for YouTube research'.");
    }

    setCommand("");
  }

  function deleteSelectedNode() {
    if (!selectedNode || selectedNode.type === "core") return;
    setGraph((current) => ({
      ...current,
      edges: current.edges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id),
      nodes: current.nodes.filter((node) => node.id !== selectedNode.id)
    }));
    setSelectedNodeId("entral");
  }

  return (
    <section className="neurons-command" aria-label="Interactive neuron graph command center">
      <header className="neurons-header">
        <div>
          <p className="eyebrow">Neural command layer</p>
          <h2>Agent Neurons</h2>
          <p>Pan, zoom, search, drag nodes, edit groups, and command the graph directly.</p>
        </div>
        <div className="neurons-status" role="status">
          <MousePointer2 aria-hidden="true" size={16} />
          {pointerMode === "pan" ? "Panning" : pointerMode === "drag-node" ? "Dragging neuron" : statusMessage}
        </div>
      </header>

      <div className={[areControlsOpen ? "" : "controls-closed", isDrawerOpen ? "" : "drawer-closed", "neurons-layout"].filter(Boolean).join(" ")}>
        {areControlsOpen ? (
        <aside className="neurons-controls" aria-label="Neuron graph controls">
          <div className="sidebar-heading">
            <div>
              <p className="eyebrow">Graph</p>
              <h3>Controls</h3>
            </div>
            <button className="sidebar-toggle-button" type="button" onClick={() => setAreControlsOpen(false)} aria-label="Close graph controls sidebar">
              <PanelLeftClose aria-hidden="true" size={18} />
            </button>
          </div>
          <label className="search-field">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">Search neurons</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agents, groups, status..." />
          </label>

          <div className="neuron-button-grid">
            <Button type="button" variant="secondary" onClick={() => setView((current) => ({ ...current, scale: Math.min(current.scale * 1.18, 2.6) }))}>
              <ZoomIn aria-hidden="true" size={18} />
              Zoom
            </Button>
            <Button type="button" variant="secondary" onClick={() => setView((current) => ({ ...current, scale: Math.max(current.scale * 0.84, 0.35) }))}>
              <ZoomOut aria-hidden="true" size={18} />
              Out
            </Button>
            <Button type="button" variant="secondary" onClick={() => fitToNodes()}>
              <Maximize2 aria-hidden="true" size={18} />
              Fit
            </Button>
            <Button type="button" variant="secondary" onClick={() => setView({ x: 0, y: 0, scale: 1 })}>
              <Crosshair aria-hidden="true" size={18} />
              Core
            </Button>
          </div>

          <div className="group-list" aria-label="Neuron groups">
            {graph.groups.map((group) => {
              const count = graph.nodes.filter((node) => node.groupId === group.id).length;

              return (
                <article className={activeGroupId === group.id ? "group-card active" : "group-card"} key={group.id}>
                  <button type="button" onClick={() => focusGroup(group.id)} aria-label={`Focus ${group.name}`}>
                    <span style={{ "--group-color": group.color } as React.CSSProperties} />
                    <strong>{group.name}</strong>
                    <small>{count} neuron{count === 1 ? "" : "s"}</small>
                  </button>
                  <label>
                    <span className="sr-only">Choose group color for {group.name}</span>
                    <input type="color" value={group.color} onChange={(event) => updateGroupColor(group.id, event.target.value)} />
                  </label>
                  <input value={group.name} onChange={(event) => renameGroup(group.id, event.target.value)} aria-label={`Rename ${group.name}`} />
                  {group.id !== "core" ? (
                    <Button type="button" variant="secondary" onClick={() => toggleGroup(group.id)}>
                      <Eye aria-hidden="true" size={16} />
                      {group.collapsed ? "Expand" : "Collapse"}
                    </Button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </aside>
        ) : null}

        <div className="neurons-stage">
          <div className="neuron-stage-toggles" aria-label="Sidebar controls">
            <button className="sidebar-toggle-button" type="button" onClick={() => setAreControlsOpen((open) => !open)} aria-label={areControlsOpen ? "Close graph controls sidebar" : "Open graph controls sidebar"}>
              {areControlsOpen ? <PanelLeftClose aria-hidden="true" size={18} /> : <PanelLeftOpen aria-hidden="true" size={18} />}
            </button>
            <button className="sidebar-toggle-button" type="button" onClick={() => setIsDrawerOpen((open) => !open)} aria-label={isDrawerOpen ? "Close neuron details sidebar" : "Open neuron details sidebar"}>
              {isDrawerOpen ? <PanelRightClose aria-hidden="true" size={18} /> : <PanelRightOpen aria-hidden="true" size={18} />}
            </button>
          </div>
          <svg
            ref={svgRef}
            className="neurons-svg"
            onPointerDown={handlePointerDown}
            onPointerLeave={endPointer}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onWheel={handleWheel}
            role="img"
            aria-label="Interactive graph of ENTRAL and connected agent neurons"
          >
            <defs>
              {graph.groups.map((group) => (
                <filter id={`glow-${group.id}`} key={group.id} x="-80%" y="-80%" width="260%" height="260%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={group.color} floodOpacity="0.85" />
                  <feDropShadow dx="0" dy="0" stdDeviation="11" floodColor={group.color} floodOpacity="0.32" />
                </filter>
              ))}
            </defs>
            <g transform={`translate(${viewport.width / 2 + view.x} ${viewport.height / 2 + view.y}) scale(${view.scale})`}>
              {graph.groups.filter((group) => group.id !== "core" && !group.collapsed).map((group) => {
                const groupNodes = visibleNodes.filter((node) => node.groupId === group.id);

                if (groupNodes.length === 0) return null;

                const cx = groupNodes.reduce((sum, node) => sum + node.x, 0) / groupNodes.length;
                const cy = groupNodes.reduce((sum, node) => sum + node.y, 0) / groupNodes.length;
                const radius = Math.max(88, Math.max(...groupNodes.map((node) => Math.hypot(node.x - cx, node.y - cy))) + 58);

                return (
                  <circle
                    aria-hidden="true"
                    className="group-halo"
                    cx={cx}
                    cy={cy}
                    fill={group.color}
                    key={group.id}
                    r={radius}
                    stroke={group.color}
                  />
                );
              })}
              {visibleEdges.map((edge) => {
                const source = nodeMap.get(edge.source);
                const target = nodeMap.get(edge.target);

                if (!source || !target) return null;

                const isActive = emphasizedNodeIds.has(source.id) || emphasizedNodeIds.has(target.id) || selectedEdgeId === edge.id;
                const color = groupMap.get(target.groupId)?.color ?? "#00F0FF";

                return (
                  <line
                    className={isActive ? "neuron-edge active" : "neuron-edge"}
                    key={edge.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setIsDrawerOpen(true);
                    }}
                    stroke={color}
                    x1={source.x}
                    x2={target.x}
                    y1={source.y}
                    y2={target.y}
                  />
                );
              })}
              {visibleNodes.map((node) => {
                const group = groupMap.get(node.groupId);
                const isEmphasized = emphasizedNodeIds.size === 0 || emphasizedNodeIds.has(node.id);
                const isSelected = selectedNodeId === node.id;
                const queryMatched = search.trim() && matchesQuery(node, search, group);
                const color = group?.color ?? "#00F0FF";

                return (
                  <g
                    className={[
                      "neuron-node",
                      node.type === "core" ? "core" : "",
                      isSelected ? "selected" : "",
                      hoveredNodeId === node.id ? "hovered" : "",
                      isEmphasized ? "emphasized" : "dimmed",
                      queryMatched ? "query-match" : "",
                      `status-${node.status}`
                    ].filter(Boolean).join(" ")}
                    key={node.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedNodeId(node.id);
                      setSelectedEdgeId(null);
                      setIsDrawerOpen(true);
                    }}
                    onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                    onPointerEnter={() => setHoveredNodeId(node.id)}
                    onPointerLeave={() => setHoveredNodeId(null)}
                    role="button"
                    tabIndex={0}
                    transform={`translate(${node.x} ${node.y})`}
                  >
                    <circle className="neuron-pulse" fill={color} r={nodeRadius(node) + 12} />
                    <circle className="neuron-core" filter={`url(#glow-${node.groupId})`} fill={color} r={nodeRadius(node)} />
                    <circle className="neuron-outline" r={nodeRadius(node) + 4} stroke={color} />
                    <text className="neuron-label" dy={node.type === "core" ? 54 : 42} textAnchor="middle">{node.name}</text>
                    <title>{node.name}: {statusLabel(node.status)}. {node.currentTask}</title>
                  </g>
                );
              })}
            </g>
          </svg>

          <form className="neuron-command" onSubmit={runCommand}>
            <Bot aria-hidden="true" size={18} />
            <label className="sr-only" htmlFor="neuron-command">Graph command</label>
            <input
              id="neuron-command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder='Try "show Research" or "redirect Instagram to POD Business"'
            />
            <Button type="submit" variant="secondary">Run</Button>
          </form>
        </div>

        {isDrawerOpen ? (
        <aside className="neuron-drawer" aria-label="Neuron details">
          {selectedNode ? (
            <>
              <header>
                <span className={`neuron-status-dot status-${selectedNode.status}`} />
                <div>
                  <p className="eyebrow">{groupMap.get(selectedNode.groupId)?.name}</p>
                  <h3>{selectedNode.name}</h3>
                  <p>{statusLabel(selectedNode.status)}</p>
                </div>
                <button className="sidebar-toggle-button" type="button" onClick={() => setIsDrawerOpen(false)} aria-label="Close neuron details sidebar">
                  <PanelRightClose aria-hidden="true" size={18} />
                </button>
              </header>
              <section>
                <h4>Current task</h4>
                <p>{selectedNode.currentTask}</p>
              </section>
              <section>
                <h4>Reasoning</h4>
                <p>{selectedNode.reasoning}</p>
              </section>
              <div className="neuron-metrics">
                <span><strong>{selectedNode.metrics.successRate}%</strong> success</span>
                <span><strong>{selectedNode.metrics.roi}</strong> ROI</span>
                <span><strong>${selectedNode.metrics.cost}</strong> cost</span>
              </div>
              <section>
                <h4>Logs</h4>
                <div className="neuron-log-list">
                  {selectedNode.logs.map((log, index) => <p key={`${log}-${index}`}>{log}</p>)}
                </div>
              </section>
              <div className="neuron-drawer-actions">
                <Button type="button" variant="secondary" onClick={() => mutateNode(selectedNode.id, { status: selectedNode.status === "paused" ? "running" : "paused", logs: [`${selectedNode.status === "paused" ? "Resumed" : "Paused"} from drawer.`, ...selectedNode.logs] })}>
                  {selectedNode.status === "paused" ? <Play aria-hidden="true" size={18} /> : <Pause aria-hidden="true" size={18} />}
                  {selectedNode.status === "paused" ? "Resume" : "Pause"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => createAgent("Adjacent Agent", selectedNode.groupId)}>
                  <Plus aria-hidden="true" size={18} />
                  Add peer
                </Button>
                <Button type="button" variant="secondary" onClick={deleteSelectedNode} disabled={selectedNode.type === "core"}>
                  <Trash2 aria-hidden="true" size={18} />
                  Delete
                </Button>
              </div>
            </>
          ) : selectedEdge ? (
            <>
              <header>
                <div>
                  <p className="eyebrow">Connection</p>
                  <h3>{selectedEdge.label}</h3>
                </div>
                <button className="sidebar-toggle-button" type="button" onClick={() => setIsDrawerOpen(false)} aria-label="Close neuron details sidebar">
                  <PanelRightClose aria-hidden="true" size={18} />
                </button>
              </header>
              <p>{nodeMap.get(selectedEdge.source)?.name} {"->"} {nodeMap.get(selectedEdge.target)?.name}</p>
            </>
          ) : null}
        </aside>
        ) : null}
      </div>
    </section>
  );
}
