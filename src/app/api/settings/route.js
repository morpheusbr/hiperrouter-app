import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { applyOutboundProxyEnv } from "@/lib/network/outboundProxy";
import { resetComboRotation } from "open-sse/services/combo.js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { withBodyValidation } from "@/lib/api/withValidation";
import { safeUrlSchema } from "@/shared/validators/zodSchemas";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SETTINGS_RESPONSE_HEADERS = {
  "Cache-Control": "no-store"
};

// Secrets must never be mass-assigned from request body (CWE-915)
const PROTECTED_SETTING_KEYS = ["password", "mitmSudoEncrypted"];

const ALLOWED_STATIC_KEYS = new Set([
  "newPassword", "currentPassword",
  "oidcClientSecret", "oidcIssuerUrl", "oidcClientId", "oidcScopes", "oidcLoginLabel",
  "outboundProxyEnabled", "outboundProxyUrl", "proxyUrl", "outboundNoProxy",
  "comboStrategy", "fallbackStrategy", "comboStickyRoundRobinLimit", "stickyRoundRobinLimit",
  "comboStrategies", "providerStrategies", "providerThinking", "quotaVisibility", "providerLimits",
  "claudeAutoPing", "codexAutoPing", "openaiAutoPing", "ccFilterNaming",
  "cloudEnabled", "tunnelEnabled", "tunnelUrl", "tunnelProvider", "tailscaleEnabled", "tailscaleUrl", "tunnelDashboardAccess",
  "requireLogin", "requireApiKey", "authMode",
  "enableObservability", "observabilityMaxRecords", "observabilityBatchSize", "observabilityFlushIntervalMs", "observabilityMaxJsonSize",
  "mitmRouterBaseUrl", "dnsToolEnabled", "rtkEnabled",
  "headroomEnabled", "headroomUrl", "headroomCompressUserMessages",
  "cavemanEnabled", "cavemanLevel", "ponytailEnabled", "ponytailLevel",
  "pxpipeEnabled", "pxpipeAutoInstall", "pxpipeMinChars", "pxpipeTimeoutMs"
]);

function isAllowedSettingKey(key) {
  if (ALLOWED_STATIC_KEYS.has(key)) return true;
  if (key.startsWith("providerLimits_") || key.endsWith("AutoPing")) return true;
  return false;
}

const SettingsPatchSchema = z.record(z.any()).superRefine((obj, ctx) => {
  for (const key of Object.keys(obj)) {
    if (PROTECTED_SETTING_KEYS.includes(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Setting '${key}' cannot be modified directly via settings API`,
        path: [key],
      });
    } else if (!isAllowedSettingKey(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown or disallowed setting: '${key}'`,
        path: [key],
      });
    }
  }

  // Strict URL safety checks for proxy and oidc endpoints
  for (const urlKey of ["outboundProxyUrl", "proxyUrl", "oidcIssuerUrl"]) {
    const val = obj[urlKey];
    if (typeof val === "string" && val.trim().length > 0) {
      const res = safeUrlSchema.safeParse(val);
      if (!res.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid ${urlKey}: ${res.error.issues[0]?.message || "URL rejected"}`,
          path: [urlKey],
        });
      }
    }
  }
});


export async function GET() {
  try {
    const settings = await getSettings();
    const { password, oidcClientSecret, ...safeSettings } = settings;
    safeSettings.oidcConfigured = !!(safeSettings.oidcIssuerUrl && safeSettings.oidcClientId && oidcClientSecret);
    
    const enableRequestLogs = process.env.ENABLE_REQUEST_LOGS === "true";
    const enableTranslator = process.env.ENABLE_TRANSLATOR === "true";
    
    return NextResponse.json({ 
      ...safeSettings, 
      enableRequestLogs,
      enableTranslator,
      hasPassword: !!password
    }, { headers: SETTINGS_RESPONSE_HEADERS });
  } catch (error) {
    console.log("Error getting settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const PATCH = withBodyValidation(SettingsPatchSchema, async (request, body) => {
  try {
    // Strip protected secrets before any internal handling sets them (since schema uses passthrough)
    for (const key of PROTECTED_SETTING_KEYS) delete body[key];

    // If updating password, hash it
    if (body.newPassword) {
      const settings = await getSettings();
      const currentHash = settings.password;

      // Verify current password if it exists
      if (currentHash) {
        if (!body.currentPassword) {
          return NextResponse.json({ error: "Current password required" }, { status: 400 });
        }
        const isValid = await bcrypt.compare(body.currentPassword, currentHash);
        if (!isValid) {
          return NextResponse.json({ error: "Invalid current password" }, { status: 401 });
        }
      } else if (process.env.INITIAL_PASSWORD) {
        const a = Buffer.from(body.currentPassword || "");
        const b = Buffer.from(process.env.INITIAL_PASSWORD);
        const isValid = a.length === b.length && crypto.timingSafeEqual(a, b);
        if (!isValid) {
          return NextResponse.json({ error: "Invalid current password" }, { status: 401 });
        }
      }

      const salt = await bcrypt.genSalt(10);
      body.password = await bcrypt.hash(body.newPassword, salt);
      delete body.newPassword;
      delete body.currentPassword;
    }

    if (Object.prototype.hasOwnProperty.call(body, "oidcClientSecret")) {
      if (!body.oidcClientSecret || !String(body.oidcClientSecret).trim()) {
        delete body.oidcClientSecret;
      }
    }

    const settings = await updateSettings(body);

    // Apply outbound proxy settings immediately (no restart required)
    if (
      Object.prototype.hasOwnProperty.call(body, "outboundProxyEnabled") ||
      Object.prototype.hasOwnProperty.call(body, "outboundProxyUrl") ||
      Object.prototype.hasOwnProperty.call(body, "outboundNoProxy")
    ) {
      applyOutboundProxyEnv(settings);
    }

    // Invalidate combo rotation state when strategy settings change
    if (
      Object.prototype.hasOwnProperty.call(body, "comboStrategy") ||
      Object.prototype.hasOwnProperty.call(body, "comboStickyRoundRobinLimit") ||
      Object.prototype.hasOwnProperty.call(body, "comboStrategies")
    ) {
      resetComboRotation();
    }

    if (
      Object.prototype.hasOwnProperty.call(body, "claudeAutoPing") ||
      Object.prototype.hasOwnProperty.call(body, "codexAutoPing")
    ) {
      import("@/shared/services/quotaAutoPing")
        .then(({ configureQuotaAutoPing }) => {
          configureQuotaAutoPing(settings);
        })
        .catch((error) => console.warn("[AutoPing] settings update failed:", error.message));
    }

    const { password, oidcClientSecret, ...safeSettings } = settings;
    safeSettings.oidcConfigured = !!(safeSettings.oidcIssuerUrl && safeSettings.oidcClientId && oidcClientSecret);
    return NextResponse.json(safeSettings, { headers: SETTINGS_RESPONSE_HEADERS });
  } catch (error) {
    console.log("Error updating settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
