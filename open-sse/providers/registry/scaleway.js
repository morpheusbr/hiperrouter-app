export default {
  id: "scaleway",
  priority: 69,
  alias: "scaleway",
  display: {
    name: "Scaleway AI",
    icon: "cloud_queue",
    color: "#4F0599",
    textIcon: "SCW",
    website: "https://www.scaleway.com",
    notice: {
      apiKeyUrl: "https://console.scaleway.com/iam/api-keys",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.scaleway.ai/v1/chat/completions",
    validateUrl: "https://api.scaleway.ai/v1/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
    { id: "llama-3.1-8b-instruct", name: "Llama 3.1 8B" },
    { id: "deepseek-r1", name: "DeepSeek R1" },
    { id: "qwen2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B" },
  ],
};
