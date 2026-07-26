import "@testing-library/jest-dom/vitest";
import type { EntitySummary } from "@entral/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CanonicalEntralAssistant } from "../components/CanonicalEntralAssistant";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("../lib/api", () => ({ apiFetch: api.apiFetch }));

const humanUserId = "123e4567-e89b-42d3-a456-426614174000";
const rootId = "223e4567-e89b-42d3-a456-426614174000";
const agentId = "323e4567-e89b-42d3-a456-426614174000";
const entities: EntitySummary[] = [{
  active_alert: null,
  active_task_count: 0,
  assigned_business_id: null,
  child_count: 1,
  compute_tier: null,
  current_mission: null,
  entity_id: rootId,
  entity_type: "ENTRAL",
  health: "HEALTHY",
  latest_material_result: null,
  model_class: null,
  name: "ENTRAL",
  parent_id: null,
  stable_code: "ENTRAL.CORE",
  status: "ACTIVE",
  updated_at: "2026-07-26T00:00:00.000Z",
  version: 4
}, {
  active_alert: null,
  active_task_count: 1,
  assigned_business_id: null,
  child_count: 0,
  compute_tier: "standard",
  current_mission: "Verify the interface",
  entity_id: agentId,
  entity_type: "SOLDIER",
  health: "HEALTHY",
  latest_material_result: null,
  model_class: "reasoning",
  name: "Interface Sentinel",
  parent_id: rootId,
  stable_code: "OPS.INTERFACE_SENTINEL",
  status: "ACTIVE",
  updated_at: "2026-07-26T00:00:00.000Z",
  version: 7
}];

function renderAssistant(overrides: Partial<React.ComponentProps<typeof CanonicalEntralAssistant>> = {}) {
  const props: React.ComponentProps<typeof CanonicalEntralAssistant> = {
    businessId: null,
    canonicalMessages: [],
    destination: "graph",
    entities,
    eventSequence: 42,
    humanUserId,
    onGraphCommand: vi.fn(),
    onRefresh: vi.fn(),
    organizationId: "ck1234567890123456789012",
    scopeLabel: "Human portfolio",
    selectedEntityId: agentId,
    ...overrides
  };
  return { ...render(<CanonicalEntralAssistant {...props} />), props };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("Canonical ENTRAL assistant", () => {
  it("uses the ENTRAL emblem and applies graph presentation commands immediately", () => {
    const onGraphCommand = vi.fn();
    renderAssistant({ onGraphCommand });
    const launcher = screen.getByRole("button", { name: "Open ENTRAL assistant" });
    fireEvent.click(launcher);
    expect(launcher).toHaveAttribute(
      "aria-controls",
      screen.getByRole("region", { name: "ENTRAL assistant" }).id
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Message ENTRAL" }), {
      target: { value: "Freeze graph movement" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message to ENTRAL" }));

    expect(onGraphCommand).toHaveBeenCalledWith({ paused: true, type: "motion" });
    expect(screen.getByText(/Graph movement paused/i)).toBeInTheDocument();
    expect(screen.getByText(/Same RLS scope, selection, and canonical event/i)).toBeInTheDocument();
    expect(screen.getByText("Event 42")).toBeInTheDocument();
    expect(api.apiFetch).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before submitting an agent-setting change", async () => {
    api.apiFetch.mockResolvedValueOnce({
      action: { action_id: "423e4567-e89b-42d3-a456-426614174000", status: "REQUESTED" }
    });
    const onRefresh = vi.fn();
    renderAssistant({ onRefresh });
    fireEvent.click(screen.getByRole("button", { name: "Open ENTRAL assistant" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Message ENTRAL" }), {
      target: { value: "Change selected agent model to gpt-5.6" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message to ENTRAL" }));

    expect(screen.getByRole("article", { name: "Governed agent change" })).toHaveTextContent("Interface Sentinel");
    expect(api.apiFetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Submit governed change" }));

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith(
        "/member/organizations/ck1234567890123456789012/governance-actions",
        expect.objectContaining({
          json: expect.objectContaining({
            action_type: "MODEL_CHANGE",
            actor_id: humanUserId,
            expected_version: 7,
            proposed_changes: { model_class: "gpt-5.6" },
            target_id: agentId
          }),
          method: "POST"
        })
      );
    });
    expect(screen.getByText(/recorded as REQUESTED/i)).toBeInTheDocument();
    expect(onRefresh).toHaveBeenCalled();
  });

  it("sends canonical context hints to the member-scoped assistant endpoint", async () => {
    api.apiFetch.mockResolvedValueOnce({
      action_plan: { authorizationRequired: false, intent: "conversation" },
      content: "Canonical scope acknowledged.",
      context: {
        business_id: null,
        event_sequence: 42,
        scope_label: "Human portfolio",
        selected_entity: entities[1],
        surface: "infrastructure"
      },
      conversation_id: "ck1234567890123456789012",
      created_at: "2026-07-26T00:00:01.000Z",
      message_id: "ck2234567890123456789012",
      user_message: {
        content: "What is selected?",
        created_at: "2026-07-26T00:00:00.000Z",
        message_id: "ck3234567890123456789012"
      }
    });
    renderAssistant({ destination: "infrastructure" });
    fireEvent.click(screen.getByRole("button", { name: "Open ENTRAL assistant" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Message ENTRAL" }), {
      target: { value: "What is selected?" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message to ENTRAL" }));

    expect(await screen.findByText("Canonical scope acknowledged.")).toBeInTheDocument();
    expect(api.apiFetch).toHaveBeenCalledWith(
      "/member/organizations/ck1234567890123456789012/entral/assistant/messages",
      expect.objectContaining({
        json: expect.objectContaining({
          context: {
            business_id: null,
            observed_event_sequence: 42,
            selected_entity_id: agentId,
            surface: "infrastructure"
          },
          message: "What is selected?"
        }),
        method: "POST"
      })
    );
  });

  it("keeps conversation history isolated when canonical business scope changes", async () => {
    const firstBusinessId = "523e4567-e89b-42d3-a456-426614174000";
    const secondBusinessId = "623e4567-e89b-42d3-a456-426614174000";
    const { rerender, props } = renderAssistant({
      businessId: firstBusinessId,
      mode: "room"
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Message ENTRAL" }), {
      target: { value: "Freeze graph movement" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message to ENTRAL" }));
    expect(screen.getByText(/Graph movement paused/i)).toBeInTheDocument();

    rerender(<CanonicalEntralAssistant {...props} businessId={secondBusinessId} mode="room" />);

    await waitFor(() => {
      expect(screen.queryByText(/Graph movement paused/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/I can inspect the same canonical scope/i)).toBeInTheDocument();
  });
});
