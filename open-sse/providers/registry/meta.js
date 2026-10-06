export default {
  id: "meta",
  priority: 16,
  alias: "meta",
  aliases: ["muse"],
  display: {
    name: "Meta Muse",
    icon: "hub",
    color: "#0668E1",
    textIcon: "MUSE",
    website: "https://dev.meta.ai",
    notice: {
      apiKeyUrl: "https://dev.meta.ai/docs/overview",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.dev.meta.ai/v1/chat/completions",
    validateUrl: "https://api.dev.meta.ai/v1/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "muse-spark-1.3", name: "Muse Spark 1.3" },
    { id: "muse-spark-1.2", name: "Muse Spark 1.2" },
    { id: "llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
  ],
};
