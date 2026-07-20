import React, { useState } from 'react';
import { FileText, CheckCircle, Clock, Search, Filter, Scan, UploadCloud, AlertCircle, Check, X } from 'lucide-react';

export function ApplicationsView() {
  const [selectedApp, setSelectedApp] = useState<number>(1);

  const applications = [
    { id: 1, name: "Aarav Sharma", class: "Class 1", status: "Pending Verification", date: "17 May 2025", matchScore: 85 },
    { id: 2, name: "Priya Patel", class: "Class 6", status: "Verified", date: "16 May 2025", matchScore: 98 },
    { id: 3, name: "Rohan Singh", class: "Nursery", status: "Pending Verification", date: "15 May 2025", matchScore: 65 },
  ];

  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Applications & OCR Verification</h1>
          <p className="text-sm text-slate-500 mt-1">AI-powered document extraction and validation</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
          <UploadCloud size={16} /> Upload Batch
        </button>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Applications List */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800">Recent Applications</h3>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded font-bold">142 Total</span>
          </div>
          <div className="p-3 border-b border-slate-200">
            <div className="relative">
              <input type="text" placeholder="Search applications..." className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500" />
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {applications.map(app => (
              <div 
                key={app.id} 
                onClick={() => setSelectedApp(app.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedApp === app.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-100'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold text-slate-800">{app.name}</h4>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${app.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {app.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>{app.class} • {app.date}</span>
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <Scan size={12} className="text-indigo-500" /> 
                    AI Match: {app.matchScore}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OCR Verification Panel */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Scan size={18} className="text-indigo-600" /> Document OCR Engine
            </h3>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-50 flex items-center gap-1">
                <X size={14} className="text-red-500" /> Reject
              </button>
              <button className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 flex items-center gap-1">
                <Check size={14} /> Approve Verified Data
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Document Previewer */}
            <div className="w-1/2 border-r border-slate-200 bg-slate-100 p-4 flex flex-col relative">
              <div className="flex justify-between items-center mb-2">
                <select className="text-xs bg-white border border-slate-300 rounded px-2 py-1">
                  <option>Birth Certificate</option>
                  <option>Previous Marksheet</option>
                  <option>Address Proof</option>
                </select>
                <div className="flex gap-1">
                  <button className="p-1 bg-white rounded border border-slate-200 text-slate-500 hover:text-indigo-600">+</button>
                  <button className="p-1 bg-white rounded border border-slate-200 text-slate-500 hover:text-indigo-600">-</button>
                </div>
              </div>
              
              {/* Simulated Document with OCR Highlights */}
              <div className="flex-1 bg-white rounded border border-slate-300 shadow-sm relative overflow-hidden flex items-center justify-center p-8">
                <div className="w-full max-w-sm border-2 border-slate-800 p-6 relative bg-[#fdfbf7]">
                  <h2 className="text-center font-serif text-xl border-b-2 border-slate-800 pb-2 mb-4">BIRTH CERTIFICATE</h2>
                  
                  <div className="space-y-4 font-mono text-sm">
                    <div className="flex">
                      <span className="w-32">Name:</span> 
                      <span className="relative">
                        Aarav Sharma
                        <div className="absolute -inset-1 border-2 border-emerald-400 bg-emerald-400/20 rounded z-10 pointer-events-none"></div>
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-32">Date of Birth:</span> 
                      <span className="relative">
                        12-Oct-2015
                        <div className="absolute -inset-1 border-2 border-emerald-400 bg-emerald-400/20 rounded z-10 pointer-events-none"></div>
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-32">Father's Name:</span> 
                      <span className="relative">
                        Rahul Sharma
                        <div className="absolute -inset-1 border-2 border-emerald-400 bg-emerald-400/20 rounded z-10 pointer-events-none"></div>
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-32">Place of Birth:</span> 
                      <span className="relative">
                        New Dehli
                        <div className="absolute -inset-1 border-2 border-amber-400 bg-amber-400/20 rounded z-10 pointer-events-none cursor-help" title="Possible typo detected"></div>
                      </span>
                    </div>
                  </div>
                  
                  {/* OCR Scan Line Animation */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500/50 shadow-[0_0_8px_2px_rgba(99,102,241,0.5)] animate-[scan_3s_ease-in-out_infinite]"></div>
                </div>
              </div>
            </div>

            {/* Extracted Data Panel */}
            <div className="w-1/2 p-4 overflow-y-auto">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
                Extracted Data
                <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  Confidence: 94%
                </span>
              </h4>

              <div className="space-y-4">
                <DataField label="Student Name" extracted="Aarav Sharma" formValue="Aarav Sharma" match={true} />
                <DataField label="Date of Birth" extracted="2015-10-12" formValue="2015-10-12" match={true} />
                <DataField label="Father's Name" extracted="Rahul Sharma" formValue="Rahul Sharma" match={true} />
                <DataField label="Place of Birth" extracted="New Dehli" formValue="New Delhi" match={false} warning="Spelling mismatch detected (Dehli vs Delhi)" />
              </div>

              <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-800">Review Required</h5>
                    <p className="text-[10px] text-amber-700 mt-1">1 mismatch found between the uploaded document and the submitted application form. Please review the 'Place of Birth' field before approving.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function DataField({ label, extracted, formValue, match, warning }: any) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
      <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center">
        <span className="font-semibold text-slate-700">{label}</span>
        {match ? (
          <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle size={12} /> Match</span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600 font-medium"><AlertCircle size={12} /> Mismatch</span>
        )}
      </div>
      <div className="p-3 grid grid-cols-2 gap-4 bg-white">
        <div>
          <div className="text-[10px] text-slate-400 mb-1">Extracted via OCR</div>
          <div className="font-medium text-slate-800">{extracted}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 mb-1">Application Form</div>
          <div className="font-medium text-slate-800">{formValue}</div>
        </div>
      </div>
      {warning && (
        <div className="bg-amber-50 px-3 py-1.5 text-[10px] text-amber-700 border-t border-amber-100 flex items-center gap-1.5">
          <AlertCircle size={10} /> {warning}
        </div>
      )}
    </div>
  );
}

