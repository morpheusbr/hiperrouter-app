export default {
  id: "aimlapi",
  priority: 48,
  hasFree: true,
  alias: "aimlapi",
  aliases: ["aiml"],
  uiAlias: "aiml",
  display: {
    name: "AIML API",
    icon: "api",
    color: "#6366F1",
    textIcon: "AIML",
    website: "https://aimlapi.com",
    notice: {
      text: "Free tier: Free credits on signup for 200+ top AI models.",
      apiKeyUrl: "https://aimlapi.com/app/keys",
    },
  },
  category: "freeTier",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.aimlapi.com/v1/chat/completions",
    validateUrl: "https://api.aimlapi.com/v1/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama 3.3 70B (AIML)" },
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (AIML)" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek V3 (AIML)" },
    { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B (AIML)" },
    { id: "mistralai/Mistral-Small-24B-Instruct-2501", name: "Mistral Small 24B (AIML)" },
  ],
  passthroughModels: true,
};
