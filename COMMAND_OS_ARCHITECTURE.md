# ENTRAL Command OS Architecture

Command OS is an additive layer on top of the existing ENTRAL app. It does not replace the current dashboard, graph engine, auth, API, or visual identity.

## Hierarchy

- ENTRAL: stationary central command layer.
- Marshals: strategic theaters or portfolios orbiting ENTRAL.
- Generals: named businesses, clients, brands, stores, or operations under Marshals.
- Commanders: departments or operating functions under each General.
- Soldiers: execution units under each Commander.

First-time default state: ENTRAL only. No Marshals, Generals, Commanders, Soldiers, businesses, demo projects, or fake activity are created until the user asks for them or approves an opt-in demo/template flow.

## Graph Layer

The current WebGL atomic/neural graph remains the primary visualization. Command OS nodes are translated into the existing graph model as grouped nodes and parent-child edges:

- ENTRAL maps to the central glowing core node.
- Marshals orbit ENTRAL as the first shell.
- Generals orbit their parent Marshal.
- Commanders orbit their parent General.
- Soldiers orbit their parent Commander.

## Command Console Layer

The persistent right-side command console is the primary communication and control surface. It supports both natural conversation through the existing AI backend and lightweight local command parsing for graph/navigation actions.

## Persistence Layer

The dashboard keeps a Command OS state object with hierarchy nodes, task records, task history, report history, and per-entity memory. It still writes to browser storage first so the interface stays fast and survives refreshes, then syncs the validated state to the authenticated backend through `/api/v1/command-os/state`.

The backend stores one user-scoped `CommandOSSnapshot` and extracts report records into `CommandOSReport` rows. This gives reports and guided setup memory a production persistence path while keeping the current local-first dashboard behavior intact.

State changes flow through a dedicated reducer and validation layer. Every mutation is repaired back to the hierarchy contract: Marshals report to ENTRAL, Generals report to Marshals, Commanders report to Generals, Soldiers report to Commanders, edges are rebuilt from parent IDs, stale task references are cleaned, dangling report references are removed, and interrupted active tasks are marked failed for review during hydration. Legacy four-level local state is migrated by inserting a Primary Marshal and moving existing root Generals underneath it without deleting user data.

## Future Execution Layer

Current task execution is simulated in Command OS state. Real autonomous execution should be added later behind policy checks, audit logs, rate limits, tool permissions, and explicit approval flows.
