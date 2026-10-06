export default {
  id: "upstage",
  priority: 68,
  hasFree: true,
  alias: "upstage",
  display: {
    name: "Upstage",
    icon: "wb_sunny",
    color: "#6A0DAD",
    textIcon: "UP",
    website: "https://upstage.ai",
    notice: {
      text: "Free tier: $10 free credit on signup for Solar models.",
      apiKeyUrl: "https://console.upstage.ai/api-keys",
    },
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://api.upstage.ai/v1/solar/chat/completions",
    validateUrl: "https://api.upstage.ai/v1/solar/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "solar-pro", name: "Solar Pro" },
    { id: "solar-mini", name: "Solar Mini" },
  ],
};
