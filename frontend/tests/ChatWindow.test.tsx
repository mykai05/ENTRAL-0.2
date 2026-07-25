import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatWindow } from "../components/ChatWindow";
import { apiFetch } from "../lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
  apiFetch: vi.fn()
}));

vi.mock("../components/AiUsageGuardrail", () => ({
  AiUsageGuardrail: ({ onProviderReadyChange }: { onProviderReadyChange?: (isReady: boolean) => void }) => {
    React.useEffect(() => onProviderReadyChange?.(false), [onProviderReadyChange]);
    return <div>Mock provider</div>;
  }
}));
vi.mock("../components/ChatInput", () => ({
  ChatInput: ({ disabled }: { disabled?: boolean }) => <button disabled={disabled}>Send directive</button>
}));
vi.mock("../components/CurlSnippet", () => ({ CurlSnippet: () => null }));
vi.mock("../components/DataPortability", () => ({ DataPortability: () => null }));
vi.mock("../components/ScreenShareControls", () => ({ ScreenShareControls: () => <div>Screen sharing</div> }));
vi.mock("../components/Skeleton", () => ({ SkeletonList: () => <div>Loading</div> }));
vi.mock("../components/ToastProvider", () => ({ useToast: () => ({ notify: vi.fn() }) }));
vi.mock("../components/VoiceProvider", () => ({ useVoice: () => ({ speak: vi.fn() }) }));

const conversation = {
  id: "conversation-1",
  title: "Launch plan",
  updatedAt: "2026-07-17T00:00:00.000Z",
  messages: [
    { id: "message-1", role: "user", content: "Prepare the launch.", createdAt: "2026-07-17T00:00:00.000Z" },
    { id: "message-2", role: "assistant", content: "[ENTRAL]\nLaunch plan ready.", createdAt: "2026-07-17T00:00:01.000Z" }
  ]
};

describe("ChatWindow", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === "/ai/conversations") return { items: [{ id: conversation.id, title: conversation.title, updatedAt: conversation.updatedAt }] };
      if (path === `/ai/conversations/${conversation.id}`) return { conversation };
      throw new Error(`Unexpected API path: ${path}`);
    });
  });

  it("keeps one history toggle and omits unsupported message actions", async () => {
    const user = userEvent.setup();
    render(<ChatWindow />);

    expect(await screen.findByText("Launch plan ready.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Hide history" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Close conversations sidebar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /fork conversation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /regenerate command response/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send directive" })).toBeDisabled();
    expect(screen.getByText(/Read-only conversation history/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide history" }));
    expect(screen.getByRole("button", { name: "Show history" })).toBeInTheDocument();
  });
});
