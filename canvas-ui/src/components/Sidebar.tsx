import React from 'react';
import { IPONodeData } from '../types/canvas';
import { 
  Search, 
  ChevronRight, 
  Plus,
  Boxes,
  User,
} from 'lucide-react';

interface SidebarProps {
  nodes: IPONodeData[];
  onSelectNode: (nodeId: string) => void;
  onAddNodeTemplate: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  nodes,
  onSelectNode,
  onAddNodeTemplate,
  searchQuery,
  onSearchChange,
}) => {
  const filteredNodes = nodes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by lifecycle_phase
  const groupedNodes = filteredNodes.reduce((acc, node) => {
    const phase = node.lifecycle_phase || 'UNKNOWN';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(node);
    return acc;
  }, {} as Record<string, IPONodeData[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IMPLEMENTED': return 'bg-emerald-500';
      case 'READY_FOR_IMPLEMENTATION': return 'bg-blue-500';
      case 'NEEDS_REVISION': return 'bg-amber-500';
      case 'REWORK': return 'bg-rose-500';
      case 'DESIGN':
      default: return 'bg-slate-500';
    }
  };

  return (
    <aside className="w-80 h-[calc(100vh-4rem)] bg-dark-800 border-r border-dark-700 flex flex-col z-10 select-none">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search canvas nodes..."
              className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Nodes In Canvas ({filteredNodes.length})</span>
          </div>

          <div className="space-y-4">
            {Object.keys(groupedNodes).length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 text-center bg-dark-900/40 rounded-lg border border-dark-700/50">
                No matching nodes found
              </div>
            ) : (
              Object.entries(groupedNodes).map(([phase, phaseNodes]) => (
                <div key={phase} className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                    {phase.replace('_', ' ')}
                  </h3>
                  {phaseNodes.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => onSelectNode(node.id)}
                      className="w-full text-left p-2.5 bg-dark-900/60 hover:bg-dark-700 rounded-lg border border-dark-700/80 transition-all flex items-center justify-between group"
                    >
                      <div className="flex flex-col flex-1 min-w-0 pr-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(node.status)}`} />
                          <div className="text-xs font-medium text-slate-200 group-hover:text-brand-300 truncate">
                            {node.title}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[9px] px-1.5 py-0.5 bg-dark-800 text-slate-400 rounded-sm border border-dark-700 truncate">
                            {node.category}
                          </span>
                          {node.assigned_to && (
                            <span className="flex items-center space-x-1 text-[9px] text-brand-300 truncate">
                              <User className="w-2.5 h-2.5" />
                              <span>{node.assigned_to}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Quick Add</span>
          </div>
          <button
            onClick={() => onAddNodeTemplate('System Component')}
            className="w-full text-left px-3 py-2 bg-dark-900 hover:bg-brand-600/20 hover:border-brand-500/40 rounded-lg border border-dark-700/80 transition-all flex items-center justify-between text-xs text-slate-300 group"
          >
            <div className="flex items-center space-x-2">
              <Boxes className="w-3.5 h-3.5 text-brand-400" />
              <span>Generic Node</span>
            </div>
            <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400" />
          </button>
        </div>
      </div>
    </aside>
  );
};
