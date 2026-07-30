import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';

import { IPONode } from './components/IPONode';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DetailModal } from './components/DetailModal';
import { UMLLegendModal } from './components/UMLLegendModal';
import { AuditOverlay } from './components/AuditOverlay';
import { LifecyclePhase, IPONodeData, GraphIPOCanvasState, CodeLanguage, ProgressSummary } from './types/canvas';
import { SAMPLE_DATA } from './data/sampleCanvas';
import { useWebSocket } from './hooks/useWebSocket';
import { calculateDagreLayout } from './utils/layout';

const AppContent: React.FC = () => {
  const [projectType, setProjectType] = useState<string>(SAMPLE_DATA.project_type);
  const [projectDescription, setProjectDescription] = useState<string | undefined>(SAMPLE_DATA.project_description);
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>('EN');
  const [searchQuery, setSearchQuery] = useState('');

  const initialData = SAMPLE_DATA;
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  const reactFlowInstance = useReactFlow();

  const nodeTypes = useMemo(() => ({ ipoNode: IPONode as any }), []);

  const handleFullState = useCallback((payload: any) => {
    if (payload && Array.isArray(payload.nodes)) {
      const parsedNodes: Node[] = payload.nodes.map((data: IPONodeData) => ({
        id: data.id,
        type: 'ipoNode',
        position: { x: 0, y: 0 },
        data: data,
      }));
      const parsedEdges: Edge[] = Array.isArray(payload.edges) ? payload.edges : [];
      const layoutedNodes = calculateDagreLayout(parsedNodes, parsedEdges);
      setNodes(layoutedNodes);
      setEdges(parsedEdges);
      if (payload.project_type) setProjectType(payload.project_type);
      if (payload.project_description) setProjectDescription(payload.project_description);
    }
  }, [setNodes, setEdges]);

  const { connected: wsConnected, sendMutation } = useWebSocket({
    FULL_STATE: handleFullState,
    STATE_CHANGED: handleFullState,
    NODE_ADDED: (payload) => {
      setNodes((nds) => [...nds, { id: payload.id, type: 'ipoNode', position: { x: 0, y: 0 }, data: payload }]);
    },
    NODE_REMOVED: (payload) => {
      setNodes((nds) => nds.filter((n) => n.id !== payload.id));
    },
    EDGE_ADDED: (payload) => {
      setEdges((eds) => [...eds, payload]);
    },
    EDGE_REMOVED: (payload) => {
      setEdges((eds) => eds.filter((e) => e.id !== payload.id));
    },
    NODE_STATUS_CHANGED: (payload) => {
      setNodes((nds) => nds.map((n) => n.id === payload.id ? { ...n, data: { ...n.data, status: payload.status } } : n));
    }
  });

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#6366F1', strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setIsModalOpen(true);
  }, []);

  const handleSelectNodeFromSidebar = useCallback(
    (nodeId: string) => {
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (targetNode) {
        reactFlowInstance.setCenter(
          targetNode.position.x + 180,
          targetNode.position.y + 150,
          { zoom: 1.1, duration: 800 }
        );
        setSelectedNodeId(nodeId);
        setIsModalOpen(true);
      }
    },
    [nodes, reactFlowInstance]
  );

  const handleAddNode = useCallback(
    (category: string = 'System Component') => {
      const newId = `node-${Date.now()}`;
      
      const newNodeData: IPONodeData = {
        id: newId,
        title: `New ${category}`,
        category: category,
        lifecycle_phase: 'MACRO_DESIGN',
        status: 'DESIGN',
        target_symbols: ['NewSymbol.ts'],
        inputs: [
          { id: `in-${Date.now()}`, name: 'InputData', type: 'object', source: 'SourceNode' },
        ],
        process_execution_plan: [
          { id: `step-${Date.now()}`, step: 'Initialize node state and execute transformation', mode: 'sequential' },
        ],
        outputs: [
          { id: `out-${Date.now()}`, name: 'OutputData', type: 'Event', target: 'TargetNode' },
        ],
        pseudocode: `// Pseudocode definition for ${category}\\nvoid Execute() {\\n    // Implementation details\\n}`,
      };

      const newNode: Node = {
        id: newId,
        type: 'ipoNode',
        position: {
          x: Math.random() * 300 + 200,
          y: Math.random() * 200 + 150,
        },
        data: newNodeData as any,
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(newId);
      setIsModalOpen(true);
      
      if (wsConnected) {
        sendMutation({ type: 'UPDATE_NODE', payload: { node_id: newId, updates: newNodeData } });
      }
    },
    [setNodes, wsConnected, sendMutation]
  );

  const handleSaveNode = useCallback(
    (updatedNodeData: IPONodeData) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === updatedNodeData.id ? { ...n, data: updatedNodeData } : n))
      );
      if (wsConnected) {
        sendMutation({ type: 'UPDATE_NODE', payload: { node_id: updatedNodeData.id, updates: updatedNodeData } });
      }
    },
    [setNodes, wsConnected, sendMutation]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setIsModalOpen(false);
      setSelectedNodeId(null);
      
      if (wsConnected) {
        // Just send a message for removal if supported, or via some API
        sendMutation({ type: 'REMOVE_NODE', payload: { id: nodeId } });
      }
    },
    [setNodes, setEdges, wsConnected, sendMutation]
  );

  const handleResetCanvas = useCallback(() => {
    const layoutedNodes = calculateDagreLayout(SAMPLE_DATA.nodes, SAMPLE_DATA.edges);
    setNodes(layoutedNodes);
    setEdges(SAMPLE_DATA.edges);
    setProjectType(SAMPLE_DATA.project_type);
    setProjectDescription(SAMPLE_DATA.project_description);
  }, [setNodes, setEdges]);

  const handleExportJson = useCallback(() => {
    const canvasState: GraphIPOCanvasState = {
      version: '1.0.0',
      project_type: projectType,
      code_language: codeLanguage,
      nodes: nodes.map((n) => n.data as unknown as IPONodeData),
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(canvasState, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `canvas.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [projectType, codeLanguage, nodes]);

  const handleImportJson = useCallback(
    (jsonContent: string) => {
      try {
        const parsed = JSON.parse(jsonContent) as Partial<GraphIPOCanvasState> & { nodes?: any[] };
        if (!parsed || !Array.isArray(parsed.nodes)) {
          alert('Invalid GraphIPO canvas JSON: missing nodes array.');
          return;
        }

        if (parsed.project_type) setProjectType(parsed.project_type);
        if (parsed.project_description) setProjectDescription(parsed.project_description);
        if (parsed.code_language) setCodeLanguage(parsed.code_language);

        const importedNodes: Node[] = parsed.nodes.map((nodeData: any, idx: number) => {
          const id = nodeData.id || `node-imported-${idx}`;
          return {
            id,
            type: 'ipoNode',
            position: nodeData.position || {
              x: 100 + (idx % 3) * 450,
              y: 100 + Math.floor(idx / 3) * 320,
            },
            data: {
              ...nodeData,
              id,
              title: nodeData.title || `Imported Node ${idx + 1}`,
              category: nodeData.category || 'System Component',
              lifecycle_phase: nodeData.lifecycle_phase || 'NODE_DRILLDOWN',
              status: nodeData.status || 'DESIGN',
              target_symbols: Array.isArray(nodeData.target_symbols) ? nodeData.target_symbols : [],
              inputs: Array.isArray(nodeData.inputs) ? nodeData.inputs : [],
              process_execution_plan: Array.isArray(nodeData.process_execution_plan) ? nodeData.process_execution_plan : [],
              outputs: Array.isArray(nodeData.outputs) ? nodeData.outputs : [],
              pseudocode: nodeData.pseudocode || '',
            },
          };
        });

        setNodes(importedNodes);
        setEdges([]);
      } catch (err) {
        alert(`Error parsing JSON canvas file: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [setNodes, setEdges]
  );

  const selectedNodeData = useMemo(() => {
    const found = nodes.find((n) => n.id === selectedNodeId);
    return found ? (found.data as unknown as IPONodeData) : null;
  }, [nodes, selectedNodeId]);

  const rawNodeDatas = useMemo(() => nodes.map((n) => n.data as unknown as IPONodeData), [nodes]);

  const progressSummary = useMemo<ProgressSummary>(() => {
    const total = rawNodeDatas.length;
    const implemented = rawNodeDatas.filter(n => n.status === 'IMPLEMENTED').length;
    const design = rawNodeDatas.filter(n => n.status === 'DESIGN').length;
    const ready = rawNodeDatas.filter(n => n.status === 'READY_FOR_IMPLEMENTATION').length;
    const revision = rawNodeDatas.filter(n => n.status === 'NEEDS_REVISION').length;
    const rework = rawNodeDatas.filter(n => n.status === 'REWORK').length;
    const completionPercentage = total > 0 ? (implemented / total) * 100 : 0;

    return {
      total,
      implemented,
      design,
      ready,
      revision,
      rework,
      completionPercentage
    };
  }, [rawNodeDatas]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-dark-900">
      <Header
        progressSummary={progressSummary}
        projectType={projectType}
        projectDescription={projectDescription}
        codeLanguage={codeLanguage}
        onCodeLanguageChange={setCodeLanguage}
        onAddNode={() => handleAddNode('Custom Node')}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onResetCanvas={handleResetCanvas}
        onToggleAudit={() => setIsAuditOpen(!isAuditOpen)}
        wsConnected={wsConnected}
      />

      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar
          nodes={rawNodeDatas}
          onSelectNode={handleSelectNodeFromSidebar}
          onAddNodeTemplate={(cat) => handleAddNode(cat)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#6366F1', strokeWidth: 2 },
            }}
          >
            <Controls className="!m-4" />
            <MiniMap
              className="!m-4"
              zoomable
              pannable
              nodeColor={() => '#374151'}
            />
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color="#1F2937"
            />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="welcome-card bg-dark-800 border border-dark-700 p-8 rounded-2xl shadow-2xl max-w-[500px] text-center pointer-events-auto">
                <h2 className="text-2xl font-bold text-white mb-3">🚀 Welcome to GraphIPO</h2>
                <p className="text-slate-300 mb-4">Design your software visually before writing any code.</p>
                <p className="text-slate-300 mb-6">Tell your AI agent what you want to build, and it will guide you through the design process.</p>
                <div className="welcome-prompt bg-dark-900 border border-dark-700 p-4 rounded-xl mb-4 text-left">
                  <p className="text-sm text-slate-400 mb-2"><strong>Try saying to your AI agent:</strong></p>
                  <code className="text-brand-300 font-mono text-sm block bg-dark-950 p-2 rounded border border-dark-800">
                    "I want to build a task management app for teams"
                  </code>
                </div>
                <p className="welcome-hint text-xs text-slate-500">
                  The agent will use <code className="bg-dark-900 px-1 py-0.5 rounded text-slate-400">start_discovery</code> to begin the design process.
                </p>
              </div>
            </div>
          )}
        </main>
        
        <AuditOverlay 
          isOpen={isAuditOpen} 
          onClose={() => setIsAuditOpen(false)} 
          nodes={rawNodeDatas}
        />
      </div>

      <DetailModal
        node={selectedNodeData}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveNode={handleSaveNode}
        onDeleteNode={handleDeleteNode}
      />

      <UMLLegendModal
        isOpen={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}

export default App;
