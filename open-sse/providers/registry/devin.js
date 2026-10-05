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
      signupUrl: "https://devin.ai/cli",
    },
  },
  category: "oauth",
  authType: "oauth",
  hasOAuth: true,
  authModes: ["oauth", "apikey"],
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
