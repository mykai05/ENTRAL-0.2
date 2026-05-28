# Command OS Entity Schema

## CommandNode

```ts
type NodeType = "emperor" | "general" | "soldier" | "operation";

type CommandNode = {
  id: string;
  type: NodeType;
  parentId: string | null;
  name: string;
  title: string;
  role: string;
  status: "idle" | "running" | "success" | "warning" | "error" | "awaiting_approval" | "paused";
  health: number;
  description?: string;
  permissions?: string[];
  tools?: string[];
  metrics?: Record<string, number | string>;
  logs?: string[];
  children?: string[];
  progress?: number;
};
```

## Operations

Operations are mock task/process nodes under Soldiers. They include status, progress, logs, created time, and parent Soldier linkage. They do not call external systems yet.

## Permissions

Permissions are descriptive strings for now. They document intended future capabilities and should later map to policy checks before real execution.

## Statuses

- `idle`: available but not running.
- `running`: active mock process.
- `success`: completed.
- `warning`: needs review.
- `error`: failed.
- `awaiting_approval`: blocked until approved.
- `paused`: manually paused.
