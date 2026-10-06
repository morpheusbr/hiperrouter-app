import { z } from "zod";
import { URL } from "url";
import { isBlockedHost } from "../utils/ssrfGuard.js";

// Utility to check if a hostname is an internal/private IP, localhost or cloud metadata
export function isInternalHost(hostname) {
  if (!hostname) return false;
  return isBlockedHost(hostname);
}

/**
 * Zod schema for a URL that specifically blocks Server-Side Request Forgery (SSRF)
 * by rejecting local/private network hosts.
 */
export const safeUrlSchema = z.string().url().refine(
  (val) => {
    try {
      const url = new URL(val);
      return !isInternalHost(url.hostname);
    } catch {
      return false; // Should not happen due to .url()
    }
  },
  { message: "URL cannot point to a local or private network address (SSRF Protection)" }
);

// Generic Reusable Schemas
export const dbIdSchema = z.string().min(1, "ID is required").max(100);
