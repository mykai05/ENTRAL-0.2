-- Phase 200 server-backed Tutorial progress. This remains explicitly scoped
-- to the authenticated user and current legacy member organization until the
-- Phase 202 identity and tenancy migration owns the wider account boundary.
BEGIN;

CREATE TABLE public."MemberTutorialProgress" (
    id text PRIMARY KEY,
    "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    "organizationId" text NOT NULL REFERENCES public."Team"(id) ON DELETE CASCADE,
    "releaseVersion" text NOT NULL DEFAULT 'phase-200',
    "roleContext" text NOT NULL,
    "planContext" text,
    "businessModelContext" text,
    "commanderPackContext" text,
    mode text NOT NULL DEFAULT 'beginner',
    "completedAnchorIds" text[] NOT NULL DEFAULT ARRAY[]::text[],
    "currentAnchorId" text,
    "firstLaunchSeen" boolean NOT NULL DEFAULT false,
    revision integer NOT NULL DEFAULT 1,
    "startedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" timestamp(3),
    "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) NOT NULL,
    CONSTRAINT "MemberTutorialProgress_releaseVersion_check"
      CHECK ("releaseVersion" = 'phase-200'),
    CONSTRAINT "MemberTutorialProgress_roleContext_check"
      CHECK ("roleContext" IN ('MEMBER', 'OWNER')),
    CONSTRAINT "MemberTutorialProgress_mode_check"
      CHECK (mode IN ('beginner', 'advanced')),
    CONSTRAINT "MemberTutorialProgress_revision_check"
      CHECK (revision > 0),
    CONSTRAINT "MemberTutorialProgress_currentAnchorId_check"
      CHECK (
        "currentAnchorId" IS NULL OR "currentAnchorId" IN (
          'command-overview',
          'businesses-overview',
          'universe-navigation',
          'infrastructure-records',
          'entral-assistant'
        )
      ),
    CONSTRAINT "MemberTutorialProgress_completedAnchorIds_check"
      CHECK (
        "completedAnchorIds" <@ ARRAY[
          'command-overview',
          'businesses-overview',
          'universe-navigation',
          'infrastructure-records',
          'entral-assistant'
        ]::text[]
      )
);

CREATE UNIQUE INDEX "MemberTutorialProgress_userId_organizationId_releaseVersion_key"
  ON public."MemberTutorialProgress"("userId", "organizationId", "releaseVersion");
CREATE INDEX "MemberTutorialProgress_organizationId_updatedAt_idx"
  ON public."MemberTutorialProgress"("organizationId", "updatedAt");
CREATE INDEX "MemberTutorialProgress_userId_updatedAt_idx"
  ON public."MemberTutorialProgress"("userId", "updatedAt");

CREATE TABLE public."MemberTutorialMutationReceipt" (
    id text PRIMARY KEY,
    "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    "organizationId" text NOT NULL REFERENCES public."Team"(id) ON DELETE CASCADE,
    "releaseVersion" text NOT NULL DEFAULT 'phase-200',
    "idempotencyKey" text NOT NULL,
    action text NOT NULL,
    "priorRevision" integer NOT NULL,
    "resultingRevision" integer NOT NULL,
    "progressSnapshot" jsonb NOT NULL,
    "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberTutorialMutationReceipt_releaseVersion_check"
      CHECK ("releaseVersion" = 'phase-200'),
    CONSTRAINT "MemberTutorialMutationReceipt_action_check"
      CHECK (action IN ('UPDATE', 'RESET')),
    CONSTRAINT "MemberTutorialMutationReceipt_revision_check"
      CHECK ("priorRevision" > 0 AND "resultingRevision" = "priorRevision" + 1),
    CONSTRAINT "MemberTutorialMutationReceipt_idempotencyKey_check"
      CHECK (length("idempotencyKey") >= 12)
);

CREATE UNIQUE INDEX "MemberTutorialMutationReceipt_user_org_release_idempotency_key"
  ON public."MemberTutorialMutationReceipt"("userId", "organizationId", "releaseVersion", "idempotencyKey");
CREATE INDEX "MemberTutorialMutationReceipt_organizationId_createdAt_idx"
  ON public."MemberTutorialMutationReceipt"("organizationId", "createdAt");
CREATE INDEX "MemberTutorialMutationReceipt_userId_createdAt_idx"
  ON public."MemberTutorialMutationReceipt"("userId", "createdAt");

COMMIT;
