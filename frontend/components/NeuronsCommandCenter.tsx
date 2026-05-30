"use client";

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Activity, AlertTriangle, Bot, Crosshair, Eye, Info, LogOut, Maximize2, Menu, Mic, MicOff, Network, PanelRightClose, PanelRightOpen, Pause, Play, Plus, RotateCcw, Search, Send, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Volume2, X, Zap, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "./Button";
import { Logo } from "./Logo";
import { MerchOperationsPanel } from "./MerchOperationsPanel";
import { ProductApprovalQueue, type ProductApprovalAction } from "./ProductApprovalQueue";
import { ProductBatchGenerator, type ProductBatchFormState } from "./ProductBatchGenerator";
import { useTheme } from "./ThemeProvider";
import { useVoice } from "./VoiceProvider";
import { apiFetch } from "../lib/api";
import {
  commandSourceLabel,
  commandSpeakerFromPrefix,
  commandSpeakerFromNodeType,
  formatCommandReport,
  formatCommandTransmission,
  statusLineForTransmission,
  stripCommandSourcePrefix,
  type CommandReport,
  type CommandSpeaker
} from "../lib/command-communications";
import {
  commandGenerals,
  commandMarshals,
  commandStatusColor,
  commandStatusLabel,
  commandTaskStatusLabel,
  createCommandId,
  createDefaultCommandHierarchy,
  inferSoldierBlueprint,
  type CommandMemory,
  type CommandNode,
  type CommandReportRecord,
  type CommandStatus,
  type CommandTask,
  type CommandTaskStatus,
  type NodeType
} from "../lib/command-os";
import {
  canMoveCommandEntity,
  commandOSReducer,
  moveCommandEntity,
  removeCommandEntity,
  validateCommandOSState
} from "../lib/command-os-store";
import { createMerchLaunchWorkflowTasks, merchLaunchWorkflowSteps } from "../lib/merch-workflow";
import { type ClientMerchStore, type PodProduct, type ProductBatchGeneratorResponse } from "../lib/merch-store";
import { collectTranscript, getSpeechRecognitionConstructor, normalizeWakeWordCommand, type SpeechRecognitionLike } from "../lib/voice-command";
import { planCommandAction } from "../lib/command-action-plan";
import {
  buildArchiveAuthorizationSummary,
  buildBusinessTemplateAuthorizationSummary,
  buildCreateNodeAuthorizationSummary,
  buildMoveAuthorizationSummary,
  buildRemoveAuthorizationImpact,
  buildWorkflowAuthorizationSummary,
  commandTitleFor
} from "../lib/command-authorization";
import { buildCommandOSReport, buildCommandOSReportRecord } from "../lib/command-reports";
import { getContextCommandSuggestions, getInspectorSuggestedActions } from "../lib/command-suggestions";
import { creationBlockedTransmission, hierarchyNameFromCommandText, nextCommandPlaceholderName } from "../lib/command-creation";

type GraphStatus = CommandStatus;

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type GraphNode3D = Vec3 & {
  activeCommanders?: number;
  activeGenerals?: number;
  activeProjects?: string[];
  activeSoldiers?: number;
  activeStores?: string[];
  businessName?: string;
  capabilities?: string[];
  children?: string[];
  commandType: NodeType;
  createdAt: string;
  currentTask: string | null;
  description?: string;
  groupId: string;
  health: number;
  id: string;
  logs: string[];
  marshalType?: CommandNode["marshalType"];
  memory: CommandMemory;
  metrics: {
    cost: number;
    roi: number;
    successRate: number;
  };
  name: string;
  parentId: string | null;
  parentCommanderId?: string | null;
  parentCommanderName?: string | null;
  parentGeneralId?: string | null;
  parentGeneralName?: string | null;
  parentMarshalId?: string | null;
  parentMarshalName?: string | null;
  permissions?: string[];
  progress?: number;
  generalType?: CommandNode["generalType"];
  operationalArea?: string;
  executionRole?: string;
  reasoning: string;
  reportHistory?: CommandReportRecord[];
  reports?: CommandReportRecord[];
  role: string;
  status: GraphStatus;
  taskHistory: string[];
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
  tasks: CommandTask[];
};

type CameraState = {
  distance: number;
  pitch: number;
  target: Vec3;
  yaw: number;
};

type GesturePoint = {
  x: number;
  y: number;
};

type TouchGestureState = {
  lastCenter: GesturePoint | null;
  lastDistance: number | null;
  moved: boolean;
  pointers: Map<number, GesturePoint>;
  primaryPointerId: number | null;
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
  orbitPattern: OrbitPattern;
  orbitSpeed: number;
  particleSize: number;
  showRings: boolean;
  showTrails: boolean;
  trailLength: number;
};

type OrbitPattern = "flat" | "tilted" | "wave" | "vertical" | "helix";

type DashboardChatResponse = {
  conversationId: string;
  content: string;
};

type CommandConsoleMessage = {
  content: string;
  id: string;
  role: "operator" | "system";
  sourceLabel: string;
  sourceType: CommandSpeaker;
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

type SpacePoint = Vec3 & {
  alpha: number;
  color: string;
  drift: number;
  size: number;
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

type BusinessTemplate = {
  color: string;
  commanders: Array<{
    name: string;
    soldiers: string[];
  }>;
  description: string;
  generalType: NonNullable<CommandNode["generalType"]>;
  id: string;
  label: string;
  marshalName: string;
  marshalType: NonNullable<CommandNode["marshalType"]>;
  starterCommands: string[];
};

type BusinessWizardState = {
  audience: string;
  brandStyle: string;
  businessName: string;
  goal: string;
  industry: string;
  initialProducts: string;
  isOpen: boolean;
  notes: string;
  preferredMarshal: string;
  templateId: string;
};

type PendingAuthorization =
  | {
    createdAt: string;
    id: string;
    nodeName: string;
    parentId: string;
    nodeType: Exclude<NodeType, "emperor">;
    summary: string;
    type: "create-node";
  }
  | {
    createdAt: string;
    id: string;
    nodeId: string;
    parentId: string;
    summary: string;
    type: "move-node";
  }
  | {
    createdAt: string;
    id: string;
    nodeId: string;
    summary: string;
    type: "archive-node";
  }
  | {
    createdAt: string;
    id: string;
    summary: string;
    type: "create-workflow";
    workflowText: string;
  }
  | {
    createdAt: string;
    id: string;
    summary: string;
    templateId: string;
    type: "create-business-template";
      wizard: BusinessWizardState;
  };

type MobileCommandTab = "command" | "hierarchy" | "tasks" | "reports" | "more";

const defaultCamera: CameraState = {
  distance: 900,
  pitch: 0.34,
  target: { x: 0, y: 0, z: 0 },
  yaw: 0.82
};

const graphControlsKey = "entral-command-center-controls";

const orbitPatternOptions: Array<{ description: string; label: string; value: OrbitPattern }> = [
  { description: "Clean horizontal circular motion.", label: "Flat circle", value: "flat" },
  { description: "Classic layered command orbits.", label: "Tilted", value: "tilted" },
  { description: "Soft neural wave through each orbit.", label: "Wave", value: "wave" },
  { description: "Tall satellite-style polar loops.", label: "Vertical", value: "vertical" },
  { description: "Subtle corkscrew drift around the shell.", label: "Helix", value: "helix" }
];

const defaultGraphControls: GraphControlSettings = {
  cameraSensitivity: 1,
  glowIntensity: 1,
  gravity: 0.72,
  orbitPattern: "flat",
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

const businessTemplates: BusinessTemplate[] = [
  {
    color: "#00F0FF",
    commanders: [
      { name: "Client Intake Commander", soldiers: ["Business Profile Soldier", "Audience Soldier", "Offer Soldier", "Notes Soldier"] },
      { name: "Brand Commander", soldiers: ["Brand Voice Soldier", "Color Direction Soldier", "Style Direction Soldier", "Collection Theme Soldier"] },
      { name: "Design Commander", soldiers: ["Design Concept Soldier", "Prompt Soldier", "Typography Soldier", "Mockup Soldier", "Variation Soldier"] },
      { name: "Listing Commander", soldiers: ["Title Soldier", "Description Soldier", "Tags Soldier", "SEO Soldier", "Materials Soldier"] },
      { name: "Compliance Commander", soldiers: ["Trademark Risk Soldier", "Copyright Risk Soldier", "AI Disclosure Soldier", "Production Partner Soldier", "Prohibited Content Soldier"] },
      { name: "Store Launch Commander", soldiers: ["Etsy Setup Soldier", "Printify Setup Soldier", "Shopify Setup Soldier", "Product Publish Checklist Soldier", "Launch QA Soldier"] },
      { name: "Marketing Commander", soldiers: ["Instagram Caption Soldier", "TikTok Script Soldier", "Email Launch Soldier", "QR Flyer Soldier", "Promo Calendar Soldier"] },
      { name: "Reporting Commander", soldiers: ["Weekly Report Soldier", "Sales Report Soldier", "Product Performance Soldier", "Opportunity Report Soldier"] }
    ],
    description: "Best for a done-for-you POD or client merch store with approvals before publishing.",
    generalType: "POD Store",
    id: "pod-merch-store",
    label: "POD / Merch Business",
    marshalName: "Merch Marshal",
    marshalType: "Merch Theater",
    starterCommands: ["define target audience", "generate product ideas", "create design concepts", "review compliance", "build launch package"]
  },
  {
    color: "#00BFFF",
    commanders: [
      { name: "Client Intake Commander", soldiers: ["Business Profile Soldier", "Offer Soldier", "Discovery Notes Soldier"] },
      { name: "Design Commander", soldiers: ["Wireframe Soldier", "Visual Direction Soldier", "Design QA Soldier"] },
      { name: "Content Commander", soldiers: ["Homepage Copy Soldier", "Service Page Copy Soldier", "Call To Action Soldier"] },
      { name: "SEO Commander", soldiers: ["Keyword Soldier", "Local SEO Soldier", "Metadata Soldier"] },
      { name: "Development Commander", soldiers: ["Frontend Soldier", "Integration Soldier", "Responsive QA Soldier"] },
      { name: "Deployment Commander", soldiers: ["Launch Checklist Soldier", "DNS Soldier", "Post Launch QA Soldier"] },
      { name: "Client Success Commander", soldiers: ["Update Report Soldier", "Request Tracker Soldier"] },
      { name: "Reporting Commander", soldiers: ["Weekly Report Soldier", "Opportunity Report Soldier"] }
    ],
    description: "Best for building and managing websites, SEO work, client delivery, and recurring updates.",
    generalType: "Agency Client",
    id: "website-agency",
    label: "Website Agency",
    marshalName: "Website Marshal",
    marshalType: "Website Theater",
    starterCommands: ["define service offer", "create homepage outline", "draft SEO plan", "prepare client intake checklist", "generate website readiness report"]
  },
  {
    color: "#FF00FF",
    commanders: [
      { name: "Research Commander", soldiers: ["Trend Soldier", "Audience Signal Soldier", "Competitor Content Soldier"] },
      { name: "Script Commander", soldiers: ["Hook Soldier", "Short Script Soldier", "Long Script Soldier"] },
      { name: "Short Form Commander", soldiers: ["Clip Idea Soldier", "Caption Soldier", "Hashtag Soldier"] },
      { name: "Long Form Commander", soldiers: ["Outline Soldier", "Segment Soldier", "Description Soldier"] },
      { name: "SEO Commander", soldiers: ["Keyword Soldier", "Topic Cluster Soldier", "Metadata Soldier"] },
      { name: "Publishing Commander", soldiers: ["Platform Checklist Soldier", "Scheduling Soldier", "Post QA Soldier"] },
      { name: "Analytics Commander", soldiers: ["Engagement Report Soldier", "Opportunity Soldier"] },
      { name: "Reporting Commander", soldiers: ["Weekly Report Soldier", "Client Update Soldier"] }
    ],
    description: "Best for content engines, creator operations, social campaigns, and recurring creative output.",
    generalType: "Agency Client",
    id: "content-agency",
    label: "Content Agency",
    marshalName: "Content Marshal",
    marshalType: "Marketing Theater",
    starterCommands: ["define content pillars", "create 14 day calendar", "draft first scripts", "prepare publishing checklist", "generate content readiness report"]
  },
  {
    color: "#39FF14",
    commanders: [
      { name: "Product Research Commander", soldiers: ["Product Opportunity Soldier", "Audience Fit Soldier", "Trend Soldier"] },
      { name: "Supplier Commander", soldiers: ["Supplier Cost Soldier", "Shipping Soldier", "Inventory Notes Soldier"] },
      { name: "Storefront Commander", soldiers: ["Catalog Soldier", "Checkout QA Soldier", "Theme QA Soldier"] },
      { name: "Listing Commander", soldiers: ["Title Soldier", "Description Soldier", "SEO Soldier"] },
      { name: "Marketing Commander", soldiers: ["Ad Angle Soldier", "Email Soldier", "Social Caption Soldier"] },
      { name: "Fulfillment Commander", soldiers: ["Order Flow Soldier", "Returns Soldier", "Customer Notice Soldier"] },
      { name: "Customer Support Commander", soldiers: ["FAQ Soldier", "Support Response Soldier"] },
      { name: "Reporting Commander", soldiers: ["Sales Report Soldier", "Profit Report Soldier"] }
    ],
    description: "Best for product brands, online stores, offer testing, pricing, fulfillment notes, and launch reporting.",
    generalType: "Brand",
    id: "ecommerce-brand",
    label: "E-commerce Brand",
    marshalName: "E-commerce Marshal",
    marshalType: "Marketing Theater",
    starterCommands: ["define first offer", "draft product collection", "calculate margin targets", "prepare launch checklist", "generate store readiness report"]
  },
  {
    color: "#9B5CFF",
    commanders: [
      { name: "Product Commander", soldiers: ["Requirements Soldier", "Roadmap Soldier", "User Story Soldier"] },
      { name: "Engineering Commander", soldiers: ["Frontend Soldier", "Backend Soldier", "Integration Soldier"] },
      { name: "UX Commander", soldiers: ["User Flow Soldier", "Prototype Soldier", "Usability Notes Soldier"] },
      { name: "Marketing Commander", soldiers: ["Positioning Soldier", "Landing Page Soldier", "Waitlist Soldier"] },
      { name: "Sales Commander", soldiers: ["Lead Notes Soldier", "Demo Script Soldier"] },
      { name: "Support Commander", soldiers: ["Docs Soldier", "Feedback Soldier"] },
      { name: "Analytics Commander", soldiers: ["Activation Soldier", "Retention Soldier", "Metric Report Soldier"] },
      { name: "Reporting Commander", soldiers: ["Sprint Report Soldier", "Risk Report Soldier"] }
    ],
    description: "Best for SaaS ideas, apps, internal tools, MVP planning, development, QA, and launch tracking.",
    generalType: "Internal Business",
    id: "saas-startup",
    label: "SaaS Startup",
    marshalName: "SaaS Marshal",
    marshalType: "Automation Theater",
    starterCommands: ["define MVP scope", "create roadmap", "draft landing page", "prepare QA checklist", "generate product readiness report"]
  },
  {
    color: "#39FF14",
    commanders: [
      { name: "Lead Intake Commander", soldiers: ["Offer Soldier", "Contact Form Soldier", "CRM Notes Soldier"] },
      { name: "Website Commander", soldiers: ["Page Structure Soldier", "Copy Soldier", "QA Soldier"] },
      { name: "Local SEO Commander", soldiers: ["Keyword Soldier", "Map Listing Soldier", "Content Brief Soldier"] },
      { name: "Reviews Commander", soldiers: ["Review Request Soldier", "Reputation Notes Soldier"] },
      { name: "Scheduling Commander", soldiers: ["Booking Flow Soldier", "Calendar Notes Soldier"] },
      { name: "Customer Follow-Up Commander", soldiers: ["Follow Up Soldier", "Retention Offer Soldier"] },
      { name: "Reporting Commander", soldiers: ["Weekly Report Soldier", "Opportunity Report Soldier"] }
    ],
    description: "Best for local service clients that need a website, lead flow, SEO, and reporting.",
    generalType: "Client Business",
    id: "local-service-business",
    label: "Local Service Business",
    marshalName: "Local Business Marshal",
    marshalType: "Client Operations Theater",
    starterCommands: ["define service area", "draft homepage outline", "create lead intake checklist", "draft local SEO plan", "generate client update report"]
  },
  {
    color: "#FF7AFF",
    commanders: [
      { name: "Planning Commander", soldiers: ["Objective Soldier", "Scope Soldier"] },
      { name: "Operations Commander", soldiers: ["Checklist Soldier", "Execution Notes Soldier"] },
      { name: "Reporting Commander", soldiers: ["Status Report Soldier", "Opportunity Report Soldier"] }
    ],
    description: "Best when the business does not fit a preset yet and the user wants a minimal editable structure.",
    generalType: "Other",
    id: "custom-blank-structure",
    label: "Custom Blank Structure",
    marshalName: "Client Operations Marshal",
    marshalType: "Client Operations Theater",
    starterCommands: ["define objective", "add operating departments", "add execution units", "create first task", "generate first status report"]
  }
];

const defaultBusinessWizard: BusinessWizardState = {
  audience: "",
  brandStyle: "",
  businessName: "",
  goal: "",
  industry: "",
  initialProducts: "",
  isOpen: false,
  notes: "",
  preferredMarshal: "",
  templateId: businessTemplates[0].id
};

function readStoredGraphControls(): GraphControlSettings {
  if (typeof window === "undefined") {
    return defaultGraphControls;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(graphControlsKey) ?? "{}") as Partial<GraphControlSettings>;
    const storedOrbitPattern = parsed.orbitPattern;
    const orbitPattern: OrbitPattern = storedOrbitPattern && orbitPatternOptions.some((option) => option.value === storedOrbitPattern)
      ? storedOrbitPattern
      : defaultGraphControls.orbitPattern;

    return {
      cameraSensitivity: clampNumber(parsed.cameraSensitivity, 0.45, 1.8, defaultGraphControls.cameraSensitivity),
      glowIntensity: clampNumber(parsed.glowIntensity, 0.45, 1.85, defaultGraphControls.glowIntensity),
      gravity: clampNumber(parsed.gravity, 0.2, 1.35, defaultGraphControls.gravity),
      orbitPattern,
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

function createDeepSpacePoints(count: number, layer: number): SpacePoint[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = `space-${layer}-${index}`;
    const angle = stableNumber(seed, 1) * Math.PI * 2;
    const elevation = (stableNumber(seed, 2) - 0.5) * Math.PI;
    const radius = 950 + layer * 760 + stableNumber(seed, 3) * (780 + layer * 420);
    const warmth = stableNumber(seed, 4);
    const color = warmth > 0.92 ? "#dffbff" : warmth > 0.72 ? "#86f8ff" : warmth > 0.5 ? "#b8c7ff" : "#477a92";

    return {
      alpha: 0.12 + stableNumber(seed, 5) * (0.28 - layer * 0.028),
      color,
      drift: stableNumber(seed, 6) * Math.PI * 2,
      size: 2.1 + stableNumber(seed, 7) * (layer === 0 ? 5.2 : 3.5),
      x: Math.cos(angle) * Math.cos(elevation) * radius,
      y: Math.sin(elevation) * radius * 0.72,
      z: Math.sin(angle) * Math.cos(elevation) * radius
    };
  });
}

function createSpaceFogPoints(): SpacePoint[] {
  const colors = ["#00f0ff", "#475cff", "#ff00ff", "#123e58", "#39ff14"];

  return Array.from({ length: 18 }, (_, index) => {
    const seed = `fog-${index}`;
    const angle = stableNumber(seed, 1) * Math.PI * 2;
    const elevation = (stableNumber(seed, 2) - 0.5) * 0.9;
    const radius = 980 + stableNumber(seed, 3) * 1650;

    return {
      alpha: 0.018 + stableNumber(seed, 4) * 0.038,
      color: colors[index % colors.length],
      drift: stableNumber(seed, 5) * Math.PI * 2,
      size: 180 + stableNumber(seed, 6) * 320,
      x: Math.cos(angle) * radius,
      y: Math.sin(elevation) * radius,
      z: Math.sin(angle) * radius
    };
  });
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

function parentMarshalId(node: CommandNode, allNodes: CommandNode[]) {
  const firstMarshalId = allNodes.find((candidate) => candidate.type === "marshal")?.id ?? "core";

  if (node.type === "marshal") return node.id;
  if (node.type === "general") return node.parentId ?? firstMarshalId;
  if (node.type === "commander") {
    const parentGeneral = allNodes.find((candidate) => candidate.id === node.parentId);
    return parentGeneral?.parentId ?? firstMarshalId;
  }
  if (node.type === "soldier") {
    const parentCommander = allNodes.find((candidate) => candidate.id === node.parentId);
    const parentGeneral = allNodes.find((candidate) => candidate.id === parentCommander?.parentId);
    return parentGeneral?.parentId ?? firstMarshalId;
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
  const groupId = node.type === "emperor" ? "core" : parentMarshalId(node, allNodes);
  const offset = stableNumber(node.id, 11) * Math.PI * 2;
  const radius = node.type === "marshal" ? 280 : node.type === "general" ? 360 : node.type === "commander" ? 450 : 530;

  return {
    activeCommanders: node.activeCommanders,
    activeGenerals: node.activeGenerals,
    activeProjects: node.activeProjects,
    activeSoldiers: node.activeSoldiers,
    activeStores: node.activeStores,
    businessName: node.businessName,
    capabilities: node.tools ?? [],
    children: node.children ?? [],
    commandType: node.type,
    createdAt: node.createdAt,
    currentTask: node.currentTask,
    description: node.description,
    groupId,
    health: node.health,
    id: node.id,
    logs: node.logs ?? [],
    marshalType: node.marshalType,
    memory: node.memory,
    metrics: {
      cost: metricNumber(node.metrics?.cost, 0),
      roi: metricNumber(node.metrics?.roi, node.health),
      successRate: metricNumber(node.metrics?.successRate, node.health)
    },
    name: node.name,
    generalType: node.generalType,
    operationalArea: node.operationalArea,
    parentId: node.parentId,
    parentCommanderId: node.parentCommanderId,
    parentCommanderName: node.parentCommanderName,
    parentGeneralId: node.parentGeneralId,
    parentGeneralName: node.parentGeneralName,
    parentMarshalId: node.parentMarshalId,
    parentMarshalName: node.parentMarshalName,
    permissions: node.permissions,
    progress: node.progress,
    executionRole: node.executionRole,
    reasoning: node.description ?? node.role,
    reportHistory: node.reportHistory ?? [],
    reports: node.reports ?? [],
    role: node.role,
    status: node.status,
    taskHistory: node.taskHistory,
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
    { color: "#00F0FF", id: "core", name: "ENTRAL Core" },
    ...commandNodes
      .filter((node) => node.type === "marshal")
      .map((marshal, index) => ({
        color: commandMarshals.find((item) => item.id === marshal.id)?.color ?? ["#00F0FF", "#FF00FF", "#39FF14", "#9B5CFF", "#00BFFF"][index % 5],
        id: marshal.id,
        name: marshal.name
      }))
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
    nodes: commandNodes.map((node) => ({ ...graphNodeFromCommandNode(node, commandNodes), vx: 0, vy: 0, vz: 0 })),
    tasks: []
  };
}

function createInitialState(): GraphState3D {
  return graphStateFromCommandNodes(createDefaultCommandHierarchy());
}

const legacyCommandStateKey = "entral-command-os-state-v1";
const previousCommandStateKey = "entral-command-os-state-v2";
const commandStateKey = "entral-command-os-state-v3";

function normalizeCommandStatus(status: unknown): GraphStatus {
  if (status === "working" || status === "thinking" || status === "waiting" || status === "error" || status === "offline" || status === "idle") {
    return status;
  }

  if (status === "running" || status === "success") return "working";
  if (status === "warning" || status === "awaiting_approval") return "waiting";
  if (status === "paused") return "offline";
  return "idle";
}

function normalizeTaskStatus(status: unknown): CommandTaskStatus {
  if (status === "pending" || status === "assigned" || status === "running" || status === "completed" || status === "failed") {
    return status;
  }

  return "pending";
}

function defaultMemoryForNode(node: Pick<GraphNode3D, "name" | "role">): CommandMemory {
  return {
    instructions: `Operate as ${node.name}. Preserve context, accept delegated work, and report status upward.`,
    notes: ["Created in local Command OS memory."],
    recentTasks: [],
    role: node.role,
    taskResults: []
  };
}

function normalizeGraphState(input: Partial<GraphState3D> | null | undefined): GraphState3D {
  const fallback = createInitialState();
  const rawNodes = Array.isArray(input?.nodes) && input.nodes.length > 0 ? input.nodes : fallback.nodes;
  const nodes = rawNodes.map((rawNode) => {
    const node = rawNode as Partial<GraphNode3D>;
    const id = typeof node.id === "string" ? node.id : createCommandId(node.name ?? "node", "node");
    const commandType = node.commandType ?? (node.type === "core" ? "emperor" : "soldier");
    const role = node.role ?? `${commandType} role`;
    const normalized: GraphNode3D = {
      activeCommanders: typeof node.activeCommanders === "number" ? node.activeCommanders : undefined,
      activeGenerals: typeof node.activeGenerals === "number" ? node.activeGenerals : undefined,
      activeProjects: Array.isArray(node.activeProjects) ? node.activeProjects : undefined,
      activeSoldiers: typeof node.activeSoldiers === "number" ? node.activeSoldiers : undefined,
      activeStores: Array.isArray(node.activeStores) ? node.activeStores : undefined,
      businessName: typeof node.businessName === "string" ? node.businessName : undefined,
      capabilities: node.capabilities ?? node.tools ?? [],
      children: Array.isArray(node.children) ? node.children : [],
      commandType,
      createdAt: typeof node.createdAt === "string" ? node.createdAt : new Date().toISOString(),
      currentTask: typeof node.currentTask === "string" ? node.currentTask : null,
      description: node.description,
      groupId: typeof node.groupId === "string" ? node.groupId : commandType === "emperor" ? "core" : "merch-marshal",
      health: typeof node.health === "number" ? node.health : 100,
      id,
      logs: Array.isArray(node.logs) ? node.logs : [],
      marshalType: node.marshalType,
      memory: node.memory && typeof node.memory === "object"
        ? {
          instructions: typeof node.memory.instructions === "string" ? node.memory.instructions : `Operate as ${node.name ?? id}.`,
          notes: Array.isArray(node.memory.notes) ? node.memory.notes : [],
          recentTasks: Array.isArray(node.memory.recentTasks) ? node.memory.recentTasks : [],
          role: typeof node.memory.role === "string" ? node.memory.role : role,
          taskResults: Array.isArray(node.memory.taskResults) ? node.memory.taskResults : []
        }
        : defaultMemoryForNode({ name: node.name ?? id, role }),
      metrics: {
        cost: metricNumber(node.metrics?.cost, 0),
        roi: metricNumber(node.metrics?.roi, typeof node.health === "number" ? node.health : 100),
        successRate: metricNumber(node.metrics?.successRate, typeof node.health === "number" ? node.health : 100)
      },
      name: node.name ?? id,
      generalType: node.generalType,
      operationalArea: node.operationalArea,
      parentId: typeof node.parentId === "string" ? node.parentId : null,
      parentCommanderId: typeof node.parentCommanderId === "string" ? node.parentCommanderId : null,
      parentCommanderName: typeof node.parentCommanderName === "string" ? node.parentCommanderName : null,
      parentGeneralId: typeof node.parentGeneralId === "string" ? node.parentGeneralId : null,
      parentGeneralName: typeof node.parentGeneralName === "string" ? node.parentGeneralName : null,
      parentMarshalId: typeof node.parentMarshalId === "string" ? node.parentMarshalId : null,
      parentMarshalName: typeof node.parentMarshalName === "string" ? node.parentMarshalName : null,
      permissions: node.permissions,
      progress: typeof node.progress === "number" ? node.progress : 0,
      executionRole: node.executionRole,
      reasoning: node.reasoning ?? node.description ?? role,
      reportHistory: Array.isArray(node.reportHistory) ? node.reportHistory : [],
      reports: Array.isArray(node.reports) ? node.reports : [],
      role,
      status: normalizeCommandStatus(node.status),
      taskHistory: Array.isArray(node.taskHistory) ? node.taskHistory : [],
      title: node.title ?? (commandType === "emperor" ? "Central Command" : commandType[0].toUpperCase() + commandType.slice(1)),
      tools: node.tools,
      type: commandType === "emperor" ? "core" : "agent",
      vx: 0,
      vy: 0,
      vz: 0,
      x: typeof node.x === "number" ? node.x : 0,
      y: typeof node.y === "number" ? node.y : 0,
      z: typeof node.z === "number" ? node.z : 0
    };

    return normalized;
  });
  const groups = Array.isArray(input?.groups) && input.groups.length > 0 ? input.groups : fallback.groups;
  const edges = Array.isArray(input?.edges) && input.edges.length > 0
    ? input.edges
    : nodes.filter((node) => node.parentId).map((node) => ({
      id: `e-${node.parentId}-${node.id}`,
      label: `${node.commandType} link`,
      source: node.parentId as string,
      target: node.id
    }));
  const tasks = Array.isArray(input?.tasks) ? input.tasks.map((task) => ({
    assignedEntityId: typeof task.assignedEntityId === "string" ? task.assignedEntityId : null,
    assignedEntityType: task.assignedEntityType ?? null,
    commanderId: typeof task.commanderId === "string" ? task.commanderId : null,
    commanderName: typeof task.commanderName === "string" ? task.commanderName : null,
    completedAt: typeof task.completedAt === "string" ? task.completedAt : null,
    createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString(),
    delegationPath: Array.isArray(task.delegationPath) ? task.delegationPath : [],
    description: typeof task.description === "string" ? task.description : "No task description provided.",
    generalId: typeof task.generalId === "string" ? task.generalId : null,
    generalName: typeof task.generalName === "string" ? task.generalName : null,
    history: Array.isArray(task.history) ? task.history : [],
    id: typeof task.id === "string" ? task.id : `task-${Date.now().toString(36)}`,
    marshalId: typeof task.marshalId === "string" ? task.marshalId : null,
    marshalName: typeof task.marshalName === "string" ? task.marshalName : null,
    name: typeof task.name === "string" ? task.name : "Untitled task",
    reportHistory: Array.isArray(task.reportHistory) ? task.reportHistory : [],
    soldierId: typeof task.soldierId === "string" ? task.soldierId : null,
    soldierName: typeof task.soldierName === "string" ? task.soldierName : null,
    status: normalizeTaskStatus(task.status),
    updatedAt: typeof task.updatedAt === "string" ? task.updatedAt : new Date().toISOString()
  })) : [];

  return { edges, groups, nodes, tasks };
}

function hasLegacyMockEntities(state: Partial<GraphState3D> | null | undefined) {
  return Array.isArray(state?.nodes) && state.nodes.some((node) => {
    const candidate = node as Partial<GraphNode3D>;
    return candidate.id?.startsWith("mock-") || /^Mock\s+(General|Commander|Soldier)\b/i.test(candidate.name ?? "");
  });
}

function readStoredCommandState(): GraphState3D {
  const fallback = createInitialState();

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(commandStateKey)
      ?? window.localStorage.getItem(previousCommandStateKey)
      ?? window.localStorage.getItem(legacyCommandStateKey);
    const parsed = JSON.parse(storedValue ?? "null") as Partial<GraphState3D> | null;

    if (hasLegacyMockEntities(parsed)) {
      window.localStorage.removeItem(commandStateKey);
      return fallback;
    }

    if (parsed && !window.localStorage.getItem("entral-command-os-pre-marshal-backup")) {
      window.localStorage.setItem("entral-command-os-pre-marshal-backup", JSON.stringify(parsed));
    }

    const stored = normalizeGraphState(parsed);
    return validateCommandOSState(stored, { fallback, recoverInterruptedTasks: true });
  } catch {
    return fallback;
  }
}

function statusLabel(status: GraphStatus) {
  return commandStatusLabel(status);
}

function taskStatusLabel(status: CommandTaskStatus) {
  return commandTaskStatusLabel(status);
}

function defaultProductBatchForm(store?: ClientMerchStore | null): ProductBatchFormState {
  return {
    audience: store?.audience ?? "",
    priceMax: 48,
    priceMin: 24,
    productCount: 5,
    productTypes: store?.productTypes.join(", ") ?? "T-shirts, Hoodies, Stickers",
    riskTolerance: "Medium",
    storeId: store?.id ?? "",
    styleDirection: store?.brandStyle ?? ""
  };
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

function getCameraBillboardAxes(camera: CameraState) {
  const clampedPitch = Math.max(-1.25, Math.min(1.25, camera.pitch));
  const eye = {
    x: camera.target.x + Math.sin(camera.yaw) * Math.cos(clampedPitch) * camera.distance,
    y: camera.target.y + Math.sin(clampedPitch) * camera.distance,
    z: camera.target.z + Math.cos(camera.yaw) * Math.cos(clampedPitch) * camera.distance
  };
  const zAxis = normalize(sub(eye, camera.target));
  const right = normalize(cross({ x: 0, y: 1, z: 0 }, zAxis));
  const up = cross(zAxis, right);

  return { right, up };
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

function orbitPoint(meta: OrbitMeta, angle: number, pattern: OrbitPattern = "flat"): Vec3 {
  const waveHeight = Math.min(34 + meta.radius * 0.035, 58);
  let point: Vec3;

  switch (pattern) {
    case "tilted":
      point = {
        x: Math.cos(angle) * meta.radius,
        y: Math.sin(angle * 2) * waveHeight,
        z: Math.sin(angle) * meta.radius
      };
      point = rotateX(point, meta.tiltX);
      point = rotateY(point, meta.tiltY);
      return rotateZ(point, meta.tiltZ);
    case "wave":
      return {
        x: Math.cos(angle) * meta.radius,
        y: Math.sin(angle * 2 + meta.phase) * waveHeight,
        z: Math.sin(angle) * meta.radius
      };
    case "vertical":
      point = {
        x: Math.cos(angle) * meta.radius,
        y: Math.sin(angle) * meta.radius * 0.58,
        z: Math.sin(angle) * meta.radius * 0.18
      };
      return rotateY(point, meta.tiltY * 0.65);
    case "helix": {
      const pulse = 1 + Math.sin(angle * 3 + meta.phase) * 0.075;
      return {
        x: Math.cos(angle) * meta.radius * pulse,
        y: Math.sin(angle * 2 + meta.phase) * Math.min(meta.radius * 0.18, 84),
        z: Math.sin(angle) * meta.radius * pulse
      };
    }
    case "flat":
    default:
      return {
        x: Math.cos(angle) * meta.radius,
        y: 0,
        z: Math.sin(angle) * meta.radius
      };
  }
}

function matchesQuery(node: GraphNode3D, query: string, group?: GraphGroup) {
  const text = `${node.name} ${node.status} ${node.currentTask ?? ""} ${node.reasoning} ${group?.name ?? ""}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function commandTextToGroup(text: string, groups: GraphGroup[]) {
  const normalized = text.toLowerCase();
  return groups.find((group) => normalized.includes(group.name.toLowerCase()) || normalized.includes(group.id.toLowerCase()));
}

function commandTextToOrbitPattern(text: string): OrbitPattern | null {
  const normalized = text.toLowerCase();

  if (normalized.includes("flat") || normalized.includes("clean circle") || normalized.includes("circular")) return "flat";
  if (normalized.includes("tilted") || normalized.includes("classic atom")) return "tilted";
  if (normalized.includes("wave") || normalized.includes("neural wave")) return "wave";
  if (normalized.includes("vertical") || normalized.includes("polar")) return "vertical";
  if (normalized.includes("helix") || normalized.includes("corkscrew") || normalized.includes("spiral")) return "helix";
  return null;
}

function commandTextToNode(text: string, nodes: GraphNode3D[]) {
  const normalized = text.toLowerCase();
  const ignoredWords = new Set(["agent", "bot", "the", "to", "for", "show", "zoom", "focus", "open", "select", "monitor", "mock"]);
  const placeholderMatch = /\b(marshal|general|commander|soldier)\s+(\d+)\b/.exec(normalized);

  if (placeholderMatch) {
    const [, type, number] = placeholderMatch;
    const placeholderNode = nodes.find((node) => node.commandType === type && node.name.toLowerCase().endsWith(` ${number}`));

    if (placeholderNode) return placeholderNode;
  }

  return nodes.find((node) => normalized.includes(node.name.toLowerCase()) || normalized.includes(node.id.toLowerCase()))
    ?? nodes.find((node) => {
      const words = node.name.toLowerCase().split(/\s+/).filter((word) => word.length > 2 && !ignoredWords.has(word));
      return words.length > 0 && words.every((word) => normalized.includes(word));
    })
    ?? null;
}

function parentNodeFromMoveCommand(text: string, nodes: GraphNode3D[]) {
  const normalized = text.toLowerCase();
  const parentMatch = /\b(?:under|to|into)\s+(marshal|general|commander)\s+(\d+)\b/.exec(normalized);

  if (parentMatch) {
    const [, type, number] = parentMatch;
    return nodes.find((node) => node.commandType === type && node.name.toLowerCase().endsWith(` ${number}`)) ?? null;
  }

  const underIndex = normalized.search(/\b(under|to|into)\b/);
  if (underIndex >= 0) {
    const parentText = text.slice(underIndex);
    return commandTextToNode(parentText, nodes.filter((node) => node.commandType === "marshal" || node.commandType === "general" || node.commandType === "commander"));
  }

  return null;
}

function descendantIdsFromNodes(nodeId: string, nodes: GraphNode3D[]) {
  const descendants: string[] = [];
  const stack = nodes.filter((node) => node.parentId === nodeId).map((node) => node.id);

  while (stack.length > 0) {
    const id = stack.pop() as string;
    descendants.push(id);
    stack.push(...nodes.filter((node) => node.parentId === id).map((node) => node.id));
  }

  return descendants;
}

function visibleNodeIdsForSelection(selectedId: string | null, nodes: GraphNode3D[]) {
  const selected = selectedId ? nodes.find((node) => node.id === selectedId) : null;

  if (!selected || selected.commandType === "emperor") {
    return new Set(nodes.map((node) => node.id));
  }

  if (selected.commandType === "soldier") {
    return new Set([selected.id, selected.parentId].filter((id): id is string => Boolean(id)));
  }

  return new Set([selected.id, ...descendantIdsFromNodes(selected.id, nodes)]);
}

function nodeVisualSize(node: GraphNode3D) {
  if (node.commandType === "emperor") return 118;
  if (node.commandType === "marshal") return 58;
  if (node.commandType === "general") return 42;
  if (node.commandType === "commander") return 28;
  if (node.commandType === "soldier") return 16;
  return node.type === "core" ? 82 : 24;
}

function nodeLevelAccent(node: GraphNode3D) {
  if (node.commandType === "emperor") return "#f8ffff";
  if (node.commandType === "marshal") return "#FF00FF";
  if (node.commandType === "general") return "#ffffff";
  if (node.commandType === "commander") return "#00BFFF";
  return "#39FF14";
}

function billboardPoint(center: Vec3, axes: ReturnType<typeof getCameraBillboardAxes>, x: number, y: number): Vec3 {
  return addVec(center, addVec(scaleVec(axes.right, x), scaleVec(axes.up, y)));
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

function midpoint(points: GesturePoint[]) {
  const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  const count = Math.max(points.length, 1);

  return {
    x: total.x / count,
    y: total.y / count
  };
}

function pointDistance(first: GesturePoint, second: GesturePoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function NeuronsCommandCenter({ user, onLogout }: { onLogout: () => void; user?: DashboardUser | null }) {
  const { settings, updateSettings } = useTheme();
  const { isSpeaking, settings: voiceSettings, speak, stopSpeaking } = useVoice();
  const [graph, dispatchGraph] = useReducer(commandOSReducer<GraphNode3D>, undefined as unknown as GraphState3D, readStoredCommandState);
  const graphRef = useRef(graph);
  const setGraph = useCallback<React.Dispatch<React.SetStateAction<GraphState3D>>>((update) => {
    const current = graphRef.current;
    const next = typeof update === "function"
      ? (update as (value: GraphState3D) => GraphState3D)(current)
      : update;

    dispatchGraph({
      fallback: createInitialState(),
      state: next,
      type: "replace"
    });
  }, []);
  const [selectedNodeId, setSelectedNodeId] = useState("entral");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [search, setSearch] = useState("");
  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandConsoleMessage[]>([
    {
      content: formatCommandReport({
        analysis: "No command structures are loaded by default. Marshals, business Generals, Commanders, and Soldiers will be created only when directed by the operator.",
        nextActions: ["Type help.", "Create your first Marshal.", "Open guided business setup.", "Start tutorial."],
        recommendation: "Use ENTRAL as the strategic authority for navigation, delegation, reports, and graph control.",
        situation: "ENTRAL Command System online. No command structures detected. Awaiting directives."
      }),
      id: "system-boot",
      role: "system",
      sourceLabel: commandSourceLabel("emperor"),
      sourceType: "emperor"
    }
  ]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([
    {
      id: "activity-boot",
      message: "ENTRAL online. Awaiting first command structure.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [dashboardConversationId, setDashboardConversationId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Voice command channel ready.");
  const [statusMessage, setStatusMessage] = useState("ENTRAL Command System online. Awaiting directives.");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<GraphStatus[] | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isCommandConsoleOpen, setIsCommandConsoleOpen] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isWebGlReady, setIsWebGlReady] = useState(true);
  const [businessWizard, setBusinessWizard] = useState<BusinessWizardState>(defaultBusinessWizard);
  const [pendingAuthorization, setPendingAuthorization] = useState<PendingAuthorization | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileCommandTab>("command");
  const [graphControls, setGraphControls] = useState<GraphControlSettings>(() => readStoredGraphControls());
  const [merchStores, setMerchStores] = useState<ClientMerchStore[]>([]);
  const [productBatchForm, setProductBatchForm] = useState<ProductBatchFormState>(() => defaultProductBatchForm());
  const [productBatchResults, setProductBatchResults] = useState<PodProduct[]>([]);
  const [productBatchWarnings, setProductBatchWarnings] = useState<string[]>([]);
  const [approvalQueueProducts, setApprovalQueueProducts] = useState<PodProduct[]>([]);
  const [isLoadingMerchStores, setIsLoadingMerchStores] = useState(false);
  const [isGeneratingProductBatch, setIsGeneratingProductBatch] = useState(false);
  const [isLoadingApprovalQueue, setIsLoadingApprovalQueue] = useState(false);
  const [updatingApprovalProductIds, setUpdatingApprovalProductIds] = useState<Set<string>>(() => new Set());
  const [lockedNodeId, setLockedNodeId] = useState<string | null>(null);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphControlsRef = useRef(graphControls);
  const lockedNodeIdRef = useRef<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const selectedRef = useRef("entral");
  const searchRef = useRef("");
  const activeGroupRef = useRef<string | null>(null);
  const activeStatusFilterRef = useRef<GraphStatus[] | null>(null);
  const focusModeRef = useRef(false);
  const cameraRef = useRef<CameraState>({ ...defaultCamera, target: { ...defaultCamera.target } });
  const desiredCameraRef = useRef<CameraState>({ ...defaultCamera, target: { ...defaultCamera.target } });
  const matrixRef = useRef<Matrix4 | null>(null);
  const dragRef = useRef<{ button: number; lastX: number; lastY: number; mode: "orbit" | "pan"; moved: boolean } | null>(null);
  const touchGestureRef = useRef<TouchGestureState>({
    lastCenter: null,
    lastDistance: null,
    moved: false,
    pointers: new Map(),
    primaryPointerId: null
  });
  const lastFrameTimeRef = useRef<number | null>(null);
  const motionRef = useRef<Map<string, NodeMotion>>(new Map());
  const previousBodyOverflowRef = useRef<string | null>(null);
  const reducedMotionRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const deepSpaceRef = useRef<SpacePoint[]>([
    ...createDeepSpacePoints(140, 0),
    ...createDeepSpacePoints(170, 1),
    ...createDeepSpacePoints(190, 2)
  ]);
  const spaceFogRef = useRef<SpacePoint[]>(createSpaceFogPoints());
  const timeRef = useRef(0);
  const taskTimersRef = useRef<number[]>([]);

  const groupMap = useMemo(() => new Map(graph.groups.map((group) => [group.id, group])), [graph.groups]);
  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const selectedNode = nodeMap.get(selectedNodeId) ?? nodeMap.get("entral") ?? null;
  const visibleNodes = graph.nodes.filter((node) => node.type === "core" || !groupMap.get(node.groupId)?.collapsed);

  useEffect(() => {
    graphRef.current = graph;
    window.localStorage.setItem(commandStateKey, JSON.stringify(graph));
  }, [graph]);

  useEffect(() => {
    graphControlsRef.current = graphControls;
    window.localStorage.setItem(graphControlsKey, JSON.stringify(graphControls));
  }, [graphControls]);

  useEffect(() => {
    lockedNodeIdRef.current = lockedNodeId;
  }, [lockedNodeId]);

  useEffect(() => () => {
    if (previousBodyOverflowRef.current !== null) {
      document.body.style.overflow = previousBodyOverflowRef.current;
      previousBodyOverflowRef.current = null;
    }

    for (const timer of taskTimersRef.current) {
      window.clearTimeout(timer);
    }

    recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    hoveredRef.current = hoveredNodeId;
  }, [hoveredNodeId]);

  useEffect(() => {
    function prepareAcademyTarget(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail as { target?: string } | undefined : undefined;

      if (detail?.target === "command-controls") {
        setIsControlsOpen(true);
      }

      if (detail?.target === "command-console" || detail?.target === "command-task-list" || detail?.target === "voice-controls") {
        setIsCommandConsoleOpen(true);
      }

      if (detail?.target === "command-inspector") {
        setIsPanelOpen(true);
      }

      if (detail?.target === "business-wizard") {
        setIsCommandConsoleOpen(true);
        setIsPanelOpen(false);
        setIsControlsOpen(false);
        setBusinessWizard((current) => ({ ...current, isOpen: true }));
      }

      if (detail?.target === "command-structure-actions") {
        setIsCommandConsoleOpen(true);
        setIsControlsOpen(true);
      }
    }

    window.addEventListener("entral:academy-prepare-target", prepareAcademyTarget);
    return () => window.removeEventListener("entral:academy-prepare-target", prepareAcademyTarget);
  }, []);

  useEffect(() => {
    function openGuidedBusinessSetup() {
      setIsCommandConsoleOpen(true);
      setIsPanelOpen(false);
      setIsControlsOpen(false);
      openBusinessWizard();
    }

    window.addEventListener("entral:open-business-wizard", openGuidedBusinessSetup);

    if (window.location.hash === "#business-setup") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      window.setTimeout(openGuidedBusinessSetup, 0);
    }

    return () => window.removeEventListener("entral:open-business-wizard", openGuidedBusinessSetup);
  }, []);

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
    focusModeRef.current = isFocusMode;
  }, [isFocusMode]);

  useEffect(() => {
    function handleGlobalEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      if (
        focusModeRef.current ||
        selectedRef.current !== "entral" ||
        activeGroupRef.current ||
        activeStatusFilterRef.current?.length ||
        searchRef.current.trim()
      ) {
        event.preventDefault();
        returnToFullPicture();
      }
    }

    window.addEventListener("keydown", handleGlobalEscape);
    return () => window.removeEventListener("keydown", handleGlobalEscape);
  }, []);

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
      setStatusMessage("ENTRAL Command Core: Evolving, Neural, Tactical, Reasoning, Autonomous, Logic.");
      return;
    }

    setStatusMessage(`${hovered.name}: ${statusLabel(hovered.status)}. ${hovered.currentTask ?? "No active task."}`);
  }, [hoveredNodeId, nodeMap]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGraph((current) => {
        const running = current.nodes.filter((node) => node.type === "agent" && node.status === "working");

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
    setStatusMessage("Graph dynamics reset to the tuned ENTRAL defaults.");
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
    const visibleIds = visibleNodeIdsForSelection(selectedRef.current, graphRef.current.nodes);

    for (const node of graphRef.current.nodes) {
      if (!visibleIds.has(node.id)) continue;
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

    function drawOrbit(meta: OrbitMeta, pattern: OrbitPattern, color: string, segments = 144, alpha = 0.24) {
      const points: Vec3[] = [];

      for (let i = 0; i <= segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(orbitPoint(meta, angle, pattern));
      }

      drawPolyline(points, color, alpha);
    }

    function drawNodeMarker(node: GraphNode3D, color: string, accent: string, size: number, dimmed: boolean, pulse: number, axes: ReturnType<typeof getCameraBillboardAxes>) {
      const alpha = dimmed ? 0.18 : 0.72;

      if (node.commandType === "marshal") {
        const radius = size * 1.42 * pulse;
        const square = [
          billboardPoint(node, axes, -radius, -radius),
          billboardPoint(node, axes, radius, -radius),
          billboardPoint(node, axes, radius, radius),
          billboardPoint(node, axes, -radius, radius),
          billboardPoint(node, axes, -radius, -radius)
        ];

        drawPolyline(square, accent, alpha);
        drawLine([billboardPoint(node, axes, -radius * 0.72, 0), billboardPoint(node, axes, radius * 0.72, 0)], color, alpha * 0.58);
        drawLine([billboardPoint(node, axes, 0, -radius * 0.72), billboardPoint(node, axes, 0, radius * 0.72)], color, alpha * 0.58);
        return;
      }

      if (node.commandType === "general") {
        const radius = size * 1.34 * pulse;
        const diamond = [
          billboardPoint(node, axes, 0, -radius),
          billboardPoint(node, axes, radius * 0.9, 0),
          billboardPoint(node, axes, 0, radius),
          billboardPoint(node, axes, -radius * 0.9, 0),
          billboardPoint(node, axes, 0, -radius)
        ];

        drawPolyline(diamond, accent, alpha);
        drawLine([billboardPoint(node, axes, -radius * 0.54, 0), billboardPoint(node, axes, radius * 0.54, 0)], color, alpha * 0.58);
        drawLine([billboardPoint(node, axes, 0, -radius * 0.54), billboardPoint(node, axes, 0, radius * 0.54)], color, alpha * 0.58);
        return;
      }

      if (node.commandType === "commander") {
        const radius = size * 1.25 * pulse;
        const triangle = [
          billboardPoint(node, axes, 0, -radius),
          billboardPoint(node, axes, radius * 0.96, radius * 0.72),
          billboardPoint(node, axes, -radius * 0.96, radius * 0.72),
          billboardPoint(node, axes, 0, -radius)
        ];

        drawPolyline(triangle, accent, alpha * 0.88);
        drawLine([billboardPoint(node, axes, -radius * 0.55, radius * 0.14), billboardPoint(node, axes, radius * 0.55, radius * 0.14)], color, alpha * 0.5);
        return;
      }

      if (node.commandType === "soldier") {
        const radius = size * 0.95 * pulse;
        drawLine([billboardPoint(node, axes, -radius, -radius), billboardPoint(node, axes, radius, radius)], accent, alpha * 0.62);
        drawLine([billboardPoint(node, axes, -radius, radius), billboardPoint(node, axes, radius, -radius)], color, alpha * 0.42);
      }
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
      const renderNodes = graphNow.nodes;
      const cameraEase = reducedMotionRef.current ? 1 : Math.min(0.34, 0.13 + controlsNow.cameraSensitivity * 0.055);
      cameraRef.current = smoothCamera(cameraRef.current, desiredCameraRef.current, cameraEase);
      const camera = cameraRef.current;
      const matrix = getCameraMatrix(camera, canvasElement.width, canvasElement.height);
      const billboardAxes = getCameraBillboardAxes(camera);
      matrixRef.current = matrix;

      glContext.clearColor(0, 0, 0, 0);
      glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
      glContext.enable(glContext.BLEND);
      glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE);
      glContext.disable(glContext.DEPTH_TEST);

      const groups = new Map(graphNow.groups.map((group) => [group.id, group]));
      const nodes = new Map(graphNow.nodes.map((node) => [node.id, node]));
      const selectedForRender = selectedRef.current ? nodes.get(selectedRef.current) ?? null : null;
      const visibleNodeIds = visibleNodeIdsForSelection(selectedRef.current, renderNodes);
      const visibleNodes = renderNodes.filter((node) => visibleNodeIds.has(node.id));
      const visibleEdges = graphNow.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
      const showHierarchyRings = !selectedForRender || selectedForRender.commandType === "emperor" || selectedForRender.commandType === "marshal" || selectedForRender.commandType === "general";
      const activeGroups = graphNow.groups.filter((group) => group.id !== "core");
      const groupIndexes = new Map(activeGroups.map((group, index) => [group.id, index]));
      const parentLocalIndexes = new Map<string, number>();
      const orbitTightness = 1.28 - controlsNow.gravity * 0.36;
      const orbitPattern = controlsNow.orbitPattern;
      const settle = reducedMotionRef.current ? 1 : 1 - Math.pow(1 - Math.min(0.22, 0.055 + controlsNow.gravity * 0.09), dt * 60);

      for (const node of renderNodes) {
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
        const shellMeta = orbitMeta(groupIndex);
        const marshalCenter = orbitPoint(
          { ...shellMeta, radius: shellMeta.radius * orbitTightness },
          timeRef.current * shellMeta.speed * controlsNow.orbitSpeed + shellMeta.phase,
          orbitPattern
        );
        const motion = getNodeMotion(node);
        let desired = marshalCenter;

        if (node.commandType !== "marshal") {
          const parentId = node.parentId ?? node.groupId;
          const parent = nodes.get(parentId);
          const localIndex = parentLocalIndexes.get(parentId) ?? 0;
          parentLocalIndexes.set(parentId, localIndex + 1);

          const parentCenter = parent && parent.commandType !== "emperor"
            ? { x: parent.x, y: parent.y, z: parent.z }
            : marshalCenter;
          const localRadius = node.commandType === "general"
            ? (132 + localIndex * 18) * orbitTightness
            : node.commandType === "commander"
            ? (86 + localIndex * 13) * orbitTightness
            : (36 + localIndex * 7) * orbitTightness;
          const localMeta: OrbitMeta = {
            phase: motion.phase + localIndex * 0.64,
            radius: localRadius,
            speed: node.commandType === "general" ? 0.22 + stableNumber(node.id, 19) * 0.08 : node.commandType === "commander" ? 0.28 + stableNumber(node.id, 23) * 0.1 : 0.48 + stableNumber(node.id, 29) * 0.16,
            tiltX: motion.localTiltX,
            tiltY: motion.localTiltY,
            tiltZ: motion.localTiltZ
          };
          const local = orbitPoint(localMeta, timeRef.current * localMeta.speed * controlsNow.orbitSpeed + localMeta.phase, orbitPattern);
          desired = addVec(parentCenter, local);
        }

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

      const lockedNode = lockedNodeIdRef.current ? nodes.get(lockedNodeIdRef.current) : null;

      if (lockedNode && lockedNode.type !== "core") {
        desiredCameraRef.current = clampCamera({
          ...desiredCameraRef.current,
          distance: Math.min(desiredCameraRef.current.distance, lockedNode.commandType === "soldier" ? 360 : lockedNode.commandType === "commander" ? 420 : lockedNode.commandType === "general" ? 520 : 620),
          target: { x: lockedNode.x, y: lockedNode.y, z: lockedNode.z }
        });
      }

      const emphasized = new Set<string>();

      if (selectedRef.current) emphasized.add(selectedRef.current);
      if (hoveredRef.current) emphasized.add(hoveredRef.current);

      for (const edge of visibleEdges) {
        if (edge.source === selectedRef.current || edge.target === selectedRef.current || edge.source === hoveredRef.current || edge.target === hoveredRef.current) {
          emphasized.add(edge.source);
          emphasized.add(edge.target);
        }
      }

      if (activeGroupRef.current) {
        for (const node of visibleNodes) {
          if (node.groupId === activeGroupRef.current) emphasized.add(node.id);
        }
      }

      if (searchRef.current.trim()) {
        for (const node of visibleNodes) {
          if (matchesQuery(node, searchRef.current, groups.get(node.groupId))) emphasized.add(node.id);
        }
      }

      if (activeStatusFilterRef.current?.length) {
        for (const node of visibleNodes) {
          if (activeStatusFilterRef.current.includes(node.status)) emphasized.add(node.id);
        }
      }

      for (const fog of spaceFogRef.current) {
        const drift = reducedMotionRef.current ? 0 : Math.sin(timeRef.current * 0.035 + fog.drift) * 42;
        drawPoint({ x: fog.x + drift, y: fog.y + drift * 0.22, z: fog.z - drift * 0.55 }, fog.color, fog.size, fog.alpha);
      }

      for (const star of deepSpaceRef.current) {
        const drift = reducedMotionRef.current ? 0 : Math.sin(timeRef.current * 0.018 + star.drift) * 8;
        drawPoint({ x: star.x + drift, y: star.y + drift * 0.35, z: star.z }, star.color, star.size, star.alpha);
      }

      for (const [index, group] of activeGroups.entries()) {
        if (group.collapsed) continue;

        const groupNodes = visibleNodes.filter((node) => node.groupId === group.id);
        if (groupNodes.length === 0) continue;

        const baseMeta = orbitMeta(index);
        const meta = { ...baseMeta, radius: baseMeta.radius * orbitTightness };
        const active = activeGroupRef.current === group.id || emphasized.size === 0 || groupNodes.some((node) => emphasized.has(node.id));

        if (controlsNow.showRings && showHierarchyRings) {
          drawOrbit(meta, orbitPattern, active ? group.color : "#123a42", 156, active ? 0.28 : 0.13);
        }

        const groupCenter = orbitPoint(meta, timeRef.current * meta.speed * controlsNow.orbitSpeed + meta.phase, orbitPattern);

        if (groupNodes.length > 0 && showHierarchyRings) {
          const radius = Math.max(44, Math.max(...groupNodes.map((node) => Math.hypot(node.x - groupCenter.x, node.y - groupCenter.y, node.z - groupCenter.z))) + 28);
          const clusterMeta = { ...meta, radius };

          if (controlsNow.showRings) {
            const haloPoints: Vec3[] = [];
            for (let i = 0; i <= 48; i += 1) {
              const point = orbitPoint(clusterMeta, (i / 48) * Math.PI * 2, orbitPattern);
              haloPoints.push({ x: point.x + groupCenter.x, y: point.y * 0.18 + groupCenter.y, z: point.z + groupCenter.z });
            }
            drawPolyline(haloPoints, group.color, active ? 0.18 : 0.08);
          }
        }
      }

      for (const edge of visibleEdges) {
        const source = nodes.get(edge.source);
        const target = nodes.get(edge.target);

        if (!source || !target) continue;
        if (source.type !== "core" && groups.get(source.groupId)?.collapsed) continue;
        if (target.type !== "core" && groups.get(target.groupId)?.collapsed) continue;

        const active = emphasized.size === 0 || emphasized.has(source.id) || emphasized.has(target.id);
        drawLine([source, target], active ? groups.get(target.groupId)?.color ?? settings.accentColor : "#14313c", active ? 0.42 : 0.14);
      }

      const coreColor = groups.get("core")?.color ?? settings.accentColor;
      const corePulse = reducedMotionRef.current ? 1 : 1 + Math.sin(timeRef.current * 2.4) * 0.06;

      if (visibleNodeIds.has("entral")) {
        drawPoint({ x: 0, y: 0, z: 0 }, coreColor, 190 * corePulse, 0.14);
        drawPoint({ x: 0, y: 0, z: 0 }, coreColor, 132 * corePulse, 0.44);
        drawPoint({ x: 0, y: 0, z: 0 }, coreColor, 94 * corePulse, 0.92);
        drawPoint({ x: 0, y: 0, z: 0 }, "#f8ffff", 38 * corePulse, 0.98);
      }

      for (const node of visibleNodes) {
        const group = groups.get(node.groupId);

        if (node.type !== "core" && group?.collapsed) continue;

        const dimmed = emphasized.size > 0 && !emphasized.has(node.id);
        const color = dimmed ? "#17404a" : group?.color ?? settings.accentColor;
        const accent = dimmed ? "#31545f" : nodeLevelAccent(node);
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

          const statusColor = commandStatusColor(node.status);
          const pulse = node.status === "working" && !reducedMotionRef.current ? 1 + Math.sin(timeRef.current * 4.2 + stableNumber(node.id, 31) * 6.28) * 0.07 : 1;
          drawPoint(node, statusColor, (size + 18) * pulse, dimmed ? 0.08 : 0.26);
          drawPoint(node, color, (size + 9) * pulse, dimmed ? 0.34 : 0.98);
          drawNodeMarker(node, color, statusColor || accent, size, dimmed, pulse, billboardAxes);
          drawPoint(node, statusColor || accent, Math.max(8, size * 0.28) * pulse, dimmed ? 0.2 : 0.82);
        }
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

  function lineageForNode(nodeId: string, nodes = graphRef.current.nodes) {
    const map = new Map(nodes.map((node) => [node.id, node]));
    const lineage: GraphNode3D[] = [];
    let current = map.get(nodeId) ?? null;

    while (current) {
      lineage.unshift(current);
      current = current.parentId ? map.get(current.parentId) ?? null : null;
    }

    return lineage;
  }

  function firstDescendantOfType(parentId: string, type: NodeType, nodes = graphRef.current.nodes, predicate: (node: GraphNode3D) => boolean = () => true) {
    const queue = nodes.filter((node) => node.parentId === parentId);

    while (queue.length > 0) {
      const node = queue.shift() as GraphNode3D;
      if (node.commandType === type && predicate(node)) return node;
      queue.push(...nodes.filter((candidate) => candidate.parentId === node.id));
    }

    return null;
  }

  function soldierForTaskTarget(target?: GraphNode3D | null) {
    const nodes = graphRef.current.nodes;
    const selected = target ?? nodes.find((node) => node.id === selectedRef.current) ?? null;

    const isOnline = (node: GraphNode3D) => node.status !== "offline";

    if (selected?.commandType === "soldier") return isOnline(selected) ? selected : null;
    if (selected?.commandType === "commander") return selected.status === "offline" ? null : firstDescendantOfType(selected.id, "soldier", nodes, isOnline);
    if (selected?.commandType === "general") return selected.status === "offline" ? null : firstDescendantOfType(selected.id, "soldier", nodes, isOnline);

    return nodes.find((node) => node.commandType === "soldier" && isOnline(node)) ?? null;
  }

  function productTypesFromText(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  function handleProductBatchFormChange(next: ProductBatchFormState) {
    if (next.storeId !== productBatchForm.storeId) {
      const store = merchStores.find((item) => item.id === next.storeId);

      if (store) {
        setProductBatchForm({
          ...next,
          audience: store.audience,
          productTypes: store.productTypes.length > 0 ? store.productTypes.join(", ") : next.productTypes,
          styleDirection: store.brandStyle
        });
        return;
      }
    }

    setProductBatchForm(next);
  }

  async function loadMerchStores(silent = false) {
    setIsLoadingMerchStores(true);

    try {
      const result = await apiFetch<{ items: ClientMerchStore[]; total: number }>("/merch/stores?pageSize=100");
      setMerchStores(result.items);
      setProductBatchForm((current) => {
        if (result.items.some((store) => store.id === current.storeId)) {
          return current;
        }

        const selected = result.items[0] ?? null;
        return selected ? { ...defaultProductBatchForm(selected), productCount: current.productCount, riskTolerance: current.riskTolerance } : current;
      });

      if (!silent && result.items.length === 0) {
        respond({
          analysis: "No Client Merch Stores are available for batch generation.",
          nextActions: ["Create a Client Merch Store record.", "Return to the Product Batch Generator.", "Generate the requested product batch."],
          recommendation: "Create or import store data before generating POD product drafts.",
          situation: "Product Batch Generator is waiting for a store."
        });
      }

      return result.items;
    } catch (error) {
      if (!silent) {
        respond({
          analysis: error instanceof Error ? error.message : "The merch store list could not be loaded.",
          nextActions: ["Confirm the backend is running.", "Log in again if the session expired.", "Retry store refresh."],
          recommendation: "Restore API connectivity before creating product batches.",
          situation: "Client Merch Store lookup failed."
        }, "Product Batch Generator store lookup failed.");
      }

      return [];
    } finally {
      setIsLoadingMerchStores(false);
    }
  }

  async function loadApprovalQueue(silent = false) {
    setIsLoadingApprovalQueue(true);

    try {
      const result = await apiFetch<{ items: PodProduct[]; total: number }>("/merch/products?pageSize=100");
      setApprovalQueueProducts(result.items);

      if (!silent && result.items.length === 0) {
        respond({
          analysis: "No generated POD products are currently available for approval.",
          nextActions: ["Generate a product batch.", "Refresh the approval queue.", "Review each card before approving."],
          recommendation: "Create a product batch before attempting approval review.",
          situation: "Approval queue is empty."
        });
      }

      return result.items;
    } catch (error) {
      if (!silent) {
        respond({
          analysis: error instanceof Error ? error.message : "The approval queue could not be loaded.",
          nextActions: ["Confirm backend connectivity.", "Verify the current session is still authenticated.", "Retry queue refresh."],
          recommendation: "Restore product API access before approving products.",
          situation: "Approval queue lookup failed."
        }, "Approval queue refresh failed.");
      }

      return [];
    } finally {
      setIsLoadingApprovalQueue(false);
    }
  }

  function openProductBatchGenerator() {
    setIsControlsOpen(true);
    setStatusMessage("Product Batch Generator and approval queue ready.");
    void loadMerchStores(true);
    void loadApprovalQueue(true);
  }

  function statusForApprovalAction(action: ProductApprovalAction) {
    if (action === "approve") return "Approved" as const;
    if (action === "revise") return "Needs Revision" as const;
    if (action === "reject") return "Rejected" as const;
    return "Archived" as const;
  }

  async function updateProductApproval(product: PodProduct, action: ProductApprovalAction) {
    const nextStatus = statusForApprovalAction(action);
    setUpdatingApprovalProductIds((current) => new Set(current).add(product.id));

    try {
      const response = await apiFetch<{ product: PodProduct }>(`/merch/products/${product.id}`, {
        method: "PATCH",
        json: { status: nextStatus }
      });

      setApprovalQueueProducts((current) => current.map((item) => item.id === product.id ? response.product : item));
      setProductBatchResults((current) => current.map((item) => item.id === product.id ? response.product : item));
      recordActivity(`${product.productName} marked ${nextStatus}.`);
      setStatusMessage(`${product.productName}: ${nextStatus}.`);
      respond({
        analysis: nextStatus === "Approved"
          ? "Product is now approved. Publishing remains gated to approved products only."
          : "Product remains blocked from publishing until it receives explicit approval.",
        nextActions: nextStatus === "Approved"
          ? ["Move the product into listing QA.", "Confirm final compliance checks.", "Publish only after the approved handoff is complete."]
          : ["Review the product card status.", "Revise or regenerate if needed.", "Approve only after client and compliance review."],
        recommendation: nextStatus === "Approved" ? "Proceed to listing QA before publishing." : "Keep the product out of the publishing path.",
        situation: `${product.productName} marked ${nextStatus}.`
      }, `${product.productName} approval status updated.`);
    } catch (error) {
      respond({
        analysis: error instanceof Error ? error.message : "The product approval update did not complete.",
        nextActions: ["Confirm backend connectivity.", "Refresh the approval queue.", "Retry the approval action."],
        recommendation: "Do not treat the product as approved until the status update succeeds.",
        situation: "Approval action failed."
      }, "Approval queue update failed.");
    } finally {
      setUpdatingApprovalProductIds((current) => {
        const next = new Set(current);
        next.delete(product.id);
        return next;
      });
    }
  }

  function batchCountFromCommand(text: string): ProductBatchFormState["productCount"] {
    const match = /\b(5|10|15|25)\b/.exec(text);
    return match ? Number(match[1]) as ProductBatchFormState["productCount"] : productBatchForm.productCount;
  }

  function isProductBatchCommand(normalized: string) {
    return (
      normalized.includes("product batch")
      || normalized.includes("batch generator")
      || normalized.includes("generate product ideas")
      || normalized.includes("generate products")
      || normalized.includes("product idea batch")
    ) && (normalized.includes("merch") || normalized.includes("store") || normalized.includes("pod") || normalized.includes("product"));
  }

  function applyProductBatchToCommandOS(products: PodProduct[], store: ClientMerchStore, warnings: string[]) {
    const nodes = graphRef.current.nodes;
    const planner = nodes.find((node) => node.name === "Product Opportunity Soldier")
      ?? nodes.find((node) => node.name === "Niche Research Commander")
      ?? nodes.find((node) => node.id === "entral-general")
      ?? nodes.find((node) => node.id === "merch-marshal")
      ?? nodes.find((node) => node.id === "entral");

    if (!planner) {
      return;
    }

    const now = new Date().toISOString();
    const path = lineageForNode(planner.id, nodes);
    const marshal = path.find((node) => node.commandType === "marshal");
    const general = path.find((node) => node.commandType === "general");
    const commander = path.find((node) => node.commandType === "commander");
    const soldier = path.find((node) => node.commandType === "soldier");
    const taskName = `Product Batch: ${store.businessName} / ${products.length} drafts`;
    const task: CommandTask = {
      assignedEntityId: planner.id,
      assignedEntityType: planner.commandType,
      completedAt: now,
      commanderId: commander?.id ?? null,
      commanderName: commander?.name ?? null,
      createdAt: now,
      delegationPath: path.map((node) => node.id),
      description: `Generated ${products.length} POD product drafts for ${store.businessName}. Outputs include product ideas, concepts, prompts, titles, descriptions, tags, pricing estimates, and compliance warnings.`,
      generalId: general?.id ?? null,
      generalName: general?.name ?? null,
      history: [
        `[ENTRAL] Product batch objective received for ${store.businessName}.`,
        `[MARSHAL] Merch Marshal routed product planning into ${path.find((node) => node.commandType === "general")?.name ?? "the active business General"}.`,
        `[GENERAL] ${path.find((node) => node.commandType === "general")?.name ?? "Business General"} routed product planning through ${path.at(-2)?.name ?? "Merch command"}.`,
        `[SOLDIER] ${planner.name} generated ${products.length} product drafts.`,
        `[REPORT] ${planner.name} -> ${path.slice().reverse().map((node) => node.name).slice(1).join(" -> ")}.`
      ],
      id: `product-batch-${Date.now().toString(36)}`,
      marshalId: marshal?.id ?? null,
      marshalName: marshal?.name ?? null,
      name: taskName,
      reportHistory: [],
      soldierId: soldier?.id ?? null,
      soldierName: soldier?.name ?? null,
      status: "completed",
      updatedAt: now
    };
    const productNames = products.map((product) => product.productName);
    const affectedNames = new Set(["entral", "Merch Marshal", "ENTRAL General", "Product Opportunity Soldier", "Design Concept Soldier", "Prompt Soldier", "Title Soldier", "Trademark Risk Soldier"]);

    setGraph((current) => {
      const next = {
        ...current,
        tasks: [task, ...current.tasks],
        nodes: current.nodes.map((node) => {
          if (!affectedNames.has(node.name) && node.id !== planner.id) return node;

          const reportNote = node.commandType === "emperor"
            ? `${products.length} merch product drafts generated. Awaiting review and approval routing.`
            : `${store.businessName} product batch report received with ${warnings.length} compliance warning categories.`;

          return {
            ...node,
            currentTask: null,
            logs: [`${taskName} completed.`, ...node.logs].slice(0, 10),
            memory: {
              ...node.memory,
              notes: [reportNote, ...node.memory.notes].slice(0, 8),
              recentTasks: [taskName, ...node.memory.recentTasks].slice(0, 8),
              taskResults: [`Generated: ${productNames.slice(0, 5).join(", ")}${productNames.length > 5 ? "..." : ""}`, ...node.memory.taskResults].slice(0, 8)
            },
            status: node.commandType === "emperor" ? "thinking" as GraphStatus : "waiting" as GraphStatus,
            taskHistory: [taskName, ...node.taskHistory].slice(0, 12)
          };
        })
      };

      graphRef.current = next;
      return next;
    });

    setSelectedNodeId(planner.id);
    selectedRef.current = planner.id;
    setLockedNodeId(planner.id);
    lockedNodeIdRef.current = planner.id;
    setIsPanelOpen(true);
  }

  async function generateProductBatchFromForm() {
    const stores = merchStores.length > 0 ? merchStores : await loadMerchStores(true);
    const store = stores.find((item) => item.id === productBatchForm.storeId) ?? stores[0] ?? null;

    if (!store) {
      respond({
        analysis: "A Client Merch Store must be selected before ENTRAL can generate product drafts.",
        nextActions: ["Create or load a Client Merch Store.", "Select the store in the Product Batch Generator.", "Generate the batch again."],
        recommendation: "Attach product ideation to a store record so pricing, audience, and brand context remain traceable.",
        situation: "Product batch generation blocked."
      });
      return;
    }

    const productTypes = productTypesFromText(productBatchForm.productTypes);

    if (productTypes.length === 0) {
      respond({
        analysis: "Product types are required so Merch Command can generate useful POD drafts.",
        nextActions: ["Add product types such as T-shirts, Hoodies, Mugs, Stickers, or Totes.", "Retry the batch generator."],
        recommendation: "Use two to four product types for a balanced first batch.",
        situation: "Product batch generation needs product lanes."
      });
      return;
    }

    setIsGeneratingProductBatch(true);

    try {
      const response = await apiFetch<ProductBatchGeneratorResponse>("/merch/products/batch", {
        method: "POST",
        json: {
          audience: productBatchForm.audience || store.audience,
          priceRange: {
            max: Number(productBatchForm.priceMax),
            min: Number(productBatchForm.priceMin)
          },
          productCount: productBatchForm.productCount,
          productTypes,
          riskTolerance: productBatchForm.riskTolerance,
          storeId: store.id,
          styleDirection: productBatchForm.styleDirection || store.brandStyle
        }
      });

      setProductBatchResults(response.products);
      setApprovalQueueProducts((current) => {
        const existing = new Map(current.map((product) => [product.id, product]));
        response.products.forEach((product) => existing.set(product.id, product));
        return Array.from(existing.values()).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      });
      setProductBatchWarnings(response.batch.warnings);
      applyProductBatchToCommandOS(response.products, store, response.batch.warnings);
      recordActivity(`${response.products.length} product drafts generated for ${store.businessName}.`);
      setStatusMessage(`${response.products.length} POD product drafts generated for ${store.businessName}.`);
      respond({
        analysis: `${response.products.length} product drafts generated with ideas, design concepts, prompts, listing copy, tags, pricing estimates, and compliance warnings.`,
        nextActions: ["Review generated products in the batch panel.", "Inspect Product Opportunity Soldier for the report.", "Route approved products into design and listing review."],
        recommendation: "Use this batch as the first client review set before production design begins.",
        situation: `${store.businessName} product batch complete.`
      }, `${store.businessName} product batch generated.`);
    } catch (error) {
      respond({
        analysis: error instanceof Error ? error.message : "The product batch service did not return a usable response.",
        nextActions: ["Confirm backend connectivity.", "Verify the selected store still exists.", "Retry with a smaller batch size if needed."],
        recommendation: "Resolve the API issue before creating product drafts.",
        situation: "Product batch generation failed."
      }, "Product Batch Generator failed.");
    } finally {
      setIsGeneratingProductBatch(false);
    }
  }

  function updateDelegationStep(taskId: string, entityId: string, status: CommandTaskStatus, entityStatus: GraphStatus, message: string, completed = false) {
    const now = new Date().toISOString();

    setGraph((current) => {
      const task = current.tasks.find((item) => item.id === taskId);
      const entity = current.nodes.find((node) => node.id === entityId);

      if (!entity || entity.status === "offline") {
        const messageSuffix = !entity
          ? "entity was removed before this delegation step could run"
          : `${entity.name} is offline and cannot receive delegation`;
        const next = {
          ...current,
          tasks: current.tasks.map((item) => item.id === taskId
            ? {
              ...item,
              completedAt: now,
              history: [...item.history, `Delegation interrupted: ${messageSuffix}.`],
              status: "failed" as CommandTaskStatus,
              updatedAt: now
            }
            : item)
        };

        graphRef.current = next;
        return next;
      }

      const next = {
        ...current,
        tasks: current.tasks.map((item) => item.id === taskId
            ? {
              ...item,
              assignedEntityId: entityId,
              assignedEntityType: entity.commandType,
              completedAt: completed ? now : item.completedAt ?? null,
            history: [...item.history, message],
            status,
            updatedAt: now
          }
          : item),
        nodes: current.nodes.map((node) => {
          if (node.id !== entityId) return node;

          const taskName = task?.name ?? "Delegated task";
          const taskResult = completed ? `${taskName} completed by ${node.name}.` : undefined;

          return {
            ...node,
            currentTask: completed ? null : taskName,
            logs: [message, ...node.logs].slice(0, 10),
            memory: {
              ...node.memory,
              notes: [`${message}`, ...node.memory.notes].slice(0, 8),
              recentTasks: [taskName, ...node.memory.recentTasks.filter((name) => name !== taskName)].slice(0, 8),
              taskResults: taskResult ? [taskResult, ...node.memory.taskResults].slice(0, 8) : node.memory.taskResults
            },
            status: completed ? "waiting" : entityStatus,
            taskHistory: [taskName, ...node.taskHistory.filter((name) => name !== taskName)].slice(0, 12)
          };
        })
      };

      graphRef.current = next;
      return next;
    });

    recordActivity(message);
  }

  function settleDelegationPath(pathIds: string[], taskName: string) {
    setGraph((current) => {
      const next = {
        ...current,
        nodes: current.nodes.map((node) => {
          if (!pathIds.includes(node.id)) return node;

          return {
            ...node,
            currentTask: null,
            logs: [`${taskName} delegation settled.`, ...node.logs].slice(0, 10),
            status: node.commandType === "emperor" ? "thinking" as GraphStatus : "waiting" as GraphStatus
          };
        })
      };

      graphRef.current = next;
      return next;
    });
  }

  function parseTaskDetails(text: string) {
    const cleaned = text
      .replace(/^(create|add|assign|run|start)\s+(a\s+|new\s+)?task\s*(called|named|to|for|:)?/i, "")
      .replace(/\s+(?:to|under|for)\s+(?:mock\s+)?(marshal|general|commander|soldier)\s+\d+.*$/i, "")
      .replace(/^(?:mock\s+)?(marshal|general|commander|soldier)\s+\d+$/i, "")
      .trim();
    const name = cleaned.length > 0 ? cleaned : "Delegated Command Task";

    return {
      description: `User requested: ${text}`,
      name: name.charAt(0).toUpperCase() + name.slice(1)
    };
  }

  function createDelegatedTask(text: string, target?: GraphNode3D | null) {
    const soldier = soldierForTaskTarget(target);

    if (!soldier) {
      respond({
        analysis: "The delegation chain requires a Soldier execution unit before final assignment can proceed.",
        nextActions: ["Create a Commander if no operation lane exists.", "Create a Soldier under that Commander.", "Reissue the task directive."],
        recommendation: "Establish execution capacity before assigning the objective.",
        situation: "No Soldier exists to receive that task."
      });
      return;
    }

    const path = lineageForNode(soldier.id);
    const marshal = path.find((node) => node.commandType === "marshal");
    const general = path.find((node) => node.commandType === "general");
    const commander = path.find((node) => node.commandType === "commander");
    const now = new Date().toISOString();
    const details = parseTaskDetails(text);
    const taskId = `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const task: CommandTask = {
      assignedEntityId: "entral",
      assignedEntityType: "emperor",
      completedAt: null,
      commanderId: commander?.id ?? null,
      commanderName: commander?.name ?? null,
      createdAt: now,
      delegationPath: path.map((node) => node.id),
      description: details.description,
      generalId: general?.id ?? null,
      generalName: general?.name ?? null,
      history: [`${details.name} created by user and received by ENTRAL.`],
      id: taskId,
      marshalId: marshal?.id ?? null,
      marshalName: marshal?.name ?? null,
      name: details.name,
      reportHistory: [],
      soldierId: soldier.id,
      soldierName: soldier.name,
      status: "pending",
      updatedAt: now
    };

    setGraph((current) => {
      const next = {
        ...current,
        tasks: [task, ...current.tasks],
        nodes: current.nodes.map((node) => {
          if (node.id !== "entral") return node;

          return {
            ...node,
            currentTask: `Routing ${details.name}`,
            logs: [`Received task ${details.name}.`, ...node.logs].slice(0, 10),
            memory: {
              ...node.memory,
              recentTasks: [details.name, ...node.memory.recentTasks].slice(0, 8)
            },
            status: "thinking" as GraphStatus,
            taskHistory: [details.name, ...node.taskHistory].slice(0, 12)
          };
        })
      };

      graphRef.current = next;
      return next;
    });

    setSelectedNodeId(soldier.id);
    setIsPanelOpen(true);
    respond({
      analysis: `Delegation path: ${path.map((node) => node.name).join(" -> ")}.`,
      nextActions: ["Watch delegation progress in the graph.", "Inspect the Soldier for task history.", "Review completion logs when the operation settles."],
      recommendation: "Maintain the current focus until execution status changes.",
      situation: `${details.name} created and received by ENTRAL.`
    }, `${details.name} delegated through command chain.`);

    path.forEach((node, index) => {
      const timer = window.setTimeout(() => {
        const isFinal = index === path.length - 1;
        const stepStatus: CommandTaskStatus = isFinal ? "running" : "assigned";
        const nodeStatus: GraphStatus = node.commandType === "emperor" ? "thinking" : isFinal ? "working" : "thinking";

        updateDelegationStep(
          taskId,
          node.id,
          stepStatus,
          nodeStatus,
          `${node.name} ${isFinal ? "is executing" : "accepted and delegated"} ${details.name}.`
        );
      }, 450 + index * 850);

      taskTimersRef.current.push(timer);
    });

    const completionTimer = window.setTimeout(() => {
      updateDelegationStep(taskId, soldier.id, "completed", "waiting", `${soldier.name} completed ${details.name}. Result stored in local memory.`, true);
      settleDelegationPath(path.map((node) => node.id), details.name);
      setStatusMessage(`Objective completed successfully by ${soldier.name}.`);
    }, 450 + path.length * 850 + 1200);

    taskTimersRef.current.push(completionTimer);
  }

  function workflowNameFromCommand(text: string) {
    const match = /\b(?:for|client|store)\s+(.+)$/i.exec(text);
    const candidate = match?.[1]
      ?.replace(/\b(?:workflow|launch|client merch store|merch store|store)\b/gi, "")
      .trim();

    return candidate && candidate.length > 1 ? `${candidate} Merch Store Launch` : "Client Merch Store Launch";
  }

  function isMerchLaunchWorkflowCommand(normalized: string) {
    return (
      (normalized.includes("workflow") || normalized.includes("launch plan") || normalized.includes("launch sequence"))
      && (normalized.includes("merch") || normalized.includes("store") || normalized.includes("pod"))
    ) || normalized.includes("launch client merch store");
  }

  function startMerchLaunchWorkflow(text: string) {
    const workflowName = workflowNameFromCommand(text);
    const now = new Date().toISOString();
    const result = createMerchLaunchWorkflowTasks(graphRef.current.nodes, { now, workflowName });

    if (result.tasks.length === 0) {
      respond({
        analysis: "The workflow requires at least one available Merch Commander and execution unit.",
        nextActions: ["Restore the default Merch hierarchy if it was removed.", "Create Commanders and Soldiers for the missing workflow lanes.", "Reissue the merch launch workflow directive."],
        recommendation: "Rebuild execution capacity before generating the workflow.",
        situation: "No Merch launch workflow tasks could be assigned."
      });
      return;
    }

    const workflowTaskNames = result.tasks.map((task) => task.name);
    const assignedIds = new Set(result.tasks.map((task) => task.assignedEntityId).filter((id): id is string => Boolean(id)));
    const commanderIds = new Set(result.tasks.map((task) => task.delegationPath.at(-2)).filter((id): id is string => Boolean(id)));
    const marshalId = graphRef.current.nodes.find((node) => node.id === "merch-marshal")?.id ?? "merch-marshal";
    const generalId = graphRef.current.nodes.find((node) => node.id === "entral-general")?.id
      ?? graphRef.current.nodes.find((node) => node.commandType === "general" && node.parentId === marshalId)?.id
      ?? "entral-general";
    let nextFocusNode: GraphNode3D | null = null;

    setGraph((current) => {
      const next = {
        ...current,
        tasks: [...result.tasks, ...current.tasks],
        nodes: current.nodes.map((node) => {
          if (node.id === "entral") {
            return {
              ...node,
              currentTask: `Supervising ${workflowName}`,
              logs: [`Generated ${result.tasks.length}-step merch launch workflow.`, ...node.logs].slice(0, 10),
              memory: {
                ...node.memory,
                notes: [`Workflow ${workflowName} established. Reports flow Soldier -> Commander -> General -> Marshal -> ENTRAL.`, ...node.memory.notes].slice(0, 8),
                recentTasks: [workflowName, ...node.memory.recentTasks].slice(0, 8)
              },
              status: "thinking" as GraphStatus,
              taskHistory: [workflowName, ...node.taskHistory].slice(0, 12)
            };
          }

          if (node.id === marshalId) {
            return {
              ...node,
              currentTask: `Routing ${workflowName} through Merch theater`,
              logs: [`Accepted ${workflowName}; assigning business General and operating Commanders.`, ...node.logs].slice(0, 10),
              memory: {
                ...node.memory,
                notes: [`Marshal report route active for ${workflowName}.`, ...node.memory.notes].slice(0, 8),
                recentTasks: [workflowName, ...node.memory.recentTasks].slice(0, 8)
              },
              status: "thinking" as GraphStatus,
              taskHistory: [workflowName, ...node.taskHistory].slice(0, 12)
            };
          }

          if (node.id === generalId) {
            return {
              ...node,
              logs: [`Accepted ${workflowName}; routing ${result.tasks.length} workflow steps through operating Commanders.`, ...node.logs].slice(0, 10),
              memory: {
                ...node.memory,
                notes: [`Workflow reporting route active for ${workflowName}.`, ...node.memory.notes].slice(0, 8),
                recentTasks: [workflowName, ...node.memory.recentTasks].slice(0, 8)
              },
              status: "thinking" as GraphStatus,
              taskHistory: [workflowName, ...node.taskHistory].slice(0, 12)
            };
          }

          if (commanderIds.has(node.id)) {
            const commanderTasks = result.tasks.filter((task) => task.delegationPath.includes(node.id)).map((task) => task.name);

            return {
              ...node,
              logs: [`Received ${commanderTasks.length} workflow step${commanderTasks.length === 1 ? "" : "s"} for ${workflowName}.`, ...node.logs].slice(0, 10),
              memory: {
                ...node.memory,
                notes: [`Report upward to ${graphRef.current.nodes.find((candidate) => candidate.id === generalId)?.name ?? "the business General"} for ${workflowName}.`, ...node.memory.notes].slice(0, 8),
                recentTasks: [...commanderTasks, ...node.memory.recentTasks].slice(0, 8)
              },
              status: "waiting" as GraphStatus,
              taskHistory: [...commanderTasks, ...node.taskHistory].slice(0, 12)
            };
          }

          if (assignedIds.has(node.id)) {
            const soldierTasks = result.tasks.filter((task) => task.assignedEntityId === node.id).map((task) => task.name);

            return {
              ...node,
              currentTask: soldierTasks[0] ?? node.currentTask,
              logs: [`Assigned ${soldierTasks.length} workflow step${soldierTasks.length === 1 ? "" : "s"} for ${workflowName}.`, ...node.logs].slice(0, 10),
              memory: {
                ...node.memory,
                notes: [`Report results upward through Commander -> General -> Marshal -> ENTRAL.`, ...node.memory.notes].slice(0, 8),
                recentTasks: [...soldierTasks, ...node.memory.recentTasks].slice(0, 8)
              },
              status: "waiting" as GraphStatus,
              taskHistory: [...soldierTasks, ...node.taskHistory].slice(0, 12)
            };
          }

          return node;
        })
      };

      nextFocusNode = next.nodes.find((node) => node.id === generalId)
        ?? next.nodes.find((node) => node.id === result.tasks[0]?.assignedEntityId)
        ?? null;
      graphRef.current = next;
      return next;
    });

    const focusNode = nextFocusNode
      ?? graphRef.current.nodes.find((node) => node.id === generalId)
      ?? graphRef.current.nodes.find((node) => node.id === result.tasks[0]?.assignedEntityId)
      ?? null;

    if (focusNode) {
      setSelectedNodeId(focusNode.id);
      selectedRef.current = focusNode.id;
      setLockedNodeId(focusNode.id);
      lockedNodeIdRef.current = focusNode.id;
      setIsPanelOpen(true);
    }

    recordActivity(`${workflowName} workflow generated with ${result.tasks.length} delegated tasks.`);
    setStatusMessage(`${workflowName}: ${result.tasks.length} workflow tasks assigned through Merch Marshal.`);
    respond({
      analysis: `${result.tasks.length} tasks generated from ${merchLaunchWorkflowSteps.length} workflow steps. Report flow is Soldier -> Commander -> General -> Marshal -> ENTRAL for every step.${result.missingSteps.length ? ` Missing lanes: ${result.missingSteps.map((step) => step.name).join(", ")}.` : ""}`,
      nextActions: ["Open Merch Marshal to review theater load.", "Inspect the active business General.", "Inspect any Commander to see its workflow steps."],
      recommendation: "Use the generated workflow as the operational launch checklist for the client merch store.",
      situation: `${workflowName} workflow established.`
    }, `${workflowName} workflow generated.`);
  }

  function canMoveEntity(node: GraphNode3D, parent: GraphNode3D) {
    return canMoveCommandEntity(node, parent);
  }

  function moveEntity(node: GraphNode3D, parent: GraphNode3D) {
    if (!canMoveEntity(node, parent)) {
      respond({
        analysis: `${node.name} cannot report to ${parent.name} under the active hierarchy rules.`,
        nextActions: ["Move Marshals only under ENTRAL.", "Move Generals only under Marshals.", "Move Commanders only under Generals.", "Move Soldiers only under Commanders."],
        recommendation: "Select a valid parent entity and reissue the reassignment directive.",
        situation: "Reassignment blocked by command hierarchy invariants."
      });
      return;
    }

    const newGroupId = node.commandType === "marshal" ? node.id : parent.groupId;

    setGraph((current) => {
      const { state: next } = moveCommandEntity(current, node.id, parent.id, createInitialState());

      graphRef.current = next;
      return next;
    });
    setSelectedNodeId(node.id);
    setActiveGroupId(newGroupId === "core" ? null : newGroupId);
    respond({
      analysis: "Parent-child links, graph edges, and group assignment were updated immediately.",
      nextActions: ["Inspect the moved entity.", "Review children and task ownership.", "Assign follow-up work if required."],
      recommendation: "Confirm the new reporting chain before delegating additional tasks.",
      situation: `${node.name} moved under ${parent.name}.`
    });
  }

  function nextPlaceholderName(type: Exclude<NodeType, "emperor">) {
    return nextCommandPlaceholderName(type, graphRef.current.nodes);
  }

  function selectedMarshalId(): string | null {
    const selected = graphRef.current.nodes.find((node) => node.id === selectedRef.current);

    if (selected?.commandType === "marshal") return selected.id;
    if (selected && selected.commandType !== "emperor") {
      const lineage = lineageForNode(selected.id);
      return lineage.find((node) => node.commandType === "marshal")?.id
        ?? graphRef.current.nodes.find((node) => node.commandType === "marshal")?.id
        ?? null;
    }

    return graphRef.current.nodes.find((node) => node.commandType === "marshal")?.id ?? null;
  }

  function selectedGeneralId(): string | null {
    const selected = graphRef.current.nodes.find((node) => node.id === selectedRef.current);

    if (selected?.commandType === "general") return selected.id;
    if (selected?.commandType === "commander" || selected?.commandType === "soldier") {
      const lineage = lineageForNode(selected.id);
      return lineage.find((node) => node.commandType === "general")?.id
        ?? graphRef.current.nodes.find((node) => node.commandType === "general" && node.parentId === selectedMarshalId())?.id
        ?? graphRef.current.nodes.find((node) => node.commandType === "general")?.id
        ?? null;
    }

    const marshalId = selectedMarshalId();
    return graphRef.current.nodes.find((node) => node.commandType === "general" && node.parentId === marshalId)?.id
      ?? graphRef.current.nodes.find((node) => node.commandType === "general")?.id
      ?? null;
  }

  function selectedCommanderId(): string | null {
    const selected = graphRef.current.nodes.find((node) => node.id === selectedRef.current);

    if (selected?.commandType === "commander") return selected.id;
    if (selected?.commandType === "soldier") return selected.parentId ?? null;

    const generalId = selectedGeneralId();
    return graphRef.current.nodes.find((node) => node.commandType === "commander" && node.parentId === generalId)?.id
      ?? graphRef.current.nodes.find((node) => node.commandType === "commander")?.id
      ?? null;
  }

  function templateFromText(value: string) {
    const normalized = value.toLowerCase();

    return businessTemplates.find((template) => normalized.includes(template.id.replace(/-/g, " ")) || normalized.includes(template.label.toLowerCase()))
      ?? (/\b(pod|merch|etsy|printify|shopify)\b/.test(normalized) ? businessTemplates.find((template) => template.id === "pod-merch-store") : null)
      ?? (/\b(website agency|web agency|website|web design|seo agency)\b/.test(normalized) ? businessTemplates.find((template) => template.id === "website-agency") : null)
      ?? (/\b(content agency|content|creator|social media|video|caption)\b/.test(normalized) ? businessTemplates.find((template) => template.id === "content-agency") : null)
      ?? (/\b(ecommerce|e-commerce|commerce|online store|product brand)\b/.test(normalized) ? businessTemplates.find((template) => template.id === "ecommerce-brand") : null)
      ?? (/\b(saas|software|app|startup|tool)\b/.test(normalized) ? businessTemplates.find((template) => template.id === "saas-startup") : null)
      ?? (/\b(local|landscaping|gym|restaurant|contractor|service)\b/.test(normalized) ? businessTemplates.find((template) => template.id === "local-service-business") : null)
      ?? (/\b(custom|blank|scratch)\b/.test(normalized) ? businessTemplates.find((template) => template.id === "custom-blank-structure") : null)
      ?? null;
  }

  function businessNameFromCommand(value: string) {
    const named = /\b(?:named|called)\s+([^,.;]+)/i.exec(value)?.[1]?.trim();
    const afterBusiness = /\b(?:business|client|brand|store|project|operation)\s+(?:for\s+)?([^,.;]+)/i.exec(value)?.[1]?.trim();
    const raw = named ?? afterBusiness ?? "";

    return raw
      .replace(/\s+under\s+.+$/i, "")
      .replace(/\s+using\s+.+$/i, "")
      .replace(/\s+with\s+.+$/i, "")
      .replace(/\s+template\s*$/i, "")
      .trim();
  }

  function openBusinessWizard(templateId?: string) {
    setBusinessWizard((current) => ({
      ...current,
      isOpen: true,
      templateId: templateId ?? current.templateId
    }));
    setIsCommandConsoleOpen(true);
    respond({
      analysis: "Guided creation is ready. Select a business template, enter the business name, and ENTRAL will build the Marshal, General, Commanders, Soldiers, and first intake task.",
      nextActions: ["Choose a template.", "Enter the business name.", "Confirm Create business."],
      recommendation: "Use POD merch store for your first merch client, or Local service business for a standard client operation.",
      situation: "Business creation wizard opened."
    });
  }

  function updateBusinessWizard(changes: Partial<BusinessWizardState>) {
    setBusinessWizard((current) => ({ ...current, ...changes }));
  }

  function requestNodeAuthorization(type: Exclude<NodeType, "emperor">, requestedName?: string) {
    const nodeName = requestedName?.trim() || nextPlaceholderName(type);
    const title = commandTitleFor(type);
    const parentId = parentIdForNewNode(type);
    const parent = parentId ? graphRef.current.nodes.find((node) => node.id === parentId) : null;

    if (!parentId || !parent) {
      respond(creationBlockedTransmission(type));
      return;
    }

    const summary = buildCreateNodeAuthorizationSummary({
      nodeName,
      nodeType: type,
      parentName: parent.name
    });

    setPendingAuthorization({
      createdAt: new Date().toISOString(),
      id: `auth-${Date.now().toString(36)}`,
      nodeName,
      nodeType: type,
      parentId,
      summary,
      type: "create-node"
    });
    setIsCommandConsoleOpen(true);
    respond(summary, `${title} creation awaiting authorization.`);
  }

  function requestBusinessTemplateAuthorization(template: BusinessTemplate, form: BusinessWizardState) {
    const businessName = form.businessName.trim();

    if (!businessName) {
      respond({
        analysis: "A business General needs a real business, client, brand, store, or operation name before ENTRAL can prepare an authorization preview.",
        nextActions: ["Enter a business name.", "Choose a template.", "Request creation again."],
        recommendation: "Use a concrete name like Iron House Gym, Smith Landscaping, or Veteran Apparel.",
        situation: "Business creation paused."
      });
      return;
    }

    const soldierCount = template.commanders.reduce((total, commander) => total + commander.soldiers.length, 0);
    const marshalName = form.preferredMarshal.trim() || template.marshalName;
    const contextLines = [
      form.industry.trim() ? `Industry: ${form.industry.trim()}` : "",
      form.audience.trim() ? `Audience: ${form.audience.trim()}` : "",
      form.brandStyle.trim() ? `Brand style: ${form.brandStyle.trim()}` : "",
      form.initialProducts.trim() ? `Initial services/products: ${form.initialProducts.trim()}` : ""
    ].filter(Boolean);
    const summary = buildBusinessTemplateAuthorizationSummary({
      businessName,
      commanderCount: template.commanders.length,
      contextLines,
      marshalName,
      soldierCount,
      templateLabel: template.label
    });

    setPendingAuthorization({
      createdAt: new Date().toISOString(),
      id: `auth-${Date.now().toString(36)}`,
      summary,
      templateId: template.id,
      type: "create-business-template",
      wizard: {
        ...form,
        businessName,
        isOpen: false,
        templateId: template.id
      }
    });
    setIsCommandConsoleOpen(true);
    respond(summary, `${businessName} business structure awaiting authorization.`);
  }

  function requestMoveAuthorization(node: GraphNode3D, parent: GraphNode3D) {
    if (!canMoveEntity(node, parent)) {
      moveEntity(node, parent);
      return;
    }

    const descendants = descendantIdsFor(node.id).length;
    const summary = buildMoveAuthorizationSummary({
      currentParentName: node.parentId ? graphRef.current.nodes.find((candidate) => candidate.id === node.parentId)?.name ?? "Unknown" : "ENTRAL",
      descendantCount: descendants,
      entityName: node.name,
      newParentName: parent.name
    });

    setPendingAuthorization({
      createdAt: new Date().toISOString(),
      id: `auth-${Date.now().toString(36)}`,
      nodeId: node.id,
      parentId: parent.id,
      summary,
      type: "move-node"
    });
    setIsCommandConsoleOpen(true);
    respond(summary, `${node.name} reassignment awaiting authorization.`);
  }

  function requestArchiveAuthorization(node: GraphNode3D) {
    const descendants = descendantIdsFor(node.id).length;
    const summary = buildArchiveAuthorizationSummary({
      descendantCount: descendants,
      entityName: node.name,
      entityTitle: node.title,
      parentName: node.parentId ? graphRef.current.nodes.find((candidate) => candidate.id === node.parentId)?.name ?? "Unknown" : "ENTRAL"
    });

    setPendingAuthorization({
      createdAt: new Date().toISOString(),
      id: `auth-${Date.now().toString(36)}`,
      nodeId: node.id,
      summary,
      type: "archive-node"
    });
    setIsCommandConsoleOpen(true);
    respond(summary, `${node.name} archive awaiting authorization.`);
  }

  function requestWorkflowAuthorization(text: string) {
    const workflowName = workflowNameFromCommand(text);
    const preview = createMerchLaunchWorkflowTasks(graphRef.current.nodes, {
      now: new Date().toISOString(),
      workflowName
    });
    const uniqueSoldiers = new Set(preview.tasks.map((task) => task.assignedEntityId).filter(Boolean)).size;
    const summary = buildWorkflowAuthorizationSummary({
      assignedSoldierCount: uniqueSoldiers,
      missingLanes: preview.missingSteps.map((step) => step.name),
      taskCount: preview.tasks.length,
      workflowName
    });

    setPendingAuthorization({
      createdAt: new Date().toISOString(),
      id: `auth-${Date.now().toString(36)}`,
      summary,
      type: "create-workflow",
      workflowText: text
    });
    setIsCommandConsoleOpen(true);
    respond(summary, `${workflowName} workflow awaiting authorization.`);
  }

  function approvePendingAuthorization() {
    const pending = pendingAuthorization;
    if (!pending) {
      respond("No pending authorization is waiting for approval.");
      return;
    }

    setPendingAuthorization(null);

    if (pending.type === "create-node") {
      createHierarchyNode(pending.nodeType, pending.nodeName, pending.parentId);
      return;
    }

    if (pending.type === "move-node") {
      const node = graphRef.current.nodes.find((candidate) => candidate.id === pending.nodeId);
      const parent = graphRef.current.nodes.find((candidate) => candidate.id === pending.parentId);

      if (!node || !parent) {
        respond({
          analysis: "The entity or parent selected for reassignment no longer exists.",
          nextActions: ["Inspect the hierarchy.", "Select the entity and parent again.", "Reissue the move directive."],
          recommendation: "No hierarchy changes were made.",
          situation: "Reassignment authorization expired."
        });
        return;
      }

      moveEntity(node, parent);
      return;
    }

    if (pending.type === "archive-node") {
      const node = graphRef.current.nodes.find((candidate) => candidate.id === pending.nodeId);

      if (!node || node.type === "core") {
        respond({
          analysis: "The selected entity can no longer be archived.",
          recommendation: "No hierarchy changes were made.",
          situation: "Archive authorization expired."
        });
        return;
      }

      mutateNode(node.id, {
        logs: [`Archived from command directive after authorization. Descendant references preserved.`, ...node.logs].slice(0, 10),
        status: "offline"
      });
      respond(`${node.name} archived locally after authorization. Descendant records were preserved and no external systems were touched.`, `${node.name} archived.`, commandSpeakerFromNodeType(node.commandType));
      return;
    }

    if (pending.type === "create-workflow") {
      startMerchLaunchWorkflow(pending.workflowText);
      return;
    }

    const template = businessTemplates.find((item) => item.id === pending.templateId);
    if (!template) {
      respond({
        analysis: "The requested business template could not be found.",
        nextActions: ["Open the business wizard.", "Choose a template again."],
        recommendation: "No hierarchy changes were made.",
        situation: "Authorization could not be executed."
      });
      return;
    }

    createBusinessFromTemplate(template, pending.wizard);
  }

  function modifyPendingAuthorization() {
    const pending = pendingAuthorization;
    if (!pending) {
      respond("No pending authorization is active.");
      return;
    }

    if (pending.type === "create-business-template") {
      setBusinessWizard({ ...pending.wizard, isOpen: true });
      setPendingAuthorization(null);
      respond({
        analysis: "The business setup form has been reopened so you can change the business name, template, Marshal, audience, industry, brand style, products, notes, or initial goal.",
        nextActions: ["Edit the form.", "Preview creation again.", "Approve the revised plan."],
        recommendation: "Use Modify when the structure is directionally right but needs more detail.",
        situation: "Business authorization returned to edit mode."
      });
      return;
    }

    respond({
      analysis: "Inline modification is not yet supported for this authorization type.",
      nextActions: ["Cancel this authorization.", "Reissue the directive with the corrected entity, parent, or workflow details."],
      recommendation: "No action will execute until you approve the current preview or cancel it.",
      situation: "Modification requires a revised command."
    });
  }

  function cancelPendingAuthorization() {
    if (!pendingAuthorization) {
      respond("No pending authorization is active.");
      return;
    }

    const summary = pendingAuthorization.summary.split("\n")[0] ?? "Pending action";
    setPendingAuthorization(null);
    respond(`Authorization canceled. ${summary} was not executed.`);
  }

  function uniqueNodeId(baseId: string, reserved: Set<string>) {
    if (!reserved.has(baseId)) {
      reserved.add(baseId);
      return baseId;
    }

    let suffix = 2;
    while (reserved.has(`${baseId}-${suffix}`)) {
      suffix += 1;
    }

    const id = `${baseId}-${suffix}`;
    reserved.add(id);
    return id;
  }

  function createBusinessFromTemplate(template: BusinessTemplate, form: BusinessWizardState) {
    const businessName = form.businessName.trim();

    if (!businessName) {
      respond({
        analysis: "A business General needs a real business, client, brand, store, or operation name.",
        nextActions: ["Enter a business name.", "Choose a template.", "Create the business again."],
        recommendation: "Use a concrete name like Iron House Gym, Smith Landscaping, or Veteran Apparel.",
        situation: "Business creation paused."
      });
      setBusinessWizard((current) => ({ ...current, isOpen: true }));
      return;
    }

    const now = new Date().toISOString();
    const existingIds = new Set(graphRef.current.nodes.map((node) => node.id));
    const marshalName = form.preferredMarshal.trim() || template.marshalName;
    const businessContextNotes = [
      form.industry.trim() ? `Industry: ${form.industry.trim()}.` : "",
      form.audience.trim() ? `Audience: ${form.audience.trim()}.` : "",
      form.brandStyle.trim() ? `Brand style: ${form.brandStyle.trim()}.` : "",
      form.initialProducts.trim() ? `Initial services/products: ${form.initialProducts.trim()}.` : "",
      form.goal.trim() ? `Initial objective: ${form.goal.trim()}.` : "",
      form.notes.trim() ? `Operator notes: ${form.notes.trim()}.` : ""
    ].filter(Boolean);
    const existingMarshal = graphRef.current.nodes.find((node) => node.commandType === "marshal" && node.name.toLowerCase() === marshalName.toLowerCase());
    const marshalId = existingMarshal?.id ?? uniqueNodeId(createCommandId(marshalName, "marshal"), existingIds);
    const generalName = /\bGeneral$/i.test(businessName) ? businessName : `${businessName} General`;
    const generalId = uniqueNodeId(`${marshalId}-${createCommandId(generalName, "general")}`, existingIds);
    const commanderIds: string[] = [];
    const soldierIds: string[] = [];
    let firstSoldierId: string | null = null;
    let firstCommanderId: string | null = null;

    const makeMemory = (role: string, instructions: string, notes: string[] = []): CommandMemory => ({
      instructions,
      notes: [
        ...notes,
        ...businessContextNotes
      ].filter(Boolean),
      recentTasks: [],
      role,
      taskResults: []
    });

    const makeNode = (node: Omit<GraphNode3D, "metrics" | "type" | "vx" | "vy" | "vz" | "x" | "y" | "z"> & Partial<Pick<GraphNode3D, "x" | "y" | "z">>): GraphNode3D => ({
      ...node,
      metrics: { cost: 0, roi: 0, successRate: 100 },
      reportHistory: node.reportHistory ?? [],
      reports: node.reports ?? [],
      type: node.commandType === "emperor" ? "core" : "agent",
      vx: 0,
      vy: 0,
      vz: 0,
      x: node.x ?? 0,
      y: node.y ?? 0,
      z: node.z ?? 0
    });

    const newMarshal = existingMarshal ? null : makeNode({
      activeCommanders: template.commanders.length,
      activeGenerals: 1,
      activeProjects: [`${businessName} launch`],
      activeSoldiers: template.commanders.reduce((total, commander) => total + commander.soldiers.length, 0),
      activeStores: [],
      capabilities: ["governance", "tool-orchestration", "status_reporter"],
      children: [],
      commandType: "marshal",
      createdAt: now,
      currentTask: `Standing up ${template.label} operations.`,
      description: `${marshalName} oversees ${template.label.toLowerCase()} businesses and routes reports to ENTRAL.`,
      groupId: marshalId,
      health: 100,
      id: marshalId,
      logs: [`${marshalName} created by the business wizard.`],
      marshalType: template.marshalType,
      memory: makeMemory(`${marshalName} strategic theater`, `Oversee ${template.label.toLowerCase()} businesses, enforce approvals, and report theater readiness to ENTRAL.`, [`Template: ${template.label}.`]),
      name: marshalName,
      parentId: "entral",
      permissions: ["govern_hierarchy", "route_commands", "manage_business_generals"],
      progress: 12,
      reasoning: "Created as the strategic theater for guided business onboarding.",
      role: `${marshalName} strategic theater`,
      status: "thinking",
      taskHistory: [`Create ${businessName} General`],
      title: "Marshal",
      tools: ["command_bus", "status_reporter", "approval_gate"],
      x: 240,
      y: 32,
      z: 240
    });

    const newGeneral = makeNode({
      activeCommanders: template.commanders.length,
      activeProjects: [`${businessName} setup`],
      activeSoldiers: template.commanders.reduce((total, commander) => total + commander.soldiers.length, 0),
      activeStores: template.id === "pod-merch-store" ? [`${businessName} merch store`] : [],
      businessName,
      capabilities: ["governance", "tool-orchestration", "business-discovery"],
      children: [],
      commandType: "general",
      createdAt: now,
      currentTask: "Complete business intake and confirm operating plan.",
      description: `${generalName} represents ${businessName} as an operating business General inside ${marshalName}.`,
      generalType: template.generalType,
      groupId: marshalId,
      health: 100,
      id: generalId,
      logs: [`${generalName} created from ${template.label} template.`, "Awaiting initial intake confirmation."],
      memory: makeMemory(`${businessName} business command`, `Coordinate Commanders for ${businessName}, maintain business memory, and report progress to ${marshalName}.`, [`Business template: ${template.label}.`]),
      name: generalName,
      parentId: marshalId,
      parentMarshalId: marshalId,
      parentMarshalName: marshalName,
      permissions: ["manage_commanders", "request_approval", "report_business_status"],
      progress: 18,
      reasoning: "Created through guided onboarding so the user can begin operating a real business structure quickly.",
      role: `${businessName} business General`,
      status: "thinking",
      taskHistory: ["Business structure created"],
      title: "General",
      tools: ["command_bus", "business_memory", "status_reporter"],
      x: 340,
      y: 70,
      z: 320
    });

    const newNodes: GraphNode3D[] = [newGeneral];

    for (const commander of template.commanders) {
      const commanderId = uniqueNodeId(`${generalId}-${createCommandId(commander.name, "commander")}`, existingIds);
      commanderIds.push(commanderId);
      if (!firstCommanderId) firstCommanderId = commanderId;

      newNodes.push(makeNode({
        capabilities: ["tool-orchestration", "report_status"],
        children: [],
        commandType: "commander",
        createdAt: now,
        currentTask: "Prepare department readiness.",
        description: `${commander.name} manages ${businessName} ${commander.name.replace(/\s+Commander$/i, "").toLowerCase()} operations.`,
        groupId: marshalId,
        health: 100,
        id: commanderId,
        logs: [`${commander.name} initialized for ${businessName}.`],
        memory: makeMemory(`${commander.name} operations`, `Break ${businessName} objectives into Soldier-level tasks and report upward to ${generalName}.`),
        name: commander.name,
        operationalArea: commander.name.replace(/\s+Commander$/i, ""),
        parentGeneralId: generalId,
        parentGeneralName: generalName,
        parentId: generalId,
        parentMarshalId: marshalId,
        parentMarshalName: marshalName,
        permissions: ["assign_soldiers", "report_department_status"],
        progress: 8,
        reasoning: "Created as a department lane for the selected business template.",
        role: `${commander.name} operations`,
        status: "idle",
        taskHistory: [],
        title: "Commander",
        tools: ["command_bus", "status_reporter"],
        x: 420,
        y: 90,
        z: 360
      }));

      for (const soldierName of commander.soldiers) {
        const soldierId = uniqueNodeId(`${commanderId}-${createCommandId(soldierName, "soldier")}`, existingIds);
        soldierIds.push(soldierId);
        if (!firstSoldierId) firstSoldierId = soldierId;
        const blueprint = inferSoldierBlueprint(soldierName);

        newNodes.push(makeNode({
          capabilities: blueprint?.tools ?? ["tool-orchestration", "report_status"],
          children: [],
          commandType: "soldier",
          createdAt: now,
          currentTask: soldierId === firstSoldierId ? "Complete first business intake." : null,
          description: `${soldierName} executes ${commander.name.toLowerCase()} work for ${businessName}.`,
          executionRole: blueprint?.role ?? `${soldierName} execution`,
          groupId: marshalId,
          health: 100,
          id: soldierId,
          logs: [`${soldierName} initialized for ${businessName}.`],
          memory: makeMemory(blueprint?.role ?? `${soldierName} execution`, `Execute assigned work for ${businessName} and report concise results to ${commander.name}.`),
          name: soldierName,
          parentCommanderId: commanderId,
          parentCommanderName: commander.name,
          parentGeneralId: generalId,
          parentGeneralName: generalName,
          parentId: commanderId,
          parentMarshalId: marshalId,
          parentMarshalName: marshalName,
          permissions: blueprint?.permissions ?? ["read_command_context", "report_status"],
          progress: soldierId === firstSoldierId ? 10 : 0,
          reasoning: "Created as an execution unit during guided business setup.",
          role: blueprint?.role ?? `${soldierName} execution`,
          status: soldierId === firstSoldierId ? "working" : "idle",
          taskHistory: soldierId === firstSoldierId ? ["Complete first business intake"] : [],
          title: "Soldier",
          tools: blueprint?.tools ?? ["command_bus", "status_reporter"],
          x: 500,
          y: 100,
          z: 420
        }));
      }
    }

    const firstTask: CommandTask | null = firstSoldierId && firstCommanderId ? {
      assignedEntityId: firstSoldierId,
      assignedEntityType: "soldier",
      commanderId: firstCommanderId,
      commanderName: template.commanders[0]?.name ?? null,
      completedAt: null,
      createdAt: now,
      delegationPath: ["entral", marshalId, generalId, firstCommanderId, firstSoldierId],
      description: `Capture business basics, audience, offer, and immediate launch objective for ${businessName}.`,
      generalId,
      generalName,
      history: [
        `ENTRAL created ${generalName} from the ${template.label} template.`,
        `${marshalName} routed first intake to ${template.commanders[0]?.name ?? "the first Commander"}.`
      ],
      id: `task-${generalId}-first-intake`,
      marshalId,
      marshalName,
      name: "Complete first business intake",
      reportHistory: [],
      soldierId: firstSoldierId,
      soldierName: newNodes.find((node) => node.id === firstSoldierId)?.name ?? null,
      status: "assigned",
      updatedAt: now
    } : null;

    setGraph((current) => {
      const next = validateCommandOSState({
        ...current,
        groups: existingMarshal
          ? current.groups
          : [...current.groups, { color: template.color, id: marshalId, name: marshalName }],
        nodes: [
          ...current.nodes.map((node) => {
            if (node.id === "entral" && !existingMarshal) {
              return { ...node, children: [...(node.children ?? []), marshalId], logs: [`${marshalName} added through guided onboarding.`, ...node.logs].slice(0, 10) };
            }

            if (node.id === marshalId) {
              return { ...node, children: [...(node.children ?? []), generalId], logs: [`${generalName} added through guided onboarding.`, ...node.logs].slice(0, 10) };
            }

            return node;
          }),
          ...(newMarshal ? [newMarshal] : []),
          ...newNodes
        ],
        tasks: firstTask ? [firstTask, ...current.tasks] : current.tasks
      }, { fallback: createInitialState() });

      graphRef.current = next;
      return next;
    });

    setBusinessWizard({ ...defaultBusinessWizard, isOpen: false, templateId: template.id });
    setSelectedNodeId(generalId);
    selectedRef.current = generalId;
    setLockedNodeId(generalId);
    lockedNodeIdRef.current = generalId;
    setIsPanelOpen(true);
    setActiveGroupId(marshalId);
    setStatusMessage(`${generalName} created with ${commanderIds.length} Commanders and ${soldierIds.length} Soldiers.`);
    respond({
      analysis: `${generalName} is now under ${marshalName}. ENTRAL created ${commanderIds.length} Commanders, ${soldierIds.length} Soldiers, and the first intake task.`,
      nextActions: template.starterCommands,
      recommendation: "Open the new General, complete the first intake task, then start the launch workflow or assign the next objective.",
      situation: "First business command structure created."
    }, `${generalName} created from ${template.label} template.`, "general");
  }

  function createHierarchyNode(type: Exclude<NodeType, "emperor">, requestedName?: string, forcedParentId?: string) {
    const palette = ["#00F0FF", "#FF00FF", "#39FF14", "#9B5CFF", "#00BFFF", "#FF7AFF"];
    const name = requestedName?.trim() || nextPlaceholderName(type);
    const parentId = forcedParentId ?? parentIdForNewNode(type);

    if (!parentId) {
      respond(creationBlockedTransmission(type));
      return null;
    }

    const parent = graphRef.current.nodes.find((node) => node.id === parentId);
    if (!parent) {
      respond({
        analysis: "The parent entity selected during authorization is no longer available.",
        nextActions: ["Refresh the hierarchy.", "Select a valid parent entity.", "Reissue the creation directive."],
        recommendation: "ENTRAL will not create an orphan entity.",
        situation: "Creation authorization expired."
      });
      return null;
    }

    let groupId = type === "marshal" ? createCommandId(name, "marshal") : parent?.groupId ?? selectedMarshalId() ?? "core";
    const baseId = type === "marshal" ? groupId : `${parentId}-${createCommandId(name, type)}`;
    const id = graphRef.current.nodes.some((node) => node.id === baseId) ? `${baseId}-${Date.now().toString(36)}` : baseId;
    groupId = type === "marshal" ? id : groupId;
    const title = type === "marshal" ? "Marshal" : type === "general" ? "General" : type === "commander" ? "Commander" : "Soldier";
    const blueprint = type === "soldier" ? inferSoldierBlueprint(name) : null;
    const newNode: GraphNode3D = {
      capabilities: type === "marshal" ? ["governance", "tool-orchestration", "status_reporter"] : type === "general" ? ["governance", "tool-orchestration"] : type === "commander" ? ["tool-orchestration"] : ["public-research", "tool-orchestration"],
      children: [],
      commandType: type,
      createdAt: new Date().toISOString(),
      currentTask: null,
      description: `${name} is a ${title}${parent ? ` under ${parent.name}` : ""}.`,
      businessName: type === "general" ? name.replace(/\s+General$/i, "") : undefined,
      groupId,
      health: 100,
      id,
      logs: [`${name} created from the Command Center.`],
      memory: {
        instructions: blueprint?.role ?? `Operate as ${name}, accept delegated tasks, and report status to ${parent?.name ?? "ENTRAL"}.`,
        notes: [`Created under ${parent?.name ?? "ENTRAL"} from the local Command Center.`],
        recentTasks: [],
        role: blueprint?.role ?? `${title} command layer`,
        taskResults: []
      },
      metrics: { cost: 0, roi: 0, successRate: 100 },
      generalType: type === "general" ? "Other" : undefined,
      marshalType: type === "marshal" ? "Other" : undefined,
      name,
      parentCommanderId: type === "soldier" ? parent?.id ?? null : null,
      parentCommanderName: type === "soldier" ? parent?.name ?? null : null,
      operationalArea: type === "commander" ? name.replace(/\s+Commander$/i, "") : undefined,
      parentId,
      parentGeneralId: type === "commander" || type === "soldier" ? lineageForNode(parentId).find((node) => node.commandType === "general")?.id ?? null : null,
      parentGeneralName: type === "commander" || type === "soldier" ? lineageForNode(parentId).find((node) => node.commandType === "general")?.name ?? null : null,
      parentMarshalId: type !== "marshal" ? lineageForNode(parentId).find((node) => node.commandType === "marshal")?.id ?? null : null,
      parentMarshalName: type !== "marshal" ? lineageForNode(parentId).find((node) => node.commandType === "marshal")?.name ?? null : null,
      permissions: blueprint?.permissions ?? ["read_command_context", "manage_children", "report_status"],
      progress: 0,
      reasoning: `ENTRAL added ${name} to expand the ${title} layer. Real autonomous execution remains policy-gated.`,
      role: blueprint?.role ?? `${title} command layer`,
      status: "idle",
      taskHistory: [],
      title,
      tools: blueprint?.tools ?? ["command_bus", "status_reporter"],
      type: "agent",
      vx: 0,
      vy: 0,
      vz: 0,
      x: parent?.x ?? 160,
      y: parent ? parent.y + 24 : 40,
      z: parent?.z ?? 160
    };

    setGraph((current) => {
      const next = validateCommandOSState({
        ...current,
        edges: [...current.edges, { id: `e-${parentId}-${id}`, label: `${type} command link`, source: parentId, target: id }],
        groups: type === "marshal"
          ? [...current.groups, { color: palette[current.groups.length % palette.length], id, name }]
          : current.groups,
        nodes: current.nodes
          .map((node) => (node.id === parentId ? { ...node, children: [...(node.children ?? []), id] } : node))
          .concat(newNode)
      }, { fallback: createInitialState() });

      graphRef.current = next;
      return next;
    });
    setSelectedNodeId(id);
    setLockedNodeId(type === "marshal" || type === "general" || type === "commander" || type === "soldier" ? id : null);
    lockedNodeIdRef.current = id;
    setIsPanelOpen(true);
    respond({
      analysis: `${name} now reports to ${parent?.name ?? "ENTRAL"}. This ${title} is active in local Command OS structure.`,
      nextActions: type === "soldier" ? ["Assign an execution task.", "Review permissions.", "Inspect memory."] : ["Add subordinate entities.", "Inspect readiness.", "Assign an objective."],
      recommendation: "Use the new entity for hierarchy planning until real execution wiring is connected.",
      situation: `${title} created successfully.`
    }, `${name} ${title} created.`, commandSpeakerFromNodeType(type));
    return newNode;
  }

  function descendantIdsFor(nodeId: string, nodes = graphRef.current.nodes) {
    const descendants: string[] = [];
    const stack = nodes.filter((node) => node.parentId === nodeId).map((node) => node.id);

    while (stack.length > 0) {
      const id = stack.pop() as string;
      descendants.push(id);
      stack.push(...nodes.filter((node) => node.parentId === id).map((node) => node.id));
    }

    return descendants;
  }

  function requestRemoveNode(nodeId = selectedNodeId) {
    const target = graphRef.current.nodes.find((node) => node.id === nodeId);

    if (!target || target.type === "core") {
      respond({
        analysis: "ENTRAL is the stationary command authority and root of every valid hierarchy path.",
        recommendation: "Remove subordinate Marshals, Generals, Commanders, or Soldiers instead.",
        situation: "Removal denied."
      });
      return;
    }

    setPendingRemovalId(target.id);
  }

  function confirmRemoveNode() {
    const target = pendingRemovalId ? graphRef.current.nodes.find((node) => node.id === pendingRemovalId) : null;

    if (!target) {
      setPendingRemovalId(null);
      return;
    }

    const descendants = descendantIdsFor(target.id);
    const nextSelectedId = target.parentId ?? "entral";

    setGraph((current) => {
      const { state: next } = removeCommandEntity(current, target.id, createInitialState());

      graphRef.current = next;
      return next;
    });
    setPendingRemovalId(null);
    setLockedNodeId(null);
    lockedNodeIdRef.current = null;
    setSelectedNodeId(nextSelectedId);
    respond({
      analysis: `${descendants.length} descendant${descendants.length === 1 ? "" : "s"} and any connected hierarchy links were removed from local state.`,
      nextActions: ["Inspect the parent entity.", "Create replacement capacity if required.", "Review task history for impact."],
      recommendation: "Confirm the remaining command chain before assigning new objectives.",
      situation: `${target.name} removed from the Command OS structure.`
    }, `${target.name} removed from the Command OS structure.`);
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
      : orbitPoint({ ...meta, radius: meta.radius * (1.28 - controls.gravity * 0.36) }, timeRef.current * meta.speed * controls.orbitSpeed + meta.phase, controls.orbitPattern);

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
    setLockedNodeId(node.type === "core" ? null : node.id);
    lockedNodeIdRef.current = node.type === "core" ? null : node.id;
    setCamera({
      distance: node.type === "core" ? 500 : 420,
      target: { x: node.x, y: node.y, z: node.z }
    });
    setStatusMessage(`Zoomed to ${node.name}. ENTRAL updated graph focus from command directive.`);
  }

  function fitGraph(message = "Fit graph to the full command field.") {
    setLockedNodeId(null);
    lockedNodeIdRef.current = null;
    setCamera({ ...defaultCamera, target: { ...defaultCamera.target } });
    setSelectedNodeId("entral");
    selectedRef.current = "entral";
    setActiveGroupId(null);
    setActiveStatusFilter(null);
    setSearch("");
    setStatusMessage(message);
  }

  function returnToFullPicture() {
    setIsFocusMode(false);
    setPendingRemovalId(null);
    setTooltip(null);
    setHoveredNodeId(null);
    fitGraph("Returned to the full command picture.");
  }

  function openSettings(tab: "appearance" | "account" | "assistant" | "voice" | "academy" = "appearance") {
    window.dispatchEvent(new CustomEvent("entral:open-settings", { detail: { tab } }));
  }

  function appendConsoleMessage(role: CommandConsoleMessage["role"], content: string, sourceType: CommandSpeaker = role === "operator" ? "operator" : "emperor") {
    setCommandHistory((current) => [
      ...current.slice(-10),
      {
        content,
        id: `${role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        sourceLabel: commandSourceLabel(sourceType),
        sourceType
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

  function respond(message: string | CommandReport, activity?: string, sourceType: CommandSpeaker = "emperor") {
    const rawTransmission = formatCommandTransmission(message);
    const explicitSourceType = commandSpeakerFromPrefix(rawTransmission) ?? sourceType;
    const transmission = stripCommandSourcePrefix(rawTransmission);

    setStatusMessage(statusLineForTransmission(transmission));
    appendConsoleMessage("system", transmission, explicitSourceType);
    speak(transmission, explicitSourceType, commandSourceLabel(explicitSourceType));
    recordActivity(activity ?? statusLineForTransmission(transmission));
  }

  function openAtomControls() {
    setIsControlsOpen(true);
    respond("Objective acknowledged. Graph controls expanded inside the unified command console.");
  }

  function closeAtomControls() {
    setIsControlsOpen(false);
    respond("Objective acknowledged. Graph controls collapsed inside the unified command console.");
  }

  function openMobileTab(tab: MobileCommandTab) {
    setMobileTab(tab);
    setIsCommandConsoleOpen(tab === "command");

    if (tab !== "command") {
      setIsPanelOpen(false);
    }
  }

  function openCommandAccessTab(tab: MobileCommandTab) {
    setMobileTab(tab);

    if (typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches) {
      openMobileTab(tab);
    }
  }

  function toggleInfoPanel() {
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

  function marshalIdFromCommand(text: string) {
    const normalized = text.toLowerCase();
    const explicitNode = commandTextToNode(text, graphRef.current.nodes);

    if (explicitNode?.commandType === "marshal") return explicitNode.id;
    if (explicitNode) return lineageForNode(explicitNode.id).find((node) => node.commandType === "marshal")?.id ?? selectedMarshalId();

    return graphRef.current.nodes.find((node) => node.commandType === "marshal" && (normalized.includes(node.id) || normalized.includes(node.name.toLowerCase())))?.id
      ?? selectedMarshalId();
  }

  function commandHasMarshalContext(text: string) {
    const normalized = text.toLowerCase();
    const explicitNode = commandTextToNode(text, graphRef.current.nodes);

    if (explicitNode?.commandType === "marshal") return true;
    if (graphRef.current.nodes.some((node) => node.commandType === "marshal" && (normalized.includes(node.id) || normalized.includes(node.name.toLowerCase())))) return true;
    if (activeGroupId && graphRef.current.nodes.some((node) => node.id === activeGroupId && node.commandType === "marshal")) return true;

    const selected = selectedRef.current ? graphRef.current.nodes.find((node) => node.id === selectedRef.current) : null;
    return Boolean(selected && selected.commandType !== "emperor" && lineageForNode(selected.id).some((node) => node.commandType === "marshal"));
  }

  function generalIdFromCommand(text: string) {
    const normalized = text.toLowerCase();
    const explicitNode = commandTextToNode(text, graphRef.current.nodes);

    if (explicitNode?.commandType === "general") return explicitNode.id;
    if (explicitNode?.commandType === "commander" || explicitNode?.commandType === "soldier") {
      return lineageForNode(explicitNode.id).find((node) => node.commandType === "general")?.id ?? null;
    }

    return graphRef.current.nodes.find((node) => node.commandType === "general" && (normalized.includes(node.id) || normalized.includes(node.name.toLowerCase())))?.id
      ?? null;
  }

  function commanderIdFromCommand(text: string) {
    const node = commandTextToNode(text, graphRef.current.nodes);

    if (node?.commandType === "commander") return node.id;
    if (node?.commandType === "soldier") return node.parentId ?? null;
    if (selectedNode?.commandType === "commander") return selectedNode.id;
    if (selectedNode?.commandType === "soldier") return selectedNode.parentId ?? null;

    return null;
  }

  function parentIdForNewNode(type: Exclude<NodeType, "emperor">) {
    const selected = selectedRef.current ? graphRef.current.nodes.find((node) => node.id === selectedRef.current) : null;

    if (type === "marshal") return "entral";

    if (type === "general") {
      if (activeGroupId && graphRef.current.nodes.some((node) => node.id === activeGroupId && node.commandType === "marshal")) {
        return activeGroupId;
      }

      if (selected?.commandType === "marshal") return selected.id;
      if (selected && selected.commandType !== "emperor") {
        return lineageForNode(selected.id).find((node) => node.commandType === "marshal")?.id ?? null;
      }

      return null;
    }

    if (type === "commander") {
      if (selected?.commandType === "general") return selected.id;
      if (selected?.commandType === "commander" || selected?.commandType === "soldier") {
        return lineageForNode(selected.id).find((node) => node.commandType === "general")?.id ?? null;
      }

      return null;
    }

    if (selected?.commandType === "commander") return selected.id;
    if (selected?.commandType === "soldier") return selected.parentId ?? null;
    return null;
  }

  function hierarchyNameFromCommand(text: string, type: Exclude<NodeType, "emperor">) {
    return hierarchyNameFromCommandText(text, type, graphRef.current.nodes);
  }

  function focusCommandNode(node: GraphNode3D) {
    focusNode(node);

    if (node.commandType === "marshal") {
      const marshalGeneralCount = graphRef.current.nodes.filter((candidate) => candidate.parentId === node.id && candidate.commandType === "general").length;
      const marshalCommanderCount = graphRef.current.nodes.filter((candidate) => lineageForNode(candidate.id).some((ancestor) => ancestor.id === node.id) && candidate.commandType === "commander").length;
      const marshalSoldierCount = graphRef.current.nodes.filter((candidate) => lineageForNode(candidate.id).some((ancestor) => ancestor.id === node.id) && candidate.commandType === "soldier").length;

      setActiveGroupId(node.id);
      respond({
        analysis: `${marshalGeneralCount} business Generals, ${marshalCommanderCount} Commanders, and ${marshalSoldierCount} Soldiers are assigned to this theater. Current health: ${node.health}%.`,
        nextActions: ["Inspect a business General.", "Create or move a General under this Marshal.", "Review theater reports and risk warnings."],
        recommendation: "Use Marshal view for portfolio-level command before drilling into individual businesses.",
        situation: `${node.name} theater operational. ENTRAL and unrelated upper context are hidden for focused inspection.`
      }, `${node.name} Marshal focused.`, "marshal");
    } else if (node.commandType === "general") {
      const commanderCount = graphRef.current.nodes.filter((candidate) => candidate.parentId === node.id && candidate.commandType === "commander").length;
      const soldierCount = graphRef.current.nodes.filter((candidate) => lineageForNode(candidate.id).some((ancestor) => ancestor.id === node.id) && candidate.commandType === "soldier").length;
      const parentMarshal = node.parentId ? graphRef.current.nodes.find((candidate) => candidate.id === node.parentId) : null;

      setActiveGroupId(node.groupId);
      respond({
        analysis: `${commanderCount} Commanders and ${soldierCount} Soldiers are attached to this business General under ${parentMarshal?.name ?? "an assigned Marshal"}. Current health: ${node.health}%.`,
        nextActions: ["Inspect operating Commanders.", "Create or remove subordinate entities.", "Assign an objective for delegation."],
        recommendation: "Review business readiness before assigning execution work.",
        situation: `${node.name} General operational. Upper ranks are hidden for focused inspection.`
      }, `${node.name} General focused.`, "general");
    } else if (node.commandType === "emperor") {
      fitGraph();
      respond({
        analysis: `${marshalNodes.length} Marshals, ${generalNodes.length} business Generals, ${commanderNodes.length} Commanders, and ${soldierNodes.length} Soldiers are visible in the full hierarchy.`,
        nextActions: ["Select a Marshal.", "Inspect a business General.", "Assign a new objective."],
        recommendation: "Maintain command from the ENTRAL overview when broad situational awareness is required.",
        situation: "Returned to ENTRAL overview. Full chain of command is visible."
      }, "Returned to ENTRAL overview.", "emperor");
    } else if (node.commandType === "commander") {
      const soldierCount = graphRef.current.nodes.filter((candidate) => candidate.parentId === node.id && candidate.commandType === "soldier").length;

      respond({
        analysis: `${soldierCount} Soldiers are attached under ${node.parentGeneralName ?? "the selected business General"}. Current status: ${statusLabel(node.status)}. Health: ${node.health}%.`,
        nextActions: ["Inspect assigned Soldiers.", "Create a Soldier if execution capacity is needed.", "Assign a task to this operation lane."],
        recommendation: "Use this Commander for task breakdown and Soldier routing.",
        situation: `${node.name} operational lane selected. Upper ranks are hidden for execution focus.`
      }, `${node.name} Commander focused.`, "commander");
    } else if (node.commandType === "soldier") {
      const parentCommander = node.parentId ? graphRef.current.nodes.find((candidate) => candidate.id === node.parentId) : null;

      respond({
        analysis: `Parent Commander: ${parentCommander?.name ?? "Unknown"}. Business General: ${node.parentGeneralName ?? "Unknown"}. Marshal: ${node.parentMarshalName ?? "Unknown"}. Current task: ${node.currentTask ?? "No active task."}`,
        nextActions: ["Review task history.", "Assign execution work.", "Monitor result logs."],
        recommendation: "Use this Soldier for final execution steps and concise completion reports.",
        situation: `${node.name} execution unit selected. Showing this Soldier and its connected Commander.`
      }, `${node.name} Soldier focused.`, "soldier");
    } else {
      respond({
        analysis: "Inspector is displaying status, parent command, permissions, tools, children, and logs.",
        recommendation: "Review the entity record before issuing a mutation or delegation command.",
        situation: `${node.name} selected.`
      }, `${node.name} selected.`, commandSpeakerFromNodeType(node.commandType));
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
    setStatusMessage("Analysis in progress. Evaluating directive.");

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
      respond(response.content, "ENTRAL returned strategic command analysis.");
    } catch (error) {
      respond({
        analysis: error instanceof Error ? error.message : "The command channel did not return a diagnostic.",
        nextActions: ["Verify the backend is running.", "Confirm OpenAI configuration.", "Retry the directive after connectivity is restored."],
        recommendation: "Use local graph commands until the AI command channel is restored.",
        situation: "AI command channel unavailable."
      }, "AI backend request failed.");
    } finally {
      setIsThinking(false);
    }
  }

  function createOperationalBriefing(label = "Operational readiness report"): CommandReport {
    return buildCommandOSReport({
      label,
      nodes: graphRef.current.nodes,
      targetId: "entral",
      tasks: graphRef.current.tasks
    });
  }

  function createFocusedReport(target: GraphNode3D | null | undefined, label?: string) {
    const reportTarget = target ?? graphRef.current.nodes.find((node) => node.id === "entral") ?? null;

    return buildCommandOSReport({
      label,
      nodes: graphRef.current.nodes,
      targetId: reportTarget?.id,
      tasks: graphRef.current.tasks
    });
  }

  function recordFocusedReport(target: GraphNode3D | null | undefined, label?: string) {
    const reportTarget = target ?? graphRef.current.nodes.find((node) => node.id === "entral") ?? null;
    const record = buildCommandOSReportRecord({
      createdAt: new Date().toISOString(),
      label,
      nodes: graphRef.current.nodes,
      targetId: reportTarget?.id,
      tasks: graphRef.current.tasks
    });

    if (!record || !reportTarget) {
      return;
    }

    const recipientIds = new Set(lineageForNode(reportTarget.id, graphRef.current.nodes).map((node) => node.id));
    recipientIds.add(record.sourceEntityId);
    recipientIds.add(record.destinationEntityId);

    setGraph((current) => {
      const next = {
        ...current,
        nodes: current.nodes.map((node) => {
          if (!recipientIds.has(node.id)) {
            return node;
          }

          const reportHistory = [record, ...(node.reportHistory ?? [])].slice(0, 20);

          return {
            ...node,
            logs: [`Report received: ${record.situation}`, ...node.logs].slice(0, 10),
            memory: {
              ...node.memory,
              notes: [`Report ${record.id}: ${record.situation}`, ...node.memory.notes].slice(0, 10)
            },
            reportHistory,
            reports: reportHistory
          };
        }),
        tasks: current.tasks.map((task) => {
          if (task.assignedEntityId !== reportTarget.id && !task.delegationPath.some((id) => recipientIds.has(id))) {
            return task;
          }

          return {
            ...task,
            reportHistory: [record, ...(task.reportHistory ?? [])].slice(0, 20)
          };
        })
      };

      graphRef.current = next;
      return next;
    });
  }

  function isHelpCommand(normalized: string) {
    return normalized === "help"
      || normalized === "?"
      || normalized.includes("what can you do")
      || normalized.includes("show commands")
      || normalized.includes("show help")
      || normalized.includes("command help")
      || normalized.includes("how do i use")
      || normalized.includes("explain the chain of command");
  }

  function createCommandHelpTransmission() {
    return [
      "ENTRAL Command Help",
      "",
      "What ENTRAL Is:",
      "ENTRAL is a command operating system for building, organizing, and managing business operations through a structured hierarchy.",
      "",
      "Chain of Command:",
      "ENTRAL oversees Marshals. Marshals oversee Generals. Generals are businesses or operations. Commanders manage departments. Soldiers execute tasks.",
      "",
      "Common Commands:",
      "- Create a Marshal",
      "- Create a business called Iron House Gym",
      "- Show hierarchy",
      "- Show tasks",
      "- Generate report",
      "- Start tutorial",
      "- Open mobile guide",
      "",
      "Structure Creation:",
      "- Create Merch Marshal",
      "- Create General named Iron House Gym under Merch Marshal",
      "- Create Design Commander under Iron House Gym",
      "- Create Typography Soldier under Design Commander",
      "",
      "Business Creation:",
      "- Create my first business",
      "- I want to start a POD business",
      "- I want to build a website agency",
      "- Use template",
      "",
      "Tasks and Reports:",
      "- Create task Review the command hierarchy",
      "- Report on Merch Marshal",
      "- Report on Iron House Gym",
      "- Show what needs attention",
      "",
      "Voice, Mobile, Tutorials:",
      "- ENTRAL, report",
      "- Start voice guide",
      "- Show mobile guide",
      "- Replay tutorial",
      "",
      "Troubleshooting:",
      "If a directive needs more detail, ENTRAL will ask for the missing Marshal, General, Commander, Soldier, or approval before execution proceeds."
    ].join("\n");
  }

  function requestDemoEnvironmentAuthorization() {
    const template = businessTemplates[0];

    setMobileTab("command");
    setIsCommandConsoleOpen(true);
    requestBusinessTemplateAuthorization(template, {
      ...defaultBusinessWizard,
      audience: "Demo operators learning ENTRAL",
      businessName: "Demo Merch Lab",
      goal: "Explore Command OS structure safely",
      industry: "Client merch and POD operations",
      isOpen: false,
      templateId: template.id
    });
  }

  function isBriefingCommand(normalized: string) {
    return normalized === "report"
      || normalized.includes("status report")
      || normalized.includes("morning briefing")
      || normalized.includes("daily briefing")
      || normalized.includes("theater status")
      || normalized.includes("business status")
      || normalized.includes("operational readiness")
      || normalized.includes("active tasks")
      || normalized.includes("mission update")
      || normalized.includes("system health")
      || normalized.includes("entral report");
  }

  function stopVoiceRecognition() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  function startVoiceRecognition() {
    setVoiceStatus("Voice channel opening. Awaiting directive.");

    if (isListening) {
      stopVoiceRecognition();
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setVoiceStatus("Voice recognition unavailable in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceStatus("Microphone permission denied or voice channel unavailable.");
    };
    recognition.onresult = (event) => {
      const transcript = collectTranscript(event);
      const routed = normalizeWakeWordCommand(transcript, voiceSettings.wakeWordEnabled);

      if (!transcript) {
        setVoiceStatus("No directive detected.");
        return;
      }

      if (!routed.accepted) {
        setVoiceStatus("Wake word required. Begin with ENTRAL, Marshal, General, or Commander.");
        return;
      }

      setVoiceStatus(`Directive captured: ${transcript}`);
      executeCommand(routed.command);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  function handleVoiceButtonClick() {
    if (isListening) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  }

  function executeCommand(commandText: string) {
    const rawText = commandText.trim();
    const text = rawText.replace(/^(entral|marshal|general|commander)[,\s:;-]+/i, "").trim() || rawText;
    const actionPlan = planCommandAction(rawText);
    const intent = actionPlan.intent;
    const normalized = text.toLowerCase();
    const group = commandTextToGroup(text, graph.groups);
    const commandNode = commandTextToNode(text, graph.nodes);
    const selected = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
    const numberMatch = /(\d+(?:\.\d+)?)/.exec(normalized);
    const numericValue = numberMatch ? Number(numberMatch[1]) : null;

    if (!rawText) return;
    appendConsoleMessage("operator", rawText, "operator");

    if (pendingAuthorization && actionPlan.kind === "approve_authorization") {
      approvePendingAuthorization();
    } else if (pendingAuthorization && actionPlan.kind === "cancel_authorization") {
      cancelPendingAuthorization();
    } else if (actionPlan.kind === "open_help" || isHelpCommand(normalized)) {
      respond(createCommandHelpTransmission(), "ENTRAL Command Help opened.");
    } else if (actionPlan.kind === "open_voice_settings" && intent.kind === "tutorial_request") {
      openSettings("voice");
      respond({
        analysis: "Voice settings are open. Push-to-talk, speech mode, volume, speed, and voice selection can be configured there.",
        nextActions: ["Enable speech if desired.", "Use push-to-talk to issue a directive.", "Say: ENTRAL, report."],
        recommendation: "Start with Reports Only voice mode until the command structure is familiar.",
        situation: "Voice guide opened."
      });
    } else if (actionPlan.kind === "open_mobile_guide") {
      setMobileTab("more");
      setIsCommandConsoleOpen(false);
      respond({
        analysis: "Mobile controls: one finger pans the graph, two fingers rotate the point of view, pinch zooms, and the bottom tabs expose Command, Hierarchy, Tasks, Reports, and More.",
        nextActions: ["Open the Hierarchy tab.", "Inspect a node.", "Return to Command to issue directives."],
        recommendation: "Use the bottom tabs as the primary mobile navigation system.",
        situation: "Mobile guide displayed."
      });
    } else if (actionPlan.kind === "open_tutorial") {
      routeWorkspaceAction("Training channel selected. Opening ENTRAL Academy.", undefined, normalized.includes("library") || normalized.includes("academy") ? "entral:open-academy" : "entral:open-tutorial");
    } else if (intent.kind === "tutorial_request") {
      if (normalized.includes("voice guide")) {
        openSettings("voice");
        respond({
          analysis: "Voice settings are open. Push-to-talk, speech mode, volume, speed, and voice selection can be configured there.",
          nextActions: ["Enable speech if desired.", "Use push-to-talk to issue a directive.", "Say: ENTRAL, report."],
          recommendation: "Start with Reports Only voice mode until the command structure is familiar.",
          situation: "Voice guide opened."
        });
      } else if (normalized.includes("mobile guide")) {
        setMobileTab("more");
        setIsCommandConsoleOpen(false);
        respond({
          analysis: "Mobile controls: one finger pans the graph, two fingers rotate the point of view, pinch zooms, and the bottom tabs expose Command, Hierarchy, Tasks, Reports, and More.",
          nextActions: ["Open the Hierarchy tab.", "Inspect a node.", "Return to Command to issue directives."],
          recommendation: "Use the bottom tabs as the primary mobile navigation system.",
          situation: "Mobile guide displayed."
        });
      } else {
        routeWorkspaceAction("Training channel selected. Opening ENTRAL Academy.", undefined, normalized.includes("library") || normalized.includes("academy") ? "entral:open-academy" : "entral:open-tutorial");
      }
    } else if (actionPlan.kind === "open_voice_settings" || intent.kind === "voice_request") {
      openSettings("voice");
      respond({
        analysis: "Voice command settings are open. ENTRAL can accept push-to-talk directives and speak reports based on the configured speech mode.",
        nextActions: ["Enable speech if desired.", "Set speech mode to Reports Only or Full Voice.", "Use the microphone button in the command console."],
        recommendation: "Use push-to-talk for controlled command entry.",
        situation: "Voice command channel selected."
      });
    } else if (actionPlan.kind === "return_to_entral") {
      const entral = graphRef.current.nodes.find((node) => node.id === "entral");
      if (entral) focusCommandNode(entral);
    } else if (actionPlan.kind === "open_tasks") {
      openCommandAccessTab("tasks");
      respond({
        analysis: `${graphRef.current.tasks.length} task${graphRef.current.tasks.length === 1 ? "" : "s"} are currently recorded in local Command OS state.`,
        nextActions: ["Create a task from Command.", "Select an assigned entity to inspect work history.", "Use a business template to generate starter tasks."],
        recommendation: "Use the Tasks tab as the fastest mobile view of active work.",
        situation: "Task center opened."
      });
    } else if (actionPlan.kind === "open_reports") {
      openCommandAccessTab("reports");
      respond({
        analysis: `${recentReportMessages.length} recent report${recentReportMessages.length === 1 ? "" : "s"} are available in the command feed.`,
        nextActions: ["Generate a system report.", "Report on a Marshal or business General.", "Open related entities from report context."],
        recommendation: "Use reports to review Situation, Analysis, Recommendation, and Next Actions without searching chat history.",
        situation: "Report center opened."
      });
    } else if (actionPlan.kind === "open_businesses") {
      setActiveStatusFilter(null);
      setSearch("general");
      openCommandAccessTab("hierarchy");
      respond({
        analysis: `${generalNodes.length} business General${generalNodes.length === 1 ? "" : "s"} currently exist. Generals represent businesses, clients, brands, stores, or operations.`,
        nextActions: ["Open a business General.", "Create a business with the wizard.", "Generate a General report."],
        recommendation: "Use Generals as the primary business records inside ENTRAL.",
        situation: "Business Generals displayed."
      }, "Business General list displayed.", "general");
    } else if (intent.kind === "report_request") {
      const reportTarget = commandNode ?? selected ?? graphRef.current.nodes.find((node) => node.id === "entral") ?? null;
      const reportLabel = normalized.includes("morning")
        ? "Morning briefing"
        : normalized.includes("what needs attention") || normalized.includes("what is wrong")
          ? "Attention Report"
          : normalized.includes("readiness")
            ? "Operational readiness report"
            : undefined;
      const report = createFocusedReport(reportTarget, reportLabel);

      recordFocusedReport(reportTarget, reportLabel);
      respond(report, `${reportTarget?.name ?? "ENTRAL"} report generated.`, commandSpeakerFromNodeType(reportTarget?.commandType ?? "emperor"));
    } else if (isBriefingCommand(normalized)) {
      respond(createOperationalBriefing(normalized.includes("morning") ? "Morning briefing" : "Operational status report"));
    } else if (actionPlan.kind === "show_hierarchy") {
      setActiveStatusFilter(null);
      setSearch("");
      fitGraph();
      respond({
        analysis: `${marshalNodes.length} Marshals, ${generalNodes.length} business Generals, ${commanderNodes.length} Commanders, and ${soldierNodes.length} Soldiers are currently registered.`,
        nextActions: ["Select a command tier.", "Filter active or failing nodes.", "Create additional structure if required."],
        recommendation: "Use this overview for broad command awareness.",
        situation: "Full chain of command displayed."
      });
    } else if (actionPlan.kind === "show_alerts") {
      setStatusHighlight(["error", "waiting", "offline"], "Highlighted error, waiting, and offline hierarchy nodes.");
    } else if (actionPlan.kind === "show_marshals") {
      setActiveStatusFilter(null);
      setSearch("marshal");
      respond({
        analysis: `${marshalNodes.length} Marshals are registered. Generals must belong to a Marshal before Commanders or Soldiers can be created.`,
        nextActions: ["Open a Marshal.", "Create a new Marshal.", "Create or move business Generals under a Marshal."],
        recommendation: "Use Marshals as strategic theaters for groups of businesses, clients, brands, stores, or operations.",
        situation: "Marshal layer displayed."
      }, "Marshal list displayed.", "marshal");
    } else if (actionPlan.kind === "show_active") {
      setStatusHighlight(["working", "thinking"], "Highlighted working and thinking hierarchy nodes.");
    } else if (normalized.includes("demo environment") || normalized.includes("demo command") || normalized.includes("load demo")) {
      requestDemoEnvironmentAuthorization();
    } else if (intent.kind === "template_request") {
      const template = templateFromText(text);
      openBusinessWizard(template?.id);
    } else if (
      intent.kind === "business_creation_request" ||
      normalized.includes("business wizard") ||
      normalized.includes("business template") ||
      normalized.includes("create my first business") ||
      normalized.includes("set up my first business") ||
      normalized.includes("start my first business") ||
      normalized.includes("help me create") ||
      normalized.includes("guide me") ||
      normalized.includes("first business")
    ) {
      const template = templateFromText(text);
      const businessName = businessNameFromCommand(text);

      if (businessName && template) {
        requestBusinessTemplateAuthorization(template, {
          ...businessWizard,
          businessName,
          isOpen: false,
          templateId: template.id
        });
      } else {
        openBusinessWizard(template?.id);
        if (businessName) updateBusinessWizard({ businessName });
      }
    } else if (normalized.includes("pause all failed")) {
      setGraph((current) => {
        const next = {
          ...current,
          nodes: current.nodes.map((node) => (node.type !== "core" && (node.status === "error" || node.status === "waiting") ? { ...node, logs: ["Marked offline from Command OS bulk command.", ...node.logs], status: "offline" as GraphStatus } : node))
        };

        graphRef.current = next;
        return next;
      });
      respond("Objective acknowledged. Failed and waiting hierarchy nodes were marked offline in local mode. No external systems were touched.");
    } else if ((normalized.includes("remove") || normalized.includes("delete") || normalized.includes("archive")) && (normalized.includes("marshal") || normalized.includes("general") || normalized.includes("commander") || normalized.includes("soldier"))) {
      const removalTarget = commandNode ?? selected;

      if (removalTarget && removalTarget.type !== "core") {
        if (normalized.includes("archive")) {
          requestArchiveAuthorization(removalTarget);
        } else {
          requestRemoveNode(removalTarget.id);
          respond("Removal confirmation opened. Review name, parent relationship, and child impact before confirming.");
        }
      } else {
        requestRemoveNode(selectedNodeId);
      }
    } else if (normalized.includes("create") && normalized.includes("marshal")) {
      requestNodeAuthorization("marshal", hierarchyNameFromCommand(text, "marshal"));
    } else if (normalized.includes("create") && (normalized.includes("business") || normalized.includes("client") || normalized.includes("brand") || normalized.includes("store") || normalized.includes("project") || normalized.includes("operation")) && !normalized.includes("commander") && !normalized.includes("soldier")) {
      const template = templateFromText(text);
      const businessName = businessNameFromCommand(text);

      if (template && businessName) {
        requestBusinessTemplateAuthorization(template, {
          ...businessWizard,
          businessName,
          isOpen: false,
          templateId: template.id
        });
        return;
      }

      if (template && !businessName) {
        openBusinessWizard(template.id);
        return;
      }

      if (!commandHasMarshalContext(text)) {
        respond({
          analysis: "A business General must belong to a Marshal before creation can proceed.",
          nextActions: ["Open the business wizard.", "Select a template.", "Or say: Create General named Iron House Gym under Merch Marshal."],
          recommendation: "Create or select a Marshal first so the business is placed inside the official command path.",
          situation: "Additional operational detail is required."
        });
        openBusinessWizard();
        if (businessName) updateBusinessWizard({ businessName });
        return;
      }

      const nameMatch = /\b(?:business|client|brand|store|operation)\s+(?:named|called)?\s*([^,.;]+)/i.exec(text);
      const rawName = nameMatch?.[1]?.trim() || hierarchyNameFromCommand(text, "general").replace(/\s+General$/i, "");
      const marshalId = marshalIdFromCommand(text);
      if (!marshalId) {
        respond({
          analysis: "A Marshal could not be identified for this business General.",
          nextActions: ["Create a Marshal.", "Then create the business General under that Marshal."],
          recommendation: "Use: Create Merch Marshal. Then: Create General named Iron House Gym under Merch Marshal.",
          situation: "General creation is awaiting Marshal selection."
        });
        return;
      }
      setSelectedNodeId(marshalId);
      selectedRef.current = marshalId;
      requestNodeAuthorization("general", /\bGeneral$/i.test(rawName) ? rawName : `${rawName} General`);
    } else if (normalized.includes("create") && normalized.includes("general")) {
      if (!commandHasMarshalContext(text)) {
        respond({
          analysis: "A General represents an actual business, client, brand, store, or operation and must belong to a Marshal.",
          nextActions: ["Select a Marshal.", "Or say: Create General named Iron House Gym under Merch Marshal."],
          recommendation: "Do not create Generals directly under ENTRAL.",
          situation: "Additional operational detail is required."
        });
        return;
      }

      const marshalId = marshalIdFromCommand(text);
      if (!marshalId) {
        respond({
          analysis: "A General must belong to a Marshal, but no Marshal was selected or named.",
          nextActions: ["Create a Marshal.", "Open an existing Marshal.", "Reissue the General creation directive."],
          recommendation: "Do not create Generals directly under ENTRAL.",
          situation: "Additional operational detail is required."
        });
        return;
      }
      setSelectedNodeId(marshalId);
      selectedRef.current = marshalId;
      requestNodeAuthorization("general", hierarchyNameFromCommand(text, "general"));
    } else if (normalized.includes("create") && normalized.includes("commander")) {
      const generalId = generalIdFromCommand(text);
      if (!generalId) {
        respond({
          analysis: "A Commander must belong to a business General, but no General was selected or named.",
          nextActions: ["Create a Marshal.", "Create a business General under it.", "Then create the Commander."],
          recommendation: "Use the business setup wizard if you want ENTRAL to build the structure for you.",
          situation: "Commander creation is awaiting General selection."
        });
        return;
      }
      setSelectedNodeId(generalId);
      selectedRef.current = generalId;
      requestNodeAuthorization("commander", hierarchyNameFromCommand(text, "commander"));
    } else if (normalized.includes("create") && normalized.includes("soldier")) {
      const commanderId = commanderIdFromCommand(text);

      if (commanderId) {
        setSelectedNodeId(commanderId);
        selectedRef.current = commanderId;
        requestNodeAuthorization("soldier", hierarchyNameFromCommand(text, "soldier"));
      } else {
        requestNodeAuthorization("soldier", hierarchyNameFromCommand(text, "soldier"));
      }
    } else if (normalized.includes("approval queue") || normalized.includes("approve products") || normalized.includes("product approvals")) {
      setIsControlsOpen(true);
      void loadApprovalQueue();
      respond({
        analysis: "The generated product approval queue is open. Products are blocked from publishing until marked Approved.",
        nextActions: ["Review each product card.", "Approve, revise, reject, or archive each product.", "Publish only approved products."],
        recommendation: "Use the queue as the gate between generated drafts and publishing readiness.",
        situation: "Approval queue ready."
      });
    } else if (normalized.includes("pricing calculator") || normalized.includes("price calculator") || normalized.includes("profit calculator") || normalized.includes("profit margin")) {
      setIsControlsOpen(true);
      void loadMerchStores(true);
      respond({
        analysis: "The Merch pricing calculator is open in Unified Controls with Etsy, Shopify, and Manual presets.",
        nextActions: ["Enter supplier cost, shipping, retail price, fees, and ad spend.", "Calculate estimated profit, margin, break-even, and recommended retail price.", "Use results before approving products."],
        recommendation: "Validate margin before products enter launch approval.",
        situation: "Pricing calculator ready."
      });
    } else if (normalized.includes("launch package") || normalized.includes("build package")) {
      setIsControlsOpen(true);
      void loadMerchStores(true);
      void loadApprovalQueue(true);
      respond({
        analysis: "Launch Package controls are open. Packages include brand summary, audience summary, approved products, listing drafts, compliance notes, checklists, social captions, QR flyer copy, and client approval checklist.",
        nextActions: ["Select the Client Merch Store.", "Approve products before package generation.", "Build the launch package."],
        recommendation: "Only approved products should be included in launch-ready materials.",
        situation: "Launch package generator ready."
      });
    } else if (normalized.includes("store report") || normalized.includes("weekly report") || normalized.includes("sales report") || normalized.includes("profit estimate") || normalized.includes("client update report") || normalized.includes("design opportunity report")) {
      setIsControlsOpen(true);
      void loadMerchStores(true);
      respond({
        analysis: "Merch reporting controls are open. Reports use ENTRAL's Situation, Analysis, Recommendation, and Next Actions structure.",
        nextActions: ["Select the Client Merch Store.", "Choose report type.", "Generate the report for review."],
        recommendation: "Use reports for internal review before client delivery.",
        situation: "Merch reporting ready."
      });
    } else if (isProductBatchCommand(normalized)) {
      openProductBatchGenerator();
      setProductBatchForm((current) => ({ ...current, productCount: batchCountFromCommand(text) }));
      respond({
        analysis: "The Product Batch Generator is open in Unified Controls. Store, product type, style, audience, pricing, batch size, and risk fields are ready.",
        nextActions: ["Select a Client Merch Store.", "Confirm product lanes and pricing range.", "Generate the batch."],
        recommendation: "Use 5 or 10 products for the first review set, then expand to 15 or 25 once the direction is approved.",
        situation: "Product Batch Generator standing by."
      });
    } else if (isMerchLaunchWorkflowCommand(normalized)) {
      requestWorkflowAuthorization(text);
    } else if ((normalized.includes("create") || normalized.includes("assign") || normalized.includes("run") || normalized.includes("start")) && normalized.includes("task")) {
      createDelegatedTask(text, commandNode ?? selected);
    } else if (normalized.includes("new chat") || normalized.includes("fresh chat") || normalized.includes("start chat")) {
      routeWorkspaceAction("Directive acknowledged. Opening a fresh ENTRAL communications workspace.", "/chat");
    } else if (normalized.includes("new task") || normalized.includes("create task")) {
      routeWorkspaceAction("Objective channel selected. Opening the task composer and automation console.", "/automations");
    } else if (normalized.includes("run agent") || normalized.includes("assign agent")) {
      routeWorkspaceAction("Agent execution channel selected. Opening the agent runner.", "/agents");
    } else if (normalized.includes("template")) {
      routeWorkspaceAction("Template library selected. Opening the agent template gallery.", "/agents#templates");
    } else if (normalized.includes("export")) {
      routeWorkspaceAction("Export channel selected. Opening history export controls.", "/chat#export");
    } else if (normalized.includes("governance") || normalized.includes("audit") || normalized.includes("admin")) {
      routeWorkspaceAction("Governance channel selected. Opening governance and audit controls.", "/admin");
    } else if (normalized.includes("automation console") || normalized.includes("automations")) {
      routeWorkspaceAction("Automation channel selected. Opening the automation console.", "/automations");
    } else if (normalized.includes("academy") || normalized.includes("tutorial") || normalized.includes("onboarding")) {
      routeWorkspaceAction("Training channel selected. Opening ENTRAL Academy.", undefined, normalized.includes("library") || normalized.includes("academy") ? "entral:open-academy" : "entral:open-tutorial");
    } else if (normalized.includes("shortcut") || normalized.includes("hotkey")) {
      routeWorkspaceAction("Control reference selected. Opening keyboard shortcuts.", undefined, "entral:open-shortcuts");
    } else if (normalized.includes("command palette") || normalized.includes("ctrl k") || normalized.includes("cmd k")) {
      routeWorkspaceAction("Command index selected. Opening the command palette.", undefined, "entral:open-command-palette");
    } else if (normalized.includes("focus mode") || normalized.includes("clean room")) {
      const shouldExit = normalized.includes("exit") || normalized.includes("leave") || normalized.includes("close") || normalized.includes("off");
      setIsFocusMode(!shouldExit);
      respond(shouldExit ? "Focus Mode disengaged. Command center controls restored." : "Focus Mode engaged. Nonessential interface elements are hidden for chain-of-command inspection.");
    } else if (normalized.includes("setting")) {
      openSettings();
      setStatusMessage("Settings channel opened from ENTRAL Command.");
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

      respond(`${shouldHide ? "Collapsed" : shouldShow ? "Expanded" : "Toggled"} unified graph controls from command directive.`);
    } else if (normalized.includes("panel") || normalized.includes("sidebar") || normalized.includes("details")) {
      const shouldHide = normalized.includes("hide") || normalized.includes("close");
      const shouldShow = normalized.includes("show") || normalized.includes("open");

      setIsPanelOpen(shouldHide ? false : shouldShow ? true : (open) => !open);
      respond(`${shouldHide ? "Closed" : shouldShow ? "Opened" : "Toggled"} the side information panel from command directive.`);
    } else if ((normalized.includes("orbit") || normalized.includes("pattern")) && commandTextToOrbitPattern(text)) {
      const orbitPattern = commandTextToOrbitPattern(text) ?? defaultGraphControls.orbitPattern;
      const option = orbitPatternOptions.find((candidate) => candidate.value === orbitPattern);
      patchGraphControls({
        orbitPattern
      }, `Orbit pattern set to ${option?.label ?? orbitPattern}.`);
    } else if (normalized.includes("ring") || normalized.includes("orbit path")) {
      const shouldShow = normalized.includes("show") || normalized.includes("enable") || normalized.includes("turn on");
      const shouldHide = normalized.includes("hide") || normalized.includes("remove") || normalized.includes("disable") || normalized.includes("turn off");
      patchGraphControls({
        showRings: shouldHide ? false : shouldShow ? true : !graphControlsRef.current.showRings
      }, `${shouldHide ? "Hidden" : shouldShow ? "Shown" : "Toggled"} orbital rings from ENTRAL Command.`);
    } else if (normalized.includes("trail length") || normalized.includes("tail length")) {
      patchGraphControls({
        trailLength: Math.min(Math.max(numericValue ?? graphControlsRef.current.trailLength + 6, 4), 42)
      }, "Updated particle trail length from ENTRAL Command.");
    } else if (normalized.includes("trail") || normalized.includes("tail")) {
      const shouldShow = normalized.includes("show") || normalized.includes("enable") || normalized.includes("turn on");
      const shouldHide = normalized.includes("hide") || normalized.includes("remove") || normalized.includes("disable") || normalized.includes("turn off");
      patchGraphControls({
        showTrails: shouldHide ? false : shouldShow ? true : !graphControlsRef.current.showTrails
      }, `${shouldHide ? "Hidden" : shouldShow ? "Shown" : "Toggled"} particle trails from ENTRAL Command.`);
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
      }, `Graph orbit speed set to ${Math.min(Math.max(nextSpeed, 0), 2.2).toFixed(2)}x from ENTRAL Command.`);
    } else if (normalized.includes("gravity") || normalized.includes("tighter") || normalized.includes("looser")) {
      const current = graphControlsRef.current.gravity;
      const nextGravity = numericValue !== null
        ? numericValue
        : normalized.includes("looser")
          ? current * 0.82
          : current * 1.14;

      patchGraphControls({
        gravity: Math.min(Math.max(nextGravity, 0.2), 1.35)
      }, "Adjusted graph gravity and orbit tightness from ENTRAL Command.");
    } else if (normalized.includes("glow")) {
      const current = graphControlsRef.current.glowIntensity;
      const nextGlow = numericValue !== null ? numericValue : normalized.includes("less") || normalized.includes("down") ? current * 0.82 : current * 1.16;

      patchGraphControls({
        glowIntensity: Math.min(Math.max(nextGlow, 0.45), 1.85)
      }, "Adjusted neon glow intensity from ENTRAL Command.");
    } else if (normalized.includes("particle size") || normalized.includes("bigger") || normalized.includes("smaller")) {
      const current = graphControlsRef.current.particleSize;
      const nextSize = numericValue !== null ? numericValue : normalized.includes("smaller") ? current * 0.86 : current * 1.12;

      patchGraphControls({
        particleSize: Math.min(Math.max(nextSize, 0.65), 1.7)
      }, "Adjusted electron particle size from ENTRAL Command.");
    } else if (normalized.includes("create") && normalized.includes("group")) {
      const nameMatch = /group (?:called |named |for )?([^,.;]+)/i.exec(text);
      createGroup(nameMatch?.[1]?.trim() || "New Cluster");
    } else if (normalized.includes("create")) {
      requestNodeAuthorization("soldier", hierarchyNameFromCommand(text, "soldier"));
    } else if (normalized.includes("reassign") || normalized.includes("move")) {
      const target = graph.nodes.find((node) => node.type !== "core" && normalized.includes(node.name.toLowerCase().split(" ")[0]));
      const moveTarget = commandNode ?? target ?? selected;
      const newParent = parentNodeFromMoveCommand(text, graph.nodes);

      if (moveTarget && newParent) {
        requestMoveAuthorization(moveTarget, newParent);
      } else if (target && group) {
        mutateNode(target.id, {
          groupId: group.id,
          logs: [`Redirected to ${group.name} from command directive.`, ...target.logs],
          reasoning: `ENTRAL redirected this neuron into ${group.name} and will re-cluster it automatically.`
        });
        setSelectedNodeId(target.id);
        focusGroup(group.id);
      } else {
        respond({
          analysis: "The directive did not include a recognizable entity and destination group.",
          nextActions: ["Name the target entity.", "Name the destination group.", "Reissue the reassignment directive."],
          recommendation: "Use a direct command such as 'Move SEO Soldier under Listing Commander.'",
          situation: "Reassignment target not found."
        });
      }
    } else if ((normalized.includes("offline") || normalized.includes("pause")) && selected) {
      mutateNode(selected.id, { logs: ["Marked offline from command directive.", ...selected.logs], status: "offline" });
      respond(`${selected.name} marked offline. Execution halted in local mode.`, `${selected.name} paused.`, commandSpeakerFromNodeType(selected.commandType));
    } else if ((normalized.includes("resume") || normalized.includes("run")) && selected) {
      mutateNode(selected.id, { logs: ["Resumed from command directive.", ...selected.logs], status: "working" });
      respond(`${selected.name} resumed. Execution status set to working in local mode.`, `${selected.name} resumed.`, commandSpeakerFromNodeType(selected.commandType));
    } else if (normalized.includes("show") || normalized.includes("pull up") || normalized.includes("highlight") || normalized.includes("zoom") || normalized.includes("focus") || normalized.includes("select") || normalized.includes("open") || normalized.includes("take me to")) {
      if (commandNode) {
        focusCommandNode(commandNode);
      } else if (group) {
        focusGroup(group.id);
      } else if (normalized.includes("working") || normalized.includes("running")) {
        setActiveGroupId(null);
        setSearch("working");
        setStatusMessage("Highlighted working entities.");
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
    event.preventDefault();
    lockGraphScroll();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (event.pointerType === "touch") {
      const gesture = touchGestureRef.current;
      gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      gesture.primaryPointerId = gesture.primaryPointerId ?? event.pointerId;

      const points = Array.from(gesture.pointers.values()).slice(0, 2);
      gesture.lastCenter = midpoint(points);
      gesture.lastDistance = points.length >= 2 ? pointDistance(points[0], points[1]) : null;
      gesture.moved = gesture.moved || points.length >= 2;
      dragRef.current = null;
      return;
    }

    dragRef.current = {
      button: event.button,
      lastX: event.clientX,
      lastY: event.clientY,
      mode: event.shiftKey || event.button === 2 ? "pan" : "orbit",
      moved: false
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") {
      const gesture = touchGestureRef.current;

      if (!gesture.pointers.has(event.pointerId)) {
        return;
      }

      event.preventDefault();
      gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      const points = Array.from(gesture.pointers.values()).slice(0, 2);
      const center = midpoint(points);
      const previousCenter = gesture.lastCenter ?? center;
      const dx = center.x - previousCenter.x;
      const dy = center.y - previousCenter.y;
      const sensitivity = graphControlsRef.current.cameraSensitivity;

      gesture.moved = gesture.moved || Math.abs(dx) + Math.abs(dy) > 3;

      if (gesture.moved && lockedNodeIdRef.current) {
        setLockedNodeId(null);
        lockedNodeIdRef.current = null;
      }

      if (points.length >= 2) {
        const distance = pointDistance(points[0], points[1]);
        const previousDistance = gesture.lastDistance ?? distance;
        const zoomRatio = previousDistance > 0 && distance > 0 ? previousDistance / distance : 1;
        const next = clampCamera({
          ...desiredCameraRef.current,
          distance: desiredCameraRef.current.distance * zoomRatio,
          pitch: desiredCameraRef.current.pitch + dy * 0.0038 * sensitivity,
          yaw: desiredCameraRef.current.yaw + dx * 0.0038 * sensitivity
        });

        desiredCameraRef.current = next;
        gesture.lastDistance = distance;
      } else {
        const scale = desiredCameraRef.current.distance * 0.0017 * sensitivity;
        const axes = getCameraBillboardAxes(desiredCameraRef.current);
        const panOffset = addVec(
          scaleVec(axes.right, -dx * scale),
          scaleVec(axes.up, dy * scale)
        );
        const next = clampCamera({
          ...desiredCameraRef.current,
          target: addVec(desiredCameraRef.current.target, panOffset)
        });

        desiredCameraRef.current = next;
        gesture.lastDistance = null;
      }

      gesture.lastCenter = center;
      return;
    }

    const drag = dragRef.current;

    if (drag) {
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;

      event.preventDefault();
      drag.moved = drag.moved || Math.abs(dx) + Math.abs(dy) > 3;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;

      if (drag.moved && lockedNodeIdRef.current) {
        setLockedNodeId(null);
        lockedNodeIdRef.current = null;
      }

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
        const axes = getCameraBillboardAxes(desiredCameraRef.current);
        const panOffset = addVec(
          scaleVec(axes.right, -dx * scale),
          scaleVec(axes.up, dy * scale)
        );
        const next = clampCamera({
          ...desiredCameraRef.current,
          target: addVec(desiredCameraRef.current.target, panOffset)
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
      task: picked.node.currentTask ?? "No active task.",
      x: event.clientX,
      y: event.clientY
    } : null);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") {
      const gesture = touchGestureRef.current;
      const hadSinglePointer = gesture.pointers.size === 1;
      const picked = pickNode(event.clientX, event.clientY);

      if (picked && hadSinglePointer && !gesture.moved && gesture.primaryPointerId === event.pointerId) {
        focusCommandNode(picked.node);
      }

      gesture.pointers.delete(event.pointerId);

      const points = Array.from(gesture.pointers.values()).slice(0, 2);
      gesture.lastCenter = points.length ? midpoint(points) : null;
      gesture.lastDistance = points.length >= 2 ? pointDistance(points[0], points[1]) : null;
      gesture.primaryPointerId = points.length ? (gesture.pointers.keys().next().value ?? null) : null;
      gesture.moved = points.length > 0;
      return;
    }

    const drag = dragRef.current;
    const picked = pickNode(event.clientX, event.clientY);

    if (picked && !drag?.moved && drag?.button !== 2) {
      focusCommandNode(picked.node);
    }

    dragRef.current = null;
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") {
      const gesture = touchGestureRef.current;
      gesture.pointers.delete(event.pointerId);

      if (gesture.pointers.size === 0) {
        gesture.lastCenter = null;
        gesture.lastDistance = null;
        gesture.moved = false;
        gesture.primaryPointerId = null;
      }

      return;
    }

    dragRef.current = null;
  }

  function handleCanvasKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    const key = event.key.toLowerCase();
    const amount = event.shiftKey ? 0.18 : 0.08;

    if (key === "arrowleft" || key === "arrowright" || key === "arrowup" || key === "arrowdown" || key === "+" || key === "=" || key === "-" || key === "_" || key === "home") {
      event.preventDefault();
      setLockedNodeId(null);
      lockedNodeIdRef.current = null;
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
    setLockedNodeId(null);
    lockedNodeIdRef.current = null;
    const zoomAmount = 0.08 * graphControlsRef.current.cameraSensitivity;
    setCamera({ distance: desiredCameraRef.current.distance * (event.deltaY > 0 ? 1 + zoomAmount : 1 - zoomAmount) });
  }

  function deleteSelectedNode() {
    requestRemoveNode(selectedNode?.id ?? selectedNodeId);
  }

  const filteredNodes = search.trim()
    ? visibleNodes.filter((node) => matchesQuery(node, search, groupMap.get(node.groupId)))
    : visibleNodes;
  const filteredVisibleNodes = activeStatusFilter?.length
    ? filteredNodes.filter((node) => activeStatusFilter.includes(node.status))
    : filteredNodes;
  const marshalNodes = graph.nodes.filter((node) => node.commandType === "marshal");
  const generalNodes = graph.nodes.filter((node) => node.commandType === "general");
  const commanderNodes = graph.nodes.filter((node) => node.commandType === "commander");
  const soldierNodes = graph.nodes.filter((node) => node.commandType === "soldier");
  const selectedChildren = selectedNode ? graph.nodes.filter((node) => node.parentId === selectedNode.id) : [];
  const selectedParent = selectedNode?.parentId ? nodeMap.get(selectedNode.parentId) : null;
  const selectedLineage = selectedNode ? lineageForNode(selectedNode.id, graph.nodes) : [];
  const selectedCommandPath = selectedLineage.map((node) => node.name).join(" / ");
  const selectedTasks = selectedNode
    ? graph.tasks.filter((task) => task.assignedEntityId === selectedNode.id || task.delegationPath.includes(selectedNode.id)).slice(0, 8)
    : [];
  const selectedReportHistory = selectedNode ? (selectedNode.reportHistory ?? []).slice(0, 5) : [];
  const selectedDescendantIds = selectedNode ? descendantIdsFor(selectedNode.id, graph.nodes) : [];
  const selectedScopeIds = new Set(selectedNode ? [selectedNode.id, ...selectedDescendantIds] : []);
  const selectedScopeNodes = selectedNode ? graph.nodes.filter((node) => selectedScopeIds.has(node.id)) : [];
  const selectedScopeTasks = selectedNode ? graph.tasks.filter((task) => task.assignedEntityId === selectedNode.id || task.delegationPath.some((id) => selectedScopeIds.has(id))) : [];
  const selectedInspectorStats = selectedNode ? {
    activeTasks: selectedScopeTasks.filter((task) => task.status === "assigned" || task.status === "running").length,
    commanders: selectedScopeNodes.filter((node) => node.commandType === "commander").length,
    failedTasks: selectedScopeTasks.filter((task) => task.status === "failed").length,
    generals: selectedScopeNodes.filter((node) => node.commandType === "general").length,
    marshals: selectedScopeNodes.filter((node) => node.commandType === "marshal").length,
    soldiers: selectedScopeNodes.filter((node) => node.commandType === "soldier").length
  } : null;
  const selectedSuggestedActions = getInspectorSuggestedActions(selectedNode);
  const visibleTasks = graph.tasks.slice(0, 8);
  const userBusinessGenerals = generalNodes.filter((node) => node.id !== "entral-general");
  const selectedTemplate = businessTemplates.find((template) => template.id === businessWizard.templateId) ?? businessTemplates[0];
  const contextCommandSuggestions = getContextCommandSuggestions({
    businessGeneralCount: userBusinessGenerals.length,
    isBusinessWizardOpen: businessWizard.isOpen,
    pendingAuthorization: Boolean(pendingAuthorization),
    selectedNode
  });
  const pendingRemovalNode = pendingRemovalId ? nodeMap.get(pendingRemovalId) ?? null : null;
  const pendingRemovalChildren = pendingRemovalNode ? descendantIdsFor(pendingRemovalNode.id, graph.nodes) : [];
  const pendingRemovalParent = pendingRemovalNode?.parentId ? nodeMap.get(pendingRemovalNode.parentId) : null;
  const pendingRemovalScopeIds = new Set(pendingRemovalNode ? [pendingRemovalNode.id, ...pendingRemovalChildren] : []);
  const pendingRemovalTaskCount = pendingRemovalNode
    ? graph.tasks.filter((task) => {
      const assignedInScope = task.assignedEntityId ? pendingRemovalScopeIds.has(task.assignedEntityId) : false;
      return assignedInScope || task.delegationPath.some((id) => pendingRemovalScopeIds.has(id));
    }).length
    : 0;
  const pendingRemovalReportCount = pendingRemovalNode
    ? graph.nodes
      .filter((node) => pendingRemovalScopeIds.has(node.id))
      .reduce((total, node) => total + (node.reportHistory?.length ?? 0), 0)
      + graph.tasks
        .filter((task) => {
          const assignedInScope = task.assignedEntityId ? pendingRemovalScopeIds.has(task.assignedEntityId) : false;
          return assignedInScope || task.delegationPath.some((id) => pendingRemovalScopeIds.has(id));
        })
        .reduce((total, task) => total + (task.reportHistory?.length ?? 0), 0)
    : 0;
  const pendingRemovalImpact = pendingRemovalNode
    ? buildRemoveAuthorizationImpact({
      descendantCount: pendingRemovalChildren.length,
      entityName: pendingRemovalNode.name,
      entityTitle: pendingRemovalNode.title,
      parentName: pendingRemovalParent?.name ?? "ENTRAL",
      reportCount: pendingRemovalReportCount,
      taskCount: pendingRemovalTaskCount
    })
    : null;
  const selectedCapabilityCards = selectedNode?.type === "core"
    ? businessCapabilityBlueprints
    : (selectedNode?.capabilities ?? ["tool-orchestration"])
      .map((id) => capabilityById(id))
      .filter((capability): capability is CapabilityBlueprint => Boolean(capability));
  const recentReportMessages = commandHistory
    .filter((message) => message.role === "system" && /^\s*Situation:\n/i.test(message.content))
    .slice(-5)
    .reverse();

  function renderMobileHierarchyNode(node: GraphNode3D, depth = 0): React.ReactNode {
    const children = graph.nodes.filter((candidate) => candidate.parentId === node.id);
    const taskCount = graph.tasks.filter((task) => task.assignedEntityId === node.id || task.delegationPath.includes(node.id)).length;
    const isActive = selectedNodeId === node.id;
    const isDegraded = node.status === "error" || node.status === "waiting" || node.status === "offline";

    return (
      <details
        className={isActive ? "command-mobile-tree-node active" : "command-mobile-tree-node"}
        key={node.id}
        open={depth < 2 || selectedLineage.some((lineageNode) => lineageNode.id === node.id)}
        style={{ "--depth": depth } as React.CSSProperties}
      >
        <summary>
          <span className={`mobile-tree-dot status-${node.status}`} />
          <span>
            <strong>{node.name}</strong>
            <small>{node.title} / {statusLabel(node.status)}{taskCount ? ` / ${taskCount} task${taskCount === 1 ? "" : "s"}` : ""}</small>
          </span>
          {isDegraded ? <AlertTriangle aria-hidden="true" size={14} /> : null}
        </summary>
        <button type="button" onClick={() => focusCommandNode(node)}>
          Inspect {node.title}
        </button>
        {children.length > 0 ? (
          <div>
            {children.map((child) => renderMobileHierarchyNode(child, depth + 1))}
          </div>
        ) : null}
      </details>
    );
  }

  function renderChildEmptyState(node: GraphNode3D) {
    if (node.commandType === "emperor") {
      return (
        <section className="command-empty-state compact">
          <h3>No Marshals exist yet.</h3>
          <p>Create your first strategic command layer or use guided setup to create a business structure.</p>
          <div>
            <Button type="button" variant="secondary" onClick={() => requestNodeAuthorization("marshal", "First Marshal")}>Create Marshal</Button>
            <Button type="button" variant="secondary" onClick={() => openBusinessWizard()}>Use Template</Button>
          </div>
        </section>
      );
    }

    if (node.commandType === "marshal") {
      return (
        <section className="command-empty-state compact">
          <h3>No business Generals exist yet.</h3>
          <p>Create a business General under this Marshal or apply a business template.</p>
          <div>
            <Button type="button" variant="secondary" onClick={() => openBusinessWizard()}>Create Business</Button>
            <Button type="button" variant="secondary" onClick={() => requestNodeAuthorization("general")}>Add General</Button>
          </div>
        </section>
      );
    }

    if (node.commandType === "general") {
      return (
        <section className="command-empty-state compact">
          <h3>No Commanders exist under this General yet.</h3>
          <p>Add departments to operate this business or use a template to generate recommended lanes.</p>
          <div>
            <Button type="button" variant="secondary" onClick={() => requestNodeAuthorization("commander")}>Add Commander</Button>
            <Button type="button" variant="secondary" onClick={() => openBusinessWizard()}>Apply Template</Button>
          </div>
        </section>
      );
    }

    if (node.commandType === "commander") {
      return (
        <section className="command-empty-state compact">
          <h3>No Soldiers exist under this Commander yet.</h3>
          <p>Add execution units before assigning tasks to this operating lane.</p>
          <div>
            <Button type="button" variant="secondary" onClick={() => requestNodeAuthorization("soldier")}>Add Soldier</Button>
            <Button type="button" variant="secondary" onClick={() => executeCommand("Help")}>Open Help</Button>
          </div>
        </section>
      );
    }

    return null;
  }

  return (
    <main className={["command-center-page", isPanelOpen ? "info-panel-open" : "", isCommandConsoleOpen ? "" : "chat-closed", isFocusMode ? "focus-mode" : ""].filter(Boolean).join(" ")} aria-label="ENTRAL Command Center">
      <canvas
        aria-describedby="command-center-camera-help"
        aria-label="3D interactive ENTRAL neuron graph"
        className="command-center-canvas"
        data-academy="command-graph"
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={handleCanvasKeyDown}
        onPointerEnter={lockGraphScroll}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => {
          if (touchGestureRef.current.pointers.size > 0) {
            return;
          }

          dragRef.current = null;
          releaseGraphScroll();
          setHoveredNodeId(null);
          setTooltip(null);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={() => {
          if (isFocusMode) {
            setIsFocusMode(false);
            setStatusMessage("Focus Mode exited. Command center controls restored.");
          }
        }}
        onWheel={handleWheel}
        ref={canvasRef}
        role="application"
        tabIndex={0}
      />
      <p className="sr-only" id="command-center-camera-help">
        On touch screens, drag one finger to pan up, down, left, and right. Drag two fingers to rotate around ENTRAL. Pinch two fingers to zoom. On desktop, drag to orbit, right click drag to pan, and use the mouse wheel or plus and minus keys to zoom.
      </p>

      <div className="command-center-vignette" aria-hidden="true" />

      <header className="command-center-brand" data-academy="command-brand" aria-label="Command center status">
        <Logo />
        <div>
          <p className="eyebrow">Command OS</p>
          <h1>ENTRAL</h1>
          <span>{user?.name ? `${user.name}'s central command layer` : "Military-neural command graph"}</span>
        </div>
      </header>

      <div className="command-center-top-actions">
          <button className="command-icon-button" data-academy="command-palette" type="button" onClick={() => window.dispatchEvent(new Event("entral:open-command-palette"))} aria-label="Open command menu">
            <Menu aria-hidden="true" size={18} />
          </button>
        <button className="command-icon-button" type="button" onClick={() => {
          setIsFocusMode(true);
          setStatusMessage("Focus Mode engaged. Press Escape or double-click the graph to restore controls.");
        }} aria-label="Enter Focus Mode">
          <Maximize2 aria-hidden="true" size={18} />
        </button>
        <button className="command-icon-button" type="button" onClick={toggleInfoPanel} aria-label={isPanelOpen ? "Hide side information panel" : "Show side information panel"}>
          {isPanelOpen ? <PanelRightClose aria-hidden="true" size={18} /> : <PanelRightOpen aria-hidden="true" size={18} />}
        </button>
        <button className="command-icon-button" data-academy="settings" type="button" onClick={() => openSettings()} aria-label="Open settings">
          <Settings aria-hidden="true" size={18} />
        </button>
        <button className="command-icon-button" type="button" onClick={onLogout} aria-label="Sign out">
          <LogOut aria-hidden="true" size={18} />
        </button>
      </div>

      <details className="command-mobile-nav" data-academy="command-nav">
        <summary>
          <Menu aria-hidden="true" size={16} />
          Navigate
        </summary>
        <nav aria-label="Mobile Command OS navigation">
          <button className={selectedNodeId === "entral" ? "active" : ""} type="button" onClick={() => {
            const entral = graphRef.current.nodes.find((node) => node.id === "entral");
            if (entral) focusCommandNode(entral);
          }}>
            ENTRAL overview
          </button>
          <button type="button" onClick={() => setStatusHighlight(["working", "thinking"], "Highlighted active working and thinking hierarchy nodes.")}>
            Active nodes
          </button>
          <button type="button" onClick={() => setStatusHighlight(["error", "waiting", "offline"], "Highlighted error, waiting, and offline nodes.")}>
            Alerts
          </button>
          {marshalNodes.map((node) => (
            <button className={selectedNodeId === node.id ? "active" : ""} key={node.id} type="button" onClick={() => focusCommandNode(node)}>
              <span style={{ "--group-color": groupMap.get(node.groupId)?.color ?? settings.accentColor } as React.CSSProperties} />
              {node.name}
            </button>
          ))}
          {generalNodes.slice(0, 6).map((node) => (
            <button className={selectedNodeId === node.id ? "active child" : "child"} key={node.id} type="button" onClick={() => focusCommandNode(node)}>
              {node.name} / General
            </button>
          ))}
          <div className="command-mobile-nav-actions">
            <button type="button" onClick={() => openBusinessWizard()}>Business setup</button>
            <button type="button" onClick={openAtomControls}>Controls</button>
            <button type="button" onClick={() => openSettings()}>Settings</button>
            <button type="button" onClick={() => requestNodeAuthorization("marshal")}>Add Marshal</button>
            <button type="button" onClick={() => requestNodeAuthorization("general")}>Add General</button>
          </div>
        </nav>
      </details>

      <section className={`command-mobile-panel tab-${mobileTab}`} aria-label="Mobile command access">
        {mobileTab === "hierarchy" ? (
          <>
            <header>
              <div>
                <p className="eyebrow">Hierarchy</p>
                <h2>Command structure</h2>
              </div>
              <button type="button" onClick={() => openMobileTab("command")}>Command</button>
            </header>
            <div className="command-mobile-tree">
              {graph.nodes.find((node) => node.id === "entral") ? renderMobileHierarchyNode(graph.nodes.find((node) => node.id === "entral") as GraphNode3D) : null}
            </div>
          </>
        ) : null}

        {mobileTab === "tasks" ? (
          <>
            <header>
              <div>
                <p className="eyebrow">Tasks</p>
                <h2>Active work</h2>
              </div>
              <button type="button" onClick={() => executeCommand("Create task Review the command hierarchy")}>New task</button>
            </header>
            {visibleTasks.length > 0 ? (
              <div className="command-mobile-card-list">
                {visibleTasks.map((task) => (
                  <button key={task.id} type="button" onClick={() => {
                    const assigned = task.assignedEntityId ? graphRef.current.nodes.find((node) => node.id === task.assignedEntityId) : null;
                    if (assigned) focusCommandNode(assigned);
                  }}>
                    <span className={`task-dot task-${task.status}`} />
                    <strong>{task.name}</strong>
                    <small>{taskStatusLabel(task.status)}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="command-mobile-empty">
                <strong>No tasks assigned yet.</strong>
                <p>Create a task directly, use guided business setup, or load a demo environment for safe exploration.</p>
                <button type="button" onClick={() => executeCommand("Create task Review the command hierarchy")}>Create first task</button>
                <button type="button" onClick={() => openBusinessWizard()}>Guided setup</button>
              </div>
            )}
          </>
        ) : null}

        {mobileTab === "reports" ? (
          <>
            <header>
              <div>
                <p className="eyebrow">Reports</p>
                <h2>Command feed</h2>
              </div>
              <button type="button" onClick={() => executeCommand("ENTRAL report")}>Generate</button>
            </header>
            {recentReportMessages.length > 0 ? (
              <div className="command-mobile-report-list">
                {recentReportMessages.map((message) => (
                  <article key={message.id}>
                    <strong>{message.sourceLabel}</strong>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="command-mobile-empty">
                <strong>No reports yet.</strong>
                <p>Ask ENTRAL for a report to populate this feed.</p>
                <button type="button" onClick={() => executeCommand("ENTRAL report")}>Generate report</button>
              </div>
            )}
          </>
        ) : null}

        {mobileTab === "more" ? (
          <>
            <header>
              <div>
                <p className="eyebrow">Actions</p>
                <h2>Command menu</h2>
              </div>
              <button type="button" onClick={() => openMobileTab("command")}>Close</button>
            </header>
            <div className="command-mobile-action-grid">
              <button type="button" onClick={() => executeCommand("Help")}>Help</button>
              <button type="button" onClick={() => openBusinessWizard()}>Business setup</button>
              <button type="button" onClick={requestDemoEnvironmentAuthorization}>Load demo</button>
              <button type="button" onClick={() => requestNodeAuthorization("marshal")}>Add Marshal</button>
              <button type="button" onClick={openAtomControls}>Graph controls</button>
              <button type="button" onClick={() => openSettings()}>Settings</button>
              <button type="button" onClick={() => routeWorkspaceAction("Training channel selected. Opening ENTRAL Academy.", undefined, "entral:open-academy")}>Academy</button>
              <button type="button" onClick={() => executeCommand("Show hierarchy")}>Full picture</button>
            </div>
          </>
        ) : null}
      </section>

      <nav className="command-mobile-tabs" data-academy="command-nav" aria-label="Mobile command tabs">
        {([
          ["command", "Command", Bot],
          ["hierarchy", "Hierarchy", Network],
          ["tasks", "Tasks", Activity],
          ["reports", "Reports", ShieldCheck],
          ["more", "More", Menu]
        ] as const).map(([tab, label, Icon]) => (
          <button className={mobileTab === tab ? "active" : ""} key={tab} type="button" onClick={() => openMobileTab(tab)} aria-pressed={mobileTab === tab}>
            <Icon aria-hidden="true" size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <nav className="command-os-nav" data-academy="command-nav" aria-label="Command OS navigation">
        <div className="command-os-nav-header">
          <p className="eyebrow">Command OS</p>
          <strong>Chain of command</strong>
          <span>{selectedNode ? `${selectedNode.title} / ${selectedNode.name}` : "ENTRAL"}</span>
        </div>
        <div className="command-level-key" aria-label="Hierarchy visual key">
          <span className="level-core">ENTRAL nucleus</span>
          <span className="level-marshal">Marshal square</span>
          <span className="level-general">Business General diamond</span>
          <span className="level-commander">Commander triangle</span>
          <span className="level-soldier">Soldier point</span>
        </div>
        <details open>
          <summary>Hierarchy</summary>
          <button className={selectedNodeId === "entral" ? "active" : ""} type="button" onClick={() => {
            const entral = graphRef.current.nodes.find((node) => node.id === "entral");
            if (entral) focusCommandNode(entral);
          }}>
            ENTRAL / Central Command
          </button>
          {marshalNodes.map((marshal) => (
            <React.Fragment key={marshal.id}>
              <button className={selectedNodeId === marshal.id ? "active" : ""} type="button" onClick={() => focusCommandNode(marshal)}>
                <span style={{ "--group-color": groupMap.get(marshal.groupId)?.color ?? settings.accentColor } as React.CSSProperties} />
                {marshal.name} / Marshal
              </button>
              {graph.nodes.filter((node) => node.parentId === marshal.id && node.commandType === "general").slice(0, 4).map((general) => (
                <button className={selectedNodeId === general.id ? "active child" : "child"} key={general.id} type="button" onClick={() => focusCommandNode(general)}>
                  {general.name} / General
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
          }}>ENTRAL Overview</button>
          <button type="button" onClick={() => setStatusHighlight(["working", "thinking"], "Highlighted active working and thinking hierarchy nodes.")}>Active Nodes</button>
          <button type="button" onClick={() => setStatusHighlight(["error", "waiting", "offline"], "Highlighted error, waiting, and offline nodes.")}>Alerts</button>
          <button type="button" onClick={() => respond("Latest activity is visible in the Activity Feed. Local execution logs are preserved per node.")}>Logs</button>
        </details>
        <details open>
          <summary>Tasks</summary>
          <button type="button" onClick={() => requestWorkflowAuthorization("start merch store launch workflow")}>
            <span className="task-dot task-assigned" />
            Generate launch workflow
          </button>
          <button type="button" onClick={openProductBatchGenerator}>
            <span className="task-dot task-running" />
            Product batch generator
          </button>
          <button type="button" onClick={() => {
            setIsControlsOpen(true);
            void loadApprovalQueue();
          }}>
            <span className="task-dot task-pending" />
            Approval queue
          </button>
          <button type="button" onClick={() => {
            setIsControlsOpen(true);
            void loadMerchStores(true);
          }}>
            <span className="task-dot task-running" />
            Pricing & reports
          </button>
          {visibleTasks.length > 0 ? visibleTasks.map((task) => (
            <button key={task.id} type="button" onClick={() => {
              const assigned = task.assignedEntityId ? graphRef.current.nodes.find((node) => node.id === task.assignedEntityId) : null;
              if (assigned) focusCommandNode(assigned);
            }}>
              <span className={`task-dot task-${task.status}`} />
              {task.name}
            </button>
          )) : (
            <button type="button" onClick={() => executeCommand("Create task Review the command hierarchy")}>Create first task</button>
          )}
        </details>
        <details open>
          <summary>Marshals</summary>
          {marshalNodes.map((node) => (
            <button className={selectedNodeId === node.id ? "active" : ""} key={node.id} type="button" onClick={() => focusCommandNode(node)}>
              <span style={{ "--group-color": groupMap.get(node.groupId)?.color ?? settings.accentColor } as React.CSSProperties} />
              {node.name}
            </button>
          ))}
        </details>
        <details>
          <summary>Business Generals</summary>
          {generalNodes.map((node) => (
            <button className={selectedNodeId === node.id ? "active" : ""} key={node.id} type="button" onClick={() => focusCommandNode(node)}>
              <span style={{ "--group-color": groupMap.get(node.groupId)?.color ?? settings.accentColor } as React.CSSProperties} />
              {node.name}
            </button>
          ))}
        </details>
        <details>
          <summary>Structure</summary>
          <button type="button" onClick={() => setSearch("marshal")}>Marshals</button>
          <button type="button" onClick={() => setSearch("general")}>Business Generals</button>
          <button type="button" onClick={() => setSearch("commander")}>Commanders</button>
          <button type="button" onClick={() => setSearch("soldier")}>Soldiers</button>
          <button type="button" onClick={() => openBusinessWizard()}>Guided business setup</button>
          <button type="button" onClick={() => requestNodeAuthorization("marshal")}>Add Marshal</button>
          <button type="button" onClick={() => requestNodeAuthorization("general")}>Add General</button>
          <button type="button" onClick={() => requestNodeAuthorization("commander")}>Add Commander</button>
          <button type="button" onClick={() => requestNodeAuthorization("soldier")}>Add Soldier</button>
        </details>
        <details>
          <summary>Infrastructure</summary>
          {["Memory", "Permissions", "Event Bus", "Tools", "Integrations"].map((label) => (
            <button key={label} type="button" onClick={() => respond(`${label} is represented in local Command OS mode. External execution remains policy-gated until explicitly connected.`)}>{label}</button>
          ))}
        </details>
        <details>
          <summary>Analytics</summary>
          {["System Metrics", "Agent Performance", "Resource Usage", "Execution Stats"].map((label) => (
            <button key={label} type="button" onClick={() => respond(`${label} summary: ${marshalNodes.length} Marshals, ${generalNodes.length} business Generals, ${commanderNodes.length} Commanders, ${soldierNodes.length} Soldiers, ${graph.nodes.length} total command nodes.`)}>{label}</button>
          ))}
        </details>
        <details>
          <summary>Settings</summary>
          <button type="button" onClick={() => openSettings("appearance")}>Appearance</button>
          <button type="button" onClick={() => openSettings("account")}>Account</button>
          <button type="button" onClick={() => openSettings("assistant")}>Command AI</button>
          <button type="button" onClick={() => openSettings("voice")}>Voice</button>
          <button type="button" onClick={() => openSettings("academy")}>Academy</button>
          <button type="button" onClick={openAtomControls}>Graph Settings</button>
          <button type="button" onClick={() => respond("Agent permissions are shown in the selected node inspector. Real permission enforcement remains policy-gated.")}>Agent Permissions</button>
          <button type="button" onClick={() => respond("Notifications are local in this Command OS layer until real delivery channels are connected.")}>Notifications</button>
        </details>
      </nav>

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

      <form className="command-center-chat" data-academy="command-console" onSubmit={runCommand} aria-label="ENTRAL command input">
        <header className="command-chat-heading">
          <div className="command-chat-title">
            <div className="command-chat-orb">
              <Bot aria-hidden="true" size={20} />
            </div>
            <div>
              <p className="eyebrow">Persistent command console</p>
              <h2>ENTRAL Command</h2>
              <span>Issue directives. ENTRAL routes objectives through Marshals, business Generals, Commanders, Soldiers, panels, and graph control.</span>
            </div>
          </div>
          <button className="command-chat-close" type="button" onClick={() => setIsCommandConsoleOpen(false)} aria-label="Close command console">
            <span>Hide</span>
            <X aria-hidden="true" size={17} />
          </button>
        </header>

        <div className={isThinking ? "command-chat-status thinking" : "command-chat-status"} role="status">
          <Sparkles aria-hidden="true" size={16} />
          <span>{statusMessage}</span>
        </div>

        <div className={["voice-command-status", isListening ? "listening" : "", isSpeaking ? "speaking" : ""].filter(Boolean).join(" ")} data-academy="voice-controls" role="status" aria-live="polite">
          {isListening ? <Mic aria-hidden="true" size={15} /> : isSpeaking ? <Volume2 aria-hidden="true" size={15} /> : <MicOff aria-hidden="true" size={15} />}
          <span>{isListening ? "Microphone active. Speak directive." : isSpeaking ? "ENTRAL speaking." : voiceStatus}</span>
          <button type="button" onClick={stopSpeaking} disabled={!isSpeaking}>Stop speech</button>
        </div>

        {userBusinessGenerals.length === 0 && !businessWizard.isOpen ? (
          <section className="business-empty-guide" aria-label="First business guidance">
            <div>
              <p className="eyebrow">First mission</p>
              <h3>Create your first business General</h3>
              <p>Start from ENTRAL alone. Create a Marshal first, open the guided business setup, or use an opt-in demo to learn the command structure safely.</p>
            </div>
            <div className="business-empty-actions">
              <Button type="button" variant="secondary" onClick={() => executeCommand("Help")}>
                Help
              </Button>
              <Button type="button" variant="secondary" onClick={() => routeWorkspaceAction("Training channel selected. Opening ENTRAL Academy.", undefined, "entral:open-tutorial")}>
                Start tutorial
              </Button>
              <Button type="button" variant="secondary" onClick={() => requestNodeAuthorization("marshal", "First Marshal")}>
                Create First Marshal
              </Button>
              <Button type="button" onClick={() => openBusinessWizard()}>
                <Sparkles aria-hidden="true" size={16} />
                Start guided setup
              </Button>
              <Button type="button" variant="secondary" onClick={() => openBusinessWizard()}>
                View templates
              </Button>
              <Button type="button" variant="secondary" onClick={() => executeCommand("Start voice guide")}>
                Voice introduction
              </Button>
              <Button type="button" variant="secondary" onClick={requestDemoEnvironmentAuthorization}>
                Load demo environment
              </Button>
            </div>
          </section>
        ) : null}

        {businessWizard.isOpen ? (
          <section className="business-wizard" data-academy="business-wizard" aria-label="Guided business creation">
            <header>
              <div>
                <p className="eyebrow">Guided setup</p>
                <h3>Build first business</h3>
                <span>{selectedTemplate.description}</span>
              </div>
              <button type="button" onClick={() => updateBusinessWizard({ isOpen: false })} aria-label="Close business setup">
                <X aria-hidden="true" size={16} />
              </button>
            </header>

            <div className="business-template-grid" role="list" aria-label="Business templates">
              {businessTemplates.map((template) => (
                <button
                  className={template.id === businessWizard.templateId ? "active" : ""}
                  key={template.id}
                  type="button"
                  onClick={() => updateBusinessWizard({ templateId: template.id })}
                  role="listitem"
                >
                  <span style={{ "--template-color": template.color } as React.CSSProperties} />
                  <strong>{template.label}</strong>
                  <small>{template.marshalName}</small>
                </button>
              ))}
            </div>

            <div className="business-wizard-grid">
              <label>
                <span>Business name</span>
                <input value={businessWizard.businessName} onChange={(event) => updateBusinessWizard({ businessName: event.target.value })} placeholder="Iron House Gym" />
              </label>
              <label>
                <span>Industry</span>
                <input value={businessWizard.industry} onChange={(event) => updateBusinessWizard({ industry: event.target.value })} placeholder="Fitness, landscaping, apparel..." />
              </label>
              <label>
                <span>Preferred Marshal</span>
                <input value={businessWizard.preferredMarshal} onChange={(event) => updateBusinessWizard({ preferredMarshal: event.target.value })} placeholder={selectedTemplate.marshalName} />
              </label>
              <label>
                <span>Audience</span>
                <input value={businessWizard.audience} onChange={(event) => updateBusinessWizard({ audience: event.target.value })} placeholder="Local gym members, homeowners..." />
              </label>
              <label>
                <span>Brand style</span>
                <input value={businessWizard.brandStyle} onChange={(event) => updateBusinessWizard({ brandStyle: event.target.value })} placeholder="Premium, tactical, playful, minimalist..." />
              </label>
              <label>
                <span>Initial services/products</span>
                <input value={businessWizard.initialProducts} onChange={(event) => updateBusinessWizard({ initialProducts: event.target.value })} placeholder="Hoodies, landing pages, SEO retainers..." />
              </label>
              <label>
                <span>Initial goal</span>
                <input value={businessWizard.goal} onChange={(event) => updateBusinessWizard({ goal: event.target.value })} placeholder="Launch first merch collection" />
              </label>
              <label className="business-wizard-wide">
                <span>Notes</span>
                <textarea value={businessWizard.notes} onChange={(event) => updateBusinessWizard({ notes: event.target.value })} placeholder="Approval rules, contact notes, constraints, important context..." rows={3} />
              </label>
            </div>

            <ol className="business-wizard-steps" aria-label="What ENTRAL will create">
              <li>Marshal theater: {businessWizard.preferredMarshal.trim() || selectedTemplate.marshalName}</li>
              <li>Business General: {businessWizard.businessName.trim() || "Your business"} General</li>
              <li>{selectedTemplate.commanders.length} Commanders and {selectedTemplate.commanders.reduce((total, commander) => total + commander.soldiers.length, 0)} Soldiers</li>
              <li>First intake task assigned for review</li>
            </ol>

            <div className="business-wizard-actions">
              <Button type="button" onClick={() => requestBusinessTemplateAuthorization(selectedTemplate, businessWizard)}>
                <Plus aria-hidden="true" size={16} />
                Preview creation
              </Button>
              <Button type="button" variant="secondary" onClick={() => {
                updateBusinessWizard(defaultBusinessWizard);
                openBusinessWizard();
              }}>
                Reset
              </Button>
            </div>
          </section>
        ) : null}

        <details className="command-console-controls" data-academy="command-controls" open={isControlsOpen} onToggle={(event) => setIsControlsOpen(event.currentTarget.open)}>
          <summary>
            <SlidersHorizontal aria-hidden="true" size={16} />
            Unified controls
            <span>Graph, hierarchy, focus</span>
          </summary>

          <label className="command-search">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">Search Command OS nodes</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Marshals, Generals, Commanders, Soldiers..." />
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
            <Button type="button" variant="secondary" onClick={() => fitGraph()}>
              <Maximize2 aria-hidden="true" size={17} />
              Fit
            </Button>
            <Button type="button" variant="secondary" onClick={() => {
              setIsFocusMode(true);
              setStatusMessage("Focus Mode engaged. Press Escape or double-click the graph to restore controls.");
            }}>
              <Eye aria-hidden="true" size={17} />
              Focus
            </Button>
          </div>

          <div className="command-control-menu" aria-label="Command graph controls">
            <label className="command-range">
              <span>Orbit speed</span>
              <input aria-label="Orbit and particle speed" type="range" min="0" max="2.2" step="0.05" value={graphControls.orbitSpeed} onChange={(event) => updateGraphControl("orbitSpeed", Number(event.target.value))} />
              <strong>{graphControls.orbitSpeed.toFixed(2)}x</strong>
            </label>
            <label className="command-select">
              <span>Orbit pattern</span>
              <select aria-label="Orbit pattern" value={graphControls.orbitPattern} onChange={(event) => updateGraphControl("orbitPattern", event.target.value as OrbitPattern)}>
                {orbitPatternOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
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
            <div className="command-control-row">
              <button className={graphControls.showTrails ? "command-toggle active" : "command-toggle"} type="button" onClick={() => updateGraphControl("showTrails", !graphControls.showTrails)} aria-pressed={graphControls.showTrails}>
                <Activity aria-hidden="true" size={16} />
                Trails
              </button>
              <button className={graphControls.showRings ? "command-toggle active" : "command-toggle"} type="button" onClick={() => updateGraphControl("showRings", !graphControls.showRings)} aria-pressed={graphControls.showRings}>
                <Eye aria-hidden="true" size={16} />
                Orbits
              </button>
            </div>
            <div className="command-control-row">
              <button className="command-toggle" type="button" onClick={() => focusGroup("core")}>
                <Crosshair aria-hidden="true" size={16} />
                Core
              </button>
              <button className="command-toggle" type="button" onClick={resetGraphControls}>
                <RotateCcw aria-hidden="true" size={16} />
                Reset
              </button>
            </div>
          </div>

          <ProductBatchGenerator
            generatedProducts={productBatchResults}
            isGenerating={isGeneratingProductBatch}
            isLoadingStores={isLoadingMerchStores}
            onChange={handleProductBatchFormChange}
            onGenerate={() => void generateProductBatchFromForm()}
            onRefreshStores={() => void loadMerchStores()}
            stores={merchStores}
            value={productBatchForm}
            warnings={productBatchWarnings}
          />

          <ProductApprovalQueue
            isLoading={isLoadingApprovalQueue}
            onAction={(product, action) => void updateProductApproval(product, action)}
            onRefresh={() => void loadApprovalQueue()}
            products={approvalQueueProducts}
            updatingProductIds={updatingApprovalProductIds}
          />

          <MerchOperationsPanel
            isLoadingStores={isLoadingMerchStores}
            onEvent={(message) => {
              recordActivity(message);
              setStatusMessage(message);
            }}
            onRefreshStores={() => void loadMerchStores()}
            stores={merchStores}
          />

          <div className="command-structure-actions" data-academy="command-structure-actions" aria-label="Chain of command controls">
            <Button type="button" variant="secondary" onClick={() => openBusinessWizard()}>
              <Sparkles aria-hidden="true" size={16} />
              Business setup
            </Button>
            <Button type="button" variant="secondary" onClick={() => requestNodeAuthorization("marshal")}>
              <Plus aria-hidden="true" size={16} />
              Add Marshal
            </Button>
            <Button type="button" variant="secondary" onClick={() => requestNodeAuthorization("general")}>
              <Plus aria-hidden="true" size={16} />
              Add General
            </Button>
            <Button type="button" variant="secondary" onClick={() => requestNodeAuthorization("commander")}>
              <Plus aria-hidden="true" size={16} />
              Add Commander
            </Button>
            <Button type="button" variant="secondary" onClick={() => requestNodeAuthorization("soldier")}>
              <Plus aria-hidden="true" size={16} />
              Add Soldier
            </Button>
            <Button type="button" variant="secondary" disabled={!selectedNode || selectedNode.type === "core"} onClick={() => requestRemoveNode(selectedNode?.id ?? selectedNodeId)}>
              <Trash2 aria-hidden="true" size={16} />
              Remove Selected
            </Button>
          </div>

          <div className="command-legend compact" aria-label="Hierarchy colors">
            {graph.groups.map((group) => (
              <article className={activeGroupId === group.id ? "command-color-row active" : "command-color-row"} key={group.id}>
                <button type="button" onClick={() => focusGroup(group.id)}>
                  <span style={{ "--group-color": group.color } as React.CSSProperties} />
                  <strong>{group.name}</strong>
                </button>
                <label>
                  <span className="sr-only">Choose color for {group.name}</span>
                  <input type="color" value={group.color} onChange={(event) => updateGroupColor(group.id, event.target.value)} />
                </label>
              </article>
            ))}
          </div>
        </details>

        <div className="command-console-log" data-academy="command-task-list" aria-label="Command console history">
          {commandHistory.map((message) => (
            <article className={`command-console-message ${message.role} source-${message.sourceType}`} key={message.id}>
              <span className="command-console-source">{message.sourceLabel}</span>
              <p>{message.content}</p>
            </article>
          ))}
        </div>

        {pendingAuthorization ? (
          <section className="command-authorization-card" aria-label="Pending authorization">
            <div>
              <p className="eyebrow">Authorization required</p>
              <pre>{pendingAuthorization.summary}</pre>
            </div>
            <div>
              <Button type="button" onClick={approvePendingAuthorization}>
                Approve
              </Button>
              <Button type="button" variant="secondary" onClick={modifyPendingAuthorization}>
                Modify
              </Button>
              <Button type="button" variant="secondary" onClick={cancelPendingAuthorization}>
                Cancel
              </Button>
            </div>
          </section>
        ) : null}

        <div className="command-chat-suggestions" aria-label="Example ENTRAL commands">
          {contextCommandSuggestions.map((example) => (
            <button key={example} type="button" onClick={() => executeCommand(example)}>
              {example}
            </button>
          ))}
        </div>

        <div className="command-chat-input-row">
          <label className="sr-only" htmlFor="entral-command-input">ENTRAL command directive</label>
          <button
            className={isListening ? "voice-command-button listening" : "voice-command-button"}
            type="button"
            aria-label={isListening ? "Stop voice command capture" : "Start voice command capture"}
            aria-pressed={isListening}
            onClick={() => {
              if (!voiceSettings.pushToTalk) {
                handleVoiceButtonClick();
              }
            }}
            onPointerDown={voiceSettings.pushToTalk ? startVoiceRecognition : undefined}
            onPointerUp={voiceSettings.pushToTalk ? stopVoiceRecognition : undefined}
            onPointerCancel={voiceSettings.pushToTalk ? stopVoiceRecognition : undefined}
            onPointerLeave={voiceSettings.pushToTalk && isListening ? stopVoiceRecognition : undefined}
          >
            {isListening ? <Mic aria-hidden="true" size={18} /> : <MicOff aria-hidden="true" size={18} />}
          </button>
          <input
            id="entral-command-input"
            disabled={isThinking}
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={isThinking ? "Analysis in progress..." : 'Try: "ENTRAL, report"'}
          />
          <button type="submit" aria-label="Send command" disabled={isThinking}>
            <Send aria-hidden="true" size={18} />
          </button>
        </div>
      </form>

      {!isCommandConsoleOpen ? (
        <button className="command-chat-reopen" type="button" onClick={() => setIsCommandConsoleOpen(true)} aria-label="Open command console">
          <Bot aria-hidden="true" size={17} />
          Command
        </button>
      ) : null}

      {pendingRemovalNode ? (
        <div className="command-confirm-backdrop" role="presentation">
          <section className="command-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="command-remove-title">
            <div className="command-confirm-icon">
              <AlertTriangle aria-hidden="true" size={22} />
            </div>
            <div>
              <p className="eyebrow">Confirm removal</p>
              <h2 id="command-remove-title">{pendingRemovalImpact?.title ?? `Remove ${pendingRemovalNode.title}?`}</h2>
              <p>{pendingRemovalImpact?.body}</p>
              <dl>
                <div>
                  <dt>Name</dt>
                  <dd>{pendingRemovalNode.name}</dd>
                </div>
                {pendingRemovalImpact?.impact.map((line) => {
                  const [label, ...rest] = line.split(": ");
                  return (
                    <div key={line}>
                      <dt>{label}</dt>
                      <dd>{rest.join(": ")}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
            <div className="command-confirm-actions">
              <Button type="button" variant="secondary" onClick={() => setPendingRemovalId(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmRemoveNode}>
                <Trash2 aria-hidden="true" size={17} />
                Confirm Remove
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      <aside className={isPanelOpen ? "command-side-panel open" : "command-side-panel"} data-academy="command-inspector" aria-label="Neuron side information panel" aria-hidden={!isPanelOpen}>
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
                <span><strong>{new Date(selectedNode.createdAt).toLocaleDateString()}</strong> created</span>
              </div>
              <p>{selectedNode.description ?? selectedNode.role}</p>
              {selectedParent ? <small>Reports to {selectedParent.name}</small> : <small>Root command authority</small>}
            </section>

            <section className="command-node-brief" aria-label="Selected command path">
              <h3>Command path</h3>
              <p>{selectedCommandPath || "ENTRAL"}</p>
              {selectedNode.commandType === "marshal" ? <small>{selectedNode.marshalType ?? "Strategic theater"}</small> : null}
              {selectedNode.commandType === "general" ? <small>{selectedNode.businessName ?? selectedNode.name} / {selectedNode.generalType ?? "Business General"}</small> : null}
              {selectedNode.commandType === "commander" ? <small>{selectedNode.operationalArea ?? selectedNode.name} under {selectedNode.parentGeneralName ?? "General"}</small> : null}
              {selectedNode.commandType === "soldier" ? <small>{selectedNode.executionRole ?? selectedNode.name} under {selectedNode.parentCommanderName ?? "Commander"}</small> : null}
            </section>

            {selectedInspectorStats ? (
              <section className="command-node-brief" aria-label="Operational summary">
                <h3>Operational summary</h3>
                <div>
                  <span><strong>{selectedInspectorStats.marshals}</strong> Marshals</span>
                  <span><strong>{selectedInspectorStats.generals}</strong> Generals</span>
                  <span><strong>{selectedInspectorStats.commanders}</strong> Commanders</span>
                  <span><strong>{selectedInspectorStats.soldiers}</strong> Soldiers</span>
                  <span><strong>{selectedInspectorStats.activeTasks}</strong> active tasks</span>
                  <span><strong>{selectedInspectorStats.failedTasks}</strong> failed tasks</span>
                </div>
              </section>
            ) : null}

            {selectedSuggestedActions.length > 0 ? (
              <section className="command-suggested-actions" aria-label="Suggested actions">
                <h3>Suggested actions</h3>
                <div>
                  {selectedSuggestedActions.map((action) => (
                    <button key={action.label} type="button" onClick={() => executeCommand(action.command)}>
                      {action.label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="command-capabilities" aria-label="Agent capability architecture">
              <div className="section-title-row compact">
                {selectedNode.type === "core" ? <Network aria-hidden="true" size={17} /> : <Zap aria-hidden="true" size={17} />}
                <h3>{selectedNode.type === "core" ? "Business execution architecture" : "Assigned capabilities"}</h3>
              </div>
              <div className="command-capability-grid">
                {(selectedCapabilityCards.length > 0 ? selectedCapabilityCards : (selectedNode.tools ?? ["command_bus"]).map((tool) => ({
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
                {(selectedNode.tools ?? ["command_bus"]).map((tool) => <span key={tool}>{tool}</span>)}
              </div>
            </section>

            {selectedChildren.length > 0 ? (
              <section className="command-search-results">
                <h3>{selectedNode.commandType === "marshal" ? "Business Generals" : selectedNode.commandType === "general" ? "Commanders" : selectedNode.commandType === "commander" ? "Soldiers" : "Child nodes"}</h3>
                {selectedChildren.map((node) => (
                  <button key={node.id} type="button" onClick={() => focusCommandNode(node)}>
                    <span>{node.name}</span>
                    <small>{node.title} / {statusLabel(node.status)}</small>
                  </button>
                ))}
              </section>
            ) : renderChildEmptyState(selectedNode)}

            <section>
              <h3>What is being displayed</h3>
              <p>{selectedNode.currentTask ?? "No active task. This entity is ready for delegation."}</p>
            </section>
            <section className="command-task-panel">
              <h3>Tasks</h3>
              {selectedTasks.length > 0 ? (
                <div className="command-task-list">
                  {selectedTasks.map((task) => (
                    <article className={`command-task-card task-${task.status}`} key={task.id}>
                      <div>
                        <strong>{task.name}</strong>
                        <span>{taskStatusLabel(task.status)}</span>
                      </div>
                      <p>{task.description}</p>
                      <small>Path: {task.delegationPath.map((id) => nodeMap.get(id)?.name ?? id).join(" -> ")}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="command-empty-state compact">
                  <h3>No active tasks.</h3>
                  <p>Create a task or generate a workflow after this entity has execution capacity.</p>
                  <div>
                    <Button type="button" variant="secondary" onClick={() => executeCommand("Create task Review the command hierarchy")}>Create Task</Button>
                    <Button type="button" variant="secondary" onClick={() => requestWorkflowAuthorization("start merch store launch workflow")}>Generate Workflow</Button>
                  </div>
                </div>
              )}
            </section>
            <section className="command-report-history">
              <h3>Report history</h3>
              {selectedReportHistory.length > 0 ? (
                <div>
                  {selectedReportHistory.map((report) => (
                    <article key={report.id}>
                      <strong>{report.situation}</strong>
                      <span>{new Date(report.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                      <p>{report.recommendation}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No reports recorded yet. Generate a report to preserve command history.</p>
              )}
            </section>
            <section className="command-memory-panel">
              <h3>Memory</h3>
              <p><strong>Role:</strong> {selectedNode.memory.role}</p>
              <p><strong>Instructions:</strong> {selectedNode.memory.instructions}</p>
              <div className="command-memory-grid">
                <div>
                  <strong>Recent tasks</strong>
                  {(selectedNode.memory.recentTasks.length > 0 ? selectedNode.memory.recentTasks : ["None yet"]).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
                </div>
                <div>
                  <strong>Results</strong>
                  {(selectedNode.memory.taskResults.length > 0 ? selectedNode.memory.taskResults : ["No results yet"]).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
                </div>
                <div>
                  <strong>Notes</strong>
                  {(selectedNode.memory.notes.length > 0 ? selectedNode.memory.notes : ["No notes yet"]).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
                </div>
              </div>
            </section>
            <section>
              <h3>Task history</h3>
              <div className="command-log-list">
                {(selectedNode.taskHistory.length > 0 ? selectedNode.taskHistory : ["No task history yet."]).map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
              </div>
            </section>
            <section>
              <h3>Reasoning</h3>
              <p>{selectedNode.reasoning}</p>
            </section>
            <section>
              <h3>Screen sharing preview</h3>
              <div className="screen-preview-placeholder">No active screen stream. Start sharing from the command interface when needed.</div>
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
              <Button type="button" variant="secondary" onClick={() => mutateNode(selectedNode.id, { status: selectedNode.status === "offline" ? "working" : "offline", logs: [`${selectedNode.status === "offline" ? "Resumed" : "Marked offline"} from side panel.`, ...selectedNode.logs] })}>
                {selectedNode.status === "offline" ? <Play aria-hidden="true" size={17} /> : <Pause aria-hidden="true" size={17} />}
                {selectedNode.status === "offline" ? "Resume" : "Offline"}
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
