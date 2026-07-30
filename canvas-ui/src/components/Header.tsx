import React, { useRef } from 'react';
import { CodeLanguage, ProgressSummary } from '../types/canvas';
import { 
  Boxes, 
  Download, 
  Upload,
  PlusCircle, 
  RefreshCw,
  GitCompareArrows,
} from 'lucide-react';

interface HeaderProps {
  progressSummary: ProgressSummary;
  projectType: string;
  projectDescription?: string;
  codeLanguage: CodeLanguage;
  onCodeLanguageChange: (lang: CodeLanguage) => void;
  onAddNode: () => void;
  onExportJson: () => void;
  onImportJson: (jsonContent: string) => void;
  onResetCanvas: () => void;
  onToggleAudit: () => void;
  wsConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  progressSummary,
  projectType,
  projectDescription,
  codeLanguage,
  onCodeLanguageChange,
  onAddNode,
  onExportJson,
  onImportJson,
  onResetCanvas,
  onToggleAudit,
  wsConnected,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onImportJson(content);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-16 bg-dark-800 border-b border-dark-700 px-6 flex items-center justify-between z-10 shadow-lg select-none">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-brand-600/20 border border-brand-500/30 rounded-xl text-brand-400 flex items-center justify-center shadow-inner relative">
          <Boxes className="w-6 h-6 animate-pulse" />
          <div 
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-dark-800 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}
            title={wsConnected ? "Live sync with server" : "Disconnected"}
          />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-lg text-white tracking-wide">GraphIPO</h1>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
              {projectType || "Unknown Project"}
            </span>
          </div>
          {projectDescription && (
            <p className="text-xs text-slate-300 italic truncate max-w-md" title={projectDescription}>
              "{projectDescription}"
            </p>
          )}
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span>Input-Process-Output Canvas Engine</span>
          </p>
        </div>
      </div>

      {/* Center Dashboard */}
      <div className="flex flex-col items-center justify-center space-y-1">
        <div className="text-xs text-slate-300 font-medium">
          {progressSummary.implemented}/{progressSummary.total} Implemented &middot; {progressSummary.design} In Design &middot; {progressSummary.revision} Needs Revision
        </div>
        <div className="w-64 h-2 bg-dark-900 rounded-full overflow-hidden border border-dark-700">
          <div 
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progressSummary.completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />

        <button
          onClick={onToggleAudit}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 border border-yellow-500/30 rounded-lg text-xs font-medium transition-all active:scale-95"
          title="Toggle Audit View"
        >
          <GitCompareArrows className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Audit View</span>
        </button>

        <button
          onClick={onAddNode}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-medium transition-all shadow-md shadow-brand-600/20 active:scale-95"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Node</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-slate-200 border border-dark-600 rounded-lg text-xs font-medium transition-all active:scale-95"
          title="Import Canvas"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onExportJson}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-slate-200 border border-dark-600 rounded-lg text-xs font-medium transition-all active:scale-95"
          title="Export Canvas"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onResetCanvas}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-dark-700 rounded-lg transition-all"
          title="Reset Sample Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
