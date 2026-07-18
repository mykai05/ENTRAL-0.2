"use client";

import React from "react";
import { Check, Copy } from "lucide-react";
import { commandSourceLabel, commandSpeakerFromPrefix, stripCommandSourcePrefix } from "../lib/command-communications";
import { MarkdownMessage } from "./MarkdownMessage";
import { useToast } from "./ToastProvider";

export type ChatRole = "user" | "assistant";

type MessageBubbleProps = {
  role: ChatRole;
  content: string;
};

export function MessageBubble({ role, content }: MessageBubbleProps) {
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
        {!isUser ? (
          <span className="message-actions">
            <button type="button" className="message-copy" onClick={() => void copyMessage()} aria-label="Copy command transmission">
              {copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
            </button>
          </span>
        ) : null}
      </header>
      {isUser ? <p>{content}</p> : <MarkdownMessage content={displayContent} />}
    </article>
  );
}
