export default {
  id: "chutes",
  priority: 70,
  hasFree: true,
  alias: "chutes",
  aliases: [
    "ch",
  ],
  uiAlias: "ch",
  display: {
    name: "Chutes AI",
    icon: "water_drop",
    color: "#ffffffff",
    textIcon: "CH",
    website: "https://chutes.ai",
    notice: {
      text: "Free tier: Open-source model inference on decentralized compute.",
      apiKeyUrl: "https://chutes.ai/app/api",
    },
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://llm.chutes.ai/v1/chat/completions",
    validateUrl: "https://llm.chutes.ai/v1/models",
  },
};
