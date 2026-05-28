import { resolve } from "node:path";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { config } from "dotenv";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../.env") });

type User = {
  email: string;
  id: string;
  name: string;
  password: string;
  role: "USER" | "ADMIN";
};

type Team = {
  id: string;
  name: string;
  role: "OWNER" | "MEMBER";
  slug: string;
  userId: string;
};

type Task = {
  createdAt: string;
  description?: string | null;
  id: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
  team: {
    id: string;
    name: string;
  };
  teamId: string;
  title: string;
  userId: string;
};

type Message = {
  content: string;
  createdAt: string;
  id: string;
  role: "user" | "assistant";
};

type Conversation = {
  createdAt: string;
  id: string;
  messages: Message[];
  title: string;
  updatedAt: string;
  userId: string;
};

type OpenAiMessage = {
  role: "assistant" | "user";
  content: string;
};

type AutomationJob = {
  createdAt: string;
  error?: string | null;
  id: string;
  logs: Array<{ createdAt: string; id: string; level: string; message: string }>;
  payload: {
    selector?: string;
    url?: string;
  };
  result?: {
    content?: string;
    engine?: string;
    statusCode?: number;
    title?: string;
  } | null;
  scheduledAt?: string | null;
  status: string;
  type: string;
  userId: string;
};

type Agent = {
  capabilities: string[];
  id: string;
  isPaused: boolean;
  lastActivitySeenAt?: string | null;
  load: number;
  name: string;
  role: string;
  runInBackground: boolean;
  status: string;
  userId: string;
  webhookUrl?: string | null;
};

type AgentTask = {
  action: string;
  completedAt?: string | null;
  error?: string | null;
  id: string;
  result?: { recommendation?: string; summary?: string } | null;
  scheduleId?: string | null;
  status: string;
  title: string;
};

type AgentSchedule = {
  action: string;
  id: string;
  intervalMinutes: number;
  lastRunAt?: string | null;
  nextRunAt: string;
  status: string;
  title: string;
};

type AgentLog = {
  createdAt: string;
  id: string;
  level: string;
  message: string;
};

type AgentMessage = {
  action: string;
  createdAt: string;
  id: string;
  taskId?: string | null;
  type: string;
};

type Policy = {
  description?: string | null;
  effect: string;
  enabled: boolean;
  id: string;
  name: string;
  rule: Record<string, unknown>;
  severity: string;
};

const app = Fastify({
  logger: {
    level: "info"
  }
});

const state = {
  agentLogs: new Map<string, AgentLog[]>(),
  agentMessages: new Map<string, AgentMessage[]>(),
  agents: new Map<string, Agent>(),
  agentSchedules: new Map<string, AgentSchedule[]>(),
  agentTasks: new Map<string, AgentTask[]>(),
  auditLogs: [] as Array<{
    action: string;
    createdAt: string;
    entry: Record<string, unknown>;
    entryHash: string;
    id: string;
    outcome: string;
    severity: string;
    targetId?: string | null;
    targetType: string;
  }>,
  automationJobs: [] as AutomationJob[],
  conversations: new Map<string, Conversation>(),
  policies: new Map<string, Policy>(),
  sessions: new Map<string, string>(),
  tasks: [] as Task[],
  teams: new Map<string, Team>(),
  users: new Map<string, User>()
};

const openAiModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o";
const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
let openAiClient: OpenAI | null = null;

const memorySystemPrompt = [
  "You are ENTRAL, a concise autonomous business command-center assistant.",
  "Chat is the primary command path in the Atomic Command Center.",
  "The user expects ENTRAL to control visible workspace elements such as the atom graph, agents, panels, settings, trails, orbital rings, camera focus, and automation controls when a supported command is available.",
  "Supported workspace actions include new chat, new task, run agent, open templates, export history, governance dashboard, automation console, replay tutorial, keyboard shortcuts, and command palette.",
  "ENTRAL is designed to become the central controller that delegates to agents, orchestrates background workflows, updates operational context, and improves over time under governance.",
  "The dashboard now exposes a mock Command OS hierarchy: ENTRAL is Emperor; ARIS, VANTA, MERCURY, ORION, and HELIX are Generals; Soldiers and Operations are simulated nodes until real execution is explicitly wired.",
  "Help the user plan, delegate, debug, and operate agents across chat, tasks, automations, and the neuron graph.",
  "Be practical and direct. Do not claim you executed real-world actions unless a tool or API actually did it.",
  "For restricted or sensitive actions, explain the safe governed next step."
].join(" ");

function getOpenAiClient() {
  if (!openAiApiKey) {
    return null;
  }

  openAiClient ??= new OpenAI({ apiKey: openAiApiKey });
  return openAiClient;
}

function recentOpenAiMessages(conversation: Conversation): OpenAiMessage[] {
  return conversation.messages
    .filter((message): message is Message & OpenAiMessage => message.role === "user" || message.role === "assistant")
    .slice(-18)
    .map((message) => ({ content: message.content.slice(0, 4000), role: message.role }));
}

async function createAssistantContent(conversation: Conversation, prompt: string, screenshot?: string) {
  const client = getOpenAiClient();

  if (!client) {
    return `Local ENTRAL reply: I received "${prompt}". Add OPENAI_API_KEY to .env and restart ENTRAL to enable live GPT-4o responses.`;
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: memorySystemPrompt },
    ...recentOpenAiMessages(conversation)
  ];

  if (screenshot) {
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `${prompt}\n\nAnalyze only the shared screenshot. Do not infer hidden windows, credentials, or private data that is not visible.`
        },
        {
          type: "image_url",
          image_url: {
            detail: "low",
            url: screenshot
          }
        }
      ]
    });
  }

  try {
    const response = await client.chat.completions.create({
      messages,
      model: openAiModel,
      temperature: screenshot ? 0.2 : 0.4
    });

    return response.choices[0]?.message?.content?.trim() || "ENTRAL did not return a message. Try again in a moment.";
  } catch (error) {
    app.log.warn({ err: error }, "OpenAI request failed in memory backend");
    return "ENTRAL could not reach OpenAI just now. Check the API key, billing, and network connection, then try again.";
  }
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

function publicUser(user: User) {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role
  };
}

function titleCaseName(name: string) {
  const trimmed = name.trim();
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : "Demo User";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";
}

function createUser(input: { email: string; name?: string; password?: string }) {
  const existing = [...state.users.values()].find((user) => user.email.toLowerCase() === input.email.toLowerCase());

  if (existing) {
    return existing;
  }

  const name = titleCaseName(input.name ?? input.email.split("@")[0] ?? "Demo User");
  const user: User = {
    email: input.email.toLowerCase(),
    id: id("user"),
    name,
    password: input.password ?? "password123",
    role: "ADMIN"
  };
  const team: Team = {
    id: id("team"),
    name: `${name}'s Team`,
    role: "OWNER",
    slug: `${slugify(name)}-${Date.now()}`,
    userId: user.id
  };

  state.users.set(user.id, user);
  state.teams.set(team.id, team);
  return user;
}

function teamsForUser(userId: string) {
  return [...state.teams.values()].filter((team) => team.userId === userId);
}

function setSession(reply: FastifyReply, user: User) {
  const token = id("dev_session");
  state.sessions.set(token, user.id);
  reply.setCookie("entral_token", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax"
  });
  return token;
}

function clearSession(reply: FastifyReply) {
  reply.clearCookie("entral_token", { path: "/" });
}

function getCurrentUser(request: FastifyRequest) {
  const cookieToken = request.cookies.entral_token;
  const authHeader = request.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  const userId = state.sessions.get(cookieToken ?? bearerToken ?? "");
  return userId ? state.users.get(userId) ?? null : null;
}

async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const user = getCurrentUser(request);

  if (!user) {
    return reply.code(401).send({ error: "Unauthorized", message: "Authentication is required." });
  }
}

function currentUserOrThrow(request: FastifyRequest) {
  const user = getCurrentUser(request);

  if (!user) {
    throw Object.assign(new Error("Authentication is required."), { statusCode: 401 });
  }

  return user;
}

function defaultPolicy() {
  if (state.policies.size > 0) {
    return;
  }

  const policy: Policy = {
    description: "Local dev policy for sensitive credential requests.",
    effect: "block",
    enabled: true,
    id: id("policy"),
    name: "Block sensitive data requests",
    rule: {
      kind: "blocked_keywords",
      keywords: ["password", "api key", "private key"]
    },
    severity: "high"
  };
  state.policies.set(policy.id, policy);
}

function seedDemo() {
  defaultPolicy();
  const user = createUser({ email: "demo@entral.local", name: "Demo User" });
  const team = teamsForUser(user.id)[0];

  if (state.tasks.length === 0 && team) {
    state.tasks.push({
      createdAt: now(),
      description: "This in-memory backend is ready for local testing.",
      id: id("task"),
      status: "TODO",
      team: { id: team.id, name: team.name },
      teamId: team.id,
      title: "Try the local dev backend",
      userId: user.id
    });
  }
}

await app.register(cookie);
await app.register(cors, {
  credentials: true,
  origin: true
});

app.setErrorHandler((error, _request, reply) => {
  const statusCode = "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
  const message = statusCode >= 500 ? "Something went wrong." : error.message;
  return reply.code(statusCode).send({
    error: statusCode >= 500 ? "Internal Server Error" : "Request Error",
    message
  });
});

app.get("/health", async () => ({ mode: "memory", ok: true }));
app.get("/api/v1/health", async () => ({ mode: "memory", ok: true }));

app.post("/api/v1/signup", async (request, reply) => {
  const body = request.body as { email?: string; name?: string; password?: string };
  const user = createUser({
    email: body.email ?? "demo@entral.local",
    name: body.name,
    password: body.password
  });
  const team = teamsForUser(user.id)[0];
  setSession(reply, user);

  return reply.code(201).send({
    email: user.email,
    id: user.id,
    team,
    user: publicUser(user)
  });
});

app.post("/api/v1/login", async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  const email = body.email ?? "demo@entral.local";
  const user = [...state.users.values()].find((item) => item.email === email.toLowerCase())
    ?? createUser({ email, name: email.split("@")[0], password: body.password });

  if (body.password && user.password !== body.password) {
    user.password = body.password;
  }

  const token = setSession(reply, user);
  return reply.send({ token, user: publicUser(user) });
});

app.post("/api/v1/logout", async (_request, reply) => {
  clearSession(reply);
  return reply.send({ ok: true });
});

app.get("/api/v1/me", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  return {
    teams: teamsForUser(user.id),
    user: publicUser(user)
  };
});

app.get("/api/v1/dashboard", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const teams = teamsForUser(user.id);
  const teamIds = teams.map((team) => team.id);
  const tasks = state.tasks.filter((task) => teamIds.includes(task.teamId));
  const agents = [...state.agents.values()].filter((agent) => agent.userId === user.id);
  const agentActivity = agents.flatMap((agent) => state.agentLogs.get(agent.id) ?? []).slice(-10).reverse();

  return {
    agentActivity: agentActivity.map((log) => ({
      ...log,
      agentName: agents.find((agent) => (state.agentLogs.get(agent.id) ?? []).some((item) => item.id === log.id))?.name ?? "Agent",
      result: null,
      taskStatus: null,
      taskTitle: null
    })),
    awaySummary: {
      completedAgentTaskCount: 0,
      since: null,
      summaries: []
    },
    message: `Welcome, ${publicUser(user).name}`,
    tasks,
    teams,
    user: publicUser(user)
  };
});

app.get("/api/v1/tasks", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const teamIds = teamsForUser(user.id).map((team) => team.id);
  const items = state.tasks.filter((task) => teamIds.includes(task.teamId));
  return {
    items,
    page: 1,
    pageSize: 20,
    total: items.length
  };
});

app.post("/api/v1/tasks", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as { description?: string; status?: Task["status"]; teamId?: string; title?: string };
  const team = teamsForUser(user.id).find((item) => item.id === body.teamId) ?? teamsForUser(user.id)[0];

  if (!team) {
    return reply.code(403).send({ error: "Forbidden", message: "No team is available." });
  }

  const task: Task = {
    createdAt: now(),
    description: body.description ?? null,
    id: id("task"),
    status: body.status ?? "TODO",
    team: { id: team.id, name: team.name },
    teamId: team.id,
    title: body.title ?? "Untitled task",
    userId: user.id
  };
  state.tasks.unshift(task);
  return reply.code(201).send({ task });
});

app.get("/api/v1/ai/conversations", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  const items = [...state.conversations.values()]
    .filter((conversation) => conversation.userId === user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((conversation) => ({
      createdAt: conversation.createdAt,
      id: conversation.id,
      lastMessage: conversation.messages.at(-1)?.content ?? null,
      title: conversation.title,
      updatedAt: conversation.updatedAt
    }));

  return { items };
});

app.post("/api/v1/ai/conversations/import", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as { conversations?: Array<{ messages?: Message[]; title?: string }> };
  const conversations = (body.conversations ?? []).map((item) => {
    const conversation: Conversation = {
      createdAt: now(),
      id: id("convo"),
      messages: (item.messages ?? []).map((message) => ({ ...message, id: message.id ?? id("msg") })),
      title: item.title ?? "Imported chat",
      updatedAt: now(),
      userId: user.id
    };
    state.conversations.set(conversation.id, conversation);
    return conversation;
  });

  return reply.code(201).send({ conversations });
});

app.get("/api/v1/ai/conversations/:conversationId", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const { conversationId } = request.params as { conversationId: string };
  const conversation = state.conversations.get(conversationId);

  if (!conversation || conversation.userId !== user.id) {
    return reply.code(404).send({ error: "Not Found", message: "Conversation was not found." });
  }

  return reply.send({ conversation });
});

app.delete("/api/v1/ai/conversations/:conversationId", { preHandler: requireAuth }, async (request) => {
  const { conversationId } = request.params as { conversationId: string };
  state.conversations.delete(conversationId);
  return { ok: true };
});

async function chatReply(request: FastifyRequest) {
  const user = currentUserOrThrow(request);
  const body = request.body as { conversationId?: string; message?: string; prompt?: string; screenshot?: string };
  const text = body.message ?? body.prompt ?? "";
  const conversation = body.conversationId && state.conversations.get(body.conversationId)?.userId === user.id
    ? state.conversations.get(body.conversationId)!
    : {
      createdAt: now(),
      id: id("convo"),
      messages: [],
      title: text.slice(0, 58) || "New chat",
      updatedAt: now(),
      userId: user.id
    };

  state.conversations.set(conversation.id, conversation);

  const userMessage: Message = {
    content: text,
    createdAt: now(),
    id: id("msg"),
    role: "user"
  };
  conversation.messages.push(userMessage);

  const assistantContent = await createAssistantContent(conversation, text, body.screenshot);

  const assistantMessage: Message = {
    content: assistantContent,
    createdAt: now(),
    id: id("msg"),
    role: "assistant"
  };
  conversation.messages.push(assistantMessage);
  conversation.updatedAt = assistantMessage.createdAt;

  return {
    content: assistantMessage.content,
    conversationId: conversation.id,
    createdAt: assistantMessage.createdAt,
    messageId: assistantMessage.id,
    userMessage: {
      content: userMessage.content,
      createdAt: userMessage.createdAt,
      messageId: userMessage.id
    }
  };
}

app.post("/api/v1/ai/chat", { preHandler: requireAuth }, chatReply);
app.post("/api/v1/ai/screen", { preHandler: requireAuth }, chatReply);

app.get("/api/v1/automation/jobs", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  return { items: state.automationJobs.filter((job) => job.userId === user.id) };
});

app.post("/api/v1/automation/jobs", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as { payload?: AutomationJob["payload"]; scheduledAt?: string; type?: string };
  const job: AutomationJob = {
    createdAt: now(),
    error: null,
    id: id("job"),
    logs: [{ createdAt: now(), id: id("log"), level: "info", message: "Dev memory backend completed this job." }],
    payload: body.payload ?? {},
    result: {
      content: `Fetched ${body.payload?.selector ?? "page"} from ${body.payload?.url ?? "target"}.`,
      engine: "memory",
      statusCode: 200,
      title: "Dev scrape result"
    },
    scheduledAt: body.scheduledAt ?? null,
    status: "completed",
    type: body.type ?? "scrape",
    userId: user.id
  };
  state.automationJobs.unshift(job);
  return reply.code(201).send({ job });
});

app.post("/api/v1/automation/jobs/:jobId/cancel", { preHandler: requireAuth }, async (request) => {
  const { jobId } = request.params as { jobId: string };
  const job = state.automationJobs.find((item) => item.id === jobId);
  if (job) job.status = "canceled";
  return { job };
});

app.post("/api/v1/automation/jobs/:jobId/retry", { preHandler: requireAuth }, async (request) => {
  const { jobId } = request.params as { jobId: string };
  const job = state.automationJobs.find((item) => item.id === jobId);
  if (job) {
    job.status = "completed";
    job.logs.unshift({ createdAt: now(), id: id("log"), level: "info", message: "Run again completed in memory mode." });
  }
  return { job };
});

app.get("/api/v1/agents", { preHandler: requireAuth }, async (request) => {
  const user = currentUserOrThrow(request);
  return { items: [...state.agents.values()].filter((agent) => agent.userId === user.id) };
});

app.post("/api/v1/agents", { preHandler: requireAuth }, async (request, reply) => {
  const user = currentUserOrThrow(request);
  const body = request.body as Partial<Agent>;
  const agent: Agent = {
    capabilities: body.capabilities ?? ["general"],
    id: id("agent"),
    isPaused: false,
    lastActivitySeenAt: null,
    load: 0,
    name: body.name ?? "Researcher",
    role: body.role ?? "Research and summarize findings",
    runInBackground: body.runInBackground ?? true,
    status: "idle",
    userId: user.id,
    webhookUrl: body.webhookUrl ?? null
  };
  state.agents.set(agent.id, agent);
  state.agentTasks.set(agent.id, []);
  state.agentLogs.set(agent.id, [{ createdAt: now(), id: id("log"), level: "info", message: "Agent created in local memory mode." }]);
  state.agentMessages.set(agent.id, []);
  state.agentSchedules.set(agent.id, []);
  return reply.code(201).send({ agent });
});

app.get("/api/v1/agents/:agentId", { preHandler: requireAuth }, async (request, reply) => {
  const { agentId } = request.params as { agentId: string };
  const agent = state.agents.get(agentId);

  if (!agent) {
    return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
  }

  return {
    agent,
    logs: state.agentLogs.get(agentId) ?? [],
    messages: state.agentMessages.get(agentId) ?? [],
    schedules: state.agentSchedules.get(agentId) ?? [],
    tasks: state.agentTasks.get(agentId) ?? []
  };
});

app.post("/api/v1/agents/:agentId/assign", { preHandler: requireAuth }, async (request, reply) => {
  const { agentId } = request.params as { agentId: string };
  const agent = state.agents.get(agentId);
  const body = request.body as { action?: string; title?: string };

  if (!agent) {
    return reply.code(404).send({ error: "Not Found", message: "Agent was not found." });
  }

  const task: AgentTask = {
    action: body.action ?? "general",
    completedAt: now(),
    id: id("agent_task"),
    result: {
      recommendation: "Use the real backend for persistent autonomous execution.",
      summary: "Dev memory agent completed the task immediately."
    },
    status: "completed",
    title: body.title ?? "Agent task"
  };
  const tasks = state.agentTasks.get(agentId) ?? [];
  tasks.unshift(task);
  state.agentTasks.set(agentId, tasks);
  state.agentLogs.set(agentId, [
    { createdAt: now(), id: id("log"), level: "info", message: `Completed ${task.title}.` },
    ...(state.agentLogs.get(agentId) ?? [])
  ]);
  state.agentMessages.set(agentId, [
    { action: task.action, createdAt: now(), id: id("message"), taskId: task.id, type: "task-result" },
    ...(state.agentMessages.get(agentId) ?? [])
  ]);
  return reply.code(201).send({ task });
});

app.post("/api/v1/agents/:agentId/schedules", { preHandler: requireAuth }, async (request, reply) => {
  const { agentId } = request.params as { agentId: string };
  const body = request.body as { action?: string; intervalMinutes?: number; title?: string };
  const schedule: AgentSchedule = {
    action: body.action ?? "general",
    id: id("schedule"),
    intervalMinutes: body.intervalMinutes ?? 15,
    lastRunAt: null,
    nextRunAt: new Date(Date.now() + (body.intervalMinutes ?? 15) * 60 * 1000).toISOString(),
    status: "active",
    title: body.title ?? "Agent schedule"
  };
  state.agentSchedules.set(agentId, [schedule, ...(state.agentSchedules.get(agentId) ?? [])]);
  return reply.code(201).send({ schedule });
});

app.post("/api/v1/agents/:agentId/:action", { preHandler: requireAuth }, async (request) => {
  const { action, agentId } = request.params as { action: string; agentId: string };
  const agent = state.agents.get(agentId);
  if (agent) {
    agent.isPaused = action === "pause" ? true : action === "resume" || action === "restart" ? false : agent.isPaused;
    agent.status = agent.isPaused ? "paused" : "idle";
  }
  return { agent };
});

app.patch("/api/v1/agents/:agentId/background", { preHandler: requireAuth }, async (request) => {
  const { agentId } = request.params as { agentId: string };
  const body = request.body as { runInBackground?: boolean };
  const agent = state.agents.get(agentId);
  if (agent) agent.runInBackground = Boolean(body.runInBackground);
  return { agent };
});

app.post("/api/v1/agents/:agentId/schedules/:scheduleId/:action", { preHandler: requireAuth }, async (request) => {
  const { action, agentId, scheduleId } = request.params as { action: string; agentId: string; scheduleId: string };
  const schedule = (state.agentSchedules.get(agentId) ?? []).find((item) => item.id === scheduleId);
  if (schedule) schedule.status = action === "revoke" ? "revoked" : action === "pause" ? "paused" : "active";
  return { schedule };
});

app.post("/api/v1/agents/:agentId/tasks/:taskId/cancel", { preHandler: requireAuth }, async (request) => {
  const { agentId, taskId } = request.params as { agentId: string; taskId: string };
  const task = (state.agentTasks.get(agentId) ?? []).find((item) => item.id === taskId);
  if (task) task.status = "canceled";
  return { task };
});

app.get("/api/v1/admin/overview", { preHandler: requireAuth }, async () => ({
  activeTasks: [],
  auditLogs: state.auditLogs,
  health: {
    activeAgents: [...state.agents.values()].filter((agent) => !agent.isPaused).length,
    activeSchedules: [...state.agentSchedules.values()].flat().filter((schedule) => schedule.status === "active").length,
    agents: state.agents.size,
    enabledPolicies: [...state.policies.values()].filter((policy) => policy.enabled).length,
    policyViolations24h: 0,
    queuedAgentTasks: 0,
    runningAgentTasks: 0
  },
  policies: [...state.policies.values()]
}));

app.post("/api/v1/admin/policies", { preHandler: requireAuth }, async (request, reply) => {
  const body = request.body as Partial<Policy>;
  const policy: Policy = {
    description: body.description ?? null,
    effect: body.effect ?? "block",
    enabled: body.enabled ?? true,
    id: id("policy"),
    name: body.name ?? "Policy",
    rule: body.rule ?? { kind: "blocked_keywords", keywords: [] },
    severity: body.severity ?? "medium"
  };
  state.policies.set(policy.id, policy);
  return reply.code(201).send({ policy });
});

app.patch("/api/v1/admin/policies/:policyId", { preHandler: requireAuth }, async (request) => {
  const { policyId } = request.params as { policyId: string };
  const body = request.body as Partial<Policy>;
  const policy = state.policies.get(policyId);
  if (policy) Object.assign(policy, body);
  return { policy };
});

app.delete("/api/v1/admin/policies/:policyId", { preHandler: requireAuth }, async (request) => {
  const { policyId } = request.params as { policyId: string };
  state.policies.delete(policyId);
  return { ok: true };
});

app.post("/api/v1/admin/agents/pause-all", { preHandler: requireAuth }, async () => {
  for (const agent of state.agents.values()) {
    agent.isPaused = true;
    agent.status = "paused";
  }
  return { ok: true };
});

app.post("/api/v1/admin/agent-tasks/:taskId/revoke", { preHandler: requireAuth }, async () => ({ ok: true }));

seedDemo();

try {
  await app.listen({ host: "0.0.0.0", port: 4000 });
  app.log.info("ENTRAL memory backend ready at http://localhost:4000");
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
