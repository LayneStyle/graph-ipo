import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { IPONodeData, NodeStatus } from '../types/canvas';
import { 
  Gamepad2, 
  Globe, 
  Database, 
  Code2, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileCode,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Zap,
  Split
} from 'lucide-react';

export const IPONode: React.FC<NodeProps<Node<IPONodeData>>> = ({ data, selected }) => {
  const [showPseudocode, setShowPseudocode] = useState(false);

  const getPhaseBadge = (phase: string) => {
    switch (phase) {
      case 'MACRO_DESIGN':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <span>MACRO DESIGN</span>
          </span>
        );
      case 'NODE_DRILLDOWN':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <span>DRILLDOWN</span>
          </span>
        );
      case 'SPECIFIED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <span>SPECIFIED</span>
          </span>
        );
      case 'IMPLEMENTATION':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
            <span>IMPLEMENTATION</span>
          </span>
        );
      case 'AUDIT':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30">
            <span>AUDIT</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
            {phase}
          </span>
        );
    }
  };

  const getStatusBadge = (status: NodeStatus) => {
    switch (status) {
      case 'IMPLEMENTED':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Implemented</span>
          </span>
        );
      case 'READY_FOR_IMPLEMENTATION':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Zap className="w-3 h-3" />
            <span>Ready</span>
          </span>
        );
      case 'NEEDS_REVISION':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            <span>Needs Rev</span>
          </span>
        );
      case 'REWORK':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            <span>Rework</span>
          </span>
        );
      case 'DESIGN':
      default:
        return (
          <span className="flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600">
            <Clock className="w-3 h-3" />
            <span>Design</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`w-96 rounded-xl bg-dark-800 border transition-all duration-200 shadow-2xl text-left ${
        selected
          ? 'border-brand-500 ring-2 ring-brand-500/30 shadow-brand-500/10'
          : 'border-dark-700 hover:border-slate-600'
      }`}
    >
      {/* Node Header */}
      <div className="p-3.5 border-b border-dark-700 bg-dark-900/60 rounded-t-xl">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center space-x-1.5">
            {getPhaseBadge(data.lifecycle_phase)}
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              {data.category}
            </span>
          </div>
          {getStatusBadge(data.status)}
        </div>
        <h3 className="text-sm font-semibold text-slate-100 leading-tight">
          {data.title}
        </h3>
        {data.description && (
          <p className="mt-1 text-xs text-slate-300 italic truncate" title={data.description}>
            {data.description.length > 60 ? `${data.description.substring(0, 60)}...` : data.description}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          {data.assigned_to ? (
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 bg-dark-800/80 px-2 py-0.5 rounded border border-dark-700 w-fit">
              <span className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center text-[8px] text-white font-bold">
                {data.assigned_to.charAt(0).toUpperCase()}
              </span>
              <span><strong className="text-slate-200 font-medium">{data.assigned_to}</strong></span>
            </div>
          ) : (
            <div />
          )}
          {data.notes && (
            <span className="text-[10px] text-brand-300 bg-brand-500/20 px-1.5 py-0.5 rounded" title="Has Notes">
              📝 Notes
            </span>
          )}
        </div>
      </div>

      {/* Inputs Section */}
      <div className="p-3 border-b border-dark-700/60 bg-dark-800">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
          <span>Inputs ({data.inputs?.length || 0})</span>
          <span className="text-[10px] font-mono text-slate-500">Prerequisites</span>
        </div>
        <div className="space-y-1.5">
          {data.inputs && data.inputs.length > 0 ? (
            data.inputs.map((input, idx) => {
              const handleId = input.id || `in-${idx}`;
              return (
                <div
                  key={handleId}
                  className="relative flex items-center justify-between p-1.5 bg-dark-900/80 rounded border border-dark-700/80 text-xs hover:border-brand-500/40 group"
                >
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={handleId}
                    className="ipo-handle !-left-2.5"
                  />
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-mono text-brand-300 font-medium">{input.name}</span>
                    {input.source && (
                      <span className="text-[10px] text-slate-500 font-mono">from {input.source}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-700 text-slate-300">
                    {input.type}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-500 italic p-1">No explicit inputs defined</div>
          )}
        </div>
      </div>

      {/* Target Symbols Section */}
      {data.target_symbols && data.target_symbols.length > 0 && (
        <div className="px-3 py-2 border-b border-dark-700/60 bg-dark-900/30">
          <div className="flex items-center space-x-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
            <Code2 className="w-3 h-3 text-slate-500" />
            <span>Target Symbols</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.target_symbols.map((sym, i) => (
              <span
                key={i}
                className="text-[10px] font-mono px-2 py-0.5 bg-dark-900 text-slate-300 rounded border border-dark-700 hover:border-slate-600 truncate max-w-full"
              >
                {sym}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Process Execution Plan */}
      <div className="p-3 border-b border-dark-700/60 bg-dark-800">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
          <span>Execution Plan</span>
          <span className="text-[10px] font-mono text-slate-500">{data.process_execution_plan?.length || 0} Steps</span>
        </div>
        <div className="space-y-1.5">
          {data.process_execution_plan && data.process_execution_plan.length > 0 ? (
            data.process_execution_plan.map((stepItem, idx) => (
              <div
                key={stepItem.id || idx}
                className="flex items-start space-x-2 text-xs p-1.5 bg-dark-900/50 rounded border border-dark-700/60"
              >
                <div className="mt-0.5">
                  {stepItem.mode === 'parallel' ? (
                    <span title="Parallel Execution" className="p-0.5 bg-indigo-500/20 text-indigo-300 rounded inline-block">
                      <Split className="w-3 h-3" />
                    </span>
                  ) : (
                    <span title="Sequential Execution" className="p-0.5 bg-slate-700 text-slate-300 rounded inline-block">
                      <ArrowDownRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-medium leading-snug">{stepItem.step}</p>
                  {stepItem.description && (
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{stepItem.description}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-500 italic p-1">No execution steps configured</div>
          )}
        </div>
      </div>

      {/* Outputs Section */}
      <div className="p-3 border-b border-dark-700/60 bg-dark-800">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
          <span>Outputs ({data.outputs?.length || 0})</span>
          <span className="text-[10px] font-mono text-slate-500">Mutations & Events</span>
        </div>
        <div className="space-y-1.5">
          {data.outputs && data.outputs.length > 0 ? (
            data.outputs.map((output, idx) => {
              const handleId = output.id || `out-${idx}`;
              return (
                <div
                  key={handleId}
                  className="relative flex items-center justify-between p-1.5 bg-dark-900/80 rounded border border-dark-700/80 text-xs hover:border-emerald-500/40 group"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-mono text-emerald-300 font-medium">{output.name}</span>
                    {output.target && (
                      <span className="text-[10px] text-slate-500 font-mono">→ {output.target}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-700 text-slate-300 ml-2">
                    {output.type || output.rpc_or_event || 'Output'}
                  </span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={handleId}
                    className="ipo-handle !-right-2.5"
                  />
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-500 italic p-1">No outputs defined</div>
          )}
        </div>
      </div>

      {/* Pseudocode Viewer Accordion */}
      {data.pseudocode && (
        <div className="p-2 bg-dark-900/90 rounded-b-xl">
          <button
            onClick={() => setShowPseudocode(!showPseudocode)}
            className="w-full flex items-center justify-between p-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded transition-colors"
          >
            <div className="flex items-center space-x-1.5">
              <FileCode className="w-3.5 h-3.5 text-brand-400" />
              <span className="font-mono text-[11px] font-medium">Pseudocode Implementation</span>
            </div>
            {showPseudocode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showPseudocode && (
            <div className="mt-2 p-2 bg-dark-950 rounded border border-dark-700/80 overflow-x-auto">
              <pre className="font-mono text-[11px] text-brand-200 leading-relaxed whitespace-pre font-medium">
                {data.pseudocode}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
