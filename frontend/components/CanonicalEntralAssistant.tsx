"use client";

import {
  parseMemberEntralAssistantMessageResponse,
  type CanonicalEntralConversationMessage,
  type EntitySummary,
  type GovernanceActionRequest,
  type MemberEntralSurface
} from "@entral/contracts";
import {
  ArrowUpRight,
  Check,
  CornerDownLeft,
  LoaderCircle,
  MessageSquareText,
  PanelLeft,
  PanelRight,
  ShieldCheck,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import {
  interpretEntralRequest,
  type InterpretedEntralRequest
} from "../lib/entral-assistant";
import type { CanonicalGraphAssistantCommandInput } from "./CanonicalGraphWorkspace";
import { Logo } from "./Logo";

type AssistantMessage = {
  readonly id: string;
  readonly content: string;
  readonly role: "assistant" | "human" | "system";
  readonly timestamp: string;
};

type CanonicalEntralAssistantProps = {
  readonly businessId: string | null;
  readonly canonicalMessages: readonly CanonicalEntralConversationMessage[];
  readonly destination: MemberEntralSurface;
  readonly entities: readonly EntitySummary[];
  readonly eventSequence: number;
  readonly humanUserId: string;
  readonly mode?: "room" | "widget";
  readonly onGraphCommand: (command: CanonicalGraphAssistantCommandInput) => void;
  readonly onRefresh: () => void;
  readonly organizationId: string;
  readonly scopeLabel: string;
  readonly selectedEntityId: string | null;
};

function localMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function canonicalAssistantMessages(
  messages: readonly CanonicalEntralConversationMessage[]
): AssistantMessage[] {
  return [...messages]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .slice(-6)
    .map((message) => ({
      content: message.content,
      id: `canonical-${message.message_id}`,
      role: message.direction === "HUMAN_TO_ENTRAL" ? "human" : "assistant",
      timestamp: message.created_at
    }));
}

function readableRole(role: AssistantMessage["role"]) {
  if (role === "human") return "You";
  if (role === "assistant") return "ENTRAL";
  return "System";
}

function isAssistantMessage(value: unknown): value is AssistantMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AssistantMessage>;
  return typeof candidate.id === "string"
    && typeof candidate.content === "string"
    && typeof candidate.timestamp === "string"
    && (candidate.role === "assistant" || candidate.role === "human" || candidate.role === "system");
}

function mergeAssistantMessages(
  ...messageGroups: readonly (readonly AssistantMessage[])[]
): AssistantMessage[] {
  const byId = new Map<string, AssistantMessage>();
  for (const group of messageGroups) {
    for (const message of group) byId.set(message.id, message);
  }
  return [...byId.values()]
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
    .slice(-40);
}

export function CanonicalEntralAssistant({
  businessId,
  canonicalMessages,
  destination,
  entities,
  eventSequence,
  humanUserId,
  mode = "widget",
  onGraphCommand,
  onRefresh,
  organizationId,
  scopeLabel,
  selectedEntityId
}: CanonicalEntralAssistantProps) {
  const router = useRouter();
  const panelId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logEndRef = useRef<HTMLLIElement>(null);
  const [isOpen, setIsOpen] = useState(mode === "room");
  const [dock, setDock] = useState<"left" | "right">("right");
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>(() => canonicalAssistantMessages(canonicalMessages));
  const [pendingProposal, setPendingProposal] = useState<Extract<InterpretedEntralRequest, { kind: "governance" }> | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [error, setError] = useState("");
  const [hydratedStoragePrefix, setHydratedStoragePrefix] = useState<string | null>(null);
  const selectedEntity = useMemo(
    () => entities.find((entity) => entity.entity_id === selectedEntityId) ?? null,
    [entities, selectedEntityId]
  );
  const storagePrefix = `entral-assistant:${humanUserId}:${organizationId}:${businessId ?? "portfolio"}`;
  const contextLabel = selectedEntity?.name ?? scopeLabel;

  const visibleMessages = useMemo(() => (
    messages.length
      ? messages
      : [{
          content: "I can inspect the same canonical scope as this screen and control the Universe Graph without interrupting agent work.",
          id: "assistant-empty",
          role: "assistant" as const,
          timestamp: new Date(0).toISOString()
        }]
  ), [messages]);

  useEffect(() => {
    setHydratedStoragePrefix(null);
    setPendingProposal(null);
    setError("");
    setDraft("");
    try {
      setConversationId(window.sessionStorage.getItem(`${storagePrefix}:conversation`));
      const storedMessages = JSON.parse(
        window.sessionStorage.getItem(`${storagePrefix}:messages`) ?? "[]"
      ) as unknown;
      setMessages(mergeAssistantMessages(
        canonicalAssistantMessages(canonicalMessages),
        Array.isArray(storedMessages) ? storedMessages.filter(isAssistantMessage) : []
      ));
      if (mode === "room") {
        setIsOpen(true);
      } else {
        setIsOpen(window.localStorage.getItem(`${storagePrefix}:open`) === "true");
        setDock(window.localStorage.getItem(`${storagePrefix}:dock`) === "left" ? "left" : "right");
      }
    } catch {
      // The assistant remains usable when browser storage is unavailable.
      setConversationId(null);
      setMessages(canonicalAssistantMessages(canonicalMessages));
    } finally {
      setHydratedStoragePrefix(storagePrefix);
    }
  }, [mode, storagePrefix]);

  useEffect(() => {
    setMessages((current) => mergeAssistantMessages(
      canonicalAssistantMessages(canonicalMessages),
      current
    ));
  }, [canonicalMessages]);

  useEffect(() => {
    if (hydratedStoragePrefix !== storagePrefix) return;
    try {
      window.sessionStorage.setItem(
        `${storagePrefix}:messages`,
        JSON.stringify(messages.slice(-40))
      );
    } catch {
      // The server conversation remains canonical when session storage is unavailable.
    }
  }, [hydratedStoragePrefix, messages, storagePrefix]);

  useEffect(() => {
    if (!isOpen) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof logEndRef.current?.scrollIntoView !== "function") return;
    const reducedMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    logEndRef.current.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest"
    });
  }, [isOpen, isSending, messages.length, pendingProposal]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || mode === "room" || !isOpen) return;
      setIsOpen(false);
      try {
        window.localStorage.setItem(`${storagePrefix}:open`, "false");
      } catch {
        // Focus restoration still works without storage.
      }
      window.requestAnimationFrame(() => launcherRef.current?.focus());
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, mode, storagePrefix]);

  function addMessage(role: AssistantMessage["role"], content: string) {
    setMessages((current) => mergeAssistantMessages(current, [{
      content,
      id: localMessageId(),
      role,
      timestamp: new Date().toISOString()
    }]));
  }

  function setOpen(nextOpen: boolean) {
    setIsOpen(nextOpen);
    try {
      window.localStorage.setItem(`${storagePrefix}:open`, String(nextOpen));
    } catch {
      // The open state simply becomes session-local.
    }
    if (!nextOpen) window.requestAnimationFrame(() => launcherRef.current?.focus());
  }

  function toggleDock() {
    const nextDock = dock === "right" ? "left" : "right";
    setDock(nextDock);
    try {
      window.localStorage.setItem(`${storagePrefix}:dock`, nextDock);
    } catch {
      // Docking remains functional for the active route.
    }
  }

  async function submitMessage(event: React.FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isSending) return;
    setDraft("");
    setError("");
    addMessage("human", message);

    const interpreted = interpretEntralRequest(message, {
      entities,
      humanUserId,
      scopeLabel,
      selectedEntityId
    }, localMessageId);
    if (interpreted?.kind === "graph") {
      onGraphCommand(interpreted.command);
      addMessage("assistant", interpreted.response);
      return;
    }
    if (interpreted?.kind === "governance") {
      setPendingProposal(interpreted);
      addMessage(
        "assistant",
        `I prepared a governed change for ${interpreted.entity.name}. Review it below before anything is submitted.`
      );
      return;
    }

    setIsSending(true);
    try {
      const payload = await apiFetch<unknown>(
        `/member/organizations/${encodeURIComponent(organizationId)}/entral/assistant/messages`,
        {
          json: {
            context: {
              business_id: businessId,
              observed_event_sequence: eventSequence,
              selected_entity_id: selectedEntityId,
              surface: destination
            },
            conversation_id: conversationId ?? undefined,
            message
          },
          method: "POST",
          timeoutMs: 45_000
        }
      );
      const response = parseMemberEntralAssistantMessageResponse(payload);
      setConversationId(response.conversation_id);
      try {
        window.sessionStorage.setItem(`${storagePrefix}:conversation`, response.conversation_id);
      } catch {
        // The server still preserves the active conversation for this response.
      }
      addMessage("assistant", response.content);
    } catch (requestError) {
      const messageText = requestError instanceof Error ? requestError.message : "ENTRAL could not respond.";
      setError(messageText);
    } finally {
      setIsSending(false);
    }
  }

  async function submitProposal(request: GovernanceActionRequest) {
    if (isSubmittingProposal) return;
    setIsSubmittingProposal(true);
    setError("");
    try {
      const response = await apiFetch<{
        action: { action_id: string; status: string };
      }>(`/member/organizations/${encodeURIComponent(organizationId)}/governance-actions`, {
        json: request,
        method: "POST"
      });
      addMessage(
        "assistant",
        `Governed change ${response.action.action_id} was recorded as ${response.action.status}. ENTRAL will report completion only after validation, execution, verification, and a canonical event receipt.`
      );
      setPendingProposal(null);
      onRefresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The governed change could not be submitted.");
    } finally {
      setIsSubmittingProposal(false);
    }
  }

  const panel = (
    <section
      aria-label={mode === "room" ? "Main ENTRAL chat room" : "ENTRAL assistant"}
      className={mode === "room"
        ? "phase180-assistant-panel phase180-assistant-room"
        : `phase180-assistant-panel phase180-assistant-widget dock-${dock}`}
      id={panelId}
    >
      <header>
        <div className="phase180-assistant-identity">
          <Logo />
          <span><strong>ENTRAL</strong><small>{contextLabel}</small></span>
        </div>
        <span className="phase180-assistant-event">Event {eventSequence}</span>
        {mode === "widget" ? (
          <>
            <button
              aria-label={`Dock ENTRAL ${dock === "right" ? "left" : "right"}`}
              onClick={toggleDock}
              type="button"
            >
              {dock === "right" ? <PanelLeft aria-hidden="true" size={17} /> : <PanelRight aria-hidden="true" size={17} />}
            </button>
            <button aria-label="Close ENTRAL assistant" onClick={() => setOpen(false)} type="button">
              <X aria-hidden="true" size={18} />
            </button>
          </>
        ) : null}
      </header>

      <p className="phase180-assistant-context">
        <ShieldCheck aria-hidden="true" size={15} />
        Same RLS scope, selection, and canonical event as this screen
      </p>

      <ol aria-live="polite" aria-relevant="additions text" className="phase180-assistant-log" role="log">
        {visibleMessages.map((message) => (
          <li className={`role-${message.role}`} key={message.id}>
            <span>{readableRole(message.role)}</span>
            <p>{message.content}</p>
          </li>
        ))}
        {isSending ? (
          <li className="role-assistant phase180-assistant-thinking">
            <span>ENTRAL</span><p><LoaderCircle aria-hidden="true" className="spin" size={16} /> Analyzing current context…</p>
          </li>
        ) : null}
        <li aria-hidden="true" className="phase180-assistant-log-end" ref={logEndRef} />
      </ol>

      {pendingProposal ? (
        <article className="phase180-assistant-proposal" aria-label="Governed agent change">
          <div><ShieldCheck aria-hidden="true" size={17} /><strong>Review governed change</strong></div>
          <p>{pendingProposal.summary}</p>
          <small>
            Target version {pendingProposal.entity.version} · {pendingProposal.request.risk_class.toLocaleLowerCase()} risk · rollback and verification required
          </small>
          <div>
            <button disabled={isSubmittingProposal} onClick={() => setPendingProposal(null)} type="button">
              Cancel
            </button>
            <button disabled={isSubmittingProposal} onClick={() => void submitProposal(pendingProposal.request)} type="button">
              {isSubmittingProposal ? <LoaderCircle aria-hidden="true" className="spin" size={16} /> : <Check aria-hidden="true" size={16} />}
              Submit governed change
            </button>
          </div>
        </article>
      ) : null}

      {error ? <p className="phase180-assistant-error" role="alert">{error}</p> : null}

      <form onSubmit={submitMessage}>
        <label>
          <span className="sr-only">Message ENTRAL</span>
          <textarea
            aria-label="Message ENTRAL"
            maxLength={4_000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            placeholder="Ask, inspect, or request a change…"
            ref={inputRef}
            rows={2}
            value={draft}
          />
        </label>
        <button aria-label="Send message to ENTRAL" disabled={!draft.trim() || isSending} type="submit">
          <CornerDownLeft aria-hidden="true" size={18} />
        </button>
      </form>

      {mode === "widget" ? (
        <button
          className="phase180-assistant-room-link"
          onClick={() => router.push("/member/dashboard?section=entral")}
          type="button"
        >
          <MessageSquareText aria-hidden="true" size={15} />
          Open full ENTRAL room
          <ArrowUpRight aria-hidden="true" size={14} />
        </button>
      ) : null}
    </section>
  );

  if (mode === "room") return panel;

  return (
    <>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close ENTRAL assistant" : "Open ENTRAL assistant"}
        className={`phase180-entral-emblem dock-${dock}`}
        onClick={() => setOpen(!isOpen)}
        ref={launcherRef}
        type="button"
      >
        <Logo />
        <span className="sr-only">ENTRAL</span>
      </button>
      {isOpen ? panel : null}
    </>
  );
}
