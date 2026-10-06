import { OPENAI_BLOCK } from "../schema/index.js";

// Collapse an OpenAI content-part array: text-only parts become a plain string,
// otherwise (multimodal or cache_control) the array is returned as-is.
export function collapseTextParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return parts;
  if (parts.every(p => p && p.type === OPENAI_BLOCK.TEXT && !p.cache_control)) {
    return parts.map(p => p.text || "").join("\n");
  }
  return parts;
}
