import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { injectReasoningContent } from "../utils/reasoningContentInjector.js";
import { ANTHROPIC_API_VERSION } from "../providers/shared.js";
import crypto from "crypto";
import { resolveSessionId } from "../utils/sessionManager.js";

// Models that use /zen/go/v1/messages (Anthropic/Claude format + x-api-key auth)
const MESSAGES_FORMAT_MODELS = new Set([
  "minimax-m3",
  "minimax-m2.7",
  "minimax-m2.5",
  "qwen3.7-max",
  "qwen3.7-plus",
  "qwen3.6-plus",
]);

const BASE = "https://opencode.ai/zen/go/v1";

export class OpenCodeGoExecutor extends BaseExecutor {
  constructor() {
    super("opencode-go", PROVIDERS["opencode-go"]);
  }

  isMessagesModel(model) {
    return typeof model === "string" && (
      MESSAGES_FORMAT_MODELS.has(model) ||
      model.startsWith("qwen") ||
      model.startsWith("minimax")
    );
  }

  // buildUrl runs before buildHeaders in BaseExecutor.execute, cache model here
  buildUrl(model) {
    this._lastModel = model;
    return this.isMessagesModel(model)
      ? `${BASE}/messages`
      : `${BASE}/chat/completions`;
  }

  resolveSession(credentials) {
    const rawH = credentials?.rawHeaders || {};
    const candidate =
      rawH["x-opencode-session"] ||
      rawH["x-session-id"] ||
      rawH["session-id"] ||
      rawH["session_id"] ||
      credentials?._clientSessionId ||
      (credentials?.connectionId
        ? resolveSessionId({ headers: rawH, connectionId: credentials.connectionId, scope: "opencode-go" })
        : null);

    if (typeof candidate === "string" && candidate.trim()) {
      const clean = candidate.trim().replace(/^[a-z0-9_-]+:/i, "");
      if (clean) return clean;
    }

    return crypto.randomUUID();
  }

  buildHeaders(credentials, stream = true) {
    const key = credentials?.apiKey || credentials?.accessToken;
    const headers = { "Content-Type": "application/json" };

    if (this.isMessagesModel(this._lastModel)) {
      headers["x-api-key"] = key;
      headers["anthropic-version"] = ANTHROPIC_API_VERSION;
    } else {
      headers["Authorization"] = `Bearer ${key}`;
    }

    if (stream) headers["Accept"] = "text/event-stream";

    // OpenCode Go requires x-opencode-session for routing affinity & prompt caching (HTTP 400 MissingSessionID if omitted)
    headers["x-opencode-session"] = this.resolveSession(credentials);

    return headers;
  }

  transformRequest(model, body) {
    return injectReasoningContent({ provider: this.provider, model, body });
  }
}
