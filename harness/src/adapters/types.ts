import { IPOCanvas, CanvasProgressSummary } from "../types.js";

export type PlatformId = "ANTIGRAVITY" | "CLAUDE" | "CURSOR" | "CODEX" | "GENERIC";

export interface PlatformCapabilities {
  supportsInteractiveModals: boolean;
  supportsSlashCommands: boolean;
  supportsSubagents: boolean;
  supportsArtifacts: boolean;
  preferredInterviewMethod: string;
}

export interface PlatformAdapter {
  platformId: PlatformId;
  displayName: string;
  capabilities: PlatformCapabilities;
  formatLayer3Banner(canvas: IPOCanvas, summary: CanvasProgressSummary): string;
  formatInterviewPrompt(nodeTitle: string, question: string, options: string[]): string;
}
