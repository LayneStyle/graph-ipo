import { IPOCanvas, IPONode, PhaseType, CanvasProgressSummary, NodeStatusType } from "./types.js";
import { getActiveAdapter } from "./adapters/index.js";

export function evaluateNodePhase(node: IPONode): PhaseType {
  if (node.status === "NEEDS_REVISION" || node.status === "REWORK") {
    return "NODE_DRILLDOWN";
  }

  if (node.status === "READY_FOR_IMPLEMENTATION" || node.status === "IMPLEMENTED") {
    return "IMPLEMENTATION";
  }

  const hasInputs = node.inputs && node.inputs.length > 0;
  const hasOutputs = node.outputs && node.outputs.length > 0;
  const hasTargetSymbols = node.target_symbols && node.target_symbols.length > 0;
  const hasProcess = node.process_execution_plan && node.process_execution_plan.length > 0;

  if (!hasInputs && !hasOutputs && !hasTargetSymbols) {
    return "MACRO_DESIGN";
  }

  if (hasInputs && !hasProcess) {
    return "NODE_DRILLDOWN";
  }

  if (hasInputs && hasOutputs && hasTargetSymbols && hasProcess) {
    return "SPECIFIED";
  }

  return "NODE_DRILLDOWN";
}

export function validateCanvasState(canvas: IPOCanvas): CanvasProgressSummary {
  const issues: string[] = [];

  if (!canvas.nodes || canvas.nodes.length === 0) {
    issues.push("Canvas contains zero nodes. Add initial IPO nodes using create_ipo_node.");
  }

  const by_status: Record<NodeStatusType, number> = {
    DESIGN: 0,
    READY_FOR_IMPLEMENTATION: 0,
    IMPLEMENTED: 0,
    NEEDS_REVISION: 0,
    REWORK: 0
  };

  const by_phase: Record<PhaseType, number> = {
    MACRO_DESIGN: 0,
    NODE_DRILLDOWN: 0,
    SPECIFIED: 0,
    IMPLEMENTATION: 0,
    AUDIT: 0
  };

  canvas.nodes.forEach((node) => {
    if (!node.id || node.id.trim() === "") {
      issues.push(`Node missing valid id.`);
    }
    if (!node.title || node.title.trim() === "") {
      issues.push(`Node '${node.id}' missing valid title.`);
    }
    if (!node.inputs || node.inputs.length === 0) {
      issues.push(`Node '${node.id}' (${node.title}) has missing or empty inputs.`);
    }
    if (!node.target_symbols || node.target_symbols.length === 0) {
      issues.push(`Node '${node.id}' (${node.title}) has missing or empty target_symbols.`);
    }
    if (!node.process_execution_plan || node.process_execution_plan.length === 0) {
      issues.push(`Node '${node.id}' (${node.title}) has missing or empty process_execution_plan/pseudocode.`);
    }
    if (!node.outputs || node.outputs.length === 0) {
      issues.push(`Node '${node.id}' (${node.title}) has missing or empty outputs.`);
    }

    if (by_status[node.status] !== undefined) {
      by_status[node.status]++;
    }

    const phase = evaluateNodePhase(node);
    if (by_phase[phase] !== undefined) {
      by_phase[phase]++;
    }
  });

  const total_nodes = canvas.nodes.length;
  const completion_percentage = total_nodes > 0 ? Math.round((by_status.IMPLEMENTED / total_nodes) * 100) : 0;

  return {
    total_nodes,
    by_status,
    by_phase,
    completion_percentage,
    code_language: canvas.code_language || "EN",
    project_type: canvas.project_type || "unknown",
    project_description: canvas.project_description || "",
    user_experience_level: canvas.user_experience_level || "intermediate",
    issues
  };
}

export function buildStateBanner(canvas: IPOCanvas, clientName?: string): string {
  const summary = validateCanvasState(canvas);
  const adapter = getActiveAdapter(clientName);
  
  const barLength = 20;
  const filled = Math.round((summary.completion_percentage / 100) * barLength);
  const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

  const defaultBanner = `
═══ GraphIPO Progress ═══
Project: ${summary.project_type} | Language: ${summary.code_language}
Description: ${summary.project_description || 'None'}
Experience Level: ${summary.user_experience_level || 'intermediate'}
Nodes: ${summary.total_nodes} total | ${bar} ${summary.completion_percentage}% complete
✅ ${summary.by_status.IMPLEMENTED} Implemented | 🔵 ${summary.by_status.READY_FOR_IMPLEMENTATION} Ready | 📝 ${summary.by_status.DESIGN} Design | ⚠️ ${summary.by_status.NEEDS_REVISION + summary.by_status.REWORK} Revision
Issues: ${summary.issues.length}
═══════════════════════
`;

  return adapter.formatLayer3Banner(canvas, summary) || defaultBanner;
}
