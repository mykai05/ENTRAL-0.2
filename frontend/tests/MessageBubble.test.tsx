import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageBubble } from "../components/MessageBubble";
import { ToastProvider } from "../components/ToastProvider";

function renderBubble(role: "assistant" | "user", content: string) {
  return render(
    <ToastProvider>
      <MessageBubble role={role} content={content} />
    </ToastProvider>
  );
}

describe("MessageBubble", () => {
  it("labels assistant messages", () => {
    renderBubble("assistant", "Here is the **plan**.");

    expect(screen.getByText("Entral")).toBeInTheDocument();
    expect(screen.getByText("plan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy assistant message" })).toBeInTheDocument();
  });

  it("labels user messages", () => {
    renderBubble("user", "Draft my next steps.");

    expect(screen.getByText("You")).toBeInTheDocument();
  });
});
