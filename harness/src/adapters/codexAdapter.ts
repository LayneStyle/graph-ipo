import { PlatformAdapter, PlatformCapabilities, PlatformId } from "./types.js";
import { IPOCanvas, CanvasProgressSummary } from "../types.js";

export class CodexAdapter implements PlatformAdapter {
  platformId: PlatformId = "CODEX";
  displayName = "Codex / OpenCode (OpenAI Platform)";

  capabilities: PlatformCapabilities = {
    supportsInteractiveModals: false,
    supportsSlashCommands: false,
    supportsSubagents: false,
    supportsArtifacts: false,
    preferredInterviewMethod: "structured_json_decision_table"
  };

  formatLayer3Banner(canvas: IPOCanvas, summary: CanvasProgressSummary): string {
    const barLength = 20;
    const filled = Math.round((summary.completion_percentage / 100) * barLength);
    const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
    
    return (
      `\n\n` +
      `==================================================\n` +
      `[SYSTEM HARNESS STATE ENFORCEMENT - Codex / OpenCode Mode]\n` +
      `Active Platform: ${this.displayName}\n` +
      `Project Type: ${summary.project_type}\n` +
      `Progress: ${bar} ${summary.completion_percentage}%\n` +
      `Nodes: ${summary.by_status.IMPLEMENTED} Implemented | ${summary.by_status.READY_FOR_IMPLEMENTATION} Ready | ${summary.by_status.DESIGN} Design | ${summary.by_status.NEEDS_REVISION + summary.by_status.REWORK} Revision\n` +
      `--------------------------------------------------\n` +
      `Codex Native Features Active:\n` +
      ` - JSON Schema Enforcement: Validate all node outputs against canvas.schema.json.\n` +
      ` - Pydantic DTO Generators: Map target_symbols directly to schema classes.\n` +
      `==================================================`
    );
  }

  formatInterviewPrompt(nodeTitle: string, question: string, options: string[]): string {
    const jsonTable = JSON.stringify({ node: nodeTitle, question, options }, null, 2);
    return (
      `[CODEX / OPENCODE DISCOVERY TABLE]\n` +
      `\`\`\`json\n${jsonTable}\n\`\`\`\n` +
      `Please select a choice key.`
    );
  }
}
