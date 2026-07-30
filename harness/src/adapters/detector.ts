import { PlatformId } from "./types.js";

export function detectPlatform(clientName?: string): PlatformId {
  const normalizedClient = (clientName || "").toLowerCase();

  // 1. Antigravity Environment Detection
  if (
    normalizedClient.includes("antigravity") ||
    normalizedClient.includes("gemini") ||
    Boolean(process.env.ANTIGRAVITY_WORKSPACE) ||
    Boolean(process.env.GEMINI_CLI)
  ) {
    return "ANTIGRAVITY";
  }

  // 2. Claude Environment Detection
  if (
    normalizedClient.includes("claude") ||
    normalizedClient.includes("anthropic") ||
    Boolean(process.env.CLAUDE_PROJECT_DIR)
  ) {
    return "CLAUDE";
  }

  // 3. Cursor / Windsurf Environment Detection
  if (
    normalizedClient.includes("cursor") ||
    normalizedClient.includes("windsurf") ||
    Boolean(process.env.CURSOR_PROJECT_DIR)
  ) {
    return "CURSOR";
  }

  // 4. Codex / OpenCode Environment Detection
  if (
    normalizedClient.includes("codex") ||
    normalizedClient.includes("opencode") ||
    Boolean(process.env.CODEX_CLI) ||
    Boolean(process.env.OPENCODE_ENV)
  ) {
    return "CODEX";
  }

  return "ANTIGRAVITY"; // Default to rich Antigravity mode if ambiguous
}
