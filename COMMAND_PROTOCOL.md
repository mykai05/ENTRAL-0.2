# Command OS Protocol

The current protocol is a lightweight local parser layered into the dashboard command console.

## Supported Local Commands

- `help`
- `what can you do`
- `show commands`
- `ENTRAL, take me to Merch Marshal.`
- `Create Marshal named Merch Marshal.`
- `Create General named Iron House Gym under Merch Marshal.`
- `I want to build a website agency.`
- `Create a website operation.`
- `Start an ecommerce brand.`
- `Open Design Commander.`
- `Show all active Soldiers.`
- `Create a Commander under Iron House Gym.`
- `Create a Soldier under Listing Commander.`
- `Create task Review the command hierarchy.`
- `Assign task Inspect SEO readiness to SEO Soldier.`
- `Show status of Merch Marshal.`
- `Show Iron House Gym report.`
- `Show failing nodes.`
- `Zoom into Marketing Commander.`
- `Return to ENTRAL.`
- `Show Listing Commander's Soldiers.`
- `Remove QR Flyer Soldier.`
- `Archive this General.`
- `Move SEO Soldier under Listing Commander.`
- `Start merch store launch workflow.`
- `Pause all failed nodes.`
- `Show me the chain of command.`
- `Enter Focus Mode.`
- `Exit Clean Room Mode.`
- `Load demo environment.`

## Current Behavior

Commands can focus graph nodes, highlight status groups, create Marshals, create business Generals, create Commanders, create Soldiers, move entities between valid parents, create delegated task records, simulate ENTRAL -> Marshal -> General -> Commander -> Soldier routing, open removal confirmations, toggle Focus Mode, open voice/mobile/tutorial guidance, append console responses, write activity events, and update local memory.

Report commands such as `ENTRAL report`, `Report on Merch Marshal`, `Report on Iron House Gym`, and `What needs attention?` route through the local Command OS report builder. Reports use Situation, Analysis, Recommendation, and Next Actions, include command path, status, risks, scoped task information, and populate the mobile Reports feed.

Generated reports are also recorded into Command OS state. Report-history records are attached to the source entity, the upward command path, the destination entity, and related tasks. Hydration keeps valid report history and removes records that point to missing source or destination entities.

When the operator is signed in, the dashboard syncs the validated state to `/api/v1/command-os/state`. The backend stores the latest snapshot and extracts report records into user-scoped persistence rows. If the backend is unavailable, the dashboard keeps the local copy and retries on later changes.

Generals are never created directly under ENTRAL. If a General directive does not name or select a Marshal, ENTRAL asks for the missing operational detail before proceeding.

`help`, `what can you do`, `show commands`, and related help requests now return an explicit ENTRAL Command Help menu instead of falling through to generic AI behavior.

The first-pass command classifier lives in `frontend/lib/command-intent.ts`. It identifies help, authorization approval/cancel, business creation, entity creation, task assignment, reports, navigation, tutorial, voice, conversational, and unknown intents. Execution is still performed by the dashboard command router until the next extraction pass.

Context-aware command suggestion chips live in `frontend/lib/command-suggestions.ts`. Suggestions change for first-time users, pending authorization, the business wizard, and selected General/Commander/Soldier contexts.

Structural command-console changes now use an authorization preview for:

- Marshal creation
- General creation
- Commander creation
- Soldier creation
- Business template creation
- Entity moves/reassignments
- Entity archives
- Merch/POD workflow generation

Visible dashboard controls for adding Marshals, Generals, Commanders, and Soldiers now use the same authorization path. Create-node authorization stores the intended parent ID, so the approved action matches the preview even if the user's selected node changes before approval.

The user can approve with the visible `Approve` button or by typing `Approve`. The user can cancel with the visible `Cancel` button or by typing `Cancel`.

The visible `Modify` button reopens business-template authorizations for editing. For move/archive/workflow previews, ENTRAL explains that inline modification is not supported yet and asks the user to cancel and reissue the corrected directive.

`Load demo environment` is an opt-in command. It prepares a demo business-template authorization preview, but it does not create demo hierarchy data until the user approves.

Offline entities are not valid recipients for new local tasks. If a refresh interrupts a local delegation timer, hydration marks the active task failed for review instead of pretending it completed.

## Future Behavior

The parser should eventually hand off to an AI command planner that emits structured actions. Those actions must pass validation, governance, permission checks, and audit logging before any real-world execution.
