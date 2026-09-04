import { describe, expect, it } from "vitest";
import { PROVIDER_MODELS, getModelTargetFormat } from "../../open-sse/config/providerModels.js";
import { OpenCodeGoExecutor } from "../../open-sse/executors/opencode-go.js";
import { OpenCodeZenExecutor } from "../../open-sse/executors/opencode-zen.js";

const CHAT_MODELS = [
  "glm-5.2",
  "glm-5.1",
  // OpenCode Go docs' endpoint table currently says kimi-k2.7, but its
  // config example and the live API use kimi-k2.7-code.
  "kimi-k2.7-code",
  "kimi-k2.6",
  "deepseek-v4-pro",
  "deepseek-v4-flash",
  "mimo-v2.5",
  "mimo-v2.5-pro",
  "glm-5.3-flash",
  "glm-5.3",
  "glm-5",
  "kimi-k3",
  "kimi-k2.5",
  "deepseek-v4-flash-vision-exp",
  "mimo-v2-pro",
  "mimo-v2-omni",
  "longcat-2.0",
  "hy4-preview",
  "hy3",
  "hy3-preview",
  "gpt-5.6-luna",
  "grok-4.6",
  "grok-4.5",
  "muse-spark-1.3-contributor",
  "muse-spark-1.2-contributor",
  "omen-alpha",
];

const MESSAGES_MODELS = [
  "minimax-m3",
  "minimax-m2.7",
  "minimax-m2.5",
  "qwen3.8-max",
  "qwen3.8-flash",
  "qwen3.7-max",
  "qwen3.7-plus",
  "qwen3.6-plus",
  "qwen3.5-plus",
];

describe("OpenCode Go official model catalog", () => {
  it("matches the documented OpenCode Go model IDs", () => {
    const ids = (PROVIDER_MODELS["opencode-go"] || []).map((model) => model.id);

    expect(ids).toEqual([...CHAT_MODELS, ...MESSAGES_MODELS]);
  });

  it("marks documented Qwen and MiniMax models as Anthropic messages format", () => {
    for (const model of MESSAGES_MODELS) {
      expect(getModelTargetFormat("opencode-go", model)).toBe("claude");
    }
  });

  it("keeps GLM, Kimi, DeepSeek, and MiMo on OpenAI-compatible chat format", () => {
    for (const model of CHAT_MODELS) {
      expect(getModelTargetFormat("opencode-go", model)).toBeNull();
    }
  });
});

describe("OpenCode Go endpoint routing", () => {
  it("routes Qwen and MiniMax models to the messages endpoint with x-api-key auth", () => {
    const executor = new OpenCodeGoExecutor();

    for (const model of MESSAGES_MODELS) {
      expect(executor.buildUrl(model)).toBe("https://opencode.ai/zen/go/v1/messages");
      const headers = executor.buildHeaders({ apiKey: "sk-test" }, false);
      expect(headers["x-api-key"]).toBe("sk-test");
      expect(headers["anthropic-version"]).toBeDefined();
      expect(headers.Authorization).toBeUndefined();
    }
  });

  it("routes GLM, Kimi, DeepSeek, and MiMo models to chat/completions with bearer auth", () => {
    const executor = new OpenCodeGoExecutor();

    for (const model of CHAT_MODELS) {
      expect(executor.buildUrl(model)).toBe("https://opencode.ai/zen/go/v1/chat/completions");
      const headers = executor.buildHeaders({ apiKey: "sk-test" }, false);
      expect(headers.Authorization).toBe("Bearer sk-test");
      expect(headers["x-api-key"]).toBeUndefined();
      expect(headers["anthropic-version"]).toBeUndefined();
    }
  });
});

describe("OpenCode Zen endpoint routing and model format", () => {
  const ZEN_MESSAGES_MODELS = [
    "claude-sonnet-5",
    "claude-sonnet-4-6",
    "claude-sonnet-4-5",
    "claude-opus-5",
    "claude-haiku-4-5",
    "minimax-m3",
    "qwen3.6-plus",
  ];

  const ZEN_CHAT_MODELS = [
    "gpt-5.6-sol",
    "gpt-5.5",
    "gemini-3.8-flash",
    "grok-4.6",
    "deepseek-v4-pro",
    "glm-5.2",
    "kimi-k3",
  ];

  it("routes Claude, Qwen, and MiniMax models to zen messages endpoint with x-api-key", () => {
    const executor = new OpenCodeZenExecutor();

    for (const model of ZEN_MESSAGES_MODELS) {
      expect(executor.buildUrl(model)).toBe("https://opencode.ai/zen/v1/messages");
      const headers = executor.buildHeaders({ apiKey: "sk-zen-key" }, false);
      expect(headers["x-api-key"]).toBe("sk-zen-key");
      expect(headers["anthropic-version"]).toBeDefined();
      expect(headers.Authorization).toBeUndefined();
    }
  });

  it("routes GPT, Gemini, Grok, DeepSeek, GLM models to zen chat/completions with bearer auth", () => {
    const executor = new OpenCodeZenExecutor();

    for (const model of ZEN_CHAT_MODELS) {
      expect(executor.buildUrl(model)).toBe("https://opencode.ai/zen/v1/chat/completions");
      const headers = executor.buildHeaders({ apiKey: "sk-zen-key" }, false);
      expect(headers.Authorization).toBe("Bearer sk-zen-key");
      expect(headers["x-api-key"]).toBeUndefined();
      expect(headers["anthropic-version"]).toBeUndefined();
    }
  });

  it("marks Claude models as Anthropic messages format in providerModels", () => {
    expect(getModelTargetFormat("opencode-zen", "claude-sonnet-5")).toBe("claude");
    expect(getModelTargetFormat("opencode-zen", "claude-opus-5")).toBe("claude");
    expect(getModelTargetFormat("opencode-zen", "gpt-5.5")).toBeNull();
    expect(getModelTargetFormat("opencode-zen", "gemini-3.8-flash")).toBeNull();
  });
});
