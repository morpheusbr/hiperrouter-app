export default {
  id: "stepfun",
  priority: 52,
  hasFree: true,
  alias: "stepfun",
  aliases: ["step"],
  uiAlias: "step",
  display: {
    name: "StepFun",
    icon: "directions_walk",
    color: "#0066FF",
    textIcon: "STEP",
    website: "https://www.stepfun.com",
    notice: {
      text: "Free tier: Free token quota for Step-1 models (128k context).",
      apiKeyUrl: "https://platform.stepfun.com/interface-key",
    },
  },
  category: "freeTier",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.stepfun.com/v1/chat/completions",
    validateUrl: "https://api.stepfun.com/v1/models",
    quirks: {
      dropClientMetadata: true,
    },
  },
  models: [
    { id: "step-1-8k", name: "Step-1 8k" },
    { id: "step-1-32k", name: "Step-1 32k" },
    { id: "step-1-128k", name: "Step-1 128k" },
    { id: "step-1-flash", name: "Step-1 Flash" },
  ],
  passthroughModels: true,
};
