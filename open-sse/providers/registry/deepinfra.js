export default {
  id: "deepinfra",
  priority: 63,
  alias: "deepinfra",
  display: {
    name: "DeepInfra",
    icon: "cloud",
    color: "#1976D2",
    textIcon: "DI",
    website: "https://deepinfra.com",
    notice: {
      apiKeyUrl: "https://deepinfra.com/dash/api_keys",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.deepinfra.com/v1/openai/chat/completions",
    validateUrl: "https://api.deepinfra.com/v1/openai/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1" },
    { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3" },
    { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama 3.3 70B" },
    { id: "meta-llama/Meta-Llama-3.1-405B-Instruct", name: "Llama 3.1 405B" },
    { id: "meta-llama/Meta-Llama-3.1-70B-Instruct", name: "Llama 3.1 70B" },
    { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", name: "Llama 3.1 8B" },
    { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B" },
    { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder 32B" },
    { id: "mistralai/Mistral-Small-24B-Instruct-2501", name: "Mistral Small 24B" },
  ],
};
