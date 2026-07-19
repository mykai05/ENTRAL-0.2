"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Crosshair,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Network,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import type { MemberOverviewResponse } from "../lib/member";
import type { MemberGraphBranch, MemberGraphStatus } from "./member-graph-model";
import {
  buildMemberNeuronScene3D,
  memberBranchOrder,
  type MemberNeuron3D
} from "./member-neurons-3d";

type Vec3 = { x: number; y: number; z: number };
type CameraState = { distance: number; pitch: number; yaw: number };
type ProjectedNeuron = { id: string; radius: number; visible: boolean; x: number; y: number };
type BranchColors = Record<MemberGraphBranch, string>;
type Matrix4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

const defaultCamera: CameraState = { distance: 1150, pitch: -0.16, yaw: 0.58 };
const colorStoragePrefix = "entral-member-command-field-colors";

const defaultBranchColors: BranchColors = {
  core: "#00f0ff",
  marshal: "#9b7bff",
  general: "#39ff9a",
  commander: "#ff4fd8",
  soldier: "#ffd166",
  health: "#39ff14",
  priorities: "#ff00ff",
  work: "#00bfff",
  team: "#9b5cff",
  summary: "#ffd166",
  findings: "#ff4d6d"
};

const colorPresets: Array<{ colors: BranchColors; label: string }> = [
  { label: "Entral neon", colors: defaultBranchColors },
  {
    label: "Deep ocean",
    colors: { core: "#5ef2ff", marshal: "#9da8ff", general: "#56f0bd", commander: "#4cc9f0", soldier: "#b9e4ff", health: "#56f0bd", priorities: "#8c9eff", work: "#00b8d9", team: "#7c6cff", summary: "#b9e4ff", findings: "#ff7d9c" }
  },
  {
    label: "Signal spectrum",
    colors: { core: "#ffffff", marshal: "#b56cff", general: "#00ff87", commander: "#ff4fd8", soldier: "#ffcf4a", health: "#00ff87", priorities: "#ff4fd8", work: "#00d9ff", team: "#b56cff", summary: "#ffcf4a", findings: "#ff5b55" }
  }
];

const branchLabels: Record<MemberGraphBranch, string> = {
  core: "Entral core",
  marshal: "Marshals",
  general: "Business Generals",
  commander: "Commanders",
  soldier: "Soldiers",
  health: "Business health",
  priorities: "Priorities",
  work: "Visible work",
  team: "Organization team",
  summary: "Operating summary",
  findings: "Findings"
};

function hierarchyLayer(node: MemberNeuron3D) {
  if (node.branch === "core") return "ENTRAL";
  if (node.branch === "marshal") return "Marshal";
  if (node.branch === "general") return "General";
  if (node.branch === "commander") return "Commander";
  if (node.branch === "soldier") return "Soldier";
  return node.depth > 3 ? "Operating record" : "Operating signal";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeColor(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

function hexToRgb(value: string): [number, number, number] {
  const clean = value.replace("#", "");
  const parsed = Number.parseInt(clean, 16);
  return [((parsed >> 16) & 255) / 255, ((parsed >> 8) & 255) / 255, (parsed & 255) / 255];
}

function subtract(first: Vec3, second: Vec3): Vec3 {
  return { x: first.x - second.x, y: first.y - second.y, z: first.z - second.z };
}

function cross(first: Vec3, second: Vec3): Vec3 {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x
  };
}

function dot(first: Vec3, second: Vec3) {
  return first.x * second.x + first.y * second.y + first.z * second.z;
}

function normalize(value: Vec3): Vec3 {
  const length = Math.hypot(value.x, value.y, value.z) || 1;
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

function multiplyMatrix(first: Matrix4, second: Matrix4): Matrix4 {
  const result = new Array(16).fill(0) as Matrix4;
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      result[column * 4 + row] =
        first[row] * second[column * 4] +
        first[4 + row] * second[column * 4 + 1] +
        first[8 + row] * second[column * 4 + 2] +
        first[12 + row] * second[column * 4 + 3];
    }
  }
  return result;
}

function perspective(fieldOfView: number, aspect: number, near: number, far: number): Matrix4 {
  const scale = 1 / Math.tan(fieldOfView / 2);
  const range = 1 / (near - far);
  return [
    scale / aspect, 0, 0, 0,
    0, scale, 0, 0,
    0, 0, (near + far) * range, -1,
    0, 0, near * far * range * 2, 0
  ];
}

function lookAt(eye: Vec3, target: Vec3): Matrix4 {
  const forward = normalize(subtract(eye, target));
  const right = normalize(cross({ x: 0, y: 1, z: 0 }, forward));
  const up = cross(forward, right);
  return [
    right.x, up.x, forward.x, 0,
    right.y, up.y, forward.y, 0,
    right.z, up.z, forward.z, 0,
    -dot(right, eye), -dot(up, eye), -dot(forward, eye), 1
  ];
}

function cameraMatrix(camera: CameraState, width: number, height: number) {
  const pitch = clamp(camera.pitch, -1.18, 1.18);
  const eye = {
    x: Math.sin(camera.yaw) * Math.cos(pitch) * camera.distance,
    y: Math.sin(pitch) * camera.distance,
    z: Math.cos(camera.yaw) * Math.cos(pitch) * camera.distance
  };
  return multiplyMatrix(perspective(Math.PI / 3.15, Math.max(0.1, width / height), 1, 6000), lookAt(eye, { x: 0, y: 0, z: 0 }));
}

function projectPoint(point: Vec3, matrix: Matrix4, width: number, height: number) {
  const clipX = matrix[0] * point.x + matrix[4] * point.y + matrix[8] * point.z + matrix[12];
  const clipY = matrix[1] * point.x + matrix[5] * point.y + matrix[9] * point.z + matrix[13];
  const clipZ = matrix[2] * point.x + matrix[6] * point.y + matrix[10] * point.z + matrix[14];
  const clipW = matrix[3] * point.x + matrix[7] * point.y + matrix[11] * point.z + matrix[15];
  const safeW = clipW || 0.0001;
  return {
    visible: clipW > 0 && clipZ / safeW > -1 && clipZ / safeW < 1,
    x: (clipX / safeW * 0.5 + 0.5) * width,
    y: (1 - (clipY / safeW * 0.5 + 0.5)) * height,
    depth: safeW
  };
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create a WebGL shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create a WebGL program.");
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertex);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown WebGL link error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function statusLabel(status: MemberGraphStatus) {
  if (status === "attention") return "Needs attention";
  if (status === "watch") return "Watch";
  if (status === "quiet") return "Awaiting data";
  if (status === "stable") return "Stable";
  return "Active";
}

function statusColor(status: MemberGraphStatus) {
  if (status === "attention") return "#ff5f6d";
  if (status === "watch") return "#ffd166";
  if (status === "stable") return "#39ff14";
  if (status === "quiet") return "#7f98a3";
  return "#00f0ff";
}

function matchesSearch(node: MemberNeuron3D, search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;
  return `${node.label} ${node.metric} ${node.status} ${node.detail} ${branchLabels[node.branch]}`.toLowerCase().includes(normalized);
}

export function MemberNeuronsCommandCenter({ overview }: { overview: MemberOverviewResponse }) {
  const scene = useMemo(() => buildMemberNeuronScene3D(overview), [overview]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const commandCenterRef = useRef<HTMLElement | null>(null);
  const selectedLabelRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<CameraState>({ ...defaultCamera });
  const selectedIdRef = useRef("core");
  const renderingActiveRef = useRef(true);
  const projectedRef = useRef<ProjectedNeuron[]>([]);
  const dragRef = useRef<{ pitch: number; pointerId: number; x: number; y: number; yaw: number } | null>(null);
  const [selectedId, setSelectedId] = useState("core");
  const [search, setSearch] = useState("");
  const [branchColors, setBranchColors] = useState<BranchColors>(defaultBranchColors);
  const [orbitSpeed, setOrbitSpeed] = useState(0.72);
  const [brightness, setBrightness] = useState(1);
  const [gravity, setGravity] = useState(1);
  const [cameraSensitivity, setCameraSensitivity] = useState(1);
  const [showParticles, setShowParticles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [webGlState, setWebGlState] = useState<"checking" | "ready" | "unavailable">("checking");
  const [rendererGeneration, setRendererGeneration] = useState(0);
  const [colorsReady, setColorsReady] = useState(false);
  const selectedNode = scene.nodes.find((node) => node.id === selectedId) ?? scene.nodes[0];
  const filteredNodes = useMemo(() => scene.nodes.filter((node) => matchesSearch(node, search)), [scene.nodes, search]);
  const visibleIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);
  const controlsRef = useRef({ branchColors, brightness, gravity, isPaused, orbitSpeed, showParticles, visibleIds });

  useEffect(() => {
    controlsRef.current = { branchColors, brightness, gravity, isPaused, orbitSpeed, showParticles, visibleIds };
  }, [branchColors, brightness, gravity, isPaused, orbitSpeed, showParticles, visibleIds]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    setSelectedId("core");
    setSearch("");
    cameraRef.current = { ...defaultCamera };
    setColorsReady(false);
    try {
      const raw = window.localStorage.getItem(`${colorStoragePrefix}:${overview.organization.id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BranchColors>;
        setBranchColors(Object.fromEntries(memberBranchOrder.map((branch) => [
          branch,
          sanitizeColor(parsed[branch], defaultBranchColors[branch])
        ])) as BranchColors);
      } else {
        setBranchColors(defaultBranchColors);
      }
    } catch {
      setBranchColors(defaultBranchColors);
    } finally {
      setColorsReady(true);
    }
  }, [overview.organization.id]);

  useEffect(() => {
    if (!colorsReady) return;
    try {
      window.localStorage.setItem(`${colorStoragePrefix}:${overview.organization.id}`, JSON.stringify(branchColors));
    } catch {
      // Visual preferences remain functional for the current session when storage is unavailable.
    }
  }, [branchColors, colorsReady, overview.organization.id]);

  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!preference) return;
    const syncPreference = () => {
      setIsReducedMotion(preference.matches);
      if (preference.matches) setIsPaused(true);
    };
    syncPreference();
    preference.addEventListener?.("change", syncPreference);
    return () => preference.removeEventListener?.("change", syncPreference);
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === commandCenterRef.current);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    const element = commandCenterRef.current;
    let isIntersecting = true;
    const syncActivity = () => {
      renderingActiveRef.current = document.visibilityState !== "hidden" && isIntersecting;
    };
    const observer = typeof IntersectionObserver === "undefined" || !element ? null : new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? true;
      syncActivity();
    }, { rootMargin: "160px" });
    if (element) observer?.observe(element);
    document.addEventListener("visibilitychange", syncActivity);
    syncActivity();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncActivity);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", { alpha: true, antialias: true, depth: true, premultipliedAlpha: false });
    } catch {
      gl = null;
    }
    if (!gl) {
      setWebGlState("unavailable");
      return;
    }

    const canvasElement = canvas;
    const glContext = gl;
    let animationFrame = 0;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      window.cancelAnimationFrame(animationFrame);
      setWebGlState("unavailable");
    };
    const handleContextRestored = () => {
      setWebGlState("checking");
      setRendererGeneration((generation) => generation + 1);
    };
    setWebGlState("ready");
    let pointProgram: WebGLProgram;
    let lineProgram: WebGLProgram;
    try {
      pointProgram = createProgram(glContext, `
      attribute vec3 a_position;
      uniform mat4 u_matrix;
      uniform float u_size;
      void main() {
        vec4 projected = u_matrix * vec4(a_position, 1.0);
        gl_Position = projected;
        gl_PointSize = clamp(u_size * 760.0 / max(240.0, projected.w), 1.2, 128.0);
      }
    `, `
      precision mediump float;
      uniform vec3 u_color;
      uniform float u_alpha;
      void main() {
        float distanceFromCenter = distance(gl_PointCoord, vec2(0.5));
        if (distanceFromCenter > 0.5) discard;
        float core = 1.0 - smoothstep(0.0, 0.5, distanceFromCenter);
        float glow = 1.0 - smoothstep(0.12, 0.5, distanceFromCenter);
        gl_FragColor = vec4(u_color, u_alpha * (glow * 0.72 + core * 0.28));
      }
    `);
      lineProgram = createProgram(glContext, `
      attribute vec3 a_position;
      uniform mat4 u_matrix;
      void main() { gl_Position = u_matrix * vec4(a_position, 1.0); }
    `, `
      precision mediump float;
      uniform vec3 u_color;
      uniform float u_alpha;
      void main() { gl_FragColor = vec4(u_color, u_alpha); }
      `);
    } catch {
      setWebGlState("unavailable");
      return;
    }
    const pointBuffer = glContext.createBuffer();
    const lineBuffer = glContext.createBuffer();
    if (!pointBuffer || !lineBuffer) {
      if (pointBuffer) glContext.deleteBuffer(pointBuffer);
      if (lineBuffer) glContext.deleteBuffer(lineBuffer);
      glContext.deleteProgram(pointProgram);
      glContext.deleteProgram(lineProgram);
      setWebGlState("unavailable");
      return;
    }
    canvasElement.addEventListener("webglcontextlost", handleContextLost);
    canvasElement.addEventListener("webglcontextrestored", handleContextRestored);

    const pointPosition = glContext.getAttribLocation(pointProgram, "a_position");
    const pointMatrix = glContext.getUniformLocation(pointProgram, "u_matrix");
    const pointColor = glContext.getUniformLocation(pointProgram, "u_color");
    const pointAlpha = glContext.getUniformLocation(pointProgram, "u_alpha");
    const pointSize = glContext.getUniformLocation(pointProgram, "u_size");
    const linePosition = glContext.getAttribLocation(lineProgram, "a_position");
    const lineMatrix = glContext.getUniformLocation(lineProgram, "u_matrix");
    const lineColor = glContext.getUniformLocation(lineProgram, "u_color");
    const lineAlpha = glContext.getUniformLocation(lineProgram, "u_alpha");
    const nodeMap = new Map(scene.nodes.map((node) => [node.id, node]));
    const starPoints = Array.from({ length: 260 }, (_, index) => {
      const angle = index * 2.399963;
      const radius = 900 + (index % 23) * 82;
      return {
        x: Math.cos(angle) * radius,
        y: ((index * 83) % 1300) - 650,
        z: Math.sin(angle) * radius
      };
    });
    let previousTime = performance.now();

    function resize() {
      const rectangle = canvasElement.getBoundingClientRect();
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rectangle.width * pixelRatio));
      const height = Math.max(1, Math.round(rectangle.height * pixelRatio));
      if (canvasElement.width !== width || canvasElement.height !== height) {
        canvasElement.width = width;
        canvasElement.height = height;
      }
      glContext.viewport(0, 0, width, height);
    }

    function drawPoint(point: Vec3, color: string, size: number, alpha: number, matrix: Matrix4) {
      glContext.useProgram(pointProgram);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, pointBuffer);
      glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array([point.x, point.y, point.z]), glContext.DYNAMIC_DRAW);
      glContext.enableVertexAttribArray(pointPosition);
      glContext.vertexAttribPointer(pointPosition, 3, glContext.FLOAT, false, 0, 0);
      glContext.uniformMatrix4fv(pointMatrix, false, matrix);
      glContext.uniform3fv(pointColor, hexToRgb(color));
      glContext.uniform1f(pointAlpha, alpha);
      glContext.uniform1f(pointSize, size);
      glContext.drawArrays(glContext.POINTS, 0, 1);
    }

    function drawPoints(points: Vec3[], color: string, size: number, alpha: number, matrix: Matrix4) {
      glContext.useProgram(pointProgram);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, pointBuffer);
      glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(points.flatMap((point) => [point.x, point.y, point.z])), glContext.DYNAMIC_DRAW);
      glContext.enableVertexAttribArray(pointPosition);
      glContext.vertexAttribPointer(pointPosition, 3, glContext.FLOAT, false, 0, 0);
      glContext.uniformMatrix4fv(pointMatrix, false, matrix);
      glContext.uniform3fv(pointColor, hexToRgb(color));
      glContext.uniform1f(pointAlpha, alpha);
      glContext.uniform1f(pointSize, size);
      glContext.drawArrays(glContext.POINTS, 0, points.length);
    }

    function drawLine(points: Vec3[], color: string, alpha: number, matrix: Matrix4, mode: number = glContext.LINES) {
      glContext.useProgram(lineProgram);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, lineBuffer);
      glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(points.flatMap((point) => [point.x, point.y, point.z])), glContext.DYNAMIC_DRAW);
      glContext.enableVertexAttribArray(linePosition);
      glContext.vertexAttribPointer(linePosition, 3, glContext.FLOAT, false, 0, 0);
      glContext.uniformMatrix4fv(lineMatrix, false, matrix);
      glContext.uniform3fv(lineColor, hexToRgb(color));
      glContext.uniform1f(lineAlpha, alpha);
      glContext.drawArrays(mode, 0, points.length);
    }

    function render(time: number) {
      if (!renderingActiveRef.current) {
        previousTime = time;
        animationFrame = window.requestAnimationFrame(render);
        return;
      }
      const controls = controlsRef.current;
      if (controls.isPaused && time - previousTime < 80) {
        animationFrame = window.requestAnimationFrame(render);
        return;
      }
      const fieldScale = clamp(1.38 - controls.gravity * 0.34, 0.68, 1.24);
      const fieldPoint = (node: MemberNeuron3D): Vec3 => ({ x: node.x3 * fieldScale, y: node.y3 * fieldScale, z: node.z3 * fieldScale });
      const delta = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      if (!controls.isPaused) cameraRef.current.yaw += delta * controls.orbitSpeed * 0.13;
      const matrix = cameraMatrix(cameraRef.current, canvasElement.width, canvasElement.height);
      glContext.clearColor(0.003, 0.012, 0.02, 1);
      glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
      glContext.enable(glContext.BLEND);
      glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE);
      glContext.enable(glContext.DEPTH_TEST);

      drawPoints(starPoints, "#6eeeff", 2.5, 0.16 * controls.brightness, matrix);
      for (const radius of [240, 370, 440, 475]) {
        const orbit = Array.from({ length: 97 }, (_, index) => {
          const angle = (Math.PI * 2 * index) / 96;
          return { x: Math.cos(angle) * radius * fieldScale, y: 0, z: Math.sin(angle) * radius * fieldScale };
        });
        drawLine(orbit, controls.branchColors.core, radius === 250 ? 0.13 : 0.075, matrix, glContext.LINE_STRIP);
      }

      scene.edges.forEach((edge, index) => {
        const source = nodeMap.get(edge.from);
        const target = nodeMap.get(edge.to);
        if (!source || !target) return;
        const isVisible = controls.visibleIds.has(source.id) && controls.visibleIds.has(target.id);
        const color = controls.branchColors[target.branch];
        const sourcePoint = fieldPoint(source);
        const targetPoint = fieldPoint(target);
        drawLine(
          [sourcePoint, targetPoint],
          color,
          isVisible ? (edge.kind === "assignment" ? 0.42 : 0.29) * controls.brightness : 0.035,
          matrix
        );
        if (controls.showParticles && !controls.isPaused && isVisible) {
          const progress = (time * 0.00012 * Math.max(0.2, controls.orbitSpeed) + index * 0.173) % 1;
          drawPoint({
            x: sourcePoint.x + (targetPoint.x - sourcePoint.x) * progress,
            y: sourcePoint.y + (targetPoint.y - sourcePoint.y) * progress,
            z: sourcePoint.z + (targetPoint.z - sourcePoint.z) * progress
          }, color, 17, 0.72 * controls.brightness, matrix);
        }
      });

      const projected: ProjectedNeuron[] = [];
      scene.nodes.forEach((node) => {
        const isVisible = controls.visibleIds.has(node.id);
        const isSelected = node.id === selectedIdRef.current;
        const branchColor = controls.branchColors[node.branch];
        const pulse = controls.isPaused ? 1 : 1 + Math.sin(time * 0.0024 + node.depth) * 0.08;
        const baseSize = node.depth === 0 ? 128 : node.depth === 1 ? 62 : node.depth === 2 ? 40 : 30;
        const alpha = (isVisible ? 1 : 0.13) * controls.brightness;
        const point = fieldPoint(node);
        drawPoint(point, branchColor, baseSize * 1.85 * pulse, (isSelected ? 0.24 : 0.1) * alpha, matrix);
        drawPoint(point, statusColor(node.status), baseSize * 1.24 * pulse, 0.32 * alpha, matrix);
        drawPoint(point, branchColor, baseSize * pulse, 0.95 * alpha, matrix);
        if (node.depth === 0) drawPoint(point, "#ffffff", 28, 1, matrix);
        const projection = projectPoint(point, matrix, canvasElement.width, canvasElement.height);
        projected.push({
          id: node.id,
          radius: clamp(baseSize * 760 / Math.max(240, projection.depth), 8, 52),
          visible: projection.visible,
          x: projection.x / (canvasElement.width / Math.max(1, canvasElement.clientWidth)),
          y: projection.y / (canvasElement.height / Math.max(1, canvasElement.clientHeight))
        });
      });
      projectedRef.current = projected;
      const selectedProjection = projected.find((point) => point.id === selectedIdRef.current);
      const label = selectedLabelRef.current;
      if (label) {
        const shouldShow = controlsRef.current.visibleIds.has(selectedIdRef.current) && Boolean(selectedProjection?.visible);
        label.hidden = !shouldShow;
        if (selectedProjection) label.style.transform = `translate3d(${selectedProjection.x}px, ${selectedProjection.y}px, 0) translate(-50%, calc(-100% - 1rem))`;
      }
      animationFrame = window.requestAnimationFrame(render);
    }

    resize();
    animationFrame = window.requestAnimationFrame(render);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(canvasElement);
    window.addEventListener("resize", resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      canvasElement.removeEventListener("webglcontextlost", handleContextLost);
      canvasElement.removeEventListener("webglcontextrestored", handleContextRestored);
      window.cancelAnimationFrame(animationFrame);
      glContext.deleteBuffer(pointBuffer);
      glContext.deleteBuffer(lineBuffer);
      glContext.deleteProgram(pointProgram);
      glContext.deleteProgram(lineProgram);
    };
  }, [rendererGeneration, scene]);

  function updateCamera(updater: (camera: CameraState) => CameraState) {
    cameraRef.current = updater(cameraRef.current);
  }

  function resetCamera() {
    cameraRef.current = { ...defaultCamera };
  }

  function selectFromCanvas(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rectangle = canvas.getBoundingClientRect();
    const x = clientX - rectangle.left;
    const y = clientY - rectangle.top;
    const picked = projectedRef.current
      .filter((point) => point.visible && visibleIds.has(point.id))
      .map((point) => ({ ...point, distance: Math.hypot(point.x - x, point.y - y) }))
      .filter((point) => point.distance <= Math.max(18, point.radius))
      .sort((first, second) => first.distance - second.distance)[0];
    if (picked) setSelectedId(picked.id);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pitch: cameraRef.current.pitch, pointerId: event.pointerId, x: event.clientX, y: event.clientY, yaw: cameraRef.current.yaw };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    cameraRef.current = {
      ...cameraRef.current,
      yaw: drag.yaw + (event.clientX - drag.x) * 0.006 * cameraSensitivity,
      pitch: clamp(drag.pitch + (event.clientY - drag.y) * 0.006 * cameraSensitivity, -1.18, 1.18)
    };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5;
    dragRef.current = null;
    if (!moved) selectFromCanvas(event.clientX, event.clientY);
  }

  async function toggleFullscreen() {
    const element = commandCenterRef.current;
    if (!element) return;
    setFullscreenError("");
    try {
      if (document.fullscreenElement === element) await document.exitFullscreen();
      else await element.requestFullscreen();
    } catch {
      setFullscreenError("Full screen could not be opened in this browser. The command field remains fully usable here.");
    }
  }

  return (
    <section className="member-3d-command-center" aria-labelledby="member-3d-heading" ref={commandCenterRef}>
      <header className="member-3d-header">
        <div>
          <p className="eyebrow"><Sparkles aria-hidden="true" size={15} />Entral member command system</p>
          <h2 id="member-3d-heading">Command Universe</h2>
          <p>ENTRAL routes {overview.organization.name}&apos;s visible operating structure through Marshals, Business Generals, Commanders, and Soldiers.</p>
        </div>
        <div className="member-3d-header-status">
          <span><Activity aria-hidden="true" size={15} />{scene.totalNodeCount} command nodes</span>
          <span>{scene.edges.length} links</span>
          <span>{scene.hierarchySource === "published" ? "Published hierarchy" : "Starter hierarchy"}</span>
          <span>Tenant bound</span>
        </div>
      </header>

      <div className="member-3d-toolbar" aria-label="3D field view controls">
        <button onClick={() => updateCamera((camera) => ({ ...camera, distance: clamp(camera.distance - 120, 520, 1900) }))} type="button"><ZoomIn aria-hidden="true" size={16} />Zoom</button>
        <button onClick={() => updateCamera((camera) => ({ ...camera, distance: clamp(camera.distance + 120, 520, 1900) }))} type="button"><ZoomOut aria-hidden="true" size={16} />Out</button>
        <button onClick={resetCamera} type="button"><Crosshair aria-hidden="true" size={16} />Fit field</button>
        <button aria-pressed={isPaused} onClick={() => setIsPaused((current) => !current)} type="button">
          {isPaused ? <Play aria-hidden="true" size={16} /> : <Pause aria-hidden="true" size={16} />}
          {isPaused ? "Resume" : "Pause"}
        </button>
        <button aria-label={isFullscreen ? "Exit full screen" : "Open full screen"} onClick={() => void toggleFullscreen()} type="button">
          {isFullscreen ? <Minimize2 aria-hidden="true" size={16} /> : <Maximize2 aria-hidden="true" size={16} />}
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>

      <div className="member-3d-layout">
        <aside className="member-3d-hierarchy" aria-label="Organization neuron hierarchy">
          <div className="member-3d-panel-heading">
            <Network aria-hidden="true" size={18} />
            <div><span>Organization map</span><strong>Chain of command</strong></div>
          </div>
          <label className="member-3d-search">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">Search neurons</span>
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Search neurons..." type="search" value={search} />
          </label>
          <div className="member-3d-branch-list">
            {memberBranchOrder.map((branch) => {
              const nodes = filteredNodes.filter((node) => node.branch === branch);
              const total = scene.nodes.filter((node) => node.branch === branch).length;
              return (
                <details key={branch} open={branch === "core" || nodes.some((node) => node.id === selectedId)}>
                  <summary>
                    <span className="member-3d-color-dot" style={{ "--branch-color": branchColors[branch] } as React.CSSProperties} />
                    <span><strong>{branchLabels[branch]}</strong><small>{nodes.length === total ? total : `${nodes.length} of ${total}`} neuron{total === 1 ? "" : "s"}</small></span>
                  </summary>
                  <div>
                    {nodes.length ? nodes.map((node) => (
                      <button aria-pressed={node.id === selectedId} key={node.id} onClick={() => setSelectedId(node.id)} type="button">
                        <span>{node.label}</span><small>{node.metric} <span aria-hidden="true">&middot;</span> {statusLabel(node.status)}</small>
                      </button>
                    )) : <p>No matching neurons.</p>}
                  </div>
                </details>
              );
            })}
          </div>
        </aside>

        <div className="member-3d-stage">
          <canvas
            aria-describedby="member-3d-instructions"
            aria-label={`3D interactive Entral neuron graph for ${overview.organization.name}`}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") updateCamera((camera) => ({ ...camera, yaw: camera.yaw - 0.12 }));
              else if (event.key === "ArrowRight") updateCamera((camera) => ({ ...camera, yaw: camera.yaw + 0.12 }));
              else if (event.key === "ArrowUp") updateCamera((camera) => ({ ...camera, pitch: clamp(camera.pitch - 0.08, -1.18, 1.18) }));
              else if (event.key === "ArrowDown") updateCamera((camera) => ({ ...camera, pitch: clamp(camera.pitch + 0.08, -1.18, 1.18) }));
              else if (event.key === "+" || event.key === "=") updateCamera((camera) => ({ ...camera, distance: clamp(camera.distance - 100, 520, 1900) }));
              else if (event.key === "-") updateCamera((camera) => ({ ...camera, distance: clamp(camera.distance + 100, 520, 1900) }));
              else if (event.key === "Home") resetCamera();
              else return;
              event.preventDefault();
            }}
            onPointerCancel={() => { dragRef.current = null; }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={(event) => {
              event.preventDefault();
              updateCamera((camera) => ({ ...camera, distance: clamp(camera.distance + event.deltaY * 0.7 * cameraSensitivity, 520, 1900) }));
            }}
            ref={canvasRef}
            role="img"
            tabIndex={0}
          />
          {webGlState === "unavailable" ? (
            <div className="member-3d-webgl-error" role="alert">
              <Network aria-hidden="true" size={24} />
              <strong>3D rendering is unavailable</strong>
              <p>Your approved organization neurons remain available in the hierarchy and inspector.</p>
            </div>
          ) : null}
          {showLabels ? (
            <div className="member-3d-selected-label" hidden ref={selectedLabelRef}>
              <strong>{selectedNode.label}</strong><span>{selectedNode.metric}</span>
            </div>
          ) : null}
          <div className="member-3d-stage-badge"><span />Live organization field</div>
          <p id="member-3d-instructions">Drag to orbit. Scroll or use plus and minus to zoom. Use arrow keys to rotate. Select any neuron for its approved details.</p>
        </div>

        <aside className="member-3d-inspector" aria-label="Selected neuron details" aria-live="polite">
          <div className="member-3d-panel-heading">
            <span className="member-3d-color-dot large" style={{ "--branch-color": branchColors[selectedNode.branch] } as React.CSSProperties} />
            <div><span>Selected neuron</span><strong>{selectedNode.label}</strong></div>
          </div>
          <span className={`member-3d-status status-${selectedNode.status}`}>{statusLabel(selectedNode.status)}</span>
          <strong className="member-3d-metric">{selectedNode.metric}</strong>
          <p>{selectedNode.detail}</p>
          <dl>
            <div><dt>Command branch</dt><dd>{branchLabels[selectedNode.branch]}</dd></div>
            <div><dt>Hierarchy layer</dt><dd>{hierarchyLayer(selectedNode)}</dd></div>
            <div><dt>Access</dt><dd>{overview.organization.role === "OWNER" ? "Owner" : "Member"}</dd></div>
          </dl>
          <div className="member-3d-supporting">
            <strong>Current signals</strong>
            <ul>{selectedNode.supportingItems.map((item, index) => <li key={`${selectedNode.id}-${index}`}>{item}</li>)}</ul>
          </div>
          <div className="member-3d-boundary"><Network aria-hidden="true" size={15} />Bound to {overview.organization.name}</div>
        </aside>
      </div>

      <div className="member-3d-controls" aria-label="Neuron field appearance and motion controls">
        <div className="member-3d-controls-heading">
          <SlidersHorizontal aria-hidden="true" size={18} />
          <div><span>Command field controls</span><strong>Motion and color</strong></div>
        </div>
        <div className="member-3d-control-grid">
          <label><span>Orbit speed</span><input aria-label="Neuron orbit speed" max="2.2" min="0" onChange={(event) => setOrbitSpeed(Number(event.target.value))} step="0.05" type="range" value={orbitSpeed} /><strong>{orbitSpeed.toFixed(2)}x</strong></label>
          <label><span>Field gravity</span><input aria-label="Neuron field gravity" max="2" min="0.4" onChange={(event) => setGravity(Number(event.target.value))} step="0.05" type="range" value={gravity} /><strong>{gravity.toFixed(2)}g</strong></label>
          <label><span>Camera sensitivity</span><input aria-label="Neuron camera sensitivity" max="1.8" min="0.35" onChange={(event) => setCameraSensitivity(Number(event.target.value))} step="0.05" type="range" value={cameraSensitivity} /><strong>{cameraSensitivity.toFixed(2)}x</strong></label>
          <label><span>Field brightness</span><input aria-label="Neuron field brightness" max="1.5" min="0.45" onChange={(event) => setBrightness(Number(event.target.value))} step="0.05" type="range" value={brightness} /><strong>{Math.round(brightness * 100)}%</strong></label>
          <button aria-pressed={showParticles} onClick={() => setShowParticles((current) => !current)} type="button">{showParticles ? <Eye aria-hidden="true" size={16} /> : <EyeOff aria-hidden="true" size={16} />}Signal particles</button>
          <button aria-pressed={showLabels} onClick={() => setShowLabels((current) => !current)} type="button">{showLabels ? <Eye aria-hidden="true" size={16} /> : <EyeOff aria-hidden="true" size={16} />}Selected label</button>
          {isReducedMotion ? <span className="member-3d-reduced-motion"><Pause aria-hidden="true" size={15} />Reduced-motion preference detected</span> : null}
        </div>
        <div className="member-3d-palette-heading"><Palette aria-hidden="true" size={17} /><strong>Color system</strong></div>
        <div className="member-3d-presets">
          {colorPresets.map((preset) => (
            <button key={preset.label} onClick={() => setBranchColors(preset.colors)} type="button">
              <span>{memberBranchOrder.slice(0, 5).map((branch) => <i key={branch} style={{ background: preset.colors[branch] }} />)}</span>{preset.label}
            </button>
          ))}
          <button onClick={() => setBranchColors(defaultBranchColors)} type="button"><RotateCcw aria-hidden="true" size={15} />Reset colors</button>
        </div>
        <div className="member-3d-color-controls">
          {memberBranchOrder.map((branch) => (
            <label key={branch}>
              <span>{branchLabels[branch]}</span>
              <input aria-label={`${branchLabels[branch]} color`} onChange={(event) => setBranchColors((current) => ({ ...current, [branch]: sanitizeColor(event.target.value, current[branch]) }))} type="color" value={branchColors[branch]} />
            </label>
          ))}
        </div>
      </div>

      {fullscreenError ? <p className="member-3d-control-error" role="alert">{fullscreenError}</p> : null}

      <p className="member-3d-disclosure">This command universe is read-only and organization-scoped. {scene.hierarchySource === "published" ? "Its chain of command was published for this organization." : "It is showing the organization starter hierarchy until an approved hierarchy is published."} Visual controls change only the local view; internal prompts, approvals, diagnostics, and execution controls are never exposed here.{scene.hiddenNodeCount ? ` ${scene.hiddenNodeCount} lower-level nodes are hidden by the rendering safety budget.` : ""}</p>
    </section>
  );
}
