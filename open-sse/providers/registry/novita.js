export default {
  id: "novita",
  priority: 64,
  hasFree: true,
  alias: "novita",
  display: {
    name: "Novita AI",
    icon: "auto_awesome",
    color: "#6366F1",
    textIcon: "NV",
    website: "https://novita.ai",
    notice: {
      text: "Free tier: $0.50 free credit on signup for open-source models.",
      apiKeyUrl: "https://novita.ai/dashboard/key",
    },
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://api.novita.ai/v3/openai/chat/completions",
    validateUrl: "https://api.novita.ai/v3/openai/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
    { id: "deepseek/deepseek_v3", name: "DeepSeek V3" },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
    { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B" },
    { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B" },
    { id: "qwen/qwen-2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B" },
  ],
};
