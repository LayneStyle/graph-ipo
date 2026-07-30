import { PlatformAdapter, PlatformCapabilities, PlatformId } from "./types.js";
import { IPOCanvas, CanvasProgressSummary } from "../types.js";

export class CursorAdapter implements PlatformAdapter {
  platformId: PlatformId = "CURSOR";
  displayName = "Cursor / Windsurf (VS Code Platform)";

  capabilities: PlatformCapabilities = {
    supportsInteractiveModals: false,
    supportsSlashCommands: false,
    supportsSubagents: false,
    supportsArtifacts: false,
    preferredInterviewMethod: "composer_markdown_checklist"
  };

  formatLayer3Banner(canvas: IPOCanvas, summary: CanvasProgressSummary): string {
    const barLength = 20;
    const filled = Math.round((summary.completion_percentage / 100) * barLength);
    const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
    
    return (
      `\n\n` +
      `==================================================\n` +
      `[SYSTEM HARNESS STATE ENFORCEMENT - Cursor / VS Code Mode]\n` +
      `Active Platform: ${this.displayName}\n` +
      `Project Type: ${summary.project_type}\n` +
      `Progress: ${bar} ${summary.completion_percentage}%\n` +
      `Nodes: ${summary.by_status.IMPLEMENTED} Implemented | ${summary.by_status.READY_FOR_IMPLEMENTATION} Ready | ${summary.by_status.DESIGN} Design | ${summary.by_status.NEEDS_REVISION + summary.by_status.REWORK} Revision\n` +
      `--------------------------------------------------\n` +
      `Cursor Native Features Active:\n` +
      ` - Composer: Use multi-file editing capabilities matching node target_symbols.\n` +
      ` - Status Bar: Synchronize node state changes with local .cursor/mcp.json workspace.\n` +
      `==================================================`
    );
  }

  formatInterviewPrompt(nodeTitle: string, question: string, options: string[]): string {
    const formattedOptions = options.map((opt) => `- [ ] ${opt}`).join("\n");
    return (
      `[CURSOR COMPOSER DISCOVERY PROMPT]\n` +
      `### Target Node: ${nodeTitle}\n` +
      `**Question:** ${question}\n\n` +
      `Select an option:\n${formattedOptions}\n`
    );
  }
}
