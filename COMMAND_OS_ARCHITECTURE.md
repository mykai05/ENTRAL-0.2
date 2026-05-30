# ENTRAL Command OS Architecture

Command OS is an additive layer on top of the existing ENTRAL app. It does not replace the current dashboard, graph engine, auth, API, or visual identity.

## Hierarchy

- ENTRAL: stationary central command layer.
- Marshals: strategic theaters or portfolios orbiting ENTRAL.
- Generals: named businesses, clients, brands, stores, or operations under Marshals.
- Commanders: departments or operating functions under each General.
- Soldiers: execution units under each Commander.

Default seed: ENTRAL -> Merch Marshal -> ENTRAL General -> Merch Commanders -> Merch Soldiers.

## Graph Layer

The current WebGL atomic/neural graph remains the primary visualization. Command OS nodes are translated into the existing graph model as grouped nodes and parent-child edges:

- ENTRAL maps to the central glowing core node.
- Marshals orbit ENTRAL as the first shell.
- Generals orbit their parent Marshal.
- Commanders orbit their parent General.
- Soldiers orbit their parent Commander.

## Command Console Layer

The persistent right-side command console is the primary communication and control surface. It supports both natural conversation through the existing AI backend and lightweight local command parsing for graph/navigation actions.

## Local State Layer

The dashboard now keeps a local Command OS state object with hierarchy nodes, task records, task history, and per-entity memory. It persists to browser storage so created Marshals, Generals, Commanders, Soldiers, delegated tasks, status changes, and memory notes survive page refreshes.

State changes flow through a dedicated reducer and validation layer. Every mutation is repaired back to the hierarchy contract: Marshals report to ENTRAL, Generals report to Marshals, Commanders report to Generals, Soldiers report to Commanders, edges are rebuilt from parent IDs, stale task references are cleaned, and interrupted active tasks are marked failed for review during hydration. Legacy four-level local state is migrated by inserting a Primary Marshal and moving existing root Generals underneath it without deleting user data.

## Future Execution Layer

Current task execution is simulated locally. Real autonomous execution should be added later behind policy checks, audit logs, rate limits, tool permissions, and explicit approval flows, then backed by database persistence instead of local storage.
