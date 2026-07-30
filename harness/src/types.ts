export type PhaseType = "MACRO_DESIGN" | "NODE_DRILLDOWN" | "SPECIFIED" | "IMPLEMENTATION" | "AUDIT";

export type NodeStatusType = "DESIGN" | "READY_FOR_IMPLEMENTATION" | "IMPLEMENTED" | "NEEDS_REVISION" | "REWORK";

export type CodeLanguageType = "EN" | "ES" | "CUSTOM";

export interface IPONode {
  id: string;
  title: string;
  description?: string;
  category: string;
  lifecycle_phase: PhaseType;
  target_symbols: string[];
  inputs: string[];
  process_execution_plan: string[];
  outputs: string[];
  status: NodeStatusType;
  locked_by?: string;
  locked_at?: string;
  assigned_to?: string;
  notes?: string;
}

export interface IPOEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'DATA_FLOW' | 'DEPENDENCY' | 'SEQUENCE' | 'EXCEPTION';
}

export interface IPOCanvas {
  version: string;
  project_type?: string;
  project_description?: string;
  user_experience_level?: 'beginner' | 'intermediate' | 'advanced';
  code_language: CodeLanguageType;
  nodes: IPONode[];
  edges: IPOEdge[];
}

export interface CanvasProgressSummary {
  total_nodes: number;
  by_status: Record<NodeStatusType, number>;
  by_phase: Record<PhaseType, number>;
  completion_percentage: number;
  code_language: CodeLanguageType;
  project_type: string;
  project_description?: string;
  user_experience_level?: 'beginner' | 'intermediate' | 'advanced';
  issues: string[];
}
