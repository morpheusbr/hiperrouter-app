export default {
  id: "replicate",
  priority: 61,
  alias: "replicate",
  display: {
    name: "Replicate",
    icon: "terminal",
    color: "#000000",
    textIcon: "REP",
    website: "https://replicate.com",
    notice: {
      apiKeyUrl: "https://replicate.com/account/api-tokens",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.replicate.com/v1/chat/completions",
    validateUrl: "https://api.replicate.com/v1/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "meta/meta-llama-3.1-405b-instruct", name: "Llama 3.1 405B" },
    { id: "meta/meta-llama-3-70b-instruct", name: "Llama 3 70B" },
    { id: "meta/meta-llama-3-8b-instruct", name: "Llama 3 8B" },
    { id: "deepseek-ai/deepseek-r1", name: "DeepSeek R1" },
  ],
};
