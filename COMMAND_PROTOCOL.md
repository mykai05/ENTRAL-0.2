# Command OS Protocol

The current protocol is a lightweight local parser layered into the dashboard command console.

## Supported Mock Commands

- `ENTRAL, take me to ARIS.`
- `Open MERCURY.`
- `Show all active Soldiers.`
- `Create a Shopify Soldier under ARIS.`
- `Create a SEO Soldier under MERCURY.`
- `Show failing Operations.`
- `Zoom into HELIX.`
- `Return to ENTRAL.`
- `Show VANTA's security Soldiers.`
- `Create a new Soldier for landing page deployment.`
- `Assign this task to ARIS.`
- `Pause all failed Operations.`
- `Show me the chain of command.`

## Current Behavior

Commands can focus graph nodes, highlight status groups, create mock Soldiers, create mock Operations, append console responses, and write activity events.

## Future Behavior

The parser should eventually hand off to an AI command planner that emits structured actions. Those actions must pass validation, governance, permission checks, and audit logging before any real-world execution.
