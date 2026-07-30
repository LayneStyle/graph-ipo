import { PlatformAdapter, PlatformCapabilities, PlatformId } from "./types.js";
import { IPOCanvas, CanvasProgressSummary } from "../types.js";

export class ClaudeAdapter implements PlatformAdapter {
  platformId: PlatformId = "CLAUDE";
  displayName = "Anthropic Claude (Code CLI / Desktop)";

  capabilities: PlatformCapabilities = {
    supportsInteractiveModals: false,
    supportsSlashCommands: true,
    supportsSubagents: true,
    supportsArtifacts: true,
    preferredInterviewMethod: "cli_terminal_prompt"
  };

  formatLayer3Banner(canvas: IPOCanvas, summary: CanvasProgressSummary): string {
    const barLength = 20;
    const filled = Math.round((summary.completion_percentage / 100) * barLength);
    const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
    
    return (
      `\n\n` +
      `==================================================\n` +
      `[SYSTEM HARNESS STATE ENFORCEMENT - Claude Code Mode]\n` +
      `Active Platform: ${this.displayName}\n` +
      `Project Type: ${summary.project_type}\n` +
      `Progress: ${bar} ${summary.completion_percentage}%\n` +
      `Nodes: ${summary.by_status.IMPLEMENTED} Implemented | ${summary.by_status.READY_FOR_IMPLEMENTATION} Ready | ${summary.by_status.DESIGN} Design | ${summary.by_status.NEEDS_REVISION + summary.by_status.REWORK} Revision\n` +
      `--------------------------------------------------\n` +
      `Claude Native Features Active:\n` +
      ` - Subagents: Delegate parallel tasks to Claude Code subagent processes.\n` +
      ` - Artifacts: Render design specs into Markdown artifacts.\n` +
      `==================================================`
    );
  }

  formatInterviewPrompt(nodeTitle: string, question: string, options: string[]): string {
    const formattedOptions = options.map((opt, idx) => `[${idx + 1}] ${opt}`).join("\n");
    return (
      `[CLAUDE CODE DISCOVERY PROMPT]\n` +
      `Target Node: "${nodeTitle}"\n` +
      `Question: ${question}\n\n` +
      `${formattedOptions}\n\n` +
      `Please ask the user to select an option in chat.`
    );
  }
}
