export default {
  id: "ai21",
  priority: 67,
  alias: "ai21",
  display: {
    name: "AI21 Labs",
    icon: "psychology",
    color: "#101828",
    textIcon: "A21",
    website: "https://www.ai21.com",
    notice: {
      apiKeyUrl: "https://studio.ai21.com/account/api-key",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.ai21.com/studio/v1/chat/completions",
    validateUrl: "https://api.ai21.com/studio/v1/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "jamba-1.5-large", name: "Jamba 1.5 Large" },
    { id: "jamba-1.5-mini", name: "Jamba 1.5 Mini" },
  ],
};
