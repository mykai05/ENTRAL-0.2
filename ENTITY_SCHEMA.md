# Command OS Entity Schema

## CommandNode

```ts
type NodeType = "emperor" | "marshal" | "general" | "commander" | "soldier";

type CommandNode = {
  children: string[];
  createdAt: string;
  currentTask: string | null;
  description?: string;
  businessName?: string;
  marshalType?: string;
  generalType?: string;
  operationalArea?: string;
  executionRole?: string;
  health: number;
  id: string;
  logs?: string[];
  memory: CommandMemory;
  metrics?: Record<string, number | string>;
  name: string;
  parentId: string | null;
  parentMarshalId?: string | null;
  parentGeneralId?: string | null;
  parentCommanderId?: string | null;
  permissions?: string[];
  progress?: number;
  role: string;
  status: "idle" | "working" | "thinking" | "waiting" | "error" | "offline";
  taskHistory: string[];
  title: string;
  tools?: string[];
  type: NodeType;
};

type CommandMemory = {
  role: string;
  instructions: string;
  recentTasks: string[];
  taskResults: string[];
  notes: string[];
};

type CommandTask = {
  id: string;
  name: string;
  description: string;
  assignedEntityId: string | null;
  assignedEntityType?: NodeType | null;
  marshalId?: string | null;
  marshalName?: string | null;
  generalId?: string | null;
  generalName?: string | null;
  commanderId?: string | null;
  commanderName?: string | null;
  soldierId?: string | null;
  soldierName?: string | null;
  status: "pending" | "assigned" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  delegationPath: string[];
  history: string[];
};
```

## Current Hierarchy

The current visualization stage only includes structural hierarchy nodes:

- `emperor`: ENTRAL, stationary center.
- `marshal`: strategic theater or portfolio orbiting ENTRAL.
- `general`: actual business, client, brand, store, or operation under a Marshal.
- `commander`: department or operating function orbiting a General.
- `soldier`: execution unit orbiting a Commander.

Live Operations are represented as local `CommandTask` records for now. They move through ENTRAL -> Marshal -> General -> Commander -> Soldier as simulated delegation events, then persist in browser storage with the full command path.

## Permissions

Permissions are descriptive strings for now. They document intended future capabilities and should later map to policy checks before real execution.

## Statuses

- `idle`: available but not running.
- `working`: actively executing delegated work.
- `thinking`: planning, routing, or deciding.
- `waiting`: waiting after delegation or ready for the next instruction.
- `error`: failed or needs intervention.
- `offline`: manually paused or unavailable.

## Task Statuses

- `pending`: created but not yet routed.
- `assigned`: accepted by an upstream entity.
- `running`: executing at Soldier level.
- `completed`: finished and stored in local memory.
- `failed`: failed task record reserved for future worker integration.

## State Integrity

Command OS state is validated on hydration and every reducer mutation. Invalid parent links are repaired, missing edges are rebuilt, deleted entity references are removed from tasks, and active tasks assigned to offline/deleted entities are reassigned or failed safely.
