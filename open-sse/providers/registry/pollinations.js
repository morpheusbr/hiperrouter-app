export default {
  id: "pollinations",
  priority: 45,
  hasFree: true,
  noAuth: true,
  alias: "pollinations",
  aliases: ["pol"],
  uiAlias: "pol",
  display: {
    name: "Pollinations AI",
    icon: "public",
    color: "#22C55E",
    textIcon: "POL",
    website: "https://pollinations.ai",
    notice: {
      text: "100% Free & Open: No API key or registration required.",
    },
  },
  category: "free",
  transport: {
    baseUrl: "https://text.pollinations.ai/openai/chat/completions",
    validateUrl: "https://text.pollinations.ai/models",
    noAuth: true,
  },
  models: [
    { id: "openai", name: "GPT-4o Mini (Pollinations)" },
    { id: "mistral", name: "Mistral Nemo (Pollinations)" },
    { id: "qwen", name: "Qwen 2.5 72B (Pollinations)" },
    { id: "deepseek", name: "DeepSeek V3 (Pollinations)" },
    { id: "llama", name: "Llama 3.3 70B (Pollinations)" },
  ],
  passthroughModels: true,
};
