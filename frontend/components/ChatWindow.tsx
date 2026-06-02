"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Sparkles, Trash2 } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { commandSourceLabel, commandSpeakerFromPrefix } from "../lib/command-communications";
import { chatFormSchema } from "../lib/validation";
import { AiUsageGuardrail } from "./AiUsageGuardrail";
import { Button } from "./Button";
import { ChatInput } from "./ChatInput";
import { CurlSnippet } from "./CurlSnippet";
import { DataPortability } from "./DataPortability";
import { MessageBubble, type ChatRole } from "./MessageBubble";
import { ModeBadge } from "./ModeStatus";
import { ScreenShareControls, type ScreenShareControlsHandle } from "./ScreenShareControls";
import { SkeletonList } from "./Skeleton";
import { useToast } from "./ToastProvider";
import { useVoice } from "./VoiceProvider";

type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  lastMessage?: string | null;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

type ConversationDetail = ConversationSummary & {
  messages: ChatMessage[];
};

type ConversationListResponse = {
  items: ConversationSummary[];
};

type ConversationResponse = {
  conversation: ConversationDetail;
};

type ChatResponse = {
  conversationId: string;
  messageId: string;
  content: string;
  createdAt: string;
  userMessage: {
    messageId: string;
    content: string;
    createdAt: string;
  };
};

const starterPrompts = [
  "Prepare tomorrow's launch readiness report.",
  "Identify the highest operational risks in this workspace.",
  "Analyze my screen and recommend the first corrective action.",
  "Convert my current objective into three executable tasks.",
  "Draft a concise command status update for the team."
];

function wantsScreenContext(message: string) {
  return /\b(screen|what do you see|look at this|look at my|fix this error|terminal|browser|figma|visible)\b/i.test(message);
}

function messageFromApi(message: { id?: string; messageId?: string; role?: string; content: string; createdAt: string }): ChatMessage {
  return {
    id: message.id ?? message.messageId ?? crypto.randomUUID(),
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
    createdAt: message.createdAt
  };
}

export function ChatWindow() {
  const router = useRouter();
  const { notify } = useToast();
  const { speak } = useVoice();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [inputError, setInputError] = useState("");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [isConversationSidebarOpen, setIsConversationSidebarOpen] = useState(true);
  const [usageRefreshIndex, setUsageRefreshIndex] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const screenShareRef = useRef<ScreenShareControlsHandle>(null);

  const handleUnauthorized = useCallback((errorValue: unknown) => {
    if (errorValue instanceof ApiError && errorValue.status === 401) {
      router.push("/login?next=/chat");
      return true;
    }

    return false;
  }, [router]);

  const loadConversations = useCallback(async () => {
    const response = await apiFetch<ConversationListResponse>("/ai/conversations");
    setConversations(response.items);
    return response.items;
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    const response = await apiFetch<ConversationResponse>(`/ai/conversations/${conversationId}`);
    setActiveConversationId(response.conversation.id);
    setMessages(response.conversation.messages.map(messageFromApi));
  }, []);

  useEffect(() => {
    async function loadInitialState() {
      try {
        setError("");
        const items = await loadConversations();

        if (items[0]) {
          await loadConversation(items[0].id);
        }
      } catch (loadError) {
        if (!handleUnauthorized(loadError)) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load chat.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitialState();
  }, [handleUnauthorized, loadConversation, loadConversations]);

  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get("prompt");

    if (prompt) {
      setDraftPrompt(prompt);
    }
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, isSending]);

  async function submitChatMessage(text: string, screenshot?: string) {
    setInputError("");
    setError("");

    const parsed = chatFormSchema.safeParse({
      message: text
    });

    if (!parsed.success) {
      setInputError(parsed.error.issues[0]?.message ?? "Enter a message.");
      return false;
    }

    const optimisticMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: parsed.data.message,
      createdAt: new Date().toISOString()
    };

    setMessages((current) => [...current, optimisticMessage]);
    setIsSending(true);

    try {
      const response = await apiFetch<ChatResponse>(screenshot ? "/ai/screen" : "/ai/chat", {
        method: "POST",
        json: {
          conversationId: activeConversationId ?? undefined,
          message: parsed.data.message,
          prompt: parsed.data.message,
          screenshot
        }
      });

      setActiveConversationId(response.conversationId);
      setMessages((current) => [
        ...current.filter((message) => message.id !== optimisticMessage.id),
        {
          id: response.userMessage.messageId,
          role: "user",
          content: response.userMessage.content,
          createdAt: response.userMessage.createdAt
        },
        {
          id: response.messageId,
          role: "assistant",
          content: response.content,
          createdAt: response.createdAt
        }
      ]);
      {
        const speaker = commandSpeakerFromPrefix(response.content) ?? "emperor";
        speak(response.content, speaker, commandSourceLabel(speaker));
      }
      await loadConversations();
      setUsageRefreshIndex((current) => current + 1);
      setDraftPrompt("");
      notify({ title: screenshot ? "Screen analyzed" : "Directive sent", type: "success" });
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));

      if (!handleUnauthorized(sendError)) {
        setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
        notify({ title: "Directive failed", message: sendError instanceof Error ? sendError.message : "Unable to send directive.", type: "error" });
      }
      return false;
    } finally {
      setIsSending(false);
    }

    return true;
  }

  async function handleSendMessage(text: string) {
    if (wantsScreenContext(text) && screenShareRef.current?.isSharing()) {
      const screenshot = await screenShareRef.current.getLatestScreenshot();

      if (!screenshot) {
        setInputError("Screen sharing is active, but no screen frame is ready yet.");
        return false;
      }

      return submitChatMessage(text, screenshot);
    }

    return submitChatMessage(text);
  }

  async function handleAnalyzeScreen(screenshot: string, prompt: string) {
    await submitChatMessage(prompt, screenshot);
  }

  function handleForkConversation(index: number) {
    setMessages((current) => current.slice(0, index + 1));
    setActiveConversationId(null);
    notify({ title: "Branch created", message: "Your next directive will start a fresh command thread from here.", type: "success" });
  }

  async function handleRegenerate(index: number) {
    const previousUserMessage = messages.slice(0, index).reverse().find((message) => message.role === "user");

    if (!previousUserMessage) {
      notify({ title: "Regenerate unavailable", message: "No earlier user message was found.", type: "error" });
      return;
    }

    setMessages((current) => current.slice(0, index));
    await submitChatMessage(previousUserMessage.content);
  }

  async function handleNewChat() {
    setActiveConversationId(null);
    setMessages([]);
    setError("");
    setInputError("");
  }

  async function handleSelectConversation(conversationId: string) {
    try {
      setError("");
      await loadConversation(conversationId);
    } catch (selectError) {
      if (!handleUnauthorized(selectError)) {
        setError(selectError instanceof Error ? selectError.message : "Unable to open conversation.");
      }
    }
  }

  async function handleClearConversation() {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    try {
      await apiFetch(`/ai/conversations/${activeConversationId}`, { method: "DELETE" });
      setActiveConversationId(null);
      setMessages([]);
      await loadConversations();
    } catch (clearError) {
      if (!handleUnauthorized(clearError)) {
        setError(clearError instanceof Error ? clearError.message : "Unable to clear conversation.");
      }
    }
  }

  async function importConversations(data: unknown) {
    const payload = data as { activeMessages?: ChatMessage[]; conversations?: Array<{ messages?: ChatMessage[]; title?: string }> };
    const normalized = {
      conversations: (payload.conversations ?? []).map((conversation, index) => ({
        ...conversation,
        messages: conversation.messages ?? (index === 0 ? payload.activeMessages : undefined)
      }))
    };

    await apiFetch("/ai/conversations/import", {
      method: "POST",
      json: normalized
    });
    await loadConversations();
  }

  return (
    <section className={isConversationSidebarOpen ? "chat-layout" : "chat-layout sidebar-closed"} aria-label="ENTRAL command communications workspace">
      {isConversationSidebarOpen ? (
      <aside className="conversation-sidebar" aria-label="Command threads">
        <div className="sidebar-heading">
          <div>
            <p className="eyebrow">History</p>
            <h2>Command threads</h2>
          </div>
          <button className="sidebar-toggle-button" type="button" onClick={() => setIsConversationSidebarOpen(false)} aria-label="Close conversations sidebar">
            <PanelLeftClose aria-hidden="true" size={18} />
          </button>
        </div>
        <Button type="button" onClick={handleNewChat}>
          <MessageSquarePlus aria-hidden="true" size={20} />
          New thread
        </Button>

        <div className="conversation-list">
          {conversations.length === 0 ? (
            <p>No communications yet.</p>
          ) : (
            conversations.map((conversation) => (
              <button
                className={conversation.id === activeConversationId ? "conversation-item active" : "conversation-item"}
                key={conversation.id}
                onClick={() => void handleSelectConversation(conversation.id)}
                type="button"
              >
                <strong>{conversation.title}</strong>
                {conversation.lastMessage ? <span>{conversation.lastMessage}</span> : null}
              </button>
            ))
          )}
        </div>

        <DataPortability
          csvRows={conversations.map((conversation) => ({
            id: conversation.id,
            title: conversation.title,
            updatedAt: conversation.updatedAt
          }))}
          data={{ conversations, activeMessages: messages }}
          filename="entral-conversations"
          label="Command thread import/export"
          onImport={importConversations}
        />
      </aside>
      ) : null}

      <div className="chat-panel">
        <header className="chat-panel-header">
          <div>
            <h1>ENTRAL Communications</h1>
            <p>Use this focused channel for saved conversations, screen-aware assistance, and report drafting.</p>
          </div>
          <div className="row-actions">
            <Button type="button" variant="secondary" onClick={() => setIsConversationSidebarOpen((open) => !open)}>
              {isConversationSidebarOpen ? <PanelLeftClose aria-hidden="true" size={20} /> : <PanelLeftOpen aria-hidden="true" size={20} />}
              {isConversationSidebarOpen ? "Hide history" : "Show history"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleClearConversation}>
              <Trash2 aria-hidden="true" size={20} />
              Clear
            </Button>
          </div>
        </header>
        <p className="surface-mode-note chat-mode-note" role="note">
          <ModeBadge mode="real">Real account history</ModeBadge>
          <span>Conversation history is saved to your workspace. Screen analysis only uses frames you choose to share.</span>
        </p>

        <AiUsageGuardrail refreshIndex={usageRefreshIndex} />

        {error ? <p className="form-error" role="alert">{error}</p> : null}

        <ScreenShareControls
          disabled={isSending || isLoading}
          onAnalyze={handleAnalyzeScreen}
          onError={(message) => {
            setError(message);
            notify({ title: "Screen sharing", message, type: "error" });
          }}
          ref={screenShareRef}
        />

        <div className="message-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions text">
          {isLoading ? (
            <SkeletonList count={4} label="Loading command transmissions" />
          ) : messages.length === 0 ? (
            <div className="empty-state chat-empty-state">
              <Sparkles aria-hidden="true" size={28} />
              <div>
              <strong>Start the first conversation.</strong>
              <p>Choose a starter prompt or ask ENTRAL for a focused report.</p>
              </div>
              <div className="starter-prompts">
                {starterPrompts.map((prompt) => (
                  <button type="button" key={prompt} onClick={() => setDraftPrompt(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble
                content={message.content}
                key={message.id}
                onFork={() => handleForkConversation(index)}
                onRegenerate={message.role === "assistant" ? () => void handleRegenerate(index) : undefined}
                role={message.role}
              />
            ))
          )}

          {isSending ? (
            <div className="typing-indicator" role="status" aria-live="polite">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              ENTRAL is analyzing...
            </div>
          ) : null}
        </div>

        <ChatInput disabled={isSending || isLoading} error={inputError} initialText={draftPrompt} onSend={handleSendMessage} />

        <div id="export" className="api-snippet-strip">
          <CurlSnippet
            body={{
              conversationId: activeConversationId ?? "conversation_id",
              message: "Prepare a command report for the next workflow."
            }}
            method="POST"
            path="/ai/chat"
            title="Send command directive"
          />
        </div>
      </div>
    </section>
  );
}
