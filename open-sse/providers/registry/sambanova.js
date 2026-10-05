export default {
  id: "sambanova",
  priority: 62,
  alias: "sambanova",
  display: {
    name: "SambaNova",
    icon: "bolt",
    color: "#FF6A00",
    textIcon: "SN",
    website: "https://cloud.sambanova.ai",
    notice: {
      apiKeyUrl: "https://cloud.sambanova.ai/apis",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.sambanova.ai/v1/chat/completions",
    validateUrl: "https://api.sambanova.ai/v1/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "Meta-Llama-3.3-70B-Instruct", name: "Llama 3.3 70B" },
    { id: "Meta-Llama-3.1-405B-Instruct", name: "Llama 3.1 405B" },
    { id: "Meta-Llama-3.1-8B-Instruct", name: "Llama 3.1 8B" },
    { id: "Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B" },
    { id: "Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder 32B" },
    { id: "DeepSeek-R1-Distill-Llama-70B", name: "DeepSeek R1 Distill Llama 70B" },
    { id: "Llama-3.2-11B-Vision-Instruct", name: "Llama 3.2 11B Vision" },
    { id: "Llama-3.2-90B-Vision-Instruct", name: "Llama 3.2 90B Vision" },
  ],
};
