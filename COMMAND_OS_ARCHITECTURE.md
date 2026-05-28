# ENTRAL Command OS Architecture

Command OS is an additive layer on top of the existing ENTRAL app. It does not replace the current dashboard, graph engine, auth, API, or visual identity.

## Hierarchy

- ENTRAL: Emperor, strategic command layer.
- ARIS, VANTA, MERCURY, ORION, HELIX: Generals.
- Soldiers: specialized internal sub-agents under each General.
- Operations: mock live processes under Soldiers.

## Graph Layer

The current WebGL atomic/neural graph remains the primary visualization. Command OS nodes are translated into the existing graph model as grouped nodes and parent-child edges:

- Emperor maps to the central core node.
- Generals map to major command shells.
- Soldiers cluster under their parent General.
- Operations attach under Soldiers.

## Command Console Layer

The persistent right-side command console is the primary communication and control surface. It supports both natural conversation through the existing AI backend and lightweight local command parsing for graph/navigation actions.

## Future Execution Layer

Current Operations are simulated only. Real autonomous execution should be added later behind policy checks, audit logs, rate limits, tool permissions, and explicit approval flows.
