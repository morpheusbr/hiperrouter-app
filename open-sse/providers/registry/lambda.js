export default {
  id: "lambda",
  priority: 66,
  alias: "lambda",
  display: {
    name: "Lambda Labs",
    icon: "memory",
    color: "#7C3AED",
    textIcon: "LB",
    website: "https://lambdalabs.com",
    notice: {
      apiKeyUrl: "https://cloud.lambdalabs.com/api-keys",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.lambdalabs.com/v1/chat/completions",
    validateUrl: "https://api.lambdalabs.com/v1/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "hermes-3-llama-3.1-405b-fp8", name: "Hermes 3 Llama 3.1 405B" },
    { id: "llama3.3-70b-instruct-fp8", name: "Llama 3.3 70B" },
    { id: "llama3.1-8b-instruct", name: "Llama 3.1 8B" },
    { id: "deepseek-r1", name: "DeepSeek R1" },
  ],
};
