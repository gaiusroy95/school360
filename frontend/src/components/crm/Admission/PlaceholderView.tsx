import React from 'react';
import { Settings, Lightbulb } from 'lucide-react';

export function PlaceholderView({ title, description }: { title: string, description: string }) {
  return (
    <div className="h-full bg-slate-50 flex flex-col p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">Admission CRM &gt; {title}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center justify-center flex-1">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
          <Settings size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-700 mb-2">{title} Module</h3>
        <p className="text-sm text-slate-500 max-w-lg mx-auto mb-6">
          {description}
        </p>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex gap-3 text-sm max-w-lg text-left">
          <Lightbulb size={20} className="flex-shrink-0 text-amber-600" />
          <p>This module can be completed with real backend data in the next phase.</p>
        </div>
      </div>
    </div>
  );
}
