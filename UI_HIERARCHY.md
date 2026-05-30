# Command OS UI Hierarchy

Command OS extends the existing ENTRAL dashboard into three functional regions.

## Left Navigation

The left navigation organizes:

- Command overview
- Marshals
- Business Generals
- Tasks
- Structure
- Infrastructure
- Analytics
- Settings

It also shows a compact chain-of-command tree and recent delegated tasks so created entities and work-in-motion remain discoverable.

## Center Graph

The center remains the existing full-screen 3D atomic/neural graph. ENTRAL sits at the center, Marshals orbit ENTRAL, business Generals orbit Marshals, Commanders orbit Generals, and Soldiers orbit Commanders.

## Right Command Console

The right console is persistent. It is the primary path for navigation, command execution, Marshal creation, business General creation, Commander creation, Soldier creation, status checks, logs, graph controls, hierarchy colors, and AI conversation. Atom/graph controls are consolidated here so the dashboard does not have a second competing control window.

## Focus Mode

Focus Mode hides navigation, panels, toolbars, status windows, and chat so only the Chain of Command visualization remains: ENTRAL, Marshals, Generals, Commanders, Soldiers, orbit lines, and the space background. Press `Escape` or double-click the graph to exit.

## Inspector

The node inspector overlays beside the graph and shows selected node details: hierarchy position, status, parent, children, creation date, current task, memory, task history, delegated tasks, permissions, tools, logs, activity, and local execution status.

## Responsiveness

On smaller screens, navigation collapses away first and the command console becomes the primary drawer-like surface while the graph remains usable.
