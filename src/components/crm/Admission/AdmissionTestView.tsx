import React from 'react';
import { FileQuestion, Settings, Clock, BarChart2 } from 'lucide-react';

export function AdmissionTestView() {
  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admission Test</h1>
          <p className="text-sm text-slate-500 mt-1">AI-powered exam builder and evaluation</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
          <FileQuestion size={16} /> Create New Test
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Settings size={18} className="text-indigo-600" /> Test Configurations
            </h3>
            
            <div className="space-y-3">
              {[
                { name: 'Class 11 Science Aptitude', questions: 50, duration: '60 mins', type: 'MCQ & Subjective', ai: true },
                { name: 'Primary Language Assessment', questions: 20, duration: '30 mins', type: 'MCQ', ai: false },
                { name: 'Psychometric Profile', questions: 45, duration: '45 mins', type: 'Rating Scale', ai: true },
              ].map((test, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-indigo-100 transition-colors">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{test.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><FileQuestion size={12}/> {test.questions} Qs</span>
                      <span className="flex items-center gap-1"><Clock size={12}/> {test.duration}</span>
                      <span>{test.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {test.ai && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded font-bold">AI Generated</span>}
                    <button className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <BarChart2 size={100} />
            </div>
            <h3 className="text-lg font-bold mb-2">AI Question Generator</h3>
            <p className="text-indigo-200 text-xs mb-4">Select syllabus, difficulty, and Bloom's taxonomy level to auto-generate question banks.</p>
            <div className="space-y-3 relative z-10">
              <select className="w-full bg-indigo-800 border border-indigo-700 rounded-lg p-2 text-sm text-white focus:outline-none">
                <option>Select Subject / Syllabus</option>
                <option>Mathematics (CBSE Class 10)</option>
                <option>Logical Reasoning</option>
              </select>
              <select className="w-full bg-indigo-800 border border-indigo-700 rounded-lg p-2 text-sm text-white focus:outline-none">
                <option>Difficulty Level</option>
                <option>Adaptive</option>
                <option>Hard</option>
              </select>
              <button className="w-full bg-white text-indigo-900 font-bold text-sm py-2 rounded-lg hover:bg-indigo-50 transition-colors">
                Generate Questions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
