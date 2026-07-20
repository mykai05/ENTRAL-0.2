# Entral member Command Center

## Selected presentation

The member experience uses the Command Center presentation preserved at commit `2ee1dd9e74ccbbf9cfe950a2e6f4f73a5587f461`.

The source file `frontend/components/NeuronsCommandCenter.tsx` is byte-identical to that commit. It is the full-screen Entral interface selected by the owner: central Entral identity, 3D command graph, Command OS hierarchy, persistent command console, inspector, settings, Academy, and local graph controls.

## Routes

- `/member/sign-in` authenticates through Entral's existing member flow.
- `/member/dashboard` is the canonical authenticated Command Center route.
- `/member` and `/member/graph` redirect to `/member/dashboard`.
- `/dashboard` remains the internal/local Command Center entry.

## Authorization boundary

The member route reuses the presentation, not internal authority.

- Server rendering verifies the HttpOnly member cookie through `/api/v1/member/organizations`.
- A member must be assigned to at least one enabled organization.
- The rendered Command Center receives no internal operator user, which prevents automatic `/command-os/state` restore/sync.
- Member JWTs have the `entral-member` audience and remain rejected by internal API middleware.
- Local Command Center keys are cleared when the user/organization scope changes.
- Internal admin, agent, automation, connector, finance, merch, prompt, diagnostic, and command-routing records are not returned by the member API.

The current visual controls intentionally remain present because the owner requested the exact interface first. Controls that operate purely in browser-local state continue to work. Controls that require internal API authority fail closed at the backend and can be individually redesigned or removed in the next reviewed UI pass.

## Hosting boundary

The Entral frontend remains a Next.js application deployed through its existing Vercel project. Production Next.js assets use `NEXT_PUBLIC_ASSET_PREFIX` (defaulting to the established Vercel origin in production) so the application can be reverse-proxied at `spcommand.com/member/*` without claiming Sovereign Protocol's `/_next` asset namespace.

The Sovereign Sites worker owns the narrow member reverse proxy and does not expose unrestricted Entral APIs.

## Verification

- Selected component blob identity is checked against commit `2ee1dd9e74ccbbf9cfe950a2e6f4f73a5587f461`.
- Frontend TypeScript passes under Node 20.19.0 and pnpm 9.12.3.
- Member redirect, token stripping, cross-tenant, internal-route denial, and presentation tests cover the new canonical route behavior.
- The preserved Command Center was rendered locally and visually compared with the selected localhost version before publication.

## Rollback

Revert the member page redirects and `MemberCommandCenterClient`, then redeploy the previous Vercel commit. This change adds no schema migration and does not alter member records.
