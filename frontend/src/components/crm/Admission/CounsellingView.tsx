import React from 'react';
import { Target, TrendingUp, AlertTriangle, MessageCircle, BarChart2, Zap, BrainCircuit, User } from 'lucide-react';

export function CounsellingView() {
  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Counselling & AI Lead Scoring</h1>
          <p className="text-sm text-slate-500 mt-1">Predictive admission probabilities and sentiment analysis</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
          <Target size={16} /> Run Batch Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Leads List */}
        <div className="lg:col-span-1 space-y-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-indigo-600" /> High Intent Leads
          </h3>
          <div className="space-y-3">
            {[
              { name: 'Vikram Singh', class: 'Class 11 Science', score: 94, sentiment: 'Positive', trend: 'up' },
              { name: 'Anjali Mehta', class: 'Nursery', score: 88, sentiment: 'Neutral', trend: 'up' },
              { name: 'Rohit Sharma', class: 'Class 6', score: 72, sentiment: 'Concerned', trend: 'down' },
              { name: 'Pooja Patel', class: 'Class 9', score: 65, sentiment: 'Neutral', trend: 'flat' },
            ].map((lead, i) => (
              <div key={i} className={`p-3 rounded-lg border ${i === 0 ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:border-indigo-100'} cursor-pointer transition-colors`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{lead.name}</h4>
                    <span className="text-[10px] text-slate-500">{lead.class}</span>
                  </div>
                  <div className={`flex flex-col items-end`}>
                    <span className={`text-lg font-bold ${
                      lead.score > 80 ? 'text-emerald-600' : lead.score > 60 ? 'text-amber-500' : 'text-red-500'
                    }`}>{lead.score}</span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider">AI Score</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/50">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                    lead.sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-700' :
                    lead.sentiment === 'Concerned' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    Sentiment: {lead.sentiment}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: AI Insights Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main AI Score Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
              <BrainCircuit size={160} />
            </div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl font-bold">
                    VS
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Vikram Singh</h2>
                    <p className="text-sm text-slate-500">Applying for: Class 11 Science • ENQ12499</p>
                  </div>
                </div>
                
                <div className="text-center bg-emerald-50 border border-emerald-100 rounded-xl p-3 min-w-[120px]">
                  <div className="text-3xl font-black text-emerald-600 tracking-tighter">94<span className="text-lg text-emerald-400">%</span></div>
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mt-1">Admission Prob.</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-10">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 mb-1 text-slate-500">
                    <MessageCircle size={14} />
                    <span className="text-xs font-semibold">Parent Sentiment</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-600">Highly Positive</div>
                  <p className="text-[10px] text-slate-400 mt-1">Based on 3 calls and 2 emails</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 mb-1 text-slate-500">
                    <Zap size={14} />
                    <span className="text-xs font-semibold">Engagement Level</span>
                  </div>
                  <div className="text-sm font-bold text-indigo-600">Very Active</div>
                  <p className="text-[10px] text-slate-400 mt-1">Opened all emails, attended campus visit</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 mb-1 text-slate-500">
                    <AlertTriangle size={14} />
                    <span className="text-xs font-semibold">Risk Factors</span>
                  </div>
                  <div className="text-sm font-bold text-amber-600">Distance from School</div>
                  <p className="text-[10px] text-slate-400 mt-1">Mentioned transport queries twice</p>
                </div>
              </div>

              {/* AI Recommendations */}
              <div className="border-t border-slate-100 pt-6 relative z-10">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <BrainCircuit size={16} className="text-indigo-600" /> AI Recommendations
                </h3>
                
                <div className="space-y-3">
                  <div className="flex gap-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                    <div className="bg-white p-1.5 rounded shadow-sm text-indigo-600 h-fit">
                      <Target size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 mb-0.5">Push Transport Facility Details</h4>
                      <p className="text-[11px] text-slate-600">The parent has shown concern regarding the commute. Sending detailed transport routes and safety measures will likely increase conversion by 15%.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                    <div className="bg-white p-1.5 rounded shadow-sm text-indigo-600 h-fit">
                      <BarChart2 size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 mb-0.5">Recommended Course: PCMB</h4>
                      <p className="text-[11px] text-slate-600">Based on the student's previous 10th grade marksheet (extracted via OCR) and stated interest in medical fields, PCMB is highly recommended.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call Logs & Transcript Analysis */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Latest Communication Analysis</h3>
            
            <div className="space-y-4">
              <div className="border-l-2 border-indigo-500 pl-4 py-1 relative">
                <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-indigo-500"></div>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-slate-800">Phone Call with Father</span>
                  <span className="text-[10px] text-slate-400">Yesterday, 14:30</span>
                </div>
                <p className="text-xs text-slate-600 mb-2 italic bg-slate-50 p-2 rounded border border-slate-100">
                  "We really liked the science labs during the campus visit. Only concern is the bus route from Sector 45, does it pick up from the main gate?"
                </p>
                <div className="flex gap-2">
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">Intent: High</span>
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">Topic: Transport</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
