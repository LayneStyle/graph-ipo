import React, { useState, useEffect } from 'react';
import { IPONodeData, NodeStatus, LifecyclePhase, IPOInput, IPOStep, IPOOutput } from '../types/canvas';
import { 
  X, 
  Save, 
  Trash2, 
  Plus, 
  Code2, 
  Bot, 
  Split, 
  ArrowDownRight, 
  Layers, 
  CheckCircle2, 
  FileCode,
  Zap,
  Globe,
  Gamepad2,
  Database
} from 'lucide-react';

interface DetailModalProps {
  node: IPONodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNode: (updatedNode: IPONodeData) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  node,
  isOpen,
  onClose,
  onSaveNode,
  onDeleteNode,
}) => {
  if (!isOpen || !node) return null;

  const normalizeNodeData = (data: IPONodeData): IPONodeData => ({
    ...data,
    target_symbols: data.target_symbols || [],
    inputs: data.inputs || [],
    process_execution_plan: data.process_execution_plan || [],
    outputs: data.outputs || [],
    pseudocode: data.pseudocode || '',
  });

  const [formData, setFormData] = useState<IPONodeData>(normalizeNodeData(node));
  const [activeTab, setActiveTab] = useState<'overview' | 'inputs' | 'execution' | 'outputs' | 'pseudocode'>('overview');
  const [newSymbol, setNewSymbol] = useState('');
  const [agentTriggered, setAgentTriggered] = useState(false);
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');

  useEffect(() => {
    setFormData(normalizeNodeData(node));
    setAgentTriggered(false);
  }, [node]);

  const handleSave = () => {
    onSaveNode(normalizeNodeData(formData));
    onClose();
  };

  const handleAddSymbol = () => {
    if (!newSymbol.trim()) return;
    setFormData({
      ...formData,
      target_symbols: [...formData.target_symbols, newSymbol.trim()],
    });
    setNewSymbol('');
  };

  const handleRemoveSymbol = (index: number) => {
    const next = [...formData.target_symbols];
    next.splice(index, 1);
    setFormData({ ...formData, target_symbols: next });
  };

  // Input handlers
  const handleAddInput = () => {
    const newInput: IPOInput = {
      id: `in-${Date.now()}`,
      name: 'NewInput',
      type: 'string',
      source: 'External',
      required: true,
    };
    setFormData({
      ...formData,
      inputs: [...formData.inputs, newInput],
    });
  };

  const handleUpdateInput = (index: number, field: keyof IPOInput, value: any) => {
    const updated = [...formData.inputs];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, inputs: updated });
  };

  const handleRemoveInput = (index: number) => {
    const updated = [...formData.inputs];
    updated.splice(index, 1);
    setFormData({ ...formData, inputs: updated });
  };

  // Step handlers
  const handleAddStep = () => {
    const newStep: IPOStep = {
      id: `step-${Date.now()}`,
      step: 'Execute business logic step',
      mode: 'sequential',
    };
    setFormData({
      ...formData,
      process_execution_plan: [...formData.process_execution_plan, newStep],
    });
  };

  const handleUpdateStep = (index: number, field: keyof IPOStep, value: any) => {
    const updated = [...formData.process_execution_plan];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, process_execution_plan: updated });
  };

  const handleRemoveStep = (index: number) => {
    const updated = [...formData.process_execution_plan];
    updated.splice(index, 1);
    setFormData({ ...formData, process_execution_plan: updated });
  };

  // Output handlers
  const handleAddOutput = () => {
    const newOutput: IPOOutput = {
      id: `out-${Date.now()}`,
      name: 'NewOutput',
      type: 'Event',
      target: 'NextComponent',
    };
    setFormData({
      ...formData,
      outputs: [...formData.outputs, newOutput],
    });
  };

  const handleUpdateOutput = (index: number, field: keyof IPOOutput, value: any) => {
    const updated = [...formData.outputs];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, outputs: updated });
  };

  const handleRemoveOutput = (index: number) => {
    const updated = [...formData.outputs];
    updated.splice(index, 1);
    setFormData({ ...formData, outputs: updated });
  };

  const handleDelegateAgent = () => {
    setAgentTriggered(true);
    setTimeout(() => setAgentTriggered(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-dark-800 border border-dark-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-5 border-b border-dark-700 bg-dark-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-600/20 border border-brand-500/30 rounded-lg text-brand-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">{formData.title}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-700 text-slate-300">
                  {formData.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">Inspector & Node Definition Specification</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'simple' ? 'advanced' : 'simple')}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-dark-800 hover:bg-dark-700 rounded-lg border border-dark-700 transition-all"
            >
              {viewMode === 'simple' ? '⚙️ Show Advanced Fields' : '📋 Show Simple View'}
            </button>
            <button
              onClick={() => onDeleteNode(node.id)}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all text-xs font-medium flex items-center space-x-1"
              title="Delete Node"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-dark-700 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        {viewMode === 'advanced' && (
          <div className="flex border-b border-dark-700 bg-dark-900/60 px-5 space-x-2 overflow-x-auto text-xs">
            {[
              { id: 'overview', label: 'Overview & Target Symbols' },
              { id: 'inputs', label: `Inputs (${formData.inputs?.length || 0})` },
              { id: 'execution', label: `Execution Plan (${formData.process_execution_plan?.length || 0})` },
              { id: 'outputs', label: `Outputs (${formData.outputs?.length || 0})` },
              { id: 'pseudocode', label: 'Pseudocode Editor' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {viewMode === 'simple' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this component about?"
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    What does it need? <span className="lowercase italic normal-case text-slate-500">(inputs)</span>
                  </label>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {formData.inputs.length > 0 ? (
                      formData.inputs.map((inp, idx) => <li key={idx}>{inp.name}</li>)
                    ) : (
                      <li className="text-slate-500 italic list-none">None</li>
                    )}
                  </ul>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    What does it produce? <span className="lowercase italic normal-case text-slate-500">(outputs)</span>
                  </label>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {formData.outputs.length > 0 ? (
                      formData.outputs.map((out, idx) => <li key={idx}>{out.name}</li>)
                    ) : (
                      <li className="text-slate-500 italic list-none">None</li>
                    )}
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  What does it do? (Step by step) <span className="lowercase italic normal-case text-slate-500">(process_execution_plan)</span>
                </label>
                <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
                  {formData.process_execution_plan.length > 0 ? (
                    formData.process_execution_plan.map((step, idx) => <li key={idx}>{step.step}</li>)
                  ) : (
                    <li className="text-slate-500 italic list-none">No steps defined</li>
                  )}
                </ol>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Files & Functions <span className="lowercase italic normal-case text-slate-500">(target_symbols)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.target_symbols.length > 0 ? (
                    formData.target_symbols.map((sym, idx) => (
                      <span key={idx} className="flex items-center space-x-1.5 text-xs font-mono px-2.5 py-1 bg-dark-900 text-brand-300 rounded border border-dark-700">
                        {sym}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">No files or functions targeted</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Your Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any comments or notes here..."
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as NodeStatus })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value="DESIGN">💡 Idea (DESIGN)</option>
                    <option value="READY_FOR_IMPLEMENTATION">✅ Ready to Code (READY_FOR_IMPLEMENTATION)</option>
                    <option value="IMPLEMENTED">🎉 Done (IMPLEMENTED)</option>
                    <option value="NEEDS_REVISION">🔄 Needs Work (NEEDS_REVISION)</option>
                    <option value="REWORK">⚠️ Redo (REWORK)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={formData.assigned_to || ''}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    placeholder="e.g. Alice"
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Node Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as NodeStatus })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value="DESIGN">DESIGN</option>
                    <option value="READY_FOR_IMPLEMENTATION">READY_FOR_IMPLEMENTATION</option>
                    <option value="IMPLEMENTED">IMPLEMENTED</option>
                    <option value="NEEDS_REVISION">NEEDS_REVISION</option>
                    <option value="REWORK">REWORK</option>
                  </select>
                </div>

                <div title="The current development stage of this component, calculated automatically">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 cursor-help">
                    Lifecycle Phase
                  </label>
                  <select
                    value={formData.lifecycle_phase}
                    onChange={(e) => setFormData({ ...formData, lifecycle_phase: e.target.value as LifecyclePhase })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value="MACRO_DESIGN">MACRO_DESIGN</option>
                    <option value="NODE_DRILLDOWN">NODE_DRILLDOWN</option>
                    <option value="SPECIFIED">SPECIFIED</option>
                    <option value="IMPLEMENTATION">IMPLEMENTATION</option>
                    <option value="AUDIT">AUDIT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any comments or notes here..."
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                />
              </div>

              {/* Target Symbols */}
              <div title="The specific files, classes, or functions where this component will be implemented in code">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 cursor-help">
                  Target Symbols & C# / TS Methods
                </label>
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="text"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                    placeholder="e.g. PlayerHealth.cs or OnDamageTaken()"
                    className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddSymbol}
                    className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-xs font-medium text-slate-200 border border-dark-600"
                  >
                    Add Symbol
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.target_symbols.map((sym, idx) => (
                    <span
                      key={idx}
                      className="flex items-center space-x-1.5 text-xs font-mono px-2.5 py-1 bg-dark-900 text-brand-300 rounded border border-dark-700"
                    >
                      <span>{sym}</span>
                      <button
                        onClick={() => handleRemoveSymbol(idx)}
                        className="text-slate-500 hover:text-rose-400 transition-colors ml-1"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INPUTS */}
          {activeTab === 'inputs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between" title="Data, events, or triggers that this component receives from other parts of the system">
                <span className="text-xs font-semibold text-slate-400 uppercase cursor-help">Input Prerequisites & Types</span>
                <button
                  onClick={handleAddInput}
                  className="flex items-center space-x-1 px-3 py-1 bg-brand-600/20 text-brand-400 border border-brand-500/30 hover:bg-brand-600 hover:text-white rounded-lg text-xs font-medium transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Input</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.inputs.map((inp, idx) => (
                  <div key={idx} className="p-3 bg-dark-900 rounded-xl border border-dark-700 space-y-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500">Input Name</span>
                        <input
                          type="text"
                          value={inp.name}
                          onChange={(e) => handleUpdateInput(idx, 'name', e.target.value)}
                          className="w-full bg-dark-800 border border-dark-700 rounded px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Type</span>
                        <input
                          type="text"
                          value={inp.type}
                          onChange={(e) => handleUpdateInput(idx, 'type', e.target.value)}
                          className="w-full bg-dark-800 border border-dark-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-2">
                          <span className="text-[10px] text-slate-500">Source Provider</span>
                          <input
                            type="text"
                            value={inp.source || ''}
                            onChange={(e) => handleUpdateInput(idx, 'source', e.target.value)}
                            className="w-full bg-dark-800 border border-dark-700 rounded px-2.5 py-1 text-xs text-white"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveInput(idx)}
                          className="mt-4 p-1 text-rose-400 hover:bg-rose-500/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: EXECUTION PLAN */}
          {activeTab === 'execution' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between" title="The step-by-step logic that this component executes, written as pseudocode">
                <span className="text-xs font-semibold text-slate-400 uppercase cursor-help">Process Execution Steps</span>
                <button
                  onClick={handleAddStep}
                  className="flex items-center space-x-1 px-3 py-1 bg-brand-600/20 text-brand-400 border border-brand-500/30 hover:bg-brand-600 hover:text-white rounded-lg text-xs font-medium transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.process_execution_plan.map((st, idx) => (
                  <div key={idx} className="p-3 bg-dark-900 rounded-xl border border-dark-700 flex items-start space-x-3">
                    <div className="pt-2">
                      <button
                        onClick={() =>
                          handleUpdateStep(idx, 'mode', st.mode === 'sequential' ? 'parallel' : 'sequential')
                        }
                        className={`p-1.5 rounded text-xs font-medium flex items-center space-x-1 ${
                          st.mode === 'parallel'
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-dark-700 text-slate-300'
                        }`}
                        title="Toggle Sequential vs Parallel"
                      >
                        {st.mode === 'parallel' ? <Split className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        <span className="capitalize">{st.mode}</span>
                      </button>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div>
                        <span className="text-[10px] text-slate-500">Step Instruction</span>
                        <input
                          type="text"
                          value={st.step}
                          onChange={(e) => handleUpdateStep(idx, 'step', e.target.value)}
                          className="w-full bg-dark-800 border border-dark-700 rounded px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Description / Detail</span>
                        <input
                          type="text"
                          value={st.description || ''}
                          onChange={(e) => handleUpdateStep(idx, 'description', e.target.value)}
                          placeholder="Optional extra rationale..."
                          className="w-full bg-dark-800 border border-dark-700 rounded px-2.5 py-1 text-xs text-slate-300"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveStep(idx)}
                      className="pt-2 p-1 text-rose-400 hover:bg-rose-500/10 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: OUTPUTS */}
          {activeTab === 'outputs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between" title="Data, events, or results that this component sends to other parts of the system">
                <span className="text-xs font-semibold text-slate-400 uppercase cursor-help">Outputs & State Mutations</span>
                <button
                  onClick={handleAddOutput}
                  className="flex items-center space-x-1 px-3 py-1 bg-brand-600/20 text-brand-400 border border-brand-500/30 hover:bg-brand-600 hover:text-white rounded-lg text-xs font-medium transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Output</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.outputs.map((out, idx) => (
                  <div key={idx} className="p-3 bg-dark-900 rounded-xl border border-dark-700 space-y-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500">Output Name</span>
                        <input
                          type="text"
                          value={out.name}
                          onChange={(e) => handleUpdateOutput(idx, 'name', e.target.value)}
                          className="w-full bg-dark-800 border border-dark-700 rounded px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Target Node / Component</span>
                        <input
                          type="text"
                          value={out.target || ''}
                          onChange={(e) => handleUpdateOutput(idx, 'target', e.target.value)}
                          className="w-full bg-dark-800 border border-dark-700 rounded px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-2">
                          <span className="text-[10px] text-slate-500">RPC / Event Type</span>
                          <input
                            type="text"
                            value={out.type || out.rpc_or_event || ''}
                            onChange={(e) => handleUpdateOutput(idx, 'type', e.target.value)}
                            className="w-full bg-dark-800 border border-dark-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveOutput(idx)}
                          className="mt-4 p-1 text-rose-400 hover:bg-rose-500/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PSEUDOCODE EDITOR */}
          {activeTab === 'pseudocode' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">Interactive Pseudocode / Code Block</span>
                <span className="text-[10px] font-mono text-brand-400">Live Editor Sync</span>
              </div>
              <textarea
                rows={12}
                value={formData.pseudocode}
                onChange={(e) => setFormData({ ...formData, pseudocode: e.target.value })}
                className="w-full bg-dark-950 border border-dark-700 rounded-xl p-4 text-xs font-mono text-brand-200 leading-relaxed focus:border-brand-500 focus:outline-none"
                placeholder="// Enter C# or TypeScript pseudocode here..."
              />
            </div>
          )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-dark-700 bg-dark-900 flex items-center justify-between">
          <button
            onClick={handleDelegateAgent}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            <Bot className="w-4 h-4 text-indigo-400" />
            <span>Delegate to AI Agent</span>
          </button>

          {agentTriggered && (
            <span className="text-xs text-emerald-400 font-medium animate-pulse flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Agent task dispatched for {formData.title}!
            </span>
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-brand-600/20 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Node</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
