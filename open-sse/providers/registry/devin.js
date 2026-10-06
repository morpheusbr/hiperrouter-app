export default {
  id: "devin",
  priority: 15,
  alias: "devin",
  display: {
    name: "Devin",
    icon: "code_blocks",
    color: "#10B981",
    textIcon: "DEV",
    website: "https://devin.ai",
    notice: {
      apiKeyUrl: "https://app.devin.ai/settings/keys",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.devin.ai/v1/chat/completions",
    validateUrl: "https://api.devin.ai/v1/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "swe-2", name: "SWE-2" },
    { id: "gpt-6-astra", name: "GPT-6 Astra (Devin)" },
    { id: "claude-fable-5.1", name: "Claude Fable 5.1 (Devin)" },
    { id: "claude-opus-5.5", name: "Claude Opus 5.5 (Devin)" },
  ],
};
