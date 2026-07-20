import React from 'react';
import { Settings, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function ModuleConfigView({ module, onBack }: { module: any, onBack: () => void }) {
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-6 pb-4 border-b border-slate-200 bg-white shrink-0 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              {module.icon}
              {module.title}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{module.desc}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onBack} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <Save size={16} /> Save Configuration
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                <Settings size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Module Configuration</h2>
                <p className="text-sm text-slate-500">Configure parameters for {module.title}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {module.items.map((item: string, idx: number) => (
                <div key={idx} className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-700">{item}</label>
                  <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 hover:bg-white transition-colors">
                    <option>Standard / Default</option>
                    <option>Custom Variant A</option>
                    <option>Custom Variant B</option>
                  </select>
                  <p className="text-xs text-slate-400">Select configuration for {item.toLowerCase()}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3 text-sm">
              <CheckCircle2 size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-900 mb-1">SSOT Architecture Notice</p>
                <p className="text-blue-800">Changes made here will reflect globally across all interconnected ERP modules due to the Single Source of Truth architecture.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
