export default {
  id: "cody",
  priority: 25,
  alias: "cody",
  display: {
    name: "Sourcegraph Cody",
    icon: "terminal",
    color: "#FF5543",
    textIcon: "CODY",
    website: "https://sourcegraph.com/cody",
    notice: {
      apiKeyUrl: "https://sourcegraph.com/user/settings/tokens",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://sourcegraph.com/.api/chat/completions",
    validateUrl: "https://sourcegraph.com/.api/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "anthropic/claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (Cody)" },
    { id: "openai/gpt-4o", name: "GPT-4o (Cody)" },
    { id: "google/gemini-1.5-pro", name: "Gemini 1.5 Pro (Cody)" },
    { id: "sourcegraph/cody-chat", name: "Cody Chat Default" },
  ],
};
