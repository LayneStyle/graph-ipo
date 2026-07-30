import { PlatformAdapter, PlatformCapabilities, PlatformId } from "./types.js";
import { IPOCanvas, CanvasProgressSummary } from "../types.js";

export class AntigravityAdapter implements PlatformAdapter {
  platformId: PlatformId = "ANTIGRAVITY";
  displayName = "Google Antigravity (IDE 2.0 / CLI)";

  capabilities: PlatformCapabilities = {
    supportsInteractiveModals: true,
    supportsSlashCommands: true,
    supportsSubagents: true,
    supportsArtifacts: true,
    preferredInterviewMethod: "ask_question_modal"
  };

  formatLayer3Banner(canvas: IPOCanvas, summary: CanvasProgressSummary): string {
    const codeLang = summary.code_language || "EN";
    const barLength = 20;
    const filled = Math.round((summary.completion_percentage / 100) * barLength);
    const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
    
    return (
      `\n\n` +
      `==================================================\n` +
      `[SYSTEM HARNESS STATE ENFORCEMENT - Google Antigravity Mode]\n` +
      `Active Platform: ${this.displayName}\n` +
      `Project Type: ${summary.project_type}\n` +
      `Progress: ${bar} ${summary.completion_percentage}%\n` +
      `Nodes: ${summary.by_status.IMPLEMENTED} Implemented | ${summary.by_status.READY_FOR_IMPLEMENTATION} Ready | ${summary.by_status.DESIGN} Design | ${summary.by_status.NEEDS_REVISION + summary.by_status.REWORK} Revision\n` +
      `Code Naming Language: ${codeLang} (All code symbols & pseudocode MUST be in ${codeLang === 'EN' ? 'English' : codeLang === 'ES' ? 'Spanish' : 'Custom'})\n` +
      `--------------------------------------------------\n` +
      `Antigravity Native Features Active:\n` +
      ` - Interactive Modals: Use ask_question to present multiple-choice node choices to user.\n` +
      ` - Slash Commands: Suggest /grill-me for deep node discovery, /teamwork-preview for subagent delegation.\n` +
      ` - Subagents: Invoke define_subagent / invoke_subagent for parallel C# / React code generation.\n` +
      `==================================================`
    );
  }

  formatInterviewPrompt(nodeTitle: string, question: string, options: string[]): string {
    const formattedOptions = options.map((opt, idx) => `  Option ${idx + 1}: ${opt}`).join("\n");
    return (
      `[ANTIGRAVITY INTERACTIVE DISCOVERY PROMPT]\n` +
      `Target Node: "${nodeTitle}"\n` +
      `Question: ${question}\n\n` +
      `Available Choices:\n${formattedOptions}\n\n` +
      `Instruction: Call ask_question tool with questions array containing these options to present interactive UI modal to user.`
    );
  }
}
