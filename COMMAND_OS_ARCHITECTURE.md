# ENTRAL Command OS Architecture

Command OS is an additive layer on top of the existing ENTRAL app. It does not replace the current dashboard, graph engine, auth, API, or visual identity.

## Hierarchy

- ENTRAL: stationary central command layer.
- Marshals: strategic theaters or portfolios orbiting ENTRAL.
- Generals: named businesses, clients, brands, stores, or operations under Marshals.
- Commanders: departments or operating functions under each General.
- Soldiers: execution units under each Commander.

First-time default state: a truthful 27-node command universe. It contains ENTRAL, five strategic Marshals, one Sovereign Protocol General, four operating Commanders, and sixteen bounded Soldiers. These nodes describe the system's real governance and operating structure; they do not create fake companies, projects, revenue, customers, activity, or external actions.

Additional businesses are separate General systems. They can be created below the appropriate Marshal through the guided portfolio builder or the manual structure controls. A General owns its own Commanders, Soldiers, tasks, reports, and memory, so adding another business does not flatten or overwrite an existing one.

## Graph Layer

The current WebGL atomic/neural graph remains the primary visualization. Command OS nodes are translated into the existing graph model as grouped nodes and parent-child edges:

- ENTRAL maps to the central glowing core node.
- Marshals orbit ENTRAL as the first shell.
- Generals orbit their parent Marshal.
- Commanders orbit their parent General.
- Soldiers orbit their parent Commander.

Command Universe v2 distributes every level across nested, stable orbital shells rather than increasing one global radius indefinitely. The owner view preserves the selected node's full lineage and branch while using a bounded visual-detail budget for very large portfolios. This keeps navigation responsive without changing the persisted hierarchy.

Default graph controls use the restrained tilted-orbit view. The interface includes a compact live-hierarchy HUD, five-level legend, portfolio counts, fit-to-universe control, and a direct Add business action. Desktop shows the full portfolio workspace; tablet and mobile intentionally simplify the chrome while preserving graph navigation and the command tabs.

## Command Console Layer

The persistent right-side command console is the primary communication and control surface. It supports both natural conversation through the existing AI backend and lightweight local command parsing for graph/navigation actions.

## Persistence Layer

The dashboard keeps a Command OS state object with hierarchy nodes, task records, task history, report history, and per-entity memory. It still writes to browser storage first so the interface stays fast and survives refreshes, then syncs the validated state to the authenticated backend through `/api/v1/command-os/state`.

The backend stores one user-scoped `CommandOSSnapshot` and extracts report records into `CommandOSReport` rows. This gives reports and guided setup memory a production persistence path while keeping the current local-first dashboard behavior intact.

The validated snapshot boundary supports up to 5,000 hierarchy nodes, 12,500 edges, 5,000 tasks, and an 8 MB serialized state. The renderer's default detail budget is 900 visible nodes at once. These are explicit engineering limits—not a claim of literal infinity—and are sufficient for hundreds of business General systems in one governed portfolio. A future move beyond those limits should normalize graph records in the database and page branches instead of making the browser snapshot unbounded.

State changes flow through a dedicated reducer and validation layer. Every mutation is repaired back to the hierarchy contract: Marshals report to ENTRAL, Generals report to Marshals, Commanders report to Generals, Soldiers report to Commanders, edges are rebuilt from parent IDs, stale task references are cleaned, dangling report references are removed, and interrupted active tasks are marked failed for review during hydration. Legacy four-level local state is migrated by inserting a Primary Marshal and moving existing root Generals underneath it without deleting user data. The regressed ENTRAL-only v3 seed migrates once to the restored command universe, while real user-created hierarchy state remains authoritative.

## Access Boundary

The Command Universe is an owner/internal operating surface. It must not be exposed as the ordinary Entral Base member portal. Member APIs remain separately authenticated, organization-scoped, allowlisted, and limited to approved member-visible data. A member never receives cross-business internal controls, raw prompts, connector administration, SP Command operations, or another organization's records merely because the owner graph can represent many businesses.

## Product Scope

The hierarchy is industry-neutral. Print-on-demand, merch, ecommerce, or another revenue model may be added later as an optional business template, but none is a dependency of ENTRAL, the default graph, or the command chain. The default guided template is a general professional-services operating system.

## Future Execution Layer

Current task execution is simulated in Command OS state. Real autonomous execution should be added later behind policy checks, audit logs, rate limits, tool permissions, and explicit approval flows.
