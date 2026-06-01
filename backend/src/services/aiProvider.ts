import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { env } from "../env.js";

export type AiProviderStatus = "Connected" | "Disabled" | "Error" | "Missing API Key" | "Mock Mode" | "Not Connected";

export type AiProviderState = {
  availabilityStatus: AiProviderStatus;
  connectionStatus: AiProviderStatus;
  missingEnvVars: string[];
  mockMode: boolean;
  modelName: string;
  providerName: string;
};

export type AiProviderRequest = {
  messages: ChatCompletionMessageParam[];
  responseFormat?: "json_object" | "text";
  temperature?: number;
};

export type AiProviderResponse = {
  content: string;
  model: string;
  providerName: string;
  requestId?: string;
  usedMockFallback: boolean;
};

export type AiProviderTestResult = {
  error?: string;
  message: string;
  missingEnvVars: string[];
  modelName: string;
  nextSteps: string[];
  providerName: string;
  status: AiProviderStatus;
  success: boolean;
  timestamp: string;
};

class AiProviderUnavailableError extends Error {
  statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = "AiProviderUnavailableError";
  }
}

class AiProviderUpstreamError extends Error {
  statusCode = 502;

  constructor(message = "AI provider request failed.") {
    super(message);
    this.name = "AiProviderUpstreamError";
  }
}

export class OpenAiProvider {
  private client?: OpenAI;

  getState(): AiProviderState {
    const missingEnvVars = env.OPENAI_API_KEY ? [] : ["OPENAI_API_KEY"];

    if (!env.AI_FEATURE_ENABLED) {
      return {
        availabilityStatus: "Disabled",
        connectionStatus: "Disabled",
        missingEnvVars,
        mockMode: false,
        modelName: env.OPENAI_MODEL,
        providerName: "OpenAI"
      };
    }

    if (missingEnvVars.length > 0) {
      return {
        availabilityStatus: "Mock Mode",
        connectionStatus: "Missing API Key",
        missingEnvVars,
        mockMode: true,
        modelName: env.OPENAI_MODEL,
        providerName: "OpenAI"
      };
    }

    return {
      availabilityStatus: "Connected",
      connectionStatus: "Connected",
      missingEnvVars,
      mockMode: false,
      modelName: env.OPENAI_MODEL,
      providerName: "OpenAI"
    };
  }

  canRequest() {
    const state = this.getState();
    return state.connectionStatus === "Connected";
  }

  async request(input: AiProviderRequest): Promise<AiProviderResponse> {
    const state = this.getState();

    if (!env.AI_FEATURE_ENABLED) {
      throw new AiProviderUnavailableError("AI provider is disabled.");
    }

    if (!env.OPENAI_API_KEY) {
      throw new AiProviderUnavailableError("AI provider is missing OPENAI_API_KEY.");
    }

    this.client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });

    try {
      const response = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: input.messages,
        response_format: input.responseFormat === "json_object" ? { type: "json_object" } : undefined,
        temperature: input.temperature ?? 0.3
      });
      const content = response.choices[0]?.message?.content?.trim();

      if (!content) {
        throw new AiProviderUnavailableError("AI provider returned an empty response.");
      }

      return {
        content,
        model: response.model,
        providerName: state.providerName,
        requestId: response._request_id ?? undefined,
        usedMockFallback: false
      };
    } catch (error) {
      if (error instanceof AiProviderUnavailableError) {
        throw error;
      }

      throw new AiProviderUpstreamError();
    }
  }

  async testConnection(): Promise<AiProviderTestResult> {
    const state = this.getState();
    const timestamp = new Date().toISOString();

    if (state.connectionStatus === "Disabled") {
      return {
        error: "AI_FEATURE_ENABLED is false.",
        message: "AI provider is disabled.",
        missingEnvVars: state.missingEnvVars,
        modelName: state.modelName,
        nextSteps: ["Set AI_FEATURE_ENABLED=true when AI provider routing is ready."],
        providerName: state.providerName,
        status: "Disabled",
        success: false,
        timestamp
      };
    }

    if (state.connectionStatus === "Missing API Key") {
      return {
        error: "OPENAI_API_KEY is not configured.",
        message: "AI Provider Not Connected. ENTRAL will continue in Mock Mode.",
        missingEnvVars: state.missingEnvVars,
        modelName: state.modelName,
        nextSteps: ["Add OPENAI_API_KEY on the backend only.", "Keep Mock Mode active until the provider test succeeds."],
        providerName: state.providerName,
        status: "Missing API Key",
        success: false,
        timestamp
      };
    }

    try {
      await this.request({
        messages: [
          { role: "system", content: "Return a terse ENTRAL provider health acknowledgement." },
          { role: "user", content: "Provider health check." }
        ],
        temperature: 0,
        responseFormat: "text"
      });

      return {
        message: `${state.providerName} is connected on ${state.modelName}. No external business action was executed.`,
        missingEnvVars: [],
        modelName: state.modelName,
        nextSteps: ["Route chat through AI Brain.", "Keep high-impact actions authorization-gated."],
        providerName: state.providerName,
        status: "Connected",
        success: true,
        timestamp
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Provider test failed.",
        message: "AI provider returned an error. ENTRAL can continue in Mock Mode.",
        missingEnvVars: [],
        modelName: state.modelName,
        nextSteps: ["Verify OPENAI_API_KEY.", "Verify OPENAI_MODEL.", "Retry the provider test."],
        providerName: state.providerName,
        status: "Error",
        success: false,
        timestamp
      };
    }
  }
}

export const openAiProvider = new OpenAiProvider();

export function getPrimaryAiProviderState() {
  return openAiProvider.getState();
}

export function testPrimaryAiProvider() {
  return openAiProvider.testConnection();
}
