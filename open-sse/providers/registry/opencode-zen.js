export default {
  id: "opencode-zen",
  priority: 215,
  alias: "opencode-zen",
  aliases: [
    "zen",
    "ocz",
  ],
  uiAlias: "zen",
  display: {
    name: "OpenCode Zen",
    icon: "terminal",
    color: "#E87040",
    textIcon: "ZEN",
    website: "https://opencode.ai/zen",
    notice: {
      text: "OpenCode Zen pay-as-you-go API. Access to Claude, GPT-5, Gemini, Grok, Kimi, GLM, MiniMax, Qwen, and open models.",
      apiKeyUrl: "https://opencode.ai/auth",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://opencode.ai/zen/v1/chat/completions",
    headers: {},
  },
  modelsFetcher: { url: "https://opencode.ai/zen/v1/models", type: "opencode-zen" },
  passthroughModels: true,
  models: [
    // Claude models (Anthropic messages target format)
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", targetFormat: "claude" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", targetFormat: "claude" },
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", targetFormat: "claude" },
    { id: "claude-sonnet-4", name: "Claude Sonnet 4", targetFormat: "claude" },
    { id: "claude-opus-5", name: "Claude Opus 5", targetFormat: "claude" },
    { id: "claude-opus-4-8", name: "Claude Opus 4.8", targetFormat: "claude" },
    { id: "claude-opus-4-7", name: "Claude Opus 4.7", targetFormat: "claude" },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6", targetFormat: "claude" },
    { id: "claude-opus-4-5", name: "Claude Opus 4.5", targetFormat: "claude" },
    { id: "claude-fable-5", name: "Claude Fable 5", targetFormat: "claude" },
    { id: "claude-fable-5-1", name: "Claude Fable 5.1", targetFormat: "claude" },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", targetFormat: "claude" },

    // OpenAI models
    { id: "gpt-5.6-sol", name: "GPT 5.6 Sol" },
    { id: "gpt-5.6-terra", name: "GPT 5.6 Terra" },
    { id: "gpt-5.6-luna", name: "GPT 5.6 Luna" },
    { id: "gpt-5.5", name: "GPT 5.5" },
    { id: "gpt-5.5-pro", name: "GPT 5.5 Pro" },
    { id: "gpt-5.4", name: "GPT 5.4" },
    { id: "gpt-5.4-pro", name: "GPT 5.4 Pro" },
    { id: "gpt-5.4-mini", name: "GPT 5.4 Mini" },
    { id: "gpt-5.4-nano", name: "GPT 5.4 Nano" },
    { id: "gpt-5.3-codex", name: "GPT 5.3 Codex" },
    { id: "gpt-5.3-codex-spark", name: "GPT 5.3 Codex Spark" },
    { id: "gpt-5.2", name: "GPT 5.2" },
    { id: "gpt-5.2-codex", name: "GPT 5.2 Codex" },
    { id: "gpt-5.1", name: "GPT 5.1" },
    { id: "gpt-5.1-codex", name: "GPT 5.1 Codex" },
    { id: "gpt-5.1-codex-mini", name: "GPT 5.1 Codex Mini" },
    { id: "gpt-5.1-codex-max", name: "GPT 5.1 Codex Max" },
    { id: "gpt-5", name: "GPT 5" },
    { id: "gpt-5-codex", name: "GPT 5 Codex" },
    { id: "gpt-5-nano", name: "GPT 5 Nano" },

    // Gemini models
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash" },
    { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash" },
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash" },
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite" },
    { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash" },

    // Grok models
    { id: "grok-4.6", name: "Grok 4.6" },
    { id: "grok-4.5", name: "Grok 4.5" },
    { id: "grok-build-0.1", name: "Grok Build 0.1" },

    // Open & Partner models
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "glm-5.2", name: "GLM 5.2" },
    { id: "glm-5.1", name: "GLM 5.1" },
    { id: "glm-5", name: "GLM 5" },
    { id: "kimi-k3", name: "Kimi K3" },
    { id: "kimi-k2.7-code", name: "Kimi K2.7 Code" },
    { id: "kimi-k2.6", name: "Kimi K2.6" },
    { id: "kimi-k2.5", name: "Kimi K2.5" },

    // MiniMax & Qwen models
    { id: "minimax-m3", name: "MiniMax M3", targetFormat: "claude" },
    { id: "minimax-m2.7", name: "MiniMax M2.7", targetFormat: "claude" },
    { id: "minimax-m2.5", name: "MiniMax M2.5", targetFormat: "claude" },
    { id: "qwen3.6-plus", name: "Qwen 3.6 Plus", targetFormat: "claude" },
    { id: "qwen3.5-plus", name: "Qwen 3.5 Plus", targetFormat: "claude" },

    // Free tier models
    { id: "big-pickle", name: "Big Pickle" },
    { id: "deepseek-v4-flash-free", name: "DeepSeek V4 Flash (Free)" },
  ],
};
