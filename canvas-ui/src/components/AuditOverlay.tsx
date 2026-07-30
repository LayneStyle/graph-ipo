import React from 'react';
import { X, CheckCircle, Circle, AlertCircle, HelpCircle } from 'lucide-react';
import { IPONodeData } from '../types/canvas';

interface AuditOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: IPONodeData[];
  extraNodes?: { id: string; title: string; description: string }[];
}

export const AuditOverlay: React.FC<AuditOverlayProps> = ({ isOpen, onClose, nodes, extraNodes = [] }) => {
  if (!isOpen) return null;

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'IMPLEMENTED':
        return { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle, label: 'Implemented' };
      case 'DESIGN':
      case 'READY_FOR_IMPLEMENTATION':
        return { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Circle, label: 'Ready/Design' };
      case 'NEEDS_REVISION':
        return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertCircle, label: 'Needs Revision' };
      case 'REWORK':
        return { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle, label: 'Rework' };
      default:
        return { color: 'text-gray-400', bg: 'bg-gray-400/10', icon: Circle, label: 'Unknown' };
    }
  };

  return (
    <div className="absolute top-0 right-0 w-1/2 h-full bg-dark-800 border-l border-dark-700 shadow-2xl flex flex-col z-40 transition-transform duration-300">
      <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-900/50">
        <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          Audit View: Implementation Status
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-dark-700 rounded-md text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Designed Nodes</h3>
          <div className="space-y-2">
            {nodes.map(node => {
              const { color, bg, icon: Icon, label } = getStatusDetails(node.status);
              return (
                <div key={node.id} className="flex items-center justify-between p-3 rounded-lg bg-dark-900 border border-dark-700">
                  <div className="flex flex-col">
                    <span className="text-gray-200 font-medium">{node.title}</span>
                    <span className="text-xs text-gray-500">{node.category} • Phase: {node.lifecycle_phase}</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${bg} ${color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {extraNodes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Undocumented Code (Audit Results)</h3>
            <div className="space-y-2">
              {extraNodes.map(node => (
                <div key={node.id} className="flex items-center justify-between p-3 rounded-lg bg-dark-900 border border-dark-700">
                  <div className="flex flex-col">
                    <span className="text-gray-200 font-medium">{node.title}</span>
                    <span className="text-xs text-gray-500">{node.description}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-500">
                    <HelpCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Extra Code</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
