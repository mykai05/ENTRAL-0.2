"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Bot, Crosshair, Eye, Info, LogOut, Maximize2, Network, PanelBottomClose, PanelBottomOpen, PanelRightClose, PanelRightOpen, Pause, Play, RotateCcw, Search, Send, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Zap, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "./Button";
import { Logo } from "./Logo";
import { useTheme } from "./ThemeProvider";
import { apiFetch } from "../lib/api";
import {
  commandGenerals,
  commandStatusLabel,
  createCommandId,
  createDefaultCommandHierarchy,
  inferSoldierBlueprint,
  type CommandNode,
  type CommandStatus,
  type NodeType
} from "../lib/command-os";

type GraphStatus = CommandStatus;

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type GraphNode3D = Vec3 & {
  capabilities?: string[];
  children?: string[];
  commandType: NodeType;
  currentTask: string;
  description?: string;
  groupId: string;
  health: number;
  id: string;
  logs: string[];
  metrics: {
    cost: number;
    roi: number;
    successRate: number;
  };
  name: string;
  parentId: string | null;
  permissions?: string[];
  progress?: number;
  reasoning: string;
  role: string;
  status: GraphStatus;
  title: string;
  tools?: string[];
  type: "core" | "agent";
  vx: number;
  vy: number;
  vz: number;
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

type GraphState3D = {
  edges: GraphEdge[];
  groups: GraphGroup[];
  nodes: GraphNode3D[];
};

type CameraState = {
  distance: number;
  pitch: number;
  target: Vec3;
  yaw: number;
};

type Matrix4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

type ProgramBundle = {
  alpha: WebGLUniformLocation | null;
  color: WebGLUniformLocation | null;
  matrix: WebGLUniformLocation | null;
  position: number;
  program: WebGLProgram;
  size?: WebGLUniformLocation | null;
};

type PickResult = {
  distance: number;
  node: GraphNode3D;
};

type TooltipState = {
  groupName: string;
  name: string;
  status: GraphStatus;
  task: string;
  x: number;
  y: number;
};

type GraphControlSettings = {
  cameraSensitivity: number;
  glowIntensity: number;
  gravity: number;
  orbitSpeed: number;
  particleSize: number;
  showRings: boolean;
  showTrails: boolean;
  trailLength: number;
};

type DashboardChatResponse = {
  conversationId: string;
  content: string;
};

type CommandConsoleMessage = {
  content: string;
  id: string;
  role: "operator" | "system";
};

type ActivityEvent = {
  id: string;
  message: string;
  timestamp: string;
};

type NodeMotion = {
  localRadius: number;
  localTiltX: number;
  localTiltY: number;
  localTiltZ: number;
  phase: number;
  trail: Vec3[];
};

type DashboardUser = {
  email: string;
  name: string;
};

type CapabilityBlueprint = {
  id: string;
  label: string;
  description: string;
  risk: "standard" | "sensitive" | "restricted";
};

const defaultCamera: CameraState = {
  distance: 900,
  pitch: 0.34,
  target: { x: 0, y: 0, z: 0 },
  yaw: 0.82
};

const graphControlsKey = "entral-command-center-controls";

const defaultGraphControls: GraphControlSettings = {
  cameraSensitivity: 1,
  glowIntensity: 1,
  gravity: 0.72,
  orbitSpeed: 0.85,
  particleSize: 1,
  showRings: true,
  showTrails: true,
  trailLength: 18
};

const businessCapabilityBlueprints: CapabilityBlueprint[] = [
  {
    description: "Plan and run compliant research across public search engines, websites, maps data, directories, and approved data APIs.",
    id: "public-research",
    label: "Public web research",
    risk: "standard"
  },
  {
    description: "Policy-gated research connector for restricted networks such as Tor; requires explicit legal scope, governance approval, and safe-use controls.",
    id: "restricted-network-research",
    label: "Restricted network research",
    risk: "restricted"
  },
  {
    description: "Find businesses, enrich leads, identify missing websites, score opportunities, and route outreach tasks to specialist agents.",
    id: "business-discovery",
    label: "Business discovery",
    risk: "sensitive"
  },
  {
    description: "Coordinate Shopify setup, catalog work, optimization experiments, fulfillment checks, reporting, and external commerce tools.",
    id: "shopify-operations",
    label: "Shopify operations",
    risk: "sensitive"
  },
  {
    description: "Delegate design, code, QA, deployment, monitoring, and iteration work for full web and mobile application builds.",
    id: "app-builder",
    label: "App builder",
    risk: "standard"
  },
  {
    description: "Coordinate clothing brand strategy, product concepts, sourcing research, creative direction, marketing, and fulfillment workflows.",
    id: "brand-operations",
    label: "Brand operations",
    risk: "sensitive"
  },
  {
    description: "Launch browser automation, Playwright scripts, webhooks, APIs, queues, and internal tools through governed execution policies.",
    id: "tool-orchestration",
    label: "Tool orchestration",
    risk: "sensitive"
  },
  {
    description: "Enforce quotas, approvals, audit trails, domain controls, user consent, and business-safe execution boundaries before action.",
    id: "governance",
    label: "Governance layer",
    risk: "standard"
  }
];

function readStoredGraphControls(): GraphControlSettings {
  if (typeof window === "undefined") {
    return defaultGraphControls;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(graphControlsKey) ?? "{}") as Partial<GraphControlSettings>;

    return {
      cameraSensitivity: clampNumber(parsed.cameraSensitivity, 0.45, 1.8, defaultGraphControls.cameraSensitivity),
      glowIntensity: clampNumber(parsed.glowIntensity, 0.45, 1.85, defaultGraphControls.glowIntensity),
      gravity: clampNumber(parsed.gravity, 0.2, 1.35, defaultGraphControls.gravity),
      orbitSpeed: clampNumber(parsed.orbitSpeed, 0, 2.2, defaultGraphControls.orbitSpeed),
      particleSize: clampNumber(parsed.particleSize, 0.65, 1.7, defaultGraphControls.particleSize),
      showRings: typeof parsed.showRings === "boolean" ? parsed.showRings : defaultGraphControls.showRings,
      showTrails: typeof parsed.showTrails === "boolean" ? parsed.showTrails : defaultGraphControls.showTrails,
      trailLength: clampNumber(parsed.trailLength, 4, 42, defaultGraphControls.trailLength)
    };
  } catch {
    return defaultGraphControls;
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback;
}

function stableNumber(seed: string, salt = 0) {
  let hash = 2166136261 + salt;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 10000) / 10000;
}

function addVec(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scaleVec(v: Vec3, scale: number): Vec3 {
  return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
}

type OrbitMeta = {
  phase: number;
  radius: number;
  speed: number;
  tiltX: number;
  tiltY: number;
  tiltZ: number;
};

const identityPillars = [
  ["Evolving", "self-improving / adaptive"],
  ["Neural", "AI cognition layer"],
  ["Tactical", "execution-oriented"],
  ["Reasoning", "multi-step logic and planning"],
  ["Autonomous", "independent workflows"],
  ["Logic", "governance and operational consistency"]
];

function parentGeneralId(node: CommandNode, allNodes: CommandNode[]) {
  if (node.type === "general") return node.id;
  if (node.type === "soldier") return node.parentId ?? "aris";
  if (node.type === "operation") {
    const parentSoldier = allNodes.find((candidate) => candidate.id === node.parentId);
    return parentSoldier?.parentId ?? "aris";
  }

  return "core";
}

function metricNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function graphNodeFromCommandNode(node: CommandNode, allNodes: CommandNode[]): Omit<GraphNode3D, "vx" | "vy" | "vz"> {
  const groupId = node.type === "emperor" ? "core" : parentGeneralId(node, allNodes);
  const offset = stableNumber(node.id, 11) * Math.PI * 2;
  const radius = node.type === "general" ? 340 : node.type === "soldier" ? 420 : 485;

  return {
    capabilities: node.tools ?? [],
    children: node.children ?? [],
    commandType: node.type,
    currentTask: node.type === "operation" ? `${node.progress ?? 0}% simulated progress.` : node.description ?? node.role,
    description: node.description,
    groupId,
    health: node.health,
    id: node.id,
    logs: node.logs ?? [],
    metrics: {
      cost: metricNumber(node.metrics?.cost, 0),
      roi: metricNumber(node.metrics?.roi, node.health),
      successRate: metricNumber(node.metrics?.successRate, node.health)
    },
    name: node.name,
    parentId: node.parentId,
    permissions: node.permissions,
    progress: node.progress,
    reasoning: node.description ?? node.role,
    role: node.role,
    status: node.status,
    title: node.title,
    tools: node.tools,
    type: node.type === "emperor" ? "core" : "agent",
    x: Math.cos(offset) * radius,
    y: Math.sin(offset * 1.7) * 120,
    z: Math.sin(offset) * radius
  };
}

function graphStateFromCommandNodes(commandNodes: CommandNode[]): GraphState3D {
  const groups: GraphGroup[] = [
    { color: "#00F0FF", id: "core", name: "ENTRAL Emperor" },
    ...commandGenerals.map((general) => ({ color: general.color, id: general.id, name: `${general.name} Command` }))
  ];
  const edges = commandNodes
    .filter((node) => node.parentId)
    .map((node) => ({
      id: `e-${node.parentId}-${node.id}`,
      label: `${node.type} link`,
      source: node.parentId as string,
      target: node.id
    }));

  return {
    edges,
    groups,
    nodes: commandNodes.map((node) => ({ ...graphNodeFromCommandNode(node, commandNodes), vx: 0, vy: 0, vz: 0 }))
  };
}

function createInitialState(): GraphState3D {
  return graphStateFromCommandNodes(createDefaultCommandHierarchy());
}

function statusLabel(status: GraphStatus) {
  return commandStatusLabel(status);
}

function hexToRgb01(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 6 ? clean : "00f0ff", 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function multiplyMatrix(a: Matrix4, b: Matrix4): Matrix4 {
  const out = new Array(16).fill(0) as Matrix4;

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }

  return out;
}

function perspective(fovRadians: number, aspect: number, near: number, far: number): Matrix4 {
  const f = 1 / Math.tan(fovRadians / 2);
  const rangeInv = 1 / (near - far);

  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  ];
}

function lookAt(eye: Vec3, target: Vec3): Matrix4 {
  const zAxis = normalize(sub(eye, target));
  const xAxis = normalize(cross({ x: 0, y: 1, z: 0 }, zAxis));
  const yAxis = cross(zAxis, xAxis);

  return [
    xAxis.x, yAxis.x, zAxis.x, 0,
    xAxis.y, yAxis.y, zAxis.y, 0,
    xAxis.z, yAxis.z, zAxis.z, 0,
    -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1
  ];
}

function projectPoint(point: Vec3, matrix: Matrix4, width: number, height: number) {
  const clipX = matrix[0] * point.x + matrix[4] * point.y + matrix[8] * point.z + matrix[12];
  const clipY = matrix[1] * point.x + matrix[5] * point.y + matrix[9] * point.z + matrix[13];
  const clipZ = matrix[2] * point.x + matrix[6] * point.y + matrix[10] * point.z + matrix[14];
  const clipW = matrix[3] * point.x + matrix[7] * point.y + matrix[11] * point.z + matrix[15];
  const safeW = clipW || 0.0001;
  const ndcX = clipX / safeW;
  const ndcY = clipY / safeW;

  return {
    screenX: (ndcX * 0.5 + 0.5) * width,
    screenY: (1 - (ndcY * 0.5 + 0.5)) * height,
    visible: clipZ / safeW > -1 && clipZ / safeW < 1 && safeW > 0
  };
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Unable to create WebGL shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? "Unknown shader error.";
    gl.deleteShader(shader);
    throw new Error(info);
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Unable to create WebGL program.");
  }

  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? "Unknown WebGL link error.";
    gl.deleteProgram(program);
    throw new Error(info);
  }

  return program;
}

function createProgramBundle(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string, withSize = false): ProgramBundle {
  const program = createProgram(gl, vertexSource, fragmentSource);
  return {
    alpha: gl.getUniformLocation(program, "u_alpha"),
    color: gl.getUniformLocation(program, "u_color"),
    matrix: gl.getUniformLocation(program, "u_matrix"),
    position: gl.getAttribLocation(program, "a_position"),
    program,
    size: withSize ? gl.getUniformLocation(program, "u_size") : undefined
  };
}

function getCameraMatrix(camera: CameraState, width: number, height: number) {
  const clampedPitch = Math.max(-1.25, Math.min(1.25, camera.pitch));
  const eye = {
    x: camera.target.x + Math.sin(camera.yaw) * Math.cos(clampedPitch) * camera.distance,
    y: camera.target.y + Math.sin(clampedPitch) * camera.distance,
    z: camera.target.z + Math.cos(camera.yaw) * Math.cos(clampedPitch) * camera.distance
  };
  const projection = perspective(Math.PI / 3.2, Math.max(width / Math.max(height, 1), 0.2), 1, 5000);
  const view = lookAt(eye, camera.target);

  return multiplyMatrix(projection, view);
}

function rotateX(point: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: point.x,
    y: point.y * cos - point.z * sin,
    z: point.y * sin + point.z * cos
  };
}

function rotateY(point: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos
  };
}

function rotateZ(point: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
    z: point.z
  };
}

function orbitMeta(index: number): OrbitMeta {
  return {
    phase: index * 1.31,
    radius: 285 + index * 74,
    speed: 0.12 + index * 0.028,
    tiltX: -0.72 + index * 0.34,
    tiltY: 0.28 + index * 0.22,
    tiltZ: index * 0.42
  };
}

function orbitPoint(meta: OrbitMeta, angle: number): Vec3 {
  let point = {
    x: Math.cos(angle) * meta.radius,
    y: Math.sin(angle * 2) * Math.min(34 + meta.radius * 0.035, 58),
    z: Math.sin(angle) * meta.radius
  };

  point = rotateX(point, meta.tiltX);
  point = rotateY(point, meta.tiltY);
  return rotateZ(point, meta.tiltZ);
}

function matchesQuery(node: GraphNode3D, query: string, group?: GraphGroup) {
  const text = `${node.name} ${node.status} ${node.currentTask} ${node.reasoning} ${group?.name ?? ""}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function commandTextToGroup(text: string, groups: GraphGroup[]) {
  const normalized = text.toLowerCase();
  return groups.find((group) => normalized.includes(group.name.toLowerCase()) || normalized.includes(group.id.toLowerCase()));
}

function commandTextToNode(text: string, nodes: GraphNode3D[]) {
  const normalized = text.toLowerCase();
  const ignoredWords = new Set(["agent", "bot", "the", "to", "for", "show", "zoom", "focus", "open", "select", "monitor"]);

  return nodes.find((node) => normalized.includes(node.name.toLowerCase()) || normalized.includes(node.id.toLowerCase()))
    ?? nodes.find((node) => {
      const words = node.name.toLowerCase().split(/\s+/).filter((word) => word.length > 2 && !ignoredWords.has(word));
      return words.length > 0 && words.every((word) => normalized.includes(word));
    })
    ?? null;
}

function nodeVisualSize(node: GraphNode3D) {
  if (node.commandType === "emperor") return 86;
  if (node.commandType === "general") return 34;
  if (node.commandType === "soldier") return 22;
  if (node.commandType === "operation") return 14;
  return node.type === "core" ? 82 : 24;
}

function capabilityById(id: string) {
  return businessCapabilityBlueprints.find((capability) => capability.id === id);
}

function capabilityRiskLabel(risk: CapabilityBlueprint["risk"]) {
  if (risk === "restricted") return "Policy gated";
  if (risk === "sensitive") return "Approval ready";
  return "Ready";
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function smoothCamera(current: CameraState, desired: CameraState, amount: number): CameraState {
  return {
    distance: lerp(current.distance, desired.distance, amount),
    pitch: lerp(current.pitch, desired.pitch, amount),
    target: {
      x: lerp(current.target.x, desired.target.x, amount),
      y: lerp(current.target.y, desired.target.y, amount),
      z: lerp(current.target.z, desired.target.z, amount)
    },
    yaw: lerp(current.yaw, desired.yaw, amount)
  };
}

function clampCamera(camera: CameraState): CameraState {
  return {
    ...camera,
    distance: Math.max(260, Math.min(1600, camera.distance)),
    pitch: Math.max(-1.2, Math.min(1.2, camera.pitch))
  };
}

export function NeuronsCommandCenter({ user, onLogout }: { onLogout: () => void; user?: DashboardUser | null }) {
  const { settings, updateSettings } = useTheme();
  const [graph, setGraph] = useState<GraphState3D>(() => createInitialState());
  const [selectedNodeId, setSelectedNodeId] = useState("entral");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [search, setSearch] = useState("");
  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandConsoleMessage[]>([
    {
      content: "Command OS online. ENTRAL is Emperor; ARIS, VANTA, MERCURY, ORION, and HELIX are standing by as Generals.",
      id: "system-boot",
      role: "system"
    }
  ]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([
    {
      id: "activity-boot",
      message: "Command hierarchy loaded in mock execution mode.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [dashboardConversationId, setDashboardConversationId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("ENTRAL chat is the primary command path. Ask it to control the atom, agents, panels, settings, and visible graph.");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<GraphStatus[] | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isWebGlReady, setIsWebGlReady] = useState(true);
  const [graphControls, setGraphControls] = useState<GraphControlSettings>(() => readStoredGraphControls());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphRef = useRef(graph);
  const graphControlsRef = useRef(graphControls);
  const hoveredRef = useRef<string | null>(null);
  const selectedRef = useRef("entral");
  const searchRef = useRef("");
  const activeGroupRef = useRef<string | null>(null);
  const activeStatusFilterRef = useRef<GraphStatus[] | null>(null);
  const cameraRef = useRef<CameraState>({ ...defaultCamera, target: { ...defaultCamera.target } });
  const desiredCameraRef = useRef<CameraState>({ ...defaultCamera, target: { ...defaultCamera.target } });
  const matrixRef = useRef<Matrix4 | null>(null);
  const dragRef = useRef<{ lastX: number; lastY: number; mode: "orbit" | "pan"; moved: boolean } | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const motionRef = useRef<Map<string, NodeMotion>>(new Map());
  const previousBodyOverflowRef = useRef<string | null>(null);
  const reducedMotionRef = useRef(false);
  const starFieldRef = useRef<Vec3[]>(Array.from({ length: 90 }, (_, index) => {
    const angle = index * 2.399963229728653;
    const radius = 760 + (index % 9) * 55;

    return {
      x: Math.cos(angle) * radius,
      y: ((index * 73) % 520) - 260,
      z: Math.sin(angle) * radius
    };
  }));
  const nucleusFieldRef = useRef<Vec3[]>(Array.from({ length: 18 }, (_, index) => {
    const angle = index * 2.399963229728653;
    const radius = 22 + (index % 5) * 8;

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(index * 1.8) * (18 + (index % 3) * 7),
      z: Math.sin(angle) * radius
    };
  }));
  const timeRef = useRef(0);

  const groupMap = useMemo(() => new Map(graph.groups.map((group) => [group.id, group])), [graph.groups]);
  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const selectedNode = nodeMap.get(selectedNodeId) ?? nodeMap.get("entral") ?? null;
  const visibleNodes = graph.nodes.filter((node) => node.type === "core" || !groupMap.get(node.groupId)?.collapsed);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  useEffect(() => {
    graphControlsRef.current = graphControls;
    window.localStorage.setItem(graphControlsKey, JSON.stringify(graphControls));
  }, [graphControls]);

  useEffect(() => () => {
    if (previousBodyOverflowRef.current !== null) {
      document.body.style.overflow = previousBodyOverflowRef.current;
      previousBodyOverflowRef.current = null;
    }
  }, []);

  useEffect(() => {
    hoveredRef.current = hoveredNodeId;
  }, [hoveredNodeId]);

  useEffect(() => {
    selectedRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  useEffect(() => {
    activeGroupRef.current = activeGroupId;
  }, [activeGroupId]);

  useEffect(() => {
    activeStatusFilterRef.current = activeStatusFilter;
  }, [activeStatusFilter]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      reducedMotionRef.current = mediaQuery.matches;
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const hovered = hoveredNodeId ? nodeMap.get(hoveredNodeId) : null;

    if (!hovered) return;

    if (hovered.type === "core") {
      setStatusMessage("ENTRAL core: Evolving, Neural, Tactical, Reasoning, Autonomous, Logic.");
      return;
    }

    setStatusMessage(`${hovered.name}: ${statusLabel(hovered.status)}. ${hovered.currentTask}`);
  }, [hoveredNodeId, nodeMap]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGraph((current) => {
        const running = current.nodes.filter((node) => node.type === "agent" && node.status === "running");

        if (running.length === 0) {
          graphRef.current = current;
          return current;
        }

        const index = Math.floor(Math.random() * running.length);
        const target = running[index];

        const next = {
          ...current,
          nodes: current.nodes.map((node) => {
            if (node.id !== target.id) return node;

            const log = `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} live update: activity heartbeat received.`;

            return {
              ...node,
              logs: [log, ...node.logs].slice(0, 8)
            };
          })
        };

        graphRef.current = next;
        return next;
      });
    }, 8000);

    return () => window.clearInterval(timer);
  }, []);

  function updateGraphControl<K extends keyof GraphControlSettings>(key: K, value: GraphControlSettings[K]) {
    setGraphControls((current) => {
      const next = { ...current, [key]: value };
      graphControlsRef.current = next;
      return next;
    });
  }

  function patchGraphControls(changes: Partial<GraphControlSettings>, message: string) {
    setGraphControls((current) => {
      const next = { ...current, ...changes };
      graphControlsRef.current = next;
      return next;
    });
    setStatusMessage(message);
  }

  function resetGraphControls() {
    graphControlsRef.current = defaultGraphControls;
    setGraphControls(defaultGraphControls);
    setStatusMessage("Atom dynamics reset to the tuned ENTRAL defaults.");
  }

  function getNodeMotion(node: GraphNode3D): NodeMotion {
    const existing = motionRef.current.get(node.id);

    if (existing) {
      return existing;
    }

    const motion: NodeMotion = {
      localRadius: 48 + stableNumber(node.id, 3) * 76,
      localTiltX: -0.62 + stableNumber(node.id, 7) * 1.24,
      localTiltY: -0.48 + stableNumber(node.id, 11) * 0.96,
      localTiltZ: stableNumber(node.id, 13) * Math.PI * 2,
      phase: stableNumber(node.id, 17) * Math.PI * 2,
      trail: []
    };

    motionRef.current.set(node.id, motion);
    return motion;
  }

  function lockGraphScroll() {
    if (previousBodyOverflowRef.current === null) {
      previousBodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
  }

  function releaseGraphScroll() {
    if (previousBodyOverflowRef.current !== null) {
      document.body.style.overflow = previousBodyOverflowRef.current;
      previousBodyOverflowRef.current = null;
    }
  }

  const pickNode = useCallback((clientX: number, clientY: number): PickResult | null => {
    const canvas = canvasRef.current;
    const matrix = matrixRef.current;

    if (!canvas || !matrix) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: PickResult | null = null;

    for (const node of graphRef.current.nodes) {
      const group = graphRef.current.groups.find((item) => item.id === node.groupId);

      if (node.type !== "core" && group?.collapsed) continue;

      const projected = projectPoint(node, matrix, rect.width, rect.height);

      if (!projected.visible) continue;

      const distance = Math.hypot(projected.screenX - x, projected.screenY - y);
      const radius = node.type === "core" ? 40 : 24;

      if (distance <= radius && (!best || distance < best.distance)) {
        best = { distance, node };
      }
    }

    return best;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return undefined;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: true });

    if (!gl) {
      setIsWebGlReady(false);
      return undefined;
    }

    setIsWebGlReady(true);
    const canvasElement = canvas;
    const glContext = gl;

    const pointProgram = createProgramBundle(glContext, `
      attribute vec3 a_position;
      uniform mat4 u_matrix;
      uniform float u_size;
      void main() {
        vec4 clip = u_matrix * vec4(a_position, 1.0);
        gl_Position = clip;
        gl_PointSize = clamp(u_size * (920.0 / max(clip.w, 160.0)), 8.0, u_size);
      }
    `, `
      precision mediump float;
      uniform vec3 u_color;
      uniform float u_alpha;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float glow = smoothstep(0.5, 0.0, d);
        float core = smoothstep(0.18, 0.0, d);
        vec3 color = mix(u_color, vec3(1.0), core * 0.72);
        gl_FragColor = vec4(color, glow * 0.9 * u_alpha);
      }
    `, true);

    const lineProgram = createProgramBundle(glContext, `
      attribute vec3 a_position;
      uniform mat4 u_matrix;
      void main() {
        gl_Position = u_matrix * vec4(a_position, 1.0);
      }
    `, `
      precision mediump float;
      uniform vec3 u_color;
      uniform float u_alpha;
      void main() {
        gl_FragColor = vec4(u_color, u_alpha);
      }
    `);

    const positionBuffer = glContext.createBuffer();
    let frameId = 0;

    function setCanvasSize() {
      const rect = canvasElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
      const nextHeight = Math.max(1, Math.floor(rect.height * dpr));

      if (canvasElement.width !== nextWidth || canvasElement.height !== nextHeight) {
        canvasElement.width = nextWidth;
        canvasElement.height = nextHeight;
      }

      glContext.viewport(0, 0, canvasElement.width, canvasElement.height);
    }

    function drawPolyline(points: Vec3[], color: string, alpha = 0.58, mode: number = glContext.LINE_STRIP) {
      const currentMatrix = matrixRef.current;

      if (!positionBuffer || !currentMatrix || points.length < 2) return;
      const safeAlpha = Math.min(alpha * graphControlsRef.current.glowIntensity, 0.95);

      glContext.useProgram(lineProgram.program);
      glContext.uniformMatrix4fv(lineProgram.matrix, false, currentMatrix);
      glContext.uniform3fv(lineProgram.color, hexToRgb01(color));
      glContext.uniform1f(lineProgram.alpha, safeAlpha);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
      glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(points.flatMap((point) => [point.x, point.y, point.z])), glContext.STREAM_DRAW);
      glContext.enableVertexAttribArray(lineProgram.position);
      glContext.vertexAttribPointer(lineProgram.position, 3, glContext.FLOAT, false, 0, 0);
      glContext.drawArrays(mode, 0, points.length);
    }

    function drawLine(points: Vec3[], color: string, alpha = 0.58) {
      drawPolyline(points, color, alpha, glContext.LINES);
    }

    function drawPoint(point: Vec3, color: string, size: number, alpha = 1) {
      const currentMatrix = matrixRef.current;

      if (!positionBuffer || !currentMatrix) return;
      const controls = graphControlsRef.current;

      glContext.useProgram(pointProgram.program);
      glContext.uniformMatrix4fv(pointProgram.matrix, false, currentMatrix);
      glContext.uniform3fv(pointProgram.color, hexToRgb01(color));
      glContext.uniform1f(pointProgram.alpha, Math.min(alpha * controls.glowIntensity, 1.25));
      glContext.uniform1f(pointProgram.size ?? null, size * controls.particleSize);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
      glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array([point.x, point.y, point.z]), glContext.STREAM_DRAW);
      glContext.enableVertexAttribArray(pointProgram.position);
      glContext.vertexAttribPointer(pointProgram.position, 3, glContext.FLOAT, false, 0, 0);
      glContext.drawArrays(glContext.POINTS, 0, 1);
    }

    function drawOrbit(meta: OrbitMeta, color: string, segments = 144, alpha = 0.24) {
      const points: Vec3[] = [];

      for (let i = 0; i <= segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(orbitPoint(meta, angle));
      }

      drawPolyline(points, color, alpha);
    }

    function render(time: number) {
      const seconds = time / 1000;
      const previousSeconds = lastFrameTimeRef.current ?? seconds;
      const dt = Math.min(Math.max(seconds - previousSeconds, 0.001), 0.05);
      lastFrameTimeRef.current = seconds;
      timeRef.current = reducedMotionRef.current ? 0 : seconds;
      setCanvasSize();

      const graphNow = graphRef.current;
      const controlsNow = graphControlsRef.current;
      const cameraEase = reducedMotionRef.current ? 1 : Math.min(0.34, 0.13 + controlsNow.cameraSensitivity * 0.055);
      cameraRef.current = smoothCamera(cameraRef.current, desiredCameraRef.current, cameraEase);
      const camera = cameraRef.current;
      const matrix = getCameraMatrix(camera, canvasElement.width, canvasElement.height);
      matrixRef.current = matrix;

      glContext.clearColor(0, 0, 0, 0);
      glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
      glContext.enable(glContext.BLEND);
      glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE);
      glContext.disable(glContext.DEPTH_TEST);

      const groups = new Map(graphNow.groups.map((group) => [group.id, group]));
      const nodes = new Map(graphNow.nodes.map((node) => [node.id, node]));
      const activeGroups = graphNow.groups.filter((group) => group.id !== "core");
      const groupIndexes = new Map(activeGroups.map((group, index) => [group.id, index]));
      const groupLocalIndexes = new Map<string, number>();
      const orbitTightness = 1.28 - controlsNow.gravity * 0.36;
      const settle = reducedMotionRef.current ? 1 : 1 - Math.pow(1 - Math.min(0.22, 0.055 + controlsNow.gravity * 0.09), dt * 60);

      for (const node of graphNow.nodes) {
        if (node.type === "core") {
          node.vx = 0;
          node.vy = 0;
          node.vz = 0;
          node.x = 0;
          node.y = 0;
          node.z = 0;
          continue;
        }

        const groupIndex = groupIndexes.get(node.groupId) ?? 0;
        const localIndex = groupLocalIndexes.get(node.groupId) ?? 0;
        groupLocalIndexes.set(node.groupId, localIndex + 1);

        const shellMeta = orbitMeta(groupIndex);
        const shell = orbitPoint(
          { ...shellMeta, radius: shellMeta.radius * orbitTightness },
          timeRef.current * shellMeta.speed * controlsNow.orbitSpeed + shellMeta.phase
        );
        const motion = getNodeMotion(node);
        const localMeta: OrbitMeta = {
          phase: motion.phase,
          radius: motion.localRadius + localIndex * 9,
          speed: 0.18 + stableNumber(node.id, 23) * 0.08,
          tiltX: motion.localTiltX,
          tiltY: motion.localTiltY,
          tiltZ: motion.localTiltZ
        };
        const clusterScale = 0.18 + (1.35 - controlsNow.gravity) * 0.06;
        const local = scaleVec(orbitPoint(localMeta, timeRef.current * localMeta.speed * controlsNow.orbitSpeed + motion.phase), clusterScale);
        const desired = addVec(shell, local);
        const previous = { x: node.x, y: node.y, z: node.z };

        node.x = lerp(node.x, desired.x, settle);
        node.y = lerp(node.y, desired.y, settle);
        node.z = lerp(node.z, desired.z, settle);
        node.vx = node.x - previous.x;
        node.vy = node.y - previous.y;
        node.vz = node.z - previous.z;

        if (controlsNow.showTrails) {
          const lastTrail = motion.trail[0];
          const movedEnough = !lastTrail || Math.hypot(node.x - lastTrail.x, node.y - lastTrail.y, node.z - lastTrail.z) > 2.5;

          if (movedEnough) {
            motion.trail.unshift({ x: node.x, y: node.y, z: node.z });
          }

          motion.trail.length = Math.min(motion.trail.length, Math.round(controlsNow.trailLength));
        } else {
          motion.trail.length = 0;
        }
      }
      const emphasized = new Set<string>();

      if (selectedRef.current) emphasized.add(selectedRef.current);
      if (hoveredRef.current) emphasized.add(hoveredRef.current);

      for (const edge of graphNow.edges) {
        if (edge.source === selectedRef.current || edge.target === selectedRef.current || edge.source === hoveredRef.current || edge.target === hoveredRef.current) {
          emphasized.add(edge.source);
          emphasized.add(edge.target);
        }
      }

      if (activeGroupRef.current) {
        for (const node of graphNow.nodes) {
          if (node.groupId === activeGroupRef.current) emphasized.add(node.id);
        }
      }

      if (searchRef.current.trim()) {
        for (const node of graphNow.nodes) {
          if (matchesQuery(node, searchRef.current, groups.get(node.groupId))) emphasized.add(node.id);
        }
      }

      if (activeStatusFilterRef.current?.length) {
        for (const node of graphNow.nodes) {
          if (activeStatusFilterRef.current.includes(node.status)) emphasized.add(node.id);
        }
      }

      for (const star of starFieldRef.current) {
        drawPoint(star, "#103640", 5);
      }

      for (const [index, group] of activeGroups.entries()) {
        if (group.collapsed) continue;

        const baseMeta = orbitMeta(index);
        const meta = { ...baseMeta, radius: baseMeta.radius * orbitTightness };
        const active = activeGroupRef.current === group.id || emphasized.size === 0 || graphNow.nodes.some((node) => node.groupId === group.id && emphasized.has(node.id));

        if (controlsNow.showRings) {
          drawOrbit(meta, active ? group.color : "#123a42", 156, active ? 0.28 : 0.13);
        }

        const groupCenter = orbitPoint(meta, timeRef.current * meta.speed * controlsNow.orbitSpeed + meta.phase);
        const groupNodes = graphNow.nodes.filter((node) => node.groupId === group.id);

        if (groupNodes.length > 0) {
          const radius = Math.max(44, Math.max(...groupNodes.map((node) => Math.hypot(node.x - groupCenter.x, node.y - groupCenter.y, node.z - groupCenter.z))) + 28);
          const clusterMeta = { ...meta, radius };

          if (controlsNow.showRings) {
            const haloPoints: Vec3[] = [];
            for (let i = 0; i <= 48; i += 1) {
              const point = orbitPoint(clusterMeta, (i / 48) * Math.PI * 2);
              haloPoints.push({ x: point.x + groupCenter.x, y: point.y * 0.18 + groupCenter.y, z: point.z + groupCenter.z });
            }
            drawPolyline(haloPoints, group.color, active ? 0.18 : 0.08);
          }
        }
      }

      for (const edge of graphNow.edges) {
        const source = nodes.get(edge.source);
        const target = nodes.get(edge.target);

        if (!source || !target) continue;
        if (source.type !== "core" && groups.get(source.groupId)?.collapsed) continue;
        if (target.type !== "core" && groups.get(target.groupId)?.collapsed) continue;

        const active = emphasized.size === 0 || emphasized.has(source.id) || emphasized.has(target.id);
        drawLine([source, target], active ? groups.get(target.groupId)?.color ?? settings.accentColor : "#14313c", active ? 0.42 : 0.14);
      }

      const coreColor = groups.get("core")?.color ?? settings.accentColor;
      const ringPoints: Vec3[] = [];

      if (controlsNow.showRings) {
        for (let ring = 0; ring < 4; ring += 1) {
          const radius = 58 + ring * 24;
          const phase = reducedMotionRef.current ? ring : timeRef.current * (0.55 + ring * 0.2);
          const count = 34;
          const coreRing: Vec3[] = [];

          for (let i = 0; i <= count; i += 1) {
            const angle = (i / count) * Math.PI * 2 + phase;
            let point = {
              x: Math.cos(angle) * radius,
              y: Math.sin(angle * 1.7 + ring) * (18 + ring * 5),
              z: Math.sin(angle) * radius
            };

            point = rotateY(rotateX(point, ring * 0.45), ring * 0.36);
            coreRing.push(point);

            if (i < count && i % 4 === 0) {
              drawLine([{ x: 0, y: 0, z: 0 }, point], coreColor, 0.24);
              ringPoints.push(point);
            }
          }

          drawPolyline(coreRing, coreColor, 0.42);
        }
      }

      drawPoint({ x: 0, y: 0, z: 0 }, coreColor, 96, 0.86);
      drawPoint({ x: 0, y: 0, z: 0 }, "#f8ffff", 30, 0.94);

      for (const [index, particle] of nucleusFieldRef.current.entries()) {
        const phase = reducedMotionRef.current ? 0 : timeRef.current * (0.38 + (index % 4) * 0.08);
        const point = rotateY(rotateX(particle, phase + index * 0.15), phase * 0.74);

        drawLine([{ x: 0, y: 0, z: 0 }, point], index % 2 === 0 ? coreColor : "#ff00ff", 0.46);
        drawPoint(point, index % 3 === 0 ? "#ffffff" : coreColor, index % 3 === 0 ? 14 : 11);
      }

      for (const node of graphNow.nodes) {
        const group = groups.get(node.groupId);

        if (node.type !== "core" && group?.collapsed) continue;

        const dimmed = emphasized.size > 0 && !emphasized.has(node.id);
        const color = dimmed ? "#17404a" : group?.color ?? settings.accentColor;
        const size = nodeVisualSize(node) * (node.id === selectedRef.current || node.id === hoveredRef.current ? 1.18 : 1);

        if (node.type === "core") {
          if (node.id === selectedRef.current || node.id === hoveredRef.current) {
            drawPoint(node, color, 126, dimmed ? 0.12 : 0.22);
          }
        } else {
          const motion = getNodeMotion(node);

          if (controlsNow.showTrails) {
            for (let trail = motion.trail.length - 1; trail >= 0; trail -= 1) {
              const age = trail / Math.max(motion.trail.length - 1, 1);
              drawPoint(motion.trail[trail], color, Math.max(4, size * (0.16 + (1 - age) * 0.22)), dimmed ? 0.08 : (1 - age) * 0.32);
            }
          }

          const pulse = node.status === "running" && !reducedMotionRef.current ? 1 + Math.sin(timeRef.current * 4.2 + stableNumber(node.id, 31) * 6.28) * 0.07 : 1;
          drawPoint(node, color, (size + 9) * pulse, dimmed ? 0.34 : 0.98);
          drawPoint(node, "#ffffff", Math.max(9, size * 0.34) * pulse, dimmed ? 0.26 : 0.88);
        }
      }

      for (const point of ringPoints) {
        drawPoint(point, coreColor, 13);
      }

      frameId = window.requestAnimationFrame(render);
    }

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      if (positionBuffer) glContext.deleteBuffer(positionBuffer);
      glContext.deleteProgram(pointProgram.program);
      glContext.deleteProgram(lineProgram.program);
    };
  }, [settings.accentColor]);

  function setCamera(nextCamera: Partial<CameraState>, immediate = false) {
    const next = clampCamera({
      ...desiredCameraRef.current,
      ...nextCamera,
      target: nextCamera.target ? { ...nextCamera.target } : desiredCameraRef.current.target
    });

    desiredCameraRef.current = next;

    if (immediate) {
      cameraRef.current = next;
    }
  }

  function updateGroupColor(groupId: string, color: string) {
    setGraph((current) => {
      const next = {
        ...current,
        groups: current.groups.map((group) => (group.id === groupId ? { ...group, color } : group))
      };

      graphRef.current = next;
      return next;
    });

    if (groupId === "core") {
      updateSettings({ accentColor: color });
    }
  }

  function renameGroup(groupId: string, name: string) {
    setGraph((current) => {
      const next = {
        ...current,
        groups: current.groups.map((group) => (group.id === groupId ? { ...group, name } : group))
      };

      graphRef.current = next;
      return next;
    });
  }

  function toggleGroup(groupId: string) {
    setGraph((current) => {
      const next = {
        ...current,
        groups: current.groups.map((group) => (group.id === groupId && group.id !== "core" ? { ...group, collapsed: !group.collapsed } : group))
      };

      graphRef.current = next;
      return next;
    });
  }

  function mutateNode(nodeId: string, changes: Partial<GraphNode3D>) {
    setGraph((current) => {
      const next = {
        ...current,
        nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...changes, logs: changes.logs ?? node.logs } : node))
      };

      graphRef.current = next;
      return next;
    });
  }

  function createAgent(name: string, groupId: string) {
    const group = groupMap.get(groupId);
    const blueprint = inferSoldierBlueprint(name, groupId);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `agent-${Date.now()}`;
    const id = nodeMap.has(slug) ? `${slug}-${Date.now().toString(36)}` : slug;
    const capabilitySet = groupId === "pod"
      ? ["shopify-operations", "brand-operations", "tool-orchestration"]
      : groupId === "ads"
        ? ["brand-operations", "business-discovery", "tool-orchestration"]
        : groupId === "ops"
          ? ["app-builder", "tool-orchestration", "governance"]
          : ["public-research", "business-discovery", "tool-orchestration"];
    const newNode: GraphNode3D = {
      capabilities: capabilitySet,
      children: [],
      commandType: "soldier",
      currentTask: `New ${group?.name ?? "General"} Soldier is waiting for instructions.`,
      description: `${name} is a mock Soldier under ${group?.name ?? "the selected General"}.`,
      groupId,
      health: 100,
      id,
      logs: ["Created from the command center."],
      metrics: { cost: 0, roi: 0, successRate: 100 },
      name,
      parentId: groupId,
      permissions: blueprint.permissions,
      progress: 0,
      reasoning: "New agent neuron created from chat. It is ready for assignment.",
      role: blueprint.role,
      status: "idle",
      title: "Soldier",
      tools: blueprint.tools,
      type: "agent",
      vx: 0,
      vy: 0,
      vz: 0,
      x: 120,
      y: 80,
      z: 120
    };

    setGraph((current) => {
      const next = {
        ...current,
        edges: [...current.edges, { id: `e-${groupId}-${newNode.id}`, label: "soldier command link", source: groupId, target: newNode.id }],
        nodes: current.nodes
          .map((node) => (node.id === groupId ? { ...node, children: [...(node.children ?? []), newNode.id] } : node))
          .concat(newNode)
      };

      graphRef.current = next;
      return next;
    });
    setSelectedNodeId(newNode.id);
    setIsPanelOpen(true);
    focusGroup(groupId);
    respond(`Created ${name} under ${group?.name ?? "selected General"}. It has mock permissions, connected tools, and inactive execution status.`, `${name} Soldier created under ${group?.name ?? groupId}.`);
  }

  function createOperation(name: string, parentSoldierId: string) {
    const soldier = graphRef.current.nodes.find((node) => node.id === parentSoldierId && node.commandType === "soldier");
    const parentId = soldier?.id ?? graphRef.current.nodes.find((node) => node.commandType === "soldier")?.id;

    if (!parentId) {
      respond("No Soldier is available for that Operation yet. Create a Soldier first.");
      return;
    }

    const parent = graphRef.current.nodes.find((node) => node.id === parentId);
    const groupId = parent?.groupId ?? "aris";
    const idBase = `${parentId}-${createCommandId(name, "operation")}`;
    const id = graphRef.current.nodes.some((node) => node.id === idBase) ? `${idBase}-${Date.now().toString(36)}` : idBase;
    const operationNode: GraphNode3D = {
      capabilities: ["mock-progress"],
      children: [],
      commandType: "operation",
      currentTask: "0% simulated progress.",
      description: "Mock Operation only. No real autonomous execution has been connected.",
      groupId,
      health: 100,
      id,
      logs: ["Mock Operation created from command console."],
      metrics: { cost: 0, roi: 0, successRate: 100 },
      name,
      parentId,
      permissions: ["read_parent_context"],
      progress: 0,
      reasoning: "This Operation is simulated and ready for future execution wiring.",
      role: "Mock live process",
      status: "idle",
      title: "Operation",
      tools: ["mock_operation_runner"],
      type: "agent",
      vx: 0,
      vy: 0,
      vz: 0,
      x: parent?.x ?? 120,
      y: (parent?.y ?? 80) + 34,
      z: parent?.z ?? 120
    };

    setGraph((current) => {
      const next = {
        ...current,
        edges: [...current.edges, { id: `e-${parentId}-${id}`, label: "operation link", source: parentId, target: id }],
        nodes: current.nodes
          .map((node) => (node.id === parentId ? { ...node, children: [...(node.children ?? []), id] } : node))
          .concat(operationNode)
      };

      graphRef.current = next;
      return next;
    });
    setSelectedNodeId(id);
    setIsPanelOpen(true);
    respond(`Created mock Operation "${name}" under ${parent?.name ?? "selected Soldier"}. It is simulated and will not call external services.`, `Mock Operation ${name} created.`);
  }

  function createGroup(name = "New Cluster") {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `group-${Date.now()}`;
    const id = groupMap.has(slug) ? `${slug}-${Date.now().toString(36)}` : slug;
    const palette = ["#00F0FF", "#FF00FF", "#39FF14", "#9B5CFF", "#00BFFF"];
    const color = palette[graph.groups.length % palette.length];

    setGraph((current) => {
      const next = {
        ...current,
        groups: [...current.groups, { color, id, name }]
      };

      graphRef.current = next;
      return next;
    });
    setActiveGroupId(id);
    setStatusMessage(`Created group ${name}.`);
  }

  function focusGroup(groupId: string) {
    setActiveGroupId(groupId);
    setActiveStatusFilter(null);
    const activeGroups = graphRef.current.groups.filter((group) => group.id !== "core");
    const groupIndex = activeGroups.findIndex((group) => group.id === groupId);
    const controls = graphControlsRef.current;
    const meta = orbitMeta(Math.max(groupIndex, 0));
    const center = groupId === "core" || groupIndex < 0
      ? { x: 0, y: 0, z: 0 }
      : orbitPoint({ ...meta, radius: meta.radius * (1.28 - controls.gravity * 0.36) }, timeRef.current * meta.speed * controls.orbitSpeed + meta.phase);

    setCamera({
      distance: groupId === "core" ? 520 : 560,
      target: center
    });
    setStatusMessage(`Focused ${groupMap.get(groupId)?.name ?? "group"}.`);
  }

  function focusNode(node: GraphNode3D) {
    setSelectedNodeId(node.id);
    setIsPanelOpen(true);
    setActiveStatusFilter(null);
    setActiveGroupId(node.groupId === "core" ? null : node.groupId);
    setCamera({
      distance: node.type === "core" ? 500 : 420,
      target: { x: node.x, y: node.y, z: node.z }
    });
    setStatusMessage(`Zoomed to ${node.name}. ENTRAL updated the graph focus from chat.`);
  }

  function fitGraph() {
    setCamera({ ...defaultCamera, target: { ...defaultCamera.target } });
    setActiveGroupId(null);
    setActiveStatusFilter(null);
    setSearch("");
    setStatusMessage("Fit atom to the full command field.");
  }

  function openSettings() {
    window.dispatchEvent(new Event("entral:open-settings"));
  }

  function appendConsoleMessage(role: CommandConsoleMessage["role"], content: string) {
    setCommandHistory((current) => [
      ...current.slice(-10),
      {
        content,
        id: `${role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        role
      }
    ]);
  }

  function recordActivity(message: string) {
    setActivityEvents((current) => [
      {
        id: `activity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        message,
        timestamp: new Date().toISOString()
      },
      ...current.slice(0, 7)
    ]);
  }

  function respond(message: string, activity = message) {
    setStatusMessage(message);
    appendConsoleMessage("system", message);
    recordActivity(activity);
  }

  function openAtomControls() {
    setIsControlsOpen(true);
    setIsPanelOpen(false);
    respond("Atom Controls opened. The side inspector was cleared so the graph and controls have maximum room.");
  }

  function closeAtomControls() {
    setIsControlsOpen(false);
    respond("Atom Controls minimized to the bottom dock.");
  }

  function toggleInfoPanel() {
    if (isControlsOpen) {
      closeAtomControls();
      setIsPanelOpen(true);
      return;
    }

    setIsPanelOpen((open) => !open);
  }

  function routeWorkspaceAction(label: string, href?: string, eventName?: string) {
    if (eventName) {
      window.dispatchEvent(new Event(eventName));
    }

    if (href) {
      window.location.assign(href);
    }

    respond(label);
  }

  function selectedGeneralId() {
    const selected = graphRef.current.nodes.find((node) => node.id === selectedRef.current);

    if (selected?.commandType === "general") return selected.id;
    if (selected?.commandType === "soldier" || selected?.commandType === "operation") return selected.groupId;
    return "aris";
  }

  function generalIdFromCommand(text: string) {
    const normalized = text.toLowerCase();
    return commandGenerals.find((general) => normalized.includes(general.id) || normalized.includes(general.name.toLowerCase()))?.id ?? selectedGeneralId();
  }

  function soldierIdFromCommand(text: string) {
    const node = commandTextToNode(text, graphRef.current.nodes);

    if (node?.commandType === "soldier") return node.id;
    if (node?.commandType === "operation" && node.parentId) return node.parentId;
    if (selectedNode?.commandType === "soldier") return selectedNode.id;
    if (selectedNode?.commandType === "operation" && selectedNode.parentId) return selectedNode.parentId;

    const generalId = generalIdFromCommand(text);
    return graphRef.current.nodes.find((candidate) => candidate.commandType === "soldier" && candidate.groupId === generalId)?.id;
  }

  function soldierNameFromCommand(text: string, generalId: string) {
    const beforeUnder = /create\s+(?:a\s+|an\s+|new\s+)?(.+?)\s+soldier(?:\s+under|\s+for|$)/i.exec(text)?.[1]?.trim();
    const afterFor = /soldier\s+for\s+([^,.;]+)/i.exec(text)?.[1]?.trim();
    const usableBeforeUnder = beforeUnder && beforeUnder.replace(/^new$/i, "").trim().length > 0 ? beforeUnder : undefined;
    const rawName = usableBeforeUnder || afterFor || "New";
    const cleaned = rawName.replace(/^new\s+/i, "").trim();
    const normalized = cleaned.length > 0 ? cleaned : commandGenerals.find((general) => general.id === generalId)?.name ?? "Command";

    return /\bsoldier$/i.test(normalized) ? normalized : `${normalized} Soldier`;
  }

  function operationNameFromCommand(text: string) {
    return /operation\s+(?:called|named|for)?\s*([^,.;]+)/i.exec(text)?.[1]?.trim()
      || /task\s+(?:called|named|for)?\s*([^,.;]+)/i.exec(text)?.[1]?.trim()
      || "New Mock Operation";
  }

  function focusCommandNode(node: GraphNode3D) {
    focusNode(node);

    if (node.commandType === "general") {
      setActiveGroupId(node.id);
      respond(`${node.name} opened. Showing its Soldiers, Operations, health, permissions, and command links.`, `${node.name} General focused.`);
    } else if (node.commandType === "emperor") {
      fitGraph();
      respond("Returned to ENTRAL Emperor overview. Full chain of command is visible.", "Returned to Emperor overview.");
    } else {
      respond(`${node.name} selected. Inspector shows status, parent command, permissions, tools, Operations, and logs.`, `${node.name} selected.`);
    }
  }

  function setStatusHighlight(statuses: GraphStatus[], label: string) {
    setActiveStatusFilter(statuses);
    setSearch("");
    setActiveGroupId(null);
    respond(label);
  }

  async function askDashboardAi(message: string) {
    setIsThinking(true);
    setStatusMessage("ENTRAL is thinking through that request.");

    try {
      const response = await apiFetch<DashboardChatResponse>("/ai/chat", {
        method: "POST",
        json: {
          conversationId: dashboardConversationId ?? undefined,
          message
        },
        timeoutMs: 45000
      });

      setDashboardConversationId(response.conversationId);
      respond(response.content, "ENTRAL answered a natural-language command console message.");
    } catch (error) {
      respond(error instanceof Error
        ? `ENTRAL could not reach the AI backend: ${error.message}`
        : "ENTRAL could not reach the AI backend.", "AI backend request failed.");
    } finally {
      setIsThinking(false);
    }
  }

  function executeCommand(commandText: string) {
    const text = commandText.trim();
    const normalized = text.toLowerCase();
    const group = commandTextToGroup(text, graph.groups);
    const commandNode = commandTextToNode(text, graph.nodes);
    const selected = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
    const numberMatch = /(\d+(?:\.\d+)?)/.exec(normalized);
    const numericValue = numberMatch ? Number(numberMatch[1]) : null;

    if (!text) return;
    appendConsoleMessage("operator", text);

    if (normalized.includes("return to entral") || normalized.includes("emperor overview") || normalized.includes("show entral")) {
      const entral = graphRef.current.nodes.find((node) => node.id === "entral");
      if (entral) focusCommandNode(entral);
    } else if (normalized.includes("chain of command")) {
      setActiveStatusFilter(null);
      setSearch("");
      fitGraph();
      respond("Showing the full chain of command: ENTRAL Emperor, five Generals, Soldiers, and simulated Operations.");
    } else if (normalized.includes("show failing") || normalized.includes("failed operation") || normalized.includes("alerts")) {
      setStatusHighlight(["error", "warning", "awaiting_approval"], "Highlighted failing, warning, and approval-gated nodes across the Command OS.");
    } else if (normalized.includes("show active") || normalized.includes("active soldiers") || normalized.includes("running operations")) {
      setStatusHighlight(["running"], "Highlighted active running Soldiers and Operations.");
    } else if (normalized.includes("pause all failed")) {
      setGraph((current) => {
        const next = {
          ...current,
          nodes: current.nodes.map((node) => (node.commandType === "operation" && (node.status === "error" || node.status === "warning") ? { ...node, logs: ["Paused from Command OS bulk command.", ...node.logs], status: "paused" as GraphStatus } : node))
        };

        graphRef.current = next;
        return next;
      });
      respond("Paused all failed or warning Operations in mock mode. No external systems were touched.");
    } else if (normalized.includes("create") && normalized.includes("soldier")) {
      const generalId = generalIdFromCommand(text);
      const soldierName = soldierNameFromCommand(text, generalId);
      createAgent(soldierName, generalId);
    } else if (normalized.includes("create") && (normalized.includes("operation") || normalized.includes("task"))) {
      const parentSoldierId = soldierIdFromCommand(text);
      createOperation(operationNameFromCommand(text), parentSoldierId ?? "");
    } else if (normalized.includes("assign") && normalized.includes("task")) {
      const generalId = generalIdFromCommand(text);
      const soldier = graphRef.current.nodes.find((node) => node.commandType === "soldier" && node.groupId === generalId);
      createOperation(operationNameFromCommand(text), soldier?.id ?? "");
    } else if (normalized.includes("new chat") || normalized.includes("fresh chat") || normalized.includes("start chat")) {
      routeWorkspaceAction("Opening a fresh ENTRAL chat workspace.", "/chat");
    } else if (normalized.includes("new task") || normalized.includes("create task")) {
      routeWorkspaceAction("Opening the task composer and automation console.", "/automations");
    } else if (normalized.includes("run agent") || normalized.includes("assign agent")) {
      routeWorkspaceAction("Opening the agent runner.", "/agents");
    } else if (normalized.includes("template")) {
      routeWorkspaceAction("Opening the agent template gallery.", "/agents#templates");
    } else if (normalized.includes("export")) {
      routeWorkspaceAction("Opening history export controls.", "/chat#export");
    } else if (normalized.includes("governance") || normalized.includes("audit") || normalized.includes("admin")) {
      routeWorkspaceAction("Opening the governance dashboard.", "/admin");
    } else if (normalized.includes("automation console") || normalized.includes("automations")) {
      routeWorkspaceAction("Opening the automation console.", "/automations");
    } else if (normalized.includes("tutorial") || normalized.includes("onboarding")) {
      routeWorkspaceAction("Replaying the guided tutorial.", undefined, "entral:open-tutorial");
    } else if (normalized.includes("shortcut") || normalized.includes("hotkey")) {
      routeWorkspaceAction("Opening keyboard shortcuts.", undefined, "entral:open-shortcuts");
    } else if (normalized.includes("command palette") || normalized.includes("ctrl k") || normalized.includes("cmd k")) {
      routeWorkspaceAction("Opening the command palette.", undefined, "entral:open-command-palette");
    } else if (normalized.includes("setting")) {
      openSettings();
      setStatusMessage("Opened settings from ENTRAL chat.");
    } else if (normalized.includes("control")) {
      const shouldHide = normalized.includes("hide") || normalized.includes("close");
      const shouldShow = normalized.includes("show") || normalized.includes("open");

      if (shouldHide) {
        closeAtomControls();
      } else if (shouldShow || !isControlsOpen) {
        openAtomControls();
      } else {
        closeAtomControls();
      }

      respond(`${shouldHide ? "Closed" : shouldShow ? "Opened" : "Toggled"} Atom Controls from chat.`);
    } else if (normalized.includes("panel") || normalized.includes("sidebar") || normalized.includes("details")) {
      const shouldHide = normalized.includes("hide") || normalized.includes("close");
      const shouldShow = normalized.includes("show") || normalized.includes("open");

      if (!shouldHide && (shouldShow || !isPanelOpen) && isControlsOpen) {
        closeAtomControls();
      }

      setIsPanelOpen(shouldHide ? false : shouldShow ? true : (open) => !open);
      respond(`${shouldHide ? "Closed" : shouldShow ? "Opened" : "Toggled"} the side information panel from chat.`);
    } else if (normalized.includes("ring") || normalized.includes("orbit path")) {
      const shouldShow = normalized.includes("show") || normalized.includes("enable") || normalized.includes("turn on");
      const shouldHide = normalized.includes("hide") || normalized.includes("remove") || normalized.includes("disable") || normalized.includes("turn off");
      patchGraphControls({
        showRings: shouldHide ? false : shouldShow ? true : !graphControlsRef.current.showRings
      }, `${shouldHide ? "Hidden" : shouldShow ? "Shown" : "Toggled"} orbital rings from ENTRAL chat.`);
    } else if (normalized.includes("trail length") || normalized.includes("tail length")) {
      patchGraphControls({
        trailLength: Math.min(Math.max(numericValue ?? graphControlsRef.current.trailLength + 6, 4), 42)
      }, "Updated particle trail length from ENTRAL chat.");
    } else if (normalized.includes("trail") || normalized.includes("tail")) {
      const shouldShow = normalized.includes("show") || normalized.includes("enable") || normalized.includes("turn on");
      const shouldHide = normalized.includes("hide") || normalized.includes("remove") || normalized.includes("disable") || normalized.includes("turn off");
      patchGraphControls({
        showTrails: shouldHide ? false : shouldShow ? true : !graphControlsRef.current.showTrails
      }, `${shouldHide ? "Hidden" : shouldShow ? "Shown" : "Toggled"} particle trails from ENTRAL chat.`);
    } else if (normalized.includes("speed") || normalized.includes("faster") || normalized.includes("slower") || normalized.includes("freeze")) {
      const current = graphControlsRef.current.orbitSpeed;
      const nextSpeed = normalized.includes("freeze") || normalized.includes("stop")
        ? 0
        : numericValue !== null
          ? numericValue
          : normalized.includes("slower")
            ? current * 0.72
            : current * 1.28;

      patchGraphControls({
        orbitSpeed: Math.min(Math.max(nextSpeed, 0), 2.2)
      }, `Atom orbit speed set to ${Math.min(Math.max(nextSpeed, 0), 2.2).toFixed(2)}x from ENTRAL chat.`);
    } else if (normalized.includes("gravity") || normalized.includes("tighter") || normalized.includes("looser")) {
      const current = graphControlsRef.current.gravity;
      const nextGravity = numericValue !== null
        ? numericValue
        : normalized.includes("looser")
          ? current * 0.82
          : current * 1.14;

      patchGraphControls({
        gravity: Math.min(Math.max(nextGravity, 0.2), 1.35)
      }, "Adjusted atom gravity and orbit tightness from ENTRAL chat.");
    } else if (normalized.includes("glow")) {
      const current = graphControlsRef.current.glowIntensity;
      const nextGlow = numericValue !== null ? numericValue : normalized.includes("less") || normalized.includes("down") ? current * 0.82 : current * 1.16;

      patchGraphControls({
        glowIntensity: Math.min(Math.max(nextGlow, 0.45), 1.85)
      }, "Adjusted neon glow intensity from ENTRAL chat.");
    } else if (normalized.includes("particle size") || normalized.includes("bigger") || normalized.includes("smaller")) {
      const current = graphControlsRef.current.particleSize;
      const nextSize = numericValue !== null ? numericValue : normalized.includes("smaller") ? current * 0.86 : current * 1.12;

      patchGraphControls({
        particleSize: Math.min(Math.max(nextSize, 0.65), 1.7)
      }, "Adjusted electron particle size from ENTRAL chat.");
    } else if (normalized.includes("create") && normalized.includes("group")) {
      const nameMatch = /group (?:called |named |for )?([^,.;]+)/i.exec(text);
      createGroup(nameMatch?.[1]?.trim() || "New Cluster");
    } else if (normalized.includes("create")) {
      const nameMatch = /agent (?:for |called |named )?([^,.;]+)/i.exec(text);
      const baseName = nameMatch?.[1]?.trim() ? `${nameMatch[1].trim()} Agent` : "New Agent";
      createAgent(baseName, group?.id ?? generalIdFromCommand(text));
    } else if (normalized.includes("redirect") || normalized.includes("move")) {
      const target = graph.nodes.find((node) => node.type !== "core" && normalized.includes(node.name.toLowerCase().split(" ")[0]));

      if (target && group) {
        mutateNode(target.id, {
          groupId: group.id,
          logs: [`Redirected to ${group.name} from chat command.`, ...target.logs],
          reasoning: `ENTRAL redirected this neuron into ${group.name} and will re-cluster it automatically.`
        });
        setSelectedNodeId(target.id);
        focusGroup(group.id);
      } else {
        respond("I could not find a matching agent and group to redirect.");
      }
    } else if (normalized.includes("pause") && selected) {
      mutateNode(selected.id, { logs: ["Paused from chat command.", ...selected.logs], status: "paused" });
      respond(`${selected.name} paused.`);
    } else if ((normalized.includes("resume") || normalized.includes("run")) && selected) {
      mutateNode(selected.id, { logs: ["Resumed from chat command.", ...selected.logs], status: "running" });
      respond(`${selected.name} resumed.`);
    } else if (normalized.includes("show") || normalized.includes("pull up") || normalized.includes("highlight") || normalized.includes("zoom") || normalized.includes("focus") || normalized.includes("select") || normalized.includes("open") || normalized.includes("take me to")) {
      if (commandNode) {
        focusCommandNode(commandNode);
      } else if (group) {
        focusGroup(group.id);
      } else if (normalized.includes("running")) {
        setActiveGroupId(null);
        setSearch("running");
        setStatusMessage("Highlighted running agents.");
      } else {
        fitGraph();
      }
    } else {
      void askDashboardAi(text);
    }
  }

  function runCommand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    executeCommand(command);
    setCommand("");
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    lockGraphScroll();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      lastX: event.clientX,
      lastY: event.clientY,
      mode: event.shiftKey || event.button === 2 ? "pan" : "orbit",
      moved: false
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;

    if (drag) {
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      drag.moved = drag.moved || Math.abs(dx) + Math.abs(dy) > 3;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;

      if (drag.mode === "orbit") {
        const sensitivity = graphControlsRef.current.cameraSensitivity;
        const next = clampCamera({
          ...desiredCameraRef.current,
          pitch: desiredCameraRef.current.pitch + dy * 0.0038 * sensitivity,
          yaw: desiredCameraRef.current.yaw + dx * 0.0038 * sensitivity
        });
        desiredCameraRef.current = next;
      } else {
        const scale = desiredCameraRef.current.distance * 0.0017 * graphControlsRef.current.cameraSensitivity;
        const next = clampCamera({
          ...desiredCameraRef.current,
          target: {
            x: desiredCameraRef.current.target.x - dx * scale,
            y: desiredCameraRef.current.target.y + dy * scale,
            z: desiredCameraRef.current.target.z
          }
        });
        desiredCameraRef.current = next;
      }

      return;
    }

    const picked = pickNode(event.clientX, event.clientY);
    const nextHoveredId = picked?.node.id ?? null;

    if (hoveredRef.current !== nextHoveredId) {
      setHoveredNodeId(nextHoveredId);
    }

    setTooltip(picked ? {
      groupName: graphRef.current.groups.find((group) => group.id === picked.node.groupId)?.name ?? "Ungrouped",
      name: picked.node.name,
      status: picked.node.status,
      task: picked.node.currentTask,
      x: event.clientX,
      y: event.clientY
    } : null);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    const picked = pickNode(event.clientX, event.clientY);

    if (picked && !drag?.moved) {
      focusCommandNode(picked.node);
    }

    dragRef.current = null;
  }

  function handleCanvasKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    const key = event.key.toLowerCase();
    const amount = event.shiftKey ? 0.18 : 0.08;

    if (key === "arrowleft" || key === "arrowright" || key === "arrowup" || key === "arrowdown" || key === "+" || key === "=" || key === "-" || key === "_" || key === "home") {
      event.preventDefault();
    }

    if (key === "arrowleft") {
      setCamera({ yaw: desiredCameraRef.current.yaw - amount }, true);
    } else if (key === "arrowright") {
      setCamera({ yaw: desiredCameraRef.current.yaw + amount }, true);
    } else if (key === "arrowup") {
      setCamera({ pitch: desiredCameraRef.current.pitch - amount }, true);
    } else if (key === "arrowdown") {
      setCamera({ pitch: desiredCameraRef.current.pitch + amount }, true);
    } else if (key === "+" || key === "=") {
      setCamera({ distance: desiredCameraRef.current.distance * 0.9 }, true);
    } else if (key === "-" || key === "_") {
      setCamera({ distance: desiredCameraRef.current.distance * 1.1 }, true);
    } else if (key === "home") {
      fitGraph();
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const zoomAmount = 0.08 * graphControlsRef.current.cameraSensitivity;
    setCamera({ distance: desiredCameraRef.current.distance * (event.deltaY > 0 ? 1 + zoomAmount : 1 - zoomAmount) });
  }

  function deleteSelectedNode() {
    if (!selectedNode || selectedNode.type === "core") return;

    setGraph((current) => {
      const next = {
        ...current,
        edges: current.edges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id),
        nodes: current.nodes.filter((node) => node.id !== selectedNode.id)
      };

      graphRef.current = next;
      return next;
    });
    setSelectedNodeId("entral");
  }

  const filteredNodes = search.trim()
    ? visibleNodes.filter((node) => matchesQuery(node, search, groupMap.get(node.groupId)))
    : visibleNodes;
  const filteredVisibleNodes = activeStatusFilter?.length
    ? filteredNodes.filter((node) => activeStatusFilter.includes(node.status))
    : filteredNodes;
  const generalNodes = graph.nodes.filter((node) => node.commandType === "general");
  const operationNodes = graph.nodes.filter((node) => node.commandType === "operation");
  const selectedChildren = selectedNode ? graph.nodes.filter((node) => node.parentId === selectedNode.id) : [];
  const selectedParent = selectedNode?.parentId ? nodeMap.get(selectedNode.parentId) : null;
  const selectedCapabilityCards = selectedNode?.type === "core"
    ? businessCapabilityBlueprints
    : (selectedNode?.capabilities ?? ["tool-orchestration"])
      .map((id) => capabilityById(id))
      .filter((capability): capability is CapabilityBlueprint => Boolean(capability));

  return (
    <main className={["command-center-page", isPanelOpen ? "info-panel-open" : "", isControlsOpen ? "atom-controls-open" : ""].filter(Boolean).join(" ")} aria-label="ENTRAL Atomic Command Center">
      <canvas
        aria-describedby="command-center-camera-help"
        aria-label="3D interactive ENTRAL neuron graph"
        className="command-center-canvas"
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={handleCanvasKeyDown}
        onPointerEnter={lockGraphScroll}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => {
          dragRef.current = null;
          releaseGraphScroll();
          setHoveredNodeId(null);
          setTooltip(null);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        ref={canvasRef}
        role="application"
        tabIndex={0}
      />
      <p className="sr-only" id="command-center-camera-help">
        Drag to orbit. Hold shift while dragging to pan. Use the mouse wheel or plus and minus keys to zoom. Arrow keys rotate the camera.
      </p>

      <div className="command-center-vignette" aria-hidden="true" />

      <header className="command-center-brand" aria-label="Command center status">
        <Logo />
        <div>
          <p className="eyebrow">Command OS</p>
          <h1>ENTRAL</h1>
          <span>{user?.name ? `${user.name}'s Emperor layer` : "Military-neural command graph"}</span>
        </div>
      </header>

      <div className="command-center-top-actions">
        <button className="command-icon-button" type="button" onClick={() => (isControlsOpen ? closeAtomControls() : openAtomControls())} aria-label={isControlsOpen ? "Hide graph controls" : "Show graph controls"}>
          {isControlsOpen ? <PanelBottomClose aria-hidden="true" size={18} /> : <PanelBottomOpen aria-hidden="true" size={18} />}
        </button>
        <button className="command-icon-button" type="button" onClick={toggleInfoPanel} aria-label={isPanelOpen ? "Hide side information panel" : "Show side information panel"}>
          {isPanelOpen ? <PanelRightClose aria-hidden="true" size={18} /> : <PanelRightOpen aria-hidden="true" size={18} />}
        </button>
        <button className="command-icon-button" type="button" onClick={openSettings} aria-label="Open settings">
          <Settings aria-hidden="true" size={18} />
        </button>
        <button className="command-icon-button" type="button" onClick={onLogout} aria-label="Sign out">
          <LogOut aria-hidden="true" size={18} />
        </button>
      </div>

      <nav className="command-os-nav" aria-label="Command OS navigation">
        <div className="command-os-nav-header">
          <p className="eyebrow">Command OS</p>
          <strong>Chain of command</strong>
          <span>{selectedNode ? `${selectedNode.title} / ${selectedNode.name}` : "ENTRAL"}</span>
        </div>
        <details open>
          <summary>Hierarchy</summary>
          <button className={selectedNodeId === "entral" ? "active" : ""} type="button" onClick={() => {
            const entral = graphRef.current.nodes.find((node) => node.id === "entral");
            if (entral) focusCommandNode(entral);
          }}>
            ENTRAL / Emperor
          </button>
          {generalNodes.map((general) => (
            <React.Fragment key={general.id}>
              <button className={selectedNodeId === general.id ? "active" : ""} type="button" onClick={() => focusCommandNode(general)}>
                <span style={{ "--group-color": groupMap.get(general.groupId)?.color ?? settings.accentColor } as React.CSSProperties} />
                {general.name} / General
              </button>
              {graph.nodes.filter((node) => node.parentId === general.id && node.commandType === "soldier").slice(0, 6).map((soldier) => (
                <button className={selectedNodeId === soldier.id ? "active child" : "child"} key={soldier.id} type="button" onClick={() => focusCommandNode(soldier)}>
                  {soldier.name}
                </button>
              ))}
            </React.Fragment>
          ))}
        </details>
        <details open>
          <summary>Command</summary>
          <button type="button" onClick={() => {
            const entral = graphRef.current.nodes.find((node) => node.id === "entral");
            if (entral) focusCommandNode(entral);
          }}>Emperor Overview</button>
          <button type="button" onClick={() => setStatusHighlight(["running"], "Highlighted active Operations and running Soldiers.")}>Active Operations</button>
          <button type="button" onClick={() => setStatusHighlight(["error", "warning", "awaiting_approval"], "Highlighted alerts, failed Operations, and approval requests.")}>Alerts</button>
          <button type="button" onClick={() => respond("Latest activity is visible in the Activity Feed. Mock execution logs are preserved per node.")}>Logs</button>
        </details>
        <details open>
          <summary>Generals</summary>
          {generalNodes.map((node) => (
            <button className={selectedNodeId === node.id ? "active" : ""} key={node.id} type="button" onClick={() => focusCommandNode(node)}>
              <span style={{ "--group-color": groupMap.get(node.groupId)?.color ?? settings.accentColor } as React.CSSProperties} />
              {node.name}
            </button>
          ))}
        </details>
        <details>
          <summary>Operations</summary>
          <button type="button" onClick={() => setStatusHighlight(["running"], "Showing running Operations.")}>Running</button>
          <button type="button" onClick={() => setStatusHighlight(["idle"], "Showing pending or idle Operations.")}>Pending</button>
          <button type="button" onClick={() => setStatusHighlight(["error", "warning"], "Showing failed and warning Operations.")}>Failed</button>
          <button type="button" onClick={() => setStatusHighlight(["success"], "Showing completed Operations.")}>Completed</button>
          <button type="button" onClick={() => setStatusHighlight(["awaiting_approval"], "Showing Operations awaiting approval.")}>Awaiting Approval</button>
        </details>
        <details>
          <summary>Infrastructure</summary>
          {["Memory", "Permissions", "Event Bus", "Tools", "Integrations"].map((label) => (
            <button key={label} type="button" onClick={() => respond(`${label} is represented in mock Command OS mode. Real execution wiring is intentionally disabled for now.`)}>{label}</button>
          ))}
        </details>
        <details>
          <summary>Analytics</summary>
          {["System Metrics", "Agent Performance", "Resource Usage", "Execution Stats"].map((label) => (
            <button key={label} type="button" onClick={() => respond(`${label} summary: ${generalNodes.length} Generals, ${operationNodes.length} mock Operations, ${graph.nodes.length} total command nodes.`)}>{label}</button>
          ))}
        </details>
        <details>
          <summary>Settings</summary>
          <button type="button" onClick={openSettings}>Appearance</button>
          <button type="button" onClick={openAtomControls}>Graph Settings</button>
          <button type="button" onClick={() => respond("Agent permissions are shown in the selected node inspector. Real permission enforcement remains policy-gated.")}>Agent Permissions</button>
          <button type="button" onClick={() => respond("Notifications are mocked in this Command OS layer until real delivery channels are connected.")}>Notifications</button>
        </details>
      </nav>

      {isControlsOpen ? (
        <aside className="command-center-controls" aria-label="3D graph controls">
          <div className="sidebar-heading">
            <div>
              <p className="eyebrow">Atom</p>
              <h2>Controls</h2>
            </div>
            <button className="sidebar-toggle-button" type="button" onClick={closeAtomControls} aria-label="Close atom controls">
              <PanelBottomClose aria-hidden="true" size={18} />
            </button>
          </div>
          <label className="command-search">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">Search Command OS nodes</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Generals, Soldiers, Operations..." />
          </label>

          <div className="camera-control-grid">
            <Button type="button" variant="secondary" onClick={() => setCamera({ distance: desiredCameraRef.current.distance * 0.86 })}>
              <ZoomIn aria-hidden="true" size={17} />
              Zoom
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCamera({ distance: desiredCameraRef.current.distance * 1.16 })}>
              <ZoomOut aria-hidden="true" size={17} />
              Out
            </Button>
            <Button type="button" variant="secondary" onClick={fitGraph}>
              <Maximize2 aria-hidden="true" size={17} />
              Fit
            </Button>
            <Button type="button" variant="secondary" onClick={() => focusGroup("core")}>
              <Crosshair aria-hidden="true" size={17} />
              Core
            </Button>
            <Button type="button" variant="secondary" onClick={() => createGroup()}>
              <Sparkles aria-hidden="true" size={17} />
              Shell
            </Button>
            <Button type="button" variant="secondary" onClick={() => {
              setSearch("");
              setActiveGroupId(null);
              setActiveStatusFilter(null);
              setStatusMessage("Filters cleared.");
            }}>
              <Eye aria-hidden="true" size={17} />
              Clear
            </Button>
          </div>

          <div className="command-control-menu" aria-label="Atom dynamics controls">
            <div className="section-title-row compact">
              <SlidersHorizontal aria-hidden="true" size={17} />
              <h3>Atom dynamics</h3>
            </div>
            <label className="command-range">
              <span>Orbit speed</span>
              <input aria-label="Orbit and particle speed" type="range" min="0" max="2.2" step="0.05" value={graphControls.orbitSpeed} onChange={(event) => updateGraphControl("orbitSpeed", Number(event.target.value))} />
              <strong>{graphControls.orbitSpeed.toFixed(2)}x</strong>
            </label>
            <label className="command-range">
              <span>Gravity</span>
              <input aria-label="Gravity and orbit tightness" type="range" min="0.2" max="1.35" step="0.05" value={graphControls.gravity} onChange={(event) => updateGraphControl("gravity", Number(event.target.value))} />
              <strong>{Math.round(graphControls.gravity * 100)}%</strong>
            </label>
            <label className="command-range">
              <span>Trail length</span>
              <input aria-label="Color trail length" type="range" min="4" max="42" step="1" value={graphControls.trailLength} onChange={(event) => updateGraphControl("trailLength", Number(event.target.value))} disabled={!graphControls.showTrails} />
              <strong>{Math.round(graphControls.trailLength)}</strong>
            </label>
            <label className="command-range">
              <span>Glow</span>
              <input aria-label="Glow intensity" type="range" min="0.45" max="1.85" step="0.05" value={graphControls.glowIntensity} onChange={(event) => updateGraphControl("glowIntensity", Number(event.target.value))} />
              <strong>{Math.round(graphControls.glowIntensity * 100)}%</strong>
            </label>
            <label className="command-range">
              <span>Particle size</span>
              <input aria-label="Particle size" type="range" min="0.65" max="1.7" step="0.05" value={graphControls.particleSize} onChange={(event) => updateGraphControl("particleSize", Number(event.target.value))} />
              <strong>{Math.round(graphControls.particleSize * 100)}%</strong>
            </label>
            <label className="command-range">
              <span>Camera feel</span>
              <input aria-label="Camera sensitivity" type="range" min="0.45" max="1.8" step="0.05" value={graphControls.cameraSensitivity} onChange={(event) => updateGraphControl("cameraSensitivity", Number(event.target.value))} />
              <strong>{Math.round(graphControls.cameraSensitivity * 100)}%</strong>
            </label>
            <div className="command-control-row">
              <button className={graphControls.showTrails ? "command-toggle active" : "command-toggle"} type="button" onClick={() => updateGraphControl("showTrails", !graphControls.showTrails)} aria-pressed={graphControls.showTrails}>
                <Activity aria-hidden="true" size={16} />
                Color trails
              </button>
              <button className={graphControls.showRings ? "command-toggle active" : "command-toggle"} type="button" onClick={() => updateGraphControl("showRings", !graphControls.showRings)} aria-pressed={graphControls.showRings}>
                <Eye aria-hidden="true" size={16} />
                Orbital rings
              </button>
            </div>
            <div className="command-control-row">
              <button className="command-toggle" type="button" onClick={resetGraphControls}>
                <RotateCcw aria-hidden="true" size={16} />
                Reset
              </button>
            </div>
          </div>

          <div className="command-legend" aria-label="Neuron groups">
            {graph.groups.map((group) => {
              const count = graph.nodes.filter((node) => node.groupId === group.id).length;

              return (
                <article className={activeGroupId === group.id ? "command-group active" : "command-group"} key={group.id}>
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
                    <button className="command-mini-button" type="button" onClick={() => toggleGroup(group.id)}>
                      {group.collapsed ? "Expand" : "Collapse"}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </aside>
      ) : null}

      {!isControlsOpen ? (
        <button className="atom-controls-dock" type="button" onClick={openAtomControls} aria-label="Open Atom Controls">
          <SlidersHorizontal aria-hidden="true" size={16} />
          <span>Atom Controls</span>
          <kbd>controls</kbd>
        </button>
      ) : null}

      <div className="command-center-orbit-help" role="status">
        <Sparkles aria-hidden="true" size={16} />
        <span>{statusMessage}</span>
        <kbd>Drag</kbd>
        <kbd>Wheel</kbd>
        <kbd>Shift + Drag</kbd>
      </div>

      {tooltip ? (
        <div
          className="command-node-tooltip"
          role="tooltip"
          style={{
            left: Math.min(tooltip.x + 18, window.innerWidth - 280),
            top: Math.min(tooltip.y + 18, window.innerHeight - 150)
          }}
        >
          <strong>{tooltip.name}</strong>
          <span>{tooltip.groupName} / {statusLabel(tooltip.status)}</span>
          <p>{tooltip.task}</p>
        </div>
      ) : null}

      {!isWebGlReady ? (
        <div className="command-center-webgl-error" role="alert">
          <Info aria-hidden="true" size={20} />
          WebGL is unavailable in this browser, so the 3D neuron field cannot render.
        </div>
      ) : null}

      <form className="command-center-chat" onSubmit={runCommand} aria-label="ENTRAL command input">
        <header className="command-chat-heading">
          <div className="command-chat-orb">
            <Bot aria-hidden="true" size={20} />
          </div>
          <div>
            <p className="eyebrow">Persistent command console</p>
            <h2>ENTRAL Command</h2>
            <span>Talk normally or issue orders. ENTRAL controls graph focus, Generals, Soldiers, mock Operations, panels, and routing.</span>
          </div>
        </header>

        <div className={isThinking ? "command-chat-status thinking" : "command-chat-status"} role="status">
          <Sparkles aria-hidden="true" size={16} />
          <span>{statusMessage}</span>
        </div>

        <div className="command-console-log" aria-label="Command console history">
          {commandHistory.map((message) => (
            <article className={`command-console-message ${message.role}`} key={message.id}>
              <span>{message.role === "operator" ? "You" : "ENTRAL"}</span>
              <p>{message.content}</p>
            </article>
          ))}
        </div>

        <div className="command-chat-suggestions" aria-label="Example ENTRAL commands">
          {[
            "take me to ARIS",
            "show active Soldiers",
            "create a Shopify Soldier under ARIS",
            "show failing Operations",
            "return to ENTRAL",
            "show chain of command"
          ].map((example) => (
            <button key={example} type="button" onClick={() => executeCommand(example)}>
              {example}
            </button>
          ))}
        </div>

        <div className="command-chat-input-row">
          <label className="sr-only" htmlFor="entral-command-input">ENTRAL chat command</label>
          <input
            id="entral-command-input"
            disabled={isThinking}
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={isThinking ? "ENTRAL is thinking..." : 'Try: "Create a SEO Soldier under MERCURY"'}
          />
          <button type="submit" aria-label="Send command" disabled={isThinking}>
            <Send aria-hidden="true" size={18} />
          </button>
        </div>
      </form>

      <aside className={isPanelOpen ? "command-side-panel open" : "command-side-panel"} aria-label="Neuron side information panel" aria-hidden={!isPanelOpen}>
        {selectedNode ? (
          <>
            <header>
              <div className={`command-status-light status-${selectedNode.status}`} />
              <div>
                <p className="eyebrow">{groupMap.get(selectedNode.groupId)?.name}</p>
                <h2>{selectedNode.name}</h2>
                <span>{statusLabel(selectedNode.status)}</span>
              </div>
              <button className="sidebar-toggle-button" type="button" onClick={() => setIsPanelOpen(false)} aria-label="Close side information panel">
                <PanelRightClose aria-hidden="true" size={18} />
              </button>
            </header>

            {selectedNode.type === "core" ? (
              <section className="entral-identity" aria-label="ENTRAL core identity">
                <h3>Core identity</h3>
                <div>
                  {identityPillars.map(([label, description]) => (
                    <p key={label}>
                      <strong>{label}</strong>
                      <span>{description}</span>
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="command-node-brief" aria-label="Selected command node">
              <h3>Command position</h3>
              <div>
                <span><strong>{selectedNode.title}</strong> level</span>
                <span><strong>{selectedNode.health}%</strong> health</span>
                <span><strong>{selectedChildren.length}</strong> direct reports</span>
              </div>
              <p>{selectedNode.description ?? selectedNode.role}</p>
              {selectedParent ? <small>Reports to {selectedParent.name}</small> : <small>Root command authority</small>}
            </section>

            <section className="command-capabilities" aria-label="Agent capability architecture">
              <div className="section-title-row compact">
                {selectedNode.type === "core" ? <Network aria-hidden="true" size={17} /> : <Zap aria-hidden="true" size={17} />}
                <h3>{selectedNode.type === "core" ? "Business execution architecture" : "Assigned capabilities"}</h3>
              </div>
              <div className="command-capability-grid">
                {(selectedCapabilityCards.length > 0 ? selectedCapabilityCards : (selectedNode.tools ?? ["mock_command_bus"]).map((tool) => ({
                  description: "Mock tool connector reserved for future real execution wiring.",
                  id: tool,
                  label: tool.replace(/_/g, " "),
                  risk: "standard" as const
                }))).map((capability) => (
                  <article className={`command-capability-card risk-${capability.risk}`} key={capability.id}>
                    <div>
                      <strong>{capability.label}</strong>
                      <span>{capabilityRiskLabel(capability.risk)}</span>
                    </div>
                    <p>{capability.description}</p>
                  </article>
                ))}
              </div>
              {selectedNode.type === "core" ? (
                <p className="command-governance-note">
                  <ShieldCheck aria-hidden="true" size={16} />
                  <span>Restricted connectors stay policy-gated: ENTRAL can plan, delegate, and request approval, but external actions must pass governance, consent, and legal scope before execution.</span>
                </p>
              ) : null}
            </section>

            <section className="command-node-lists">
              <h3>Permissions & tools</h3>
              <div>
                {(selectedNode.permissions ?? ["read_context"]).map((permission) => <span key={permission}>{permission}</span>)}
                {(selectedNode.tools ?? ["mock_command_bus"]).map((tool) => <span key={tool}>{tool}</span>)}
              </div>
            </section>

            {selectedChildren.length > 0 ? (
              <section className="command-search-results">
                <h3>{selectedNode.commandType === "general" ? "Soldiers" : "Child Operations"}</h3>
                {selectedChildren.map((node) => (
                  <button key={node.id} type="button" onClick={() => focusCommandNode(node)}>
                    <span>{node.name}</span>
                    <small>{node.title} / {statusLabel(node.status)}</small>
                  </button>
                ))}
              </section>
            ) : null}

            <section>
              <h3>What is being displayed</h3>
              <p>{selectedNode.currentTask}</p>
            </section>
            <section>
              <h3>Reasoning</h3>
              <p>{selectedNode.reasoning}</p>
            </section>
            <section>
              <h3>Screen sharing preview</h3>
              <div className="screen-preview-placeholder">No active screen stream. Start sharing from chat when needed.</div>
            </section>
            <div className="command-metrics">
              <span><strong>{selectedNode.metrics.successRate}%</strong> success</span>
              <span><strong>{selectedNode.metrics.roi}</strong> ROI</span>
              <span><strong>${selectedNode.metrics.cost}</strong> cost</span>
            </div>
            <section>
              <h3>Live logs</h3>
              <div className="command-log-list">
                {selectedNode.logs.map((log, index) => <p key={`${log}-${index}`}>{log}</p>)}
              </div>
            </section>
            <section>
              <h3>Activity feed</h3>
              <div className="command-log-list">
                {activityEvents.map((event) => <p key={event.id}>{new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} / {event.message}</p>)}
              </div>
            </section>
            <div className="command-panel-actions">
              <Button type="button" variant="secondary" onClick={() => mutateNode(selectedNode.id, { status: selectedNode.status === "paused" ? "running" : "paused", logs: [`${selectedNode.status === "paused" ? "Resumed" : "Paused"} from side panel.`, ...selectedNode.logs] })}>
                {selectedNode.status === "paused" ? <Play aria-hidden="true" size={17} /> : <Pause aria-hidden="true" size={17} />}
                {selectedNode.status === "paused" ? "Resume" : "Pause"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => mutateNode(selectedNode.id, { logs: ["Reasoning trace refreshed.", ...selectedNode.logs] })}>
                <RotateCcw aria-hidden="true" size={17} />
                Refresh
              </Button>
              <Button type="button" variant="secondary" disabled={selectedNode.type === "core"} onClick={deleteSelectedNode}>
                <Trash2 aria-hidden="true" size={17} />
                Delete
              </Button>
            </div>
          </>
        ) : null}

        {search.trim() ? (
          <section className="command-search-results">
            <h3>Search matches</h3>
            {filteredVisibleNodes.map((node) => (
              <button key={node.id} type="button" onClick={() => {
                setSelectedNodeId(node.id);
                setIsPanelOpen(true);
              }}>
                <span>{node.name}</span>
                <small>{groupMap.get(node.groupId)?.name}</small>
              </button>
            ))}
          </section>
        ) : null}
      </aside>
    </main>
  );
}
