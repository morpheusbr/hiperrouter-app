export default {
  id: "maritaca",
  priority: 65,
  hasFree: true,
  alias: "maritaca",
  display: {
    name: "Maritaca AI",
    icon: "psychology",
    color: "#00A868",
    textIcon: "MA",
    website: "https://www.maritaca.ai",
    notice: {
      text: "Free tier: Brazilian LLM MariTalk (Sabiá-3) with free trial quota.",
      apiKeyUrl: "https://chat.maritaca.ai",
    },
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://chat.maritaca.ai/api/chat/completions",
    validateUrl: "https://chat.maritaca.ai/api/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "sabia-3", name: "Sabiá-3" },
    { id: "sabia-2-medium", name: "Sabiá-2 Médio" },
    { id: "sabia-2-small", name: "Sabiá-2 Pequeno" },
  ],
};
