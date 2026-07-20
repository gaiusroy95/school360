import React, { useState, useEffect } from 'react';
import { UploadCloud, Download, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle, Database, Server, RefreshCw, Key, Settings, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

export function ExpressSetupView({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'provisioning' | 'error' | 'final_steps'>('upload');
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  
  const handleUpload = (simulateError: boolean) => {
    if (simulateError) {
      setTimeout(() => {
        setStep('error');
      }, 1000);
    } else {
      setTimeout(() => {
        setStep('mapping');
      }, 1500);
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Tab 1: Global Settings
    const globalSettingsData = [
      ['Setting Key', 'Setting Value', 'Description'],
      ['Institution Name', 'Acme International School', 'Full registered name'],
      ['Address', '123 Education Lane, Knowledge City', 'Primary address'],
      ['Contact Number', '+1 234 567 8900', 'Primary phone'],
      ['Language', 'English', 'Default system language'],
      ['Currency', 'USD', '3-letter currency code'],
      ['Time Zone', 'America/New_York', 'Standard time zone format'],
      ['Password Policy', 'Strong (8+ chars, special char)', 'Weak / Medium / Strong'],
      ['Backup Schedule', 'Daily at 2:00 AM', 'Daily / Weekly / Monthly']
    ];
    const wsGlobal = XLSX.utils.aoa_to_sheet(globalSettingsData);
    XLSX.utils.book_append_sheet(wb, wsGlobal, 'Global Settings');

    // Tab 2: Academic Structure
    const academicStructureData = [
      ['Education Board', 'Medium', 'Academic Session Start', 'Academic Session End', 'Terms/Semesters'],
      ['CBSE', 'English', '2025-04-01', '2026-03-31', 'Term 1, Term 2'],
      ['State Board', 'Regional', '2025-06-01', '2026-05-31', 'Semester 1, Semester 2']
    ];
    const wsAcademic = XLSX.utils.aoa_to_sheet(academicStructureData);
    XLSX.utils.book_append_sheet(wb, wsAcademic, 'Academic Structure');

    // Tab 3: Classes & Sections
    const classesData = [
      ['Class Name', 'Section Name', 'Capacity', 'Room Mapping'],
      ['Class 1', 'A', '30', 'Room 101'],
      ['Class 1', 'B', '30', 'Room 102'],
      ['Class 2', 'A', '35', 'Room 103']
    ];
    const wsClasses = XLSX.utils.aoa_to_sheet(classesData);
    XLSX.utils.book_append_sheet(wb, wsClasses, 'Classes & Sections');

    // Tab 4: Subjects & Departments
    const subjectsData = [
      ['Subject Name', 'Subject Code', 'Type (Core/Elective)', 'Department Name', 'HOD Name'],
      ['Mathematics', 'MATH101', 'Core', 'Mathematics', 'Dr. Smith'],
      ['Physics', 'PHY101', 'Core', 'Science', 'Prof. Johnson'],
      ['Computer Science', 'CS101', 'Elective', 'Computer Science', 'Mr. Davis']
    ];
    const wsSubjects = XLSX.utils.aoa_to_sheet(subjectsData);
    XLSX.utils.book_append_sheet(wb, wsSubjects, 'Subjects & Depts');

    // Tab 5: Grading & Fees
    const feesData = [
      ['Grading System Type', 'Pass/Fail Criteria', 'Fee Group Name', 'Fee Types', 'Installment Rules'],
      ['CGPA (10 Point)', 'Min 4.0 CGPA', 'Primary (Class 1-5)', 'Tuition, Transport, Library', 'Quarterly (4 Installments)'],
      ['Percentage', 'Min 33%', 'Middle (Class 6-8)', 'Tuition, Transport, Lab, Library', 'Half-Yearly (2 Installments)']
    ];
    const wsFees = XLSX.utils.aoa_to_sheet(feesData);
    XLSX.utils.book_append_sheet(wb, wsFees, 'Grading & Fees');

    // Tab 6: Operations & Prefs
    const opsData = [
      ['Document Categories Required', 'ID Card Prefix', 'Roll No Format', 'Base Holiday Calendar Dates'],
      ['Birth Certificate, Aadhar Card, Transfer Certificate', 'STU-', 'CLASS-SEC-ROLL', '2025-01-01, 2025-08-15, 2025-10-02, 2025-12-25']
    ];
    const wsOps = XLSX.utils.aoa_to_sheet(opsData);
    XLSX.utils.book_append_sheet(wb, wsOps, 'Operations & Prefs');

    XLSX.writeFile(wb, 'Master_Setup_v2.xlsx');
  };

  // Simulated DB Transaction
  const startProvisioning = () => {
    setStep('provisioning');
    setProgress(0);
    
    const steps = [
      { p: 10, msg: "Step 1: Setting up Global Preferences & Security..." },
      { p: 35, msg: "Step 2: Provisioning Academic Core (Sessions, Terms, Departments)..." },
      { p: 60, msg: "Step 3: Generating Class & Section Hierarchy..." },
      { p: 75, msg: "Step 4: Mapping Subjects to Departments & Classes..." },
      { p: 90, msg: "Step 5: Configuring Financials (Fee Groups & Installment Rules)..." },
      { p: 100, msg: "Finalizing Database Transaction & ACID Commit..." }
    ];

    let currentStepIndex = 0;
    
    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        setProgress(steps[currentStepIndex].p);
        setProgressStatus(steps[currentStepIndex].msg);
        currentStepIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setStep('final_steps');
        }, 1000);
      }
    }, 1200); // Adjust timing for realism
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="p-6 pb-4 border-b border-slate-200 bg-white shrink-0 flex justify-between items-center">
        <div>
          <button onClick={onBack} className="text-xs text-indigo-600 hover:underline mb-1 font-medium">&larr; Back to Setup Modules</button>
          <h1 className="text-2xl font-bold text-slate-800">Express Setup Engine (Module 18)</h1>
          <p className="text-sm text-slate-500 mt-1">Automated ERP Onboarding & Data Import</p>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center">
        
        {step === 'upload' && (
          <div className="max-w-3xl w-full space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
               <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet size={32} />
               </div>
               <h2 className="text-lg font-bold text-slate-800 mb-2">Master Setup Template</h2>
               <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6">Download the multi-tab Excel template. Fill in your Global Settings, Academic Structure, Classes, Subjects, and Fees offline, then upload it here.</p>
               <button onClick={handleDownloadTemplate} className="px-5 py-2.5 bg-white border-2 border-emerald-500 text-emerald-700 font-bold rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-2 mx-auto shadow-sm">
                  <Download size={18} /> Download Master_Setup_v2.xlsx
               </button>
            </div>

            <div className="bg-white p-8 rounded-xl border-2 border-dashed border-indigo-300 shadow-sm text-center relative group">
               <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept=".xlsx, .csv" onChange={(e) => {
                 if (e.target.files && e.target.files.length > 0) {
                   handleUpload(false);
                 }
               }} />
               <div className="w-16 h-16 bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                  <UploadCloud size={32} />
               </div>
               <h2 className="text-lg font-bold text-slate-800 mb-2">Upload Completed Template</h2>
               <p className="text-sm text-slate-500 mb-4">Drag and drop your .xlsx or .csv file here, or click to browse.</p>
               <div className="relative z-20 flex gap-2 justify-center">
                 <button onClick={(e) => { e.stopPropagation(); handleUpload(true); }} className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded text-xs font-bold hover:bg-rose-100">
                    Test Invalid Upload
                 </button>
               </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-amber-800 text-sm">
               <AlertCircle size={20} className="shrink-0" />
               <div>
                  <p className="font-bold mb-1">Strict Validation Notice</p>
                  <p className="text-xs">The upload engine will parse all 6 tabs simultaneously. Ensure all foreign key references (e.g., matching Subject Codes to Departments) are correct. Partial uploads will be automatically rolled back.</p>
               </div>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="max-w-4xl w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
             <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                   <XCircle size={24} />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-slate-800">Validation Error Report</h2>
                   <p className="text-sm text-slate-500">The template contains critical data integrity errors. The database transaction was rolled back.</p>
                </div>
             </div>

             <div className="space-y-4 mb-6">
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg flex gap-3 text-sm">
                   <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                   <div>
                      <p className="font-bold text-rose-800">Tab 'Classes & Sections', Row 12</p>
                      <p className="text-rose-700 mt-1">Error: Capacity cannot be blank. A numeric value is required for class capacity.</p>
                   </div>
                </div>
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex gap-3 text-sm">
                   <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                   <div>
                      <p className="font-bold text-amber-800">Tab 'Subjects & Departments', Row 45</p>
                      <p className="text-amber-700 mt-1">Error: Foreign Key Violation. Department 'ScienceLab' does not exist in the Departments tab.</p>
                   </div>
                </div>
             </div>

             <div className="flex justify-between items-center border-t border-slate-100 pt-6">
                <p className="text-xs text-slate-500 max-w-sm">Please fix the errors in your Excel file and upload again. No partial data was inserted.</p>
                <button onClick={() => setStep('upload')} className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors shadow-sm flex items-center gap-2">
                   <RefreshCw size={18} /> Re-Upload Template
                </button>
             </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="max-w-4xl w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
             <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
                <Database className="text-indigo-600" /> Data Parsing Successful
             </h2>
             
             <p className="text-sm text-slate-600 mb-6">We found the following records across 6 tabs. Please confirm the relational mapping before we initialize the database transaction.</p>
             
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
               {[
                 { label: "Global Preferences", count: "32 Keys", bg: "bg-blue-50 text-blue-700" },
                 { label: "Academic Sessions", count: "2 Sessions", bg: "bg-emerald-50 text-emerald-700" },
                 { label: "Classes & Sections", count: "15 Classes / 42 Sec", bg: "bg-purple-50 text-purple-700" },
                 { label: "Departments & Subjects", count: "4 Dept / 28 Subj", bg: "bg-amber-50 text-amber-700" },
                 { label: "Fee Groups & Types", count: "12 Groups / 34 Types", bg: "bg-teal-50 text-teal-700" },
                 { label: "Holiday Calendars", count: "14 Base Holidays", bg: "bg-rose-50 text-rose-700" },
               ].map((item, i) => (
                 <div key={i} className={`p-4 rounded-lg border ${item.bg.replace('bg-', 'border-').replace('50', '200')} ${item.bg}`}>
                    <p className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-80">{item.label}</p>
                    <p className="text-xl font-black">{item.count}</p>
                 </div>
               ))}
             </div>

             <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                <button onClick={() => setStep('upload')} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
                   Cancel
                </button>
                <button onClick={startProvisioning} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
                   <Server size={18} /> Confirm Provisioning (ACID Transaction)
                </button>
             </div>
          </div>
        )}

        {step === 'provisioning' && (
          <div className="max-w-2xl w-full bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center animate-fade-in my-auto">
             <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <RefreshCw size={36} className="animate-spin" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <Database size={10} className="text-white" />
                </div>
             </div>
             <h2 className="text-2xl font-bold text-slate-800 mb-2">Executing Express Setup...</h2>
             <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">Please do not close this window. We are inserting relational records into the central SSOT database.</p>
             
             <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
                <div className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
             </div>
             <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>{progressStatus}</span>
                <span>{progress}%</span>
             </div>
          </div>
        )}

        {step === 'final_steps' && (
          <div className="max-w-3xl w-full bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
             <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                  <ShieldCheck size={32} />
                </div>
                <div>
                   <h2 className="text-2xl font-bold text-slate-800">Provisioning Complete</h2>
                   <p className="text-sm text-slate-500 mt-1">100% of tabular data successfully migrated without constraint violations.</p>
                </div>
             </div>

             <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                   <Key className="text-indigo-600" size={16} /> Final Steps: Secure Integrations (Module 15)
                </h3>
                <p className="text-xs text-slate-600 mb-4">Because API keys should never be transmitted in a plain Excel file, please configure your gateways below.</p>
                
                <div className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-700">Payment Gateway (Razorpay/Stripe) Key</label>
                         <input type="password" placeholder="pk_live_..." className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500" />
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-700">Payment Gateway Secret</label>
                         <input type="password" placeholder="sk_live_..." className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500" />
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-700">SMS Gateway API Key (Twilio/Msg91)</label>
                         <input type="password" placeholder="Enter API Key" className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500" />
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-700">SSO Client Secret (Google Workspace)</label>
                         <input type="password" placeholder="Enter Client Secret" className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500" />
                      </div>
                   </div>
                </div>
             </div>

             <div className="flex justify-between items-center border-t border-slate-100 pt-6">
                <span className="text-xs text-slate-500 flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500"/> Default Email/SMS templates have been auto-seeded.</span>
                <button onClick={onBack} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                   Save Integrations & Finish
                </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
