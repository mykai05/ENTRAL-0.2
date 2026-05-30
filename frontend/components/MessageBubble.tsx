"use client";

import React from "react";
import { Check, Copy, GitFork, RefreshCcw } from "lucide-react";
import { commandSourceLabel, commandSpeakerFromPrefix, stripCommandSourcePrefix } from "../lib/command-communications";
import { MarkdownMessage } from "./MarkdownMessage";
import { useToast } from "./ToastProvider";

export type ChatRole = "user" | "assistant";

type MessageBubbleProps = {
  role: ChatRole;
  content: string;
  onFork?: () => void;
  onRegenerate?: () => void;
};

export function MessageBubble({ role, content, onFork, onRegenerate }: MessageBubbleProps) {
  const isUser = role === "user";
  const commandSpeaker = !isUser ? commandSpeakerFromPrefix(content) ?? "emperor" : "operator";
  const displayContent = !isUser ? stripCommandSourcePrefix(content) : content;
  const [copied, setCopied] = React.useState(false);
  const { notify } = useToast();

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      notify({ title: "Copied", message: "Command transmission copied.", type: "success" });
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      notify({ title: "Copy failed", message: "Clipboard access was blocked.", type: "error" });
    }
  }

  return (
    <article className={`message-bubble ${isUser ? "message-user" : "message-assistant"}`}>
      <header>
        <span>{commandSourceLabel(commandSpeaker)}</span>
        <span className="message-actions">
          {!isUser ? (
            <>
              <button type="button" className="message-copy" onClick={() => void copyMessage()} aria-label="Copy command transmission">
                {copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
              </button>
              {onRegenerate ? (
                <button type="button" className="message-copy" onClick={onRegenerate} aria-label="Regenerate command response">
                  <RefreshCcw aria-hidden="true" size={14} />
                </button>
              ) : null}
            </>
          ) : null}
          {onFork ? (
            <button type="button" className="message-copy" onClick={onFork} aria-label="Fork conversation from this message">
              <GitFork aria-hidden="true" size={14} />
            </button>
          ) : null}
        </span>
      </header>
      {isUser ? <p>{content}</p> : <MarkdownMessage content={displayContent} />}
    </article>
  );
}
