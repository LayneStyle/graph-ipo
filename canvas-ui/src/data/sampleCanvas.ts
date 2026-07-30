import { Node, Edge } from '@xyflow/react';
import { IPONodeData } from '../types/canvas';


const sampleNodes: Node[] = [
  {
    id: 'node-1',
    type: 'ipoNode',
    position: { x: 50, y: 120 },
    data: {
      id: 'node-1',
      title: 'Authentication Component',
      category: 'Security',
      lifecycle_phase: 'IMPLEMENTATION',
      status: 'IMPLEMENTED',
      assigned_to: 'Bob (Backend)',
      notes: 'Remember to check JWT expiration.',
      description: 'Handles user login and token verification.',
      target_symbols: ['AuthController', 'jwt_verify()'],
      inputs: [
        { id: 'in-1', name: 'Token', type: 'string', source: 'Header', required: true }
      ],
      process_execution_plan: [
        { id: 'step-1', step: 'Decode token', mode: 'sequential' }
      ],
      outputs: [
        { id: 'out-1', name: 'UserSession', type: 'Object', target: 'RouteHandler' }
      ],
      pseudocode: `def verify_token(token):\n    return jwt.decode(token)`
    } as IPONodeData
  },
  {
    id: 'node-2',
    type: 'ipoNode',
    position: { x: 500, y: 120 },
    data: {
      id: 'node-2',
      title: 'User Profile Route',
      category: 'API Route',
      lifecycle_phase: 'SPECIFIED',
      status: 'DESIGN',
      assigned_to: 'Alice (Frontend)',
      description: 'Fetches and displays the logged-in user profile.',
      target_symbols: ['ProfileRoute'],
      inputs: [
        { id: 'in-2', name: 'UserSession', type: 'Object', source: 'node-1', required: true }
      ],
      process_execution_plan: [
        { id: 'step-2', step: 'Fetch user from DB', mode: 'sequential' }
      ],
      outputs: [
        { id: 'out-2', name: 'ProfileData', type: 'JSON', target: 'Client' }
      ],
      pseudocode: `def get_profile(user_session):\n    return db.get_user(user_session.id)`
    } as IPONodeData
  }
];

const sampleEdges: Edge[] = [
  {
    id: 'edge-1',
    source: 'node-1',
    sourceHandle: 'out-1',
    target: 'node-2',
    targetHandle: 'in-2',
    animated: true,
    style: { stroke: '#6366F1', strokeWidth: 2 }
  }
];

export interface SampleCanvasData {
  title: string;
  project_description: string;
  project_type: string;
  user_experience_level: 'beginner' | 'intermediate' | 'advanced';
  nodes: Node[];
  edges: Edge[];
}

export const SAMPLE_DATA: SampleCanvasData = {
  title: 'Sample GraphIPO Project',
  project_description: 'A sample project illustrating the updated lifecycle phases.',
  project_type: 'react+typescript',
  user_experience_level: 'intermediate',
  nodes: sampleNodes,
  edges: sampleEdges,
};
