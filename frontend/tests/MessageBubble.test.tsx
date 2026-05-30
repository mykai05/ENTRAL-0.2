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
  it("labels command transmissions", () => {
    renderBubble("assistant", "[ENTRAL]\nAnalysis complete. **Plan** is ready.");

    expect(screen.getByText("[ENTRAL]")).toBeInTheDocument();
    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy command transmission" })).toBeInTheDocument();
  });

  it("labels user messages", () => {
    renderBubble("user", "Draft my next steps.");

    expect(screen.getByText("[OPERATOR]")).toBeInTheDocument();
  });
});
