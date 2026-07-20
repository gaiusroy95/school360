import React, { useState } from 'react';
import { User, Users, BookOpen, HeartPulse, Bus, Home, FileText, IndianRupee, UserPlus, CheckCircle, UploadCloud, AlertCircle } from 'lucide-react';

export function AddNewStudentView() {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, name: 'Basic Info', icon: <User size={14} /> },
    { id: 2, name: 'Parents', icon: <Users size={14} /> },
    { id: 3, name: 'Academic', icon: <BookOpen size={14} /> },
    { id: 4, name: 'Medical', icon: <HeartPulse size={14} /> },
    { id: 5, name: 'Transport', icon: <Bus size={14} /> },
    { id: 6, name: 'Hostel', icon: <Home size={14} /> },
    { id: 7, name: 'Documents', icon: <FileText size={14} /> },
    { id: 8, name: 'Fee Setup', icon: <IndianRupee size={14} /> },
    { id: 9, name: 'Generate', icon: <UserPlus size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-6 pb-2 border-b border-slate-200 bg-white shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Add New Student</h1>
            <p className="text-sm text-slate-500 mt-1">Digital onboarding with automated ERP setup</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              Save Draft
            </button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Next Step
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between pb-4 overflow-x-auto custom-scrollbar">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center flex-shrink-0 mx-2 relative min-w-[70px]">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors cursor-pointer z-10 ${
                  currentStep === step.id 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                    : currentStep > step.id 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'bg-white border-slate-200 text-slate-400'
                }`}
                onClick={() => setCurrentStep(step.id)}
              >
                {currentStep > step.id ? <CheckCircle size={16} /> : step.icon}
              </div>
              <span className={`text-[10px] font-bold mt-2 ${currentStep === step.id ? 'text-indigo-600' : currentStep > step.id ? 'text-emerald-600' : 'text-slate-400'}`}>
                {step.name}
              </span>
              
              {/* Connection Line */}
              {idx < steps.length - 1 && (
                <div className={`absolute top-5 left-1/2 w-full h-[2px] -z-10 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-200'}`} style={{ width: 'calc(100% + 1rem)' }}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
          
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                  <input type="text" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter first name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                  <input type="text" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter last name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth *</label>
                  <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                  <select className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option>Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                  <select className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option>Select Blood Group</option>
                    <option>A+</option><option>A-</option>
                    <option>B+</option><option>B-</option>
                    <option>O+</option><option>O-</option>
                    <option>AB+</option><option>AB-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Aadhaar Number (Optional)</label>
                  <input type="text" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="12-digit number" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Religion</label>
                  <input type="text" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. Hindu" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nationality</label>
                  <input type="text" defaultValue="Indian" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option>General</option>
                    <option>OBC</option>
                    <option>SC/ST</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-lg font-bold text-slate-800">Documents Upload</h3>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded border border-indigo-100">OCR Enabled</span>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 flex gap-4 items-start">
                <AlertCircle className="text-indigo-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-indigo-900">AI Document Extraction</h4>
                  <p className="text-xs text-indigo-700 mt-1">Upload the birth certificate and Aadhaar card. Our OCR engine will automatically verify the details against the form data.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600 rounded-full flex items-center justify-center mb-3 transition-colors">
                    <UploadCloud size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Birth Certificate</h4>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600 rounded-full flex items-center justify-center mb-3 transition-colors">
                    <UploadCloud size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Aadhaar Card</h4>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                </div>
              </div>
            </div>
          )}

          {currentStep !== 1 && currentStep !== 7 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                {steps.find(s => s.id === currentStep)?.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">{steps.find(s => s.id === currentStep)?.name} Module</h3>
              <p className="text-sm text-slate-500 max-w-md">
                This step handles the {steps.find(s => s.id === currentStep)?.name.toLowerCase()} details. Connected via SSOT to ensure no duplicate entries in other ERP modules.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
