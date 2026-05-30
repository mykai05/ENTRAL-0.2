# ENTRAL v0.3 Goal Spec

Source PDF: `C:\Users\malac\Downloads\ENTRAL v0.3 Development Plan.pdf`

This file is the source-of-truth extraction for the ENTRAL v0.3 implementation plan. It preserves the operating goals, hierarchy rules, phase requirements, audits, validation expectations, and final success criteria from the PDF.

## Primary Objective

Build ENTRAL v0.3.

This release should make ENTRAL easier to understand, easier to command, easier to operate on mobile, and more capable of supporting real business workflows.

Do not focus on adding random features. Do not add another hierarchy layer. Do not rebuild the entire app from scratch. Do not redesign the entire product unless a local UI structure is clearly broken.

Focus on turning ENTRAL from a visually impressive command system into a usable operating system that a new user can understand and operate.

Core v0.3 goal:

A brand-new user should be able to open ENTRAL, understand what it is, create their first business structure, issue commands, generate reports, and operate from mobile within 5 minutes.

Guiding principle:

Make ENTRAL easier to command than to configure.

## Current Official Hierarchy

The official ENTRAL hierarchy is:

`ENTRAL → Marshal → General → Commander → Soldier`

Definitions:

- ENTRAL: Central command system.
- Marshal: Strategic theater / portfolio layer. Examples: Merch Marshal, Website Marshal, Voice Operations Marshal, Marketing Marshal, Automation Marshal, Client Operations Marshal.
- General: Actual business, client, brand, store, or operation name. Examples: Iron House Gym, FutureFocused Web Works, Veteran Apparel, Smith Landscaping, MilMember, ENTRAL Internal.
- Commander: Department or operational function inside a General. Examples: Design Commander, Listing Commander, Compliance Commander, Sales Commander, Website Commander, Reporting Commander, Client Success Commander.
- Soldier: Execution unit under a Commander. Examples: Typography Soldier, Mockup Soldier, SEO Tag Soldier, QA Soldier, Weekly Report Soldier, Lead Intake Soldier.

Rules:

- Do not use the term Enterprise.
- Do not treat Commanders as business names.
- Generals are business names.
- Marshals are strategic operating categories.
- Commanders are departments/functions.
- Soldiers execute.

## Overnight Execution Instructions

This is intended to be a long-running Codex task.

Work in phases. Before implementing, inspect the current codebase and understand:

- Frontend structure
- Backend structure
- Command OS architecture
- Entity schema
- Existing hierarchy logic
- Existing mobile layout
- Existing command/chat behavior
- Existing report system
- Existing task system
- Existing tutorial/onboarding system
- Existing voice system
- Existing Merch/POD logic if present
- Existing tests
- Existing deployment/build scripts

Do not blindly duplicate systems. Do not create parallel replacements when existing modules can be improved. Prefer refactoring existing systems over creating competing new systems.

At every stage, preserve working functionality. Run checks frequently. If a proposed change is risky, document it instead of making a destructive change.

## Phase 0: Pre-Flight Codebase Audit

Objective: Before building, perform a full audit of the current state.

Inspect and document:

1. Current route/page structure
2. Current component structure
3. Current command/chat implementation
4. Current entity model
5. Current hierarchy model
6. Current state store/reducer
7. Current persistence/hydration logic
8. Current reporting system
9. Current task system
10. Current mobile behavior
11. Current graph/orbit visualization
12. Current tutorial/onboarding behavior
13. Current voice implementation
14. Current Merch/POD implementation
15. Current test coverage
16. Current package scripts

Create or update `ENTRAL_V0_3_AUDIT.md`.

Include:

- What currently exists
- What is partially implemented
- What is missing
- What is duplicated
- What is risky
- What should not be touched
- Recommended implementation order

Do not stop after the audit unless the app is too broken to continue. Continue into implementation unless blocked.

## Phase 1: Command Intelligence Layer

Objective: ENTRAL must understand user intent. Users should not need to memorize exact command syntax. The chat/command interface should become the primary control layer for ENTRAL.

Current problem to fix:

Typing simple inputs like `help` should not produce a generic report-style response. It should return a real help menu.

Every user message should be classified as one of:

- Conversation
- Help request
- Command request
- Entity creation request
- Entity deletion request
- Entity update request
- Task request
- Report request
- Business creation request
- Template request
- Navigation request
- Tutorial request
- Voice request
- Unknown / needs clarification

ENTRAL should understand common natural language inputs such as:

- help
- what can you do
- show commands
- show help
- start tutorial
- replay tutorial
- create a Marshal
- create a Merch Marshal
- create a business called Iron House Gym
- create a General named Iron House Gym under Merch Marshal
- I want to start a POD business
- I want to build a website agency
- create a website operation
- show my businesses
- show my Marshals
- show hierarchy
- open tasks
- generate a report
- report on Iron House Gym
- report on Merch Marshal
- show what needs attention
- what is wrong with my system
- create a Design Commander under Iron House Gym
- create a Typography Soldier under Design Commander
- delete this Soldier
- archive this General
- show mobile guide
- start voice guide

Behavior:

- If the message is conversational, respond in ENTRAL command persona.
- If the message is actionable, translate it into a Command OS action.
- If the message is ambiguous, ask for clarification.
- If the message makes structural changes, summarize the intended action and request authorization before execution.
- If the message cannot be understood, explain what ENTRAL can do and suggest valid actions.

## Phase 2: Help Command and Command Menu

Objective: Fix help behavior. The command `help` must return a real help menu.

Help menu title:

`ENTRAL Command Help`

Sections:

1. What ENTRAL Is
2. Chain of Command
3. Common Commands
4. Structure Creation
5. Business Creation
6. Tasks
7. Reports
8. Voice
9. Mobile
10. Tutorials
11. Templates
12. Troubleshooting

Example content:

- What ENTRAL Is: ENTRAL is a command operating system for building, organizing, and managing business operations through a structured hierarchy.
- Chain of Command: ENTRAL oversees Marshals. Marshals oversee Generals. Generals represent businesses or operations. Commanders manage departments. Soldiers execute tasks.
- Common Commands: Create a Marshal, Create a business, Show hierarchy, Show tasks, Generate report, Start tutorial, Open mobile guide.
- Business: Start POD business, Start website agency, Create client project.
- Tutorial: Start tutorial, Replay tutorial, Mobile guide, Voice guide.

UI requirement:

If the chat interface supports rich command chips or buttons, display suggested actions:

- Create Marshal
- Create Business
- Show Hierarchy
- Open Tasks
- Generate Report
- Start Tutorial
- Use Template

## Phase 3: Action Planning and Authorization

Objective: ENTRAL should not silently make major structural changes. Before creating, deleting, archiving, moving, or bulk-generating hierarchy, ENTRAL must summarize the planned operation and ask for authorization.

Authorization required for:

- Creating multiple entities
- Applying templates
- Creating a business General
- Creating a Marshal
- Deleting any entity
- Archiving any entity
- Moving entities
- Creating tasks in bulk
- Applying a business workflow
- Creating a Merch/POD structure

Example:

User: `I want to start a POD business.`

ENTRAL response:

Objective interpreted: Start POD / Merch business operation.

Recommended structure:

```text
Merch Marshal
└── [Business Name] General
    ├── Client Intake Commander
    ├── Brand Commander
    ├── Design Commander
    ├── Listing Commander
    ├── Compliance Commander
    ├── Store Launch Commander
    ├── Marketing Commander
    └── Reporting Commander
```

This will create:

- 1 Marshal if it does not exist
- 1 General
- 8 Commanders
- Recommended starter Soldiers
- Initial setup tasks

Ask: `Authorize creation?`

Buttons:

- Approve
- Modify
- Cancel

Requirements:

- Do not execute bulk creation until user approves.
- Provide a clear preview.
- Allow canceling.
- If `Modify` exists, allow editing recommended structure or return a clear message that modification is not yet supported.

## Phase 4: First-Time User Experience

Objective: A brand-new user should not be overwhelmed.

On first login, the system should contain only ENTRAL.

Critical first-login rule:

There should be:

- No Marshals
- No Generals
- No Commanders
- No Soldiers
- No businesses
- No projects
- No demo hierarchy
- No placeholder organizations
- No fake activity

ENTRAL should sit alone at the center. Glowing. Pulsating. Alive. Awaiting directives.

First contact message:

```text
ENTRAL Command System online.
No command structures detected.
No active operations detected.
Awaiting directives.
```

Suggested first actions:

- Start Tutorial
- Create First Marshal
- Create Business
- Use Template
- Voice Introduction
- View Help

Philosophy:

The user should feel like they are building an empire from nothing. Nothing should be pre-generated. The first hierarchy should be created by the user.

If demo data exists, it should be opt-in only. Add a clear option: `Load Demo Environment`.

Do not load demo environment by default.

## Phase 5: Empty State Design

Objective: Every empty screen should explain what it is and what the user should do next.

No blank screens. No confusing empty panels. No dead areas.

Required empty states:

- No Marshals: `No Marshals exist yet. Create your first strategic command layer.`
  - Actions: Create Marshal, Use Template, Start Tutorial
- No Generals: `No business Generals exist yet. Create a business or use a template.`
  - Actions: Create Business, Use Business Wizard, Apply Template
- No Commanders: `No Commanders exist under this General yet. Add departments to operate this business.`
  - Actions: Add Commander, Apply Template
- No Soldiers: `No Soldiers exist under this Commander yet. Add execution units to perform tasks.`
  - Actions: Add Soldier, Add Recommended Soldiers
- No Tasks: `No active tasks. Create a task or generate a workflow.`
  - Actions: Create Task, Generate Starter Tasks
- No Reports: `No reports generated. Generate your first system report.`
  - Actions: Generate Report
- No Tutorial Progress: `Training not started. Begin ENTRAL Academy.`
  - Actions: Start Tutorial
- No Voice Setup: `Voice is not configured yet. Enable voice commands or continue with text.`
  - Actions: Enable Voice, Open Voice Guide

Every empty state should include:

- Short explanation
- Why it matters
- Primary action button
- Secondary action button
- Link to help/tutorial where useful

## Phase 6: Business Creation Wizard

Objective: Users should not need to understand every hierarchy layer manually. Create a simple Business Creation Wizard that turns a business idea into a working ENTRAL structure.

Wizard entry points:

- First-time user screen
- Command tab
- Mobile quick actions
- Templates page
- Empty General state
- Help menu
- Natural language command

Example command: `Create a business called Iron House Gym.`

Required fields:

- Business Name
- Business Type
- Goal

Optional fields:

- Industry
- Target Audience
- Preferred Marshal
- Brand Style
- Notes
- Initial Services / Products

Business Type options:

- POD / Merch Business
- Website Agency
- Content Agency
- Local Service Business
- E-commerce Brand
- SaaS Startup
- Custom

Before creation, ENTRAL should display:

- Recommended Marshal
- Business General
- Recommended Commanders
- Recommended Soldiers
- Initial tasks
- First report outline

Example output:

```text
Merch Marshal
└── Iron House Gym General
    ├── Client Intake Commander
    ├── Brand Commander
    ├── Design Commander
    ├── Listing Commander
    ├── Compliance Commander
    ├── Store Launch Commander
    ├── Marketing Commander
    └── Reporting Commander
```

Require approval before creation.

## Phase 7: Business Templates

Objective: Templates should reduce setup friction. Users should be able to select a template and quickly generate a useful command structure.

Required templates:

1. POD / Merch Business
2. Website Agency
3. Content Agency
4. E-commerce Brand
5. SaaS Startup
6. Local Service Business
7. Custom Blank Structure

Each template must define:

- Default Marshal
- Recommended Commanders
- Recommended Soldiers
- Starter tasks
- Recommended reports
- First 5 suggested actions

### POD / Merch Business Template

Marshal: Merch Marshal

General: User-provided business/client name

Commanders:

- Client Intake Commander
- Brand Commander
- Design Commander
- Listing Commander
- Compliance Commander
- Store Launch Commander
- Marketing Commander
- Reporting Commander

Soldiers:

- Client Intake Commander: Business Profile Soldier, Audience Soldier, Offer Soldier, Notes Soldier
- Brand Commander: Brand Voice Soldier, Color Direction Soldier, Style Direction Soldier, Collection Theme Soldier
- Design Commander: Design Concept Soldier, Prompt Soldier, Typography Soldier, Mockup Soldier, Variation Soldier
- Listing Commander: Title Soldier, Description Soldier, Tags Soldier, SEO Soldier, Materials Soldier
- Compliance Commander: Trademark Risk Soldier, Copyright Risk Soldier, AI Disclosure Soldier, Production Partner Soldier, Prohibited Content Soldier
- Store Launch Commander: Etsy Setup Soldier, Printify Setup Soldier, Shopify Setup Soldier, Product Publish Checklist Soldier, Launch QA Soldier
- Marketing Commander: Instagram Caption Soldier, TikTok Script Soldier, Email Launch Soldier, QR Flyer Soldier, Promo Calendar Soldier
- Reporting Commander: Weekly Report Soldier, Sales Report Soldier, Product Performance Soldier, Opportunity Report Soldier

Starter tasks:

- Define business profile
- Define audience
- Generate first merch collection ideas
- Draft first product concepts
- Draft listing structure
- Run compliance review
- Prepare launch checklist
- Generate first report

Recommended reports:

- Launch Readiness Report
- Product Opportunity Report
- Weekly Store Report

First 5 suggested actions:

1. Define target audience
2. Generate product ideas
3. Create design concepts
4. Review compliance
5. Build launch package

### Website Agency Template

Marshal: Website Marshal

General: User-provided agency/client/business name

Commanders:

- Client Intake Commander
- Design Commander
- Content Commander
- SEO Commander
- Development Commander
- Deployment Commander
- Client Success Commander
- Reporting Commander

Starter tasks:

- Define client offer
- Create sitemap
- Draft homepage structure
- Draft service page copy
- Generate SEO basics
- Prepare launch checklist

### Content Agency Template

Marshal: Content Marshal

Commanders:

- Research Commander
- Script Commander
- Short Form Commander
- Long Form Commander
- SEO Commander
- Publishing Commander
- Analytics Commander
- Reporting Commander

### E-commerce Brand Template

Marshal: E-commerce Marshal

Commanders:

- Product Research Commander
- Supplier Commander
- Storefront Commander
- Listing Commander
- Marketing Commander
- Fulfillment Commander
- Customer Support Commander
- Reporting Commander

### SaaS Startup Template

Marshal: SaaS Marshal

Commanders:

- Product Commander
- Engineering Commander
- UX Commander
- Marketing Commander
- Sales Commander
- Support Commander
- Analytics Commander
- Reporting Commander

### Local Service Business Template

Marshal: Local Business Marshal

Commanders:

- Lead Intake Commander
- Website Commander
- Local SEO Commander
- Reviews Commander
- Scheduling Commander
- Customer Follow-Up Commander
- Reporting Commander

## Phase 8: Mobile Command Experience

Objective: Mobile should feel like a command tablet, not a compressed desktop.

Mobile priorities:

1. Command
2. Voice
3. Tasks
4. Reports
5. Businesses
6. Hierarchy
7. Graph visualization

Mobile home:

- Top: ENTRAL status, system health, active alerts
- Middle: Command input, voice command button, recent reports
- Bottom: Quick actions

Quick actions:

- Create Marshal
- Create Business
- Create Commander
- Create Soldier
- Generate Report
- Show Hierarchy
- Open Tasks
- Voice Command

Bottom navigation tabs:

- Command
- Hierarchy
- Tasks
- Reports
- More

Avoid sidebars on mobile. Avoid hidden desktop menus. Avoid keyboard shortcuts as required navigation.

## Phase 9: Mobile Hierarchy View

Objective: On mobile, the primary hierarchy view should be a collapsible tree, not the orbit graph.

Example:

```text
ENTRAL
▼ Merch Marshal
  ▼ Iron House Gym
    ▼ Design Commander
      Typography Soldier
      Prompt Soldier
      Mockup Soldier
```

Users should be able to:

- Expand
- Collapse
- Search
- Filter
- Quick jump
- Tap entity to inspect
- Create child entity from selected node
- See entity status
- See entity type
- See task count
- See warning indicators

Mobile hierarchy actions:

- Marshal: Create General, Generate Report, View Details, Archive Marshal
- General: Create Commander, Apply Template, Generate Report, View Business, Archive General
- Commander: Create Soldier, Create Task, Generate Report, View Details
- Soldier: Assign Task, View Details, View History

## Phase 10: Mobile Graph Touch Controls

Objective: Keep the orbit graph available on mobile, but make it optional and touch-native.

Entity interaction:

- Tapping an entity should behave like desktop clicking.
- Tap ENTRAL: Open ENTRAL inspector.
- Tap Marshal: Open Marshal inspector.
- Tap General: Open General inspector.
- Tap Commander: Open Commander inspector.
- Tap Soldier: Open Soldier inspector.

Camera lock:

- When user taps an entity, camera lock should work as desktop.
- Camera follows selected entity.
- Camera remains locked during orbit.
- Lock persists until manually exited.
- User may switch lock targets instantly.
- Show visible lock indicator.

Display examples:

- Following: Iron House Gym General
- Following: Merch Marshal
- Following: Design Commander

Touch controls:

- Single Finger Drag: Pan / move around graph
- Two Finger Pinch: Zoom in / zoom out
- Two Finger Drag: Rotate camera perspective, change viewing angle, orbit around the hierarchy, inspect structures from different sides
- Double Tap: Focus selected entity

When camera lock is active:

- Selected entity remains centered.
- Two Finger Drag rotates around the selected entity.
- Users can inspect from all sides without losing lock.

The graph should feel like manipulating a 3D model.

Performance:

Reduce unnecessary particles, heavy glow effects, expensive background calculations, and excessive animation layers.

Maintain ENTRAL identity, space atmosphere, entity hierarchy clarity, and smooth motion.

## Phase 11: Mobile Task Center

Objective: Create or refine a dedicated mobile task screen.

Display:

- Active Tasks
- Pending Tasks
- Completed Tasks
- Failed Tasks
- Priority
- Status
- Due Date
- Assigned Entity
- Command Path

Actions:

- Create Task
- Assign Task
- Mark Complete
- Generate Task Report
- Filter by Marshal
- Filter by General
- Filter by Commander
- Filter by Soldier

Empty state:

`No active tasks. Create a task or generate a workflow.`

Actions:

- Create Task
- Generate Starter Tasks
- Use Business Template

## Phase 12: Mobile Report Center

Objective: Reports must be easy to find and read on mobile.

Display:

- Recent Reports
- Marshal Reports
- General Reports
- System Reports
- Business Reports
- Task Reports

Actions:

- Generate Report
- Filter Reports
- Search Reports
- Favorite Report
- Open Related Entity

Report format:

Use readable structured sections: Situation, Analysis, Recommendation, Next Actions.

Do not cram reports into tiny cards if they need readable long-form display.

## Phase 13: Voice Experience Improvement

Objective: Voice should feel native to mobile and useful on desktop.

Requirements:

- Large voice button on mobile
- Push-to-talk mode
- Voice status indicator
- Voice playback toggle
- Reports Only mode
- Full Voice mode
- Silent mode

Required commands:

- `ENTRAL, report.`
- `ENTRAL, show tasks.`
- `ENTRAL, create a business.`
- `ENTRAL, open Iron House Gym.`
- `ENTRAL, start tutorial.`
- `ENTRAL, generate a report.`
- `ENTRAL, what needs attention?`

If voice functionality is only partially implemented, clearly mark incomplete features and avoid fake working states.

## Phase 14: Tutorial / ENTRAL Academy

Objective: ENTRAL must teach itself. New users should not need external explanation.

Required tutorials:

- Quick Start
- Command Guide
- Hierarchy Guide
- Mobile Guide
- Voice Guide
- Business Creation Guide
- Templates Guide
- Merch/POD Guide

Users must be able to:

- Start tutorial
- Skip tutorial
- Replay tutorial
- Resume tutorial
- Jump to section

First tutorial flow:

1. Explain ENTRAL
2. Explain Marshals
3. Explain Generals
4. Explain Commanders
5. Explain Soldiers
6. Create first Marshal
7. Create first General
8. Generate first report
9. Show tasks
10. Show mobile/voice options

Critical rule:

The tutorial should progressively create the hierarchy. The hierarchy should be built during onboarding, not before onboarding.

## Phase 15: Product Simplification Audit

Objective: ENTRAL has enough feature density. Reduce confusion. Do not add complexity unnecessarily.

Audit every screen, page, button, panel, feature, and workflow.

For each item determine:

1. Why does this exist?
2. Is it useful?
3. Is it discoverable?
4. Is it duplicated elsewhere?
5. Is it necessary?
6. Is it confusing?
7. Can it be simplified?
8. Should it be merged?
9. Should it be hidden?
10. Should it be removed?

Create or update `ENTRAL_V0_3_SIMPLIFICATION_AUDIT.md`.

Include:

- Critical Issues
- High Priority Issues
- Medium Priority Issues
- Low Priority Issues

Identify:

- Dead buttons
- Empty pages
- Duplicate systems
- Duplicate navigation
- Hidden important features
- Confusing terminology
- Mobile pain points
- First-time user pain points
- Redundant views
- Features that should move to More menu
- Features that should be hidden until needed

Do not remove anything risky without listing it first. Safe fixes are allowed. For larger changes, report recommended actions.

## Phase 16: Feature Access Rule

Objective: No essential feature should require more than 3 taps/clicks from the main interface.

Audit major actions:

- Create Marshal
- Create Business
- Create Commander
- Create Soldier
- Generate Report
- Open Tasks
- Open Hierarchy
- Open Graph
- Start Tutorial
- Use Voice
- Open Business General
- Open Template Wizard
- Open Help
- Open Reports
- Open Mobile Guide

If any require more than 3 taps/clicks, simplify access.

Create or update `ENTRAL_V0_3_ACCESS_AUDIT.md`.

Include:

- Feature
- Current access path
- Number of taps/clicks
- Problem
- Recommended fix
- Fix implemented or not implemented

## Phase 17: Merch Command MVP Readiness

Objective: v0.3 should prepare ENTRAL to support a real POD/Merch business workflow.

Do not build the full Merch Command system unless it is already partially implemented and safe to extend. Focus on readiness and basic simulation.

Required supported workflow:

1. Create Merch Marshal
2. Create business General
3. Apply POD / Merch template
4. Create Commanders and Soldiers
5. Create initial tasks
6. Generate starter report
7. Track business status

If Merch module exists, audit it for:

- Correct Marshal → General → Commander → Soldier structure
- No Commanders used as business names
- Product records tied to General
- Store records tied to General
- Reports include Marshal and General context
- Approval queue exists or is clearly marked incomplete
- Pricing calculator exists or is clearly marked incomplete
- Launch package exists or is clearly marked incomplete

If safe, add basic Merch MVP screens or structures:

- Client / Business General
- Store
- Product Idea
- Product Draft
- Approval Status
- Launch Checklist
- Starter Report

Do not integrate Etsy, Shopify, Printify, or Printful APIs in v0.3 unless already safely scaffolded.

Manual approval remains required.

## Phase 18: Data Integrity and Migration Safety

Objective: Prevent corruption. The Command OS must remain stable.

Verify:

- No orphan Marshals
- No orphan Generals
- No orphan Commanders
- No orphan Soldiers
- No dangling task references
- No dangling report references
- No invalid hierarchy relationships
- No entities directly under the wrong parent
- Persistence works after refresh
- Hydration validates state
- Migration does not destroy user data

Validate official hierarchy.

Valid:

- ENTRAL → Marshal
- Marshal → General
- General → Commander
- Commander → Soldier

Invalid:

- ENTRAL → General
- ENTRAL → Commander
- ENTRAL → Soldier
- Marshal → Commander
- Marshal → Soldier
- General → Soldier
- Commander → Marshal
- Commander → General
- Soldier → anything

## Phase 19: UI Labeling and Terminology Cleanup

Objective: Terminology must be consistent everywhere.

Do not use:

- Enterprise
- Atom if referring to hierarchy entities
- AI militia if it confuses the user
- Commanders as businesses
- Generals as generic departments

Use:

- ENTRAL
- Marshal
- General
- Commander
- Soldier
- Business General
- Command Path
- Report
- Task
- Operation

Check locations:

- Dashboard
- Mobile UI
- Help menu
- Tutorials
- Reports
- Entity inspector
- Empty states
- Commands
- Voice prompts
- Templates
- Documentation
- Test names where user-facing

## Phase 20: Entity Inspector Polish

Objective: Entity inspectors should be useful, not decorative.

ENTRAL inspector should show:

- Total Marshals
- Total Generals
- Total Commanders
- Total Soldiers
- Active Tasks
- Reports
- System Health
- Suggested Actions

Marshal inspector should show:

- Name
- Type
- Status
- Active Generals
- Active Commanders
- Active Soldiers
- Active Tasks
- Reports
- Health
- Suggested Actions

General inspector should show:

- Business Name
- Parent Marshal
- Status
- Industry if available
- Audience if available
- Commanders
- Soldiers
- Projects / Stores if available
- Tasks
- Reports
- Health
- Suggested Actions

Commander inspector should show:

- Name
- Parent General
- Parent Marshal
- Assigned Soldiers
- Active Tasks
- Reports
- Performance
- Suggested Actions

Soldier inspector should show:

- Name
- Parent Commander
- Parent General
- Parent Marshal
- Current Task
- Task History
- Reports
- Suggested Actions

## Phase 21: Report Quality Improvement

Objective: Reports should be useful and consistent.

Use format:

- Situation
- Analysis
- Recommendation
- Next Actions

Required report types:

- System Report
- Marshal Report
- General Report
- Commander Report
- Soldier Report
- Task Report
- Business Readiness Report
- Merch Launch Readiness Report if applicable

Reports should include:

- Source entity
- Command path
- Status
- Risks
- Recommendations
- Next actions

Avoid generic filler. If there is insufficient data, say so clearly.

Example:

`Insufficient operational data exists for a full analysis. Recommended next action: create initial tasks or complete the setup workflow.`

## Phase 22: Documentation Update

Objective: Update documentation so tomorrow's development can continue cleanly.

Create or update:

- `ENTRAL_TOMORROW_START_HERE.md`
- `COMMAND_OS_ARCHITECTURE.md`
- `ENTITY_SCHEMA.md`
- `COMMAND_PROTOCOL.md`
- `MOBILE_UX_AUDIT.md`
- `ENTRAL_V0_3_AUDIT.md`
- `ENTRAL_V0_3_SIMPLIFICATION_AUDIT.md`
- `ENTRAL_V0_3_ACCESS_AUDIT.md`

`ENTRAL_TOMORROW_START_HERE.md` should include:

1. Current status
2. What v0.3 implemented
3. What was intentionally not implemented
4. What checks passed
5. What checks failed
6. Known issues
7. Recommended next step
8. Best first prompt for next Codex session
9. Whether deployed frontend needs update
10. Whether backend changes need deployment

## Phase 23: Testing and Validation

Objective: Do not finish without checking the work.

Run available checks using the package manager already used by the project.

Possible commands:

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run build`

If checks fail, attempt safe fixes.

If unable to fix safely, document:

- Failed command
- Error summary
- Likely cause
- What was attempted
- Recommended next action

Do not claim success if checks failed.

## Phase 24: Deployment Readiness

Objective: Make sure v0.3 can be deployed cleanly.

Check:

- Frontend build
- Backend build
- Environment variables
- API URL configuration
- Frontend/backend connection
- Vercel deployment assumptions
- Production warnings
- Console errors if detectable
- Broken routes if detectable

Do not expose secrets. Do not hardcode sensitive values.

If deployment cannot be verified, document why.

## Phase 25: Final Report

At completion, provide a final report with:

1. Executive Summary
2. Files Changed
3. Command Intelligence Improvements
4. Help System Improvements
5. First-Time User Improvements
6. Mobile Improvements
7. Business Wizard / Template Improvements
8. Merch Readiness Improvements
9. Product Simplification Findings
10. Access Audit Findings
11. Data Integrity Notes
12. Tests/checks run
13. Passing checks
14. Failing checks
15. Remaining risks
16. Recommended next phase
17. Suggested first user workflow to test manually
18. Suggested mobile workflow to test manually
19. Suggested Merch/POD workflow to test manually

Be specific. Do not exaggerate. Do not claim a feature works unless verified.

## v0.3 Success Criteria

ENTRAL v0.3 is successful if:

1. A new user understands what ENTRAL is within 5 minutes.
2. A new user starts with only ENTRAL, no fake hierarchy.
3. The help command returns real help.
4. Natural language commands work for common actions.
5. Structural changes require authorization.
6. A user can create their first business through a wizard.
7. Templates reduce setup time.
8. Mobile is usable and not overcrowded.
9. The mobile graph supports tap, pan, pinch zoom, and two-finger perspective rotation.
10. Empty states guide the user.
11. No essential feature is hidden behind unknown shortcuts.
12. No essential feature takes more than 3 taps/clicks to access.
13. Reports are useful and structured.
14. The hierarchy terminology is consistent.
15. The Merch/POD workflow can be simulated at a basic level.
16. Data integrity is preserved.
17. Build/checks are run and documented.

Final goal:

Make ENTRAL feel like a real command operating system, not just a visual dashboard.
