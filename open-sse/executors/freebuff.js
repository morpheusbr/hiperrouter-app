import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

// Buffy system marker required to pass the upstream anti-abuse filter
export const BUFFY_SYSTEM_MARKER =
  "You are Buffy, the coding agent behind Codebuff. You help users with software engineering tasks: fixing bugs, adding functionality, refactoring, and explaining code.\n\n# Freebuff Meta-information\nYou are the AI agent behind Freebuff, a tool where users can chat with you to code with AI for free. See freebuff.com for more information about the product.";

// Model canonical admission mapping
const CANONICAL_ADMISSION_MODELS = {
  "deepseek-v4-flash": "deepseek/deepseek-v4-flash",
  "deepseek/deepseek-v4-flash": "deepseek/deepseek-v4-flash",
  "glm-5.3-flash": "z-ai/glm-5.3-flash",
  "z-ai/glm-5.3-flash": "z-ai/glm-5.3-flash",
  "mimo-v2.6": "mimo/mimo-v2.6",
  "mimo/mimo-v2.6": "mimo/mimo-v2.6",
  "mimo-v2.5": "mimo/mimo-v2.5",
  "mimo/mimo-v2.5": "mimo/mimo-v2.5",
  "solar-pro4": "upstage/solar-pro4",
  "upstage/solar-pro4": "upstage/solar-pro4",
  "solar-mini4": "upstage/solar-mini4",
  "upstage/solar-mini4": "upstage/solar-mini4",
  "gpt-6-luna": "openai/gpt-6-luna",
  "openai/gpt-6-luna": "openai/gpt-6-luna",
  "space-bunny-alpha": "stealth/space-bunny-alpha",
  "stealth/space-bunny-alpha": "stealth/space-bunny-alpha",
  "ling-3.1-flash": "fbc/ling-3.1-flash",
  "fbc/ling-3.1-flash": "fbc/ling-3.1-flash",
  "laguna-s-2.1": "fbc/laguna-s-2.1",
  "fbc/laguna-s-2.1": "fbc/laguna-s-2.1",
};

// In-memory catalog cache
let cachedCatalog = null;
let catalogExpiresAt = 0;
const CATALOG_TTL_MS = 15 * 60 * 1000;

// In-memory active session cache
let activeSession = null;

function loadCredentials(credentials) {
  // If explicitly provided via provider connection custom data
  if (credentials?.providerSpecificData?.authToken) {
    return {
      authToken: credentials.providerSpecificData.authToken,
      id: credentials.providerSpecificData?.userId || null,
    };
  }

  // 1. Prioritize reading from installed Freebuff CLI credentials on disk
  const searchDirs = [
    path.join(os.homedir(), ".config", "manicode"),
    "/root/.config/manicode",
  ];

  for (const dir of searchDirs) {
    const credPath = path.join(dir, "credentials.json");
    if (fs.existsSync(credPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(credPath, "utf8"));
        const defaultProfile = raw.default || Object.values(raw)[0];
        if (defaultProfile?.authToken) {
          return {
            authToken: defaultProfile.authToken,
            id: defaultProfile.id || null,
          };
        }
      } catch {
        // ignore error and try next path
      }
    }
  }

  // 2. Fall back to custom API key if user configured one specifically for Freebuff
  if (credentials?.apiKey && credentials.apiKey.includes("-")) {
    return {
      authToken: credentials.apiKey,
      id: credentials.providerSpecificData?.userId || null,
    };
  }
  if (credentials?.accessToken) {
    return {
      authToken: credentials.accessToken,
      id: credentials.providerSpecificData?.userId || null,
    };
  }

  throw new Error("Freebuff credentials not found. Run 'freebuff login' or place credentials.json in ~/.config/manicode/");
}

function loadDeviceKey(credentials) {
  if (credentials?.providerSpecificData?.privateKey && credentials?.providerSpecificData?.keyId) {
    const privBuf = Buffer.from(credentials.providerSpecificData.privateKey.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const privKey = crypto.createPrivateKey({ key: privBuf, format: "der", type: "pkcs8" });
    return {
      privKey,
      keyId: credentials.providerSpecificData.keyId,
    };
  }

  const searchDirs = [
    path.join(os.homedir(), ".config", "manicode"),
    "/root/.config/manicode",
  ];

  for (const dir of searchDirs) {
    const keyPath = path.join(dir, "device-key.json");
    if (fs.existsSync(keyPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(keyPath, "utf8"));
        if (raw.privateKey && raw.registrations) {
          const regKey = Object.keys(raw.registrations).find(k => k.includes("codebuff.com"));
          const keyId = raw.registrations[regKey] || Object.values(raw.registrations)[0];
          const privBuf = Buffer.from(raw.privateKey.replace(/-/g, "+").replace(/_/g, "/"), "base64");
          const privKey = crypto.createPrivateKey({ key: privBuf, format: "der", type: "pkcs8" });
          return { privKey, keyId };
        }
      } catch {
        // ignore error and try next path
      }
    }
  }

  throw new Error("Freebuff device key not found. Please ensure ~/.config/manicode/device-key.json exists.");
}

async function getOrFetchCatalog(authToken, userId, deviceKey, proxyOptions = null) {
  if (cachedCatalog && Date.now() < catalogExpiresAt) {
    return cachedCatalog;
  }

  const emptySha256 = crypto.createHash("sha256").update("").digest("hex");
  const catTs = String(Date.now());
  const catMsg = Buffer.from(["freebuff-device-v1", "GET", "/api/v1/freebuff/models", catTs, emptySha256, ""].join("\n"), "utf8");
  const catSig = crypto.sign(null, catMsg, deviceKey.privKey).toString("base64url");

  const headers = {
    "Authorization": `Bearer ${authToken}`,
    "x-freebuff-acting-user-id": userId || "",
    "x-freebuff-catalog-protocol": "1",
    "x-freebuff-client": "cli",
    "x-freebuff-device-key": deviceKey.keyId,
    "x-freebuff-device-sig": catSig,
    "x-freebuff-device-ts": catTs,
    "User-Agent": "Bun/1.3.14",
  };

  const res = await proxyAwareFetch("https://www.codebuff.com/api/v1/freebuff/models", {
    method: "GET",
    headers,
  }, proxyOptions);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Freebuff catalog (${res.status}): ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data?.fetchId || !Array.isArray(data?.rows)) {
    throw new Error("Freebuff catalog response missing fetchId or rows");
  }

  cachedCatalog = data;
  catalogExpiresAt = Date.now() + CATALOG_TTL_MS;
  return cachedCatalog;
}

function normalizeForSearch(str) {
  return (str || "")
    .replace(/^(fb|freebuff)\//, "")
    .replace(/^[^/]+\//, "")
    .replace(/(\D)(\d)/g, "$1 $2")
    .replace(/(\d)(\D)/g, "$1 $2")
    .replace(/[-._/]/g, " ")
    .toLowerCase();
}

function resolveCatalogModel(catalog, requestedModel) {
  const normReq = (requestedModel || "").toLowerCase().trim();
  const canonicalAdmissionId = CANONICAL_ADMISSION_MODELS[normReq] || requestedModel;

  // 1. Direct handle match
  let found = catalog.rows.find(r => r.handle === requestedModel);
  if (found) return { row: found, admissionModel: canonicalAdmissionId };

  // 2. Key match
  found = catalog.rows.find(r => r.key === requestedModel || r.id === requestedModel);
  if (found) return { row: found, admissionModel: canonicalAdmissionId };

  // 3. Normalized search match
  const searchNorm = normalizeForSearch(requestedModel);
  const tokens = searchNorm.split(" ").filter(t => t.length > 0 && t !== "v");

  if (tokens.length > 0) {
    found = catalog.rows.find(r => {
      const dispNorm = normalizeForSearch(r.displayName || "");
      return tokens.every(tok => dispNorm.includes(tok));
    });
    if (found) return { row: found, admissionModel: canonicalAdmissionId };
  }

  // 4. Substring fallback on displayName
  const cleanReq = normReq.replace(/^(fb|freebuff)\//, "").replace(/\//g, " ").replace(/-/g, " ");
  found = catalog.rows.find(r => {
    const disp = (r.displayName || "").toLowerCase();
    return disp.includes(cleanReq) || cleanReq.includes(disp);
  });
  if (found) return { row: found, admissionModel: canonicalAdmissionId };

  // 5. Default fallback to DeepSeek V4.1 Flash
  found = catalog.rows.find(r => r.displayName?.includes("DeepSeek V4.1 Flash")) || catalog.rows[0];
  return { row: found, admissionModel: canonicalAdmissionId || "deepseek/deepseek-v4-flash" };
}

async function admitSession(authToken, admissionModel, proxyOptions = null, forceTakeover = false) {
  if (!forceTakeover && activeSession && activeSession.model === admissionModel && Date.now() < activeSession.expiresAt - 60000) {
    return activeSession.instanceId;
  }

  const rawUuid = crypto.randomUUID();
  const cliInstanceId = `cli:${rawUuid}`;

  const headers = {
    "Authorization": `Bearer ${authToken}`,
    "x-fb-timezone": "America/Sao_Paulo",
    "x-freebuff-first-tab-discount": "0",
    "x-freebuff-multi-session": "1",
    "x-freebuff-purchase-continuity": "1",
    "x-freebuff-desktop-attempt-id": rawUuid,
    "x-freebuff-instance-id": cliInstanceId,
    "x-freebuff-model": admissionModel,
    "x-freebuff-wallet-spend-limit": "session",
    "Content-Type": "application/json",
  };

  let res = await proxyAwareFetch("https://www.codebuff.com/api/v1/freebuff/session/admission", {
    method: "POST",
    headers,
  }, proxyOptions);

  let data = await res.json().catch(() => ({}));

  if (res.status === 409 && data?.currentInstanceId) {
    headers["x-freebuff-takeover-instance-id"] = data.currentInstanceId;
    res = await proxyAwareFetch("https://www.codebuff.com/api/v1/freebuff/session/admission", {
      method: "POST",
      headers,
    }, proxyOptions);
    data = await res.json().catch(() => ({}));
  }

  if (!res.ok && res.status !== 200) {
    const detail = data?.availableHours || data?.message || data?.error || data?.status || `HTTP ${res.status}`;
    throw new Error(`Freebuff admission error (${res.status}): ${detail}`);
  }

  const admittedInstanceId = data.instanceId || cliInstanceId;
  const remainingMs = typeof data.remainingMs === "number" ? data.remainingMs : 3600000;

  activeSession = {
    instanceId: admittedInstanceId,
    model: admissionModel,
    expiresAt: Date.now() + remainingMs,
  };

  return admittedInstanceId;
}

async function startAgentRun(authToken, userId, proxyOptions = null) {
  const res = await proxyAwareFetch("https://www.codebuff.com/api/v1/agent-runs", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${authToken}`,
      "x-freebuff-acting-user-id": userId || "",
      "Content-Type": "application/json",
      "User-Agent": "Bun/1.3.14",
    },
    body: JSON.stringify({
      action: "START",
      agentId: "base3-free-catalog",
      ancestorRunIds: [],
    }),
  }, proxyOptions);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Freebuff agent-run failed (${res.status}): ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.runId || crypto.randomUUID();
}

function injectBuffyMarker(body) {
  const messages = Array.isArray(body?.messages) ? [...body.messages] : [];
  const hasMarker = messages.some(
    m => m?.role === "system" && typeof m.content === "string" && (m.content.includes("You are Buffy") || m.content.includes("Freebuff Meta-information"))
  );

  if (!hasMarker) {
    messages.unshift({ role: "system", content: BUFFY_SYSTEM_MARKER });
  }

  return { ...body, messages };
}

export class FreebuffExecutor extends BaseExecutor {
  constructor() {
    super("freebuff", PROVIDERS["freebuff"] || { baseUrl: "https://www.codebuff.com/api/v1/chat/completions" });
  }

  buildUrl() {
    return "https://www.codebuff.com/api/v1/chat/completions";
  }

  async execute({ model, body, stream, credentials, signal, log, proxyOptions = null }) {
    const creds = loadCredentials(credentials);
    const devKey = loadDeviceKey(credentials);

    const catalog = await getOrFetchCatalog(creds.authToken, creds.id, devKey, proxyOptions);
    const { row: modelRow, admissionModel } = resolveCatalogModel(catalog, model);

    if (!modelRow?.handle) {
      throw new Error(`Could not find a valid handle for model '${model}' in Freebuff catalog`);
    }

    let instanceId;
    try {
      instanceId = await admitSession(creds.authToken, admissionModel, proxyOptions);
    } catch (err) {
      log?.error?.("AUTH", `Freebuff admission failed: ${err.message}`);
      throw err;
    }

    let runId;
    try {
      runId = await startAgentRun(creds.authToken, creds.id, proxyOptions);
    } catch (err) {
      log?.error?.("AUTH", `Freebuff agent-run failed: ${err.message}`);
      throw err;
    }

    const markedBody = injectBuffyMarker(body);
    const chatBody = {
      model: modelRow.handle,
      codebuff_metadata: {
        freebuff_instance_id: instanceId,
        freebuff_multi_session: "1",
        surface: "cli",
        freebuff_client_env: "v1;in=1;out=1;tp=none;term=1;ct=0;sz=0x0;ci=0;ssh=1;l=1;p=python;g=other;osc=0;tzo=0;px=none;tls=1;ca=0",
        freebuff_input_profile: "v1;tc=6;ke=6;mc=0;pc=0;pe=0;ms=498;cps=6",
        trace_session_id: crypto.randomUUID(),
        repo_snapshot: '{"gitAvailable":true,"repositoryVisibility":"unknown","fileCount":2901,"fileCountIsLowerBound":false,"testFileCount":386,"commitCount":1078,"historyIsShallow":false,"historyScanTruncated":false,"commitDatePercentiles":{"p0":"2026-01-05","p25":"2026-03-12","p50":"2026-05-07","p75":"2026-06-20","p100":"2026-10-05"},"mergedPullRequestCount":256,"humanContributorCount":233,"botContributorCount":1,"changedFileCount":13,"changedFileScanTruncated":false}',
        llm_step_number: "1",
        run_id: runId,
        client_id: crypto.randomBytes(6).toString("hex"),
        cost_mode: "free",
      },
      provider: { data_collection: "deny" },
      messages: markedBody.messages,
      stream: stream !== false,
      ...(markedBody.tools ? { tools: markedBody.tools } : {}),
      ...(markedBody.tool_choice ? { tool_choice: markedBody.tool_choice } : {}),
      ...(typeof markedBody.temperature === "number" ? { temperature: markedBody.temperature } : {}),
    };

    const url = this.buildUrl();
    const bodyStr = JSON.stringify(chatBody);
    const bodySha256 = crypto.createHash("sha256").update(bodyStr).digest("hex");
    const chatTs = String(Date.now());
    const chatMsg = Buffer.from(["freebuff-device-v1", "POST", "/api/v1/chat/completions", chatTs, bodySha256, catalog.fetchId].join("\n"), "utf8");
    const chatSig = crypto.sign(null, chatMsg, devKey.privKey).toString("base64url");

    const headers = {
      "Authorization": `Bearer ${creds.authToken}`,
      "Content-Type": "application/json",
      "User-Agent": "ai-sdk/openai-compatible/0.0.0-test/codebuff ai-sdk/provider-utils/3.0.25 runtime/browser",
      "x-freebuff-acting-user-id": creds.id || "",
      "x-freebuff-catalog-fetch": catalog.fetchId,
      "x-freebuff-device-key": devKey.keyId,
      "x-freebuff-device-sig": chatSig,
      "x-freebuff-device-ts": chatTs,
      "Accept": stream !== false ? "text/event-stream" : "application/json",
    };

    log?.debug?.("FETCH", `FREEBUFF → ${url} | model=${modelRow.displayName} | body=${bodyStr.length}B`);

    let response = await proxyAwareFetch(url, {
      method: "POST",
      headers,
      body: bodyStr,
      signal,
    }, proxyOptions);

    if (response.status === 409 || response.status === 403) {
      log?.debug?.("AUTH", `Freebuff returned ${response.status}, retrying with session re-admission...`);
      activeSession = null;
      instanceId = await admitSession(creds.authToken, admissionModel, proxyOptions, true);
      chatBody.codebuff_metadata.freebuff_instance_id = instanceId;

      const retryBodyStr = JSON.stringify(chatBody);
      const retrySha = crypto.createHash("sha256").update(retryBodyStr).digest("hex");
      const retryTs = String(Date.now());
      const retryMsg = Buffer.from(["freebuff-device-v1", "POST", "/api/v1/chat/completions", retryTs, retrySha, catalog.fetchId].join("\n"), "utf8");
      const retrySig = crypto.sign(null, retryMsg, devKey.privKey).toString("base64url");

      headers["x-freebuff-device-sig"] = retrySig;
      headers["x-freebuff-device-ts"] = retryTs;

      response = await proxyAwareFetch(url, {
        method: "POST",
        headers,
        body: retryBodyStr,
        signal,
      }, proxyOptions);
    }

    return { response, url, headers, transformedBody: chatBody };
  }
}

export const __test__ = {
  loadCredentials,
  loadDeviceKey,
  getOrFetchCatalog,
  resolveCatalogModel,
  admitSession,
  injectBuffyMarker,
};

export default FreebuffExecutor;
