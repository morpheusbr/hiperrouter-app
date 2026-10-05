export default {
  id: "poe",
  priority: 145,
  alias: "poe",
  display: {
    name: "Poe (Subscription)",
    icon: "forum",
    color: "#4B2896",
    textIcon: "POE",
    website: "https://poe.com",
    notice: {
      signupUrl: "https://poe.com",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint: "Paste your p-b cookie value from poe.com",
  transport: {
    baseUrl: "https://api.poe.com/v1/chat/completions",
    validateUrl: "https://api.poe.com/v1/models",
    format: "openai",
    authType: "cookie",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "Claude-3.5-Sonnet", name: "Claude 3.5 Sonnet (Poe)" },
    { id: "GPT-4o", name: "GPT-4o (Poe)" },
    { id: "Claude-3-Opus", name: "Claude 3 Opus (Poe)" },
    { id: "o1-preview", name: "o1 Preview (Poe)" },
  ],
};
