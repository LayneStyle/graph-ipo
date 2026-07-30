export type NodeStatus = 'DESIGN' | 'READY_FOR_IMPLEMENTATION' | 'IMPLEMENTED' | 'NEEDS_REVISION' | 'REWORK';

export type LifecyclePhase = 'MACRO_DESIGN' | 'NODE_DRILLDOWN' | 'SPECIFIED' | 'IMPLEMENTATION' | 'AUDIT';

export type CodeLanguage = 'EN' | 'ES' | 'CUSTOM';

export interface IPOInput {
  id?: string;
  name: string;
  type: string;
  source?: string;
  description?: string;
  required?: boolean;
}

export interface IPOStep {
  id: string;
  step: string;
  mode: 'sequential' | 'parallel';
  description?: string;
}

export interface IPOOutput {
  id?: string;
  name: string;
  type?: string;
  target?: string;
  rpc_or_event?: string;
  description?: string;
}

export interface IPONodeData extends Record<string, unknown> {
  id: string;
  title: string;
  category: string;
  lifecycle_phase: LifecyclePhase;
  status: NodeStatus;
  target_symbols: string[];
  inputs: IPOInput[];
  process_execution_plan: IPOStep[];
  outputs: IPOOutput[];
  pseudocode: string;
  assigned_to?: string;
  notes?: string;
  description?: string;
}

export interface GraphIPOCanvasState {
  version: string;
  project_type?: string;
  project_description?: string;
  user_experience_level?: 'beginner' | 'intermediate' | 'advanced';
  code_language?: CodeLanguage;
  nodes: IPONodeData[];
  edges?: { id: string; source: string; target: string; label?: string; type?: string }[];
}

export interface ProgressSummary {
  total: number;
  implemented: number;
  design: number;
  ready: number;
  revision: number;
  rework: number;
  completionPercentage: number;
}
