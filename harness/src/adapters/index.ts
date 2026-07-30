import { PlatformAdapter, PlatformId } from "./types.js";
import { detectPlatform } from "./detector.js";
import { AntigravityAdapter } from "./antigravityAdapter.js";
import { ClaudeAdapter } from "./claudeAdapter.js";
import { CursorAdapter } from "./cursorAdapter.js";
import { CodexAdapter } from "./codexAdapter.js";

const adapters: Record<PlatformId, PlatformAdapter> = {
  ANTIGRAVITY: new AntigravityAdapter(),
  CLAUDE: new ClaudeAdapter(),
  CURSOR: new CursorAdapter(),
  CODEX: new CodexAdapter(),
  GENERIC: new AntigravityAdapter()
};

export function getActiveAdapter(clientName?: string): PlatformAdapter {
  const platformId = detectPlatform(clientName);
  return adapters[platformId] || adapters.ANTIGRAVITY;
}

export * from "./types.js";
export * from "./detector.js";
