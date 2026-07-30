import React from 'react';
import { 
  X, 
  Square, 
  ShieldAlert, 
  Layers, 
  Database, 
  Repeat, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  AlertCircle, 
  Clock,
  GitBranch
} from 'lucide-react';

interface UMLLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UMLLegendModal: React.FC<UMLLegendModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-dark-950">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-slate-100">Guía Visual & Semántica UML - GraphIPO</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Node Shapes & Structures */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              1. Formas y Bordes de Nodos (Shapes & Structural Types)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-dark-800 border border-indigo-500/40 flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">System Engine (Doble Borde)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Manager global o loop principal del juego/backend. Borde doble o resplandor morado.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-dark-800 border border-amber-500/40 border-dashed flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Security Gate / Decisión (Trazo Discontinuo)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Validación de permisos, cliente/servidor o condicionales críticos.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-dark-800 border border-emerald-500/40 flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Data Container (Cilindro / ScriptableObject)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Almacén de datos, tablas de balance o modelos de base de datos.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-dark-800 border border-sky-500/40 flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Loop / Iteración (Bucle Recurrente)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Procesamiento por lotes o iteración secuencial de arreglos/streams.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Colors & Node Status */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              2. Colores y Estado de Implementación
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-xs font-semibold text-emerald-300">Implemented</span>
                <span className="text-[10px] text-slate-400 mt-1">Código verificado</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col items-center text-center">
                <Zap className="w-5 h-5 text-blue-400 mb-1" />
                <span className="text-xs font-semibold text-blue-300">Ready</span>
                <span className="text-[10px] text-slate-400 mt-1">Listo para programar</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center text-center">
                <AlertCircle className="w-5 h-5 text-amber-400 mb-1" />
                <span className="text-xs font-semibold text-amber-300">Needs Revision</span>
                <span className="text-[10px] text-slate-400 mt-1">Impactado por cambio</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col items-center text-center">
                <Clock className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-300">Design</span>
                <span className="text-[10px] text-slate-400 mt-1">En fase de diseño</span>
              </div>
            </div>
          </div>

          {/* Section 3: Arrow Styles & Connections */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              3. Conexiones y Flechas UML
            </h3>
            <div className="space-y-2.5 bg-dark-800/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-4">
                <div className="w-24 h-0.5 bg-brand-500 relative flex items-center justify-end">
                  <div className="w-2 h-2 border-t-2 border-r-2 border-brand-500 transform rotate-45"></div>
                </div>
                <span className="text-xs text-slate-300"><strong className="text-white">Línea Continua:</strong> Llamada Secuencial Síncrona (Paso N $\rightarrow$ Paso N+1)</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-24 h-0.5 border-t-2 border-dashed border-sky-400 relative flex items-center justify-end">
                  <div className="w-2 h-2 border-t-2 border-r-2 border-sky-400 transform rotate-45"></div>
                </div>
                <span className="text-xs text-slate-300"><strong className="text-white">Línea Discontinua:</strong> Evento Asíncrono / Fan-Out en Paralelo</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-24 h-0.5 border-t-2 border-dotted border-red-500 relative flex items-center justify-end">
                  <div className="w-2 h-2 border-t-2 border-r-2 border-red-500 transform rotate-45"></div>
                </div>
                <span className="text-xs text-slate-300"><strong className="text-white">Línea Roja Punteada:</strong> Manejo de Excepción / Fallback de Error</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-dark-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
