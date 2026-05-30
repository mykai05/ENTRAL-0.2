# Command OS Protocol

The current protocol is a lightweight local parser layered into the dashboard command console.

## Supported Local Commands

- `ENTRAL, take me to Merch Marshal.`
- `Create Marshal named Merch Marshal.`
- `Create General named Iron House Gym under Merch Marshal.`
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
- `Pause all failed nodes.`
- `Show me the chain of command.`
- `Enter Focus Mode.`
- `Exit Clean Room Mode.`

## Current Behavior

Commands can focus graph nodes, highlight status groups, create Marshals, create business Generals, create Commanders, create Soldiers, move entities between valid parents, create delegated task records, simulate ENTRAL -> Marshal -> General -> Commander -> Soldier routing, open removal confirmations, toggle Focus Mode, append console responses, write activity events, and update local memory.

Generals are never created directly under ENTRAL. If a General directive does not name or select a Marshal, ENTRAL asks for the missing operational detail before proceeding.

Offline entities are not valid recipients for new local tasks. If a refresh interrupts a local delegation timer, hydration marks the active task failed for review instead of pretending it completed.

## Future Behavior

The parser should eventually hand off to an AI command planner that emits structured actions. Those actions must pass validation, governance, permission checks, and audit logging before any real-world execution.
