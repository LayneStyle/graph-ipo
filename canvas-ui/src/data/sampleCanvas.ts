import { Node, Edge } from '@xyflow/react';

export interface SampleCanvasData {
  title: string;
  project_description: string;
  project_type: string;
  user_experience_level: 'beginner' | 'intermediate' | 'advanced';
  nodes: Node[];
  edges: Edge[];
}

// Empty initial state — real data is loaded from the REST API
export const SAMPLE_DATA: SampleCanvasData = {
  title: 'GraphIPO',
  project_description: '',
  project_type: '',
  user_experience_level: 'intermediate',
  nodes: [],
  edges: [],
};
