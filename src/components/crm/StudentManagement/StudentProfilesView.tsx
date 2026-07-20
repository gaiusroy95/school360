import React, { useState } from 'react';
import { User, BookOpen, Calendar, IndianRupee, FileText, Bus, Home, HeartPulse, MessageSquare, Award } from 'lucide-react';

export function StudentProfilesView() {
  const [activeTab, setActiveTab] = useState('Overview');
  const tabs = [
    { name: 'Overview', icon: <User size={14} /> },
    { name: 'Academics', icon: <BookOpen size={14} /> },
    { name: 'Attendance', icon: <Calendar size={14} /> },
    { name: 'Fees', icon: <IndianRupee size={14} /> },
    { name: 'Examination', icon: <FileText size={14} /> },
    { name: 'Library', icon: <BookOpen size={14} /> },
    { name: 'Transport', icon: <Bus size={14} /> },
    { name: 'Hostel', icon: <Home size={14} /> },
    { name: 'Medical', icon: <HeartPulse size={14} /> },
    { name: 'Comms', icon: <MessageSquare size={14} /> },
    { name: 'Documents', icon: <FileText size={14} /> },
    { name: 'Behavior', icon: <Award size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="p-6 pb-4 flex items-start gap-6">
          <div className="w-24 h-24 bg-slate-200 rounded-2xl overflow-hidden shadow-sm shrink-0 border border-slate-200">
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=Aarav Sharma" alt="Aarav" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-800">Aarav Sharma</h1>
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">Active</span>
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">Class 6 - A</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                  <span>Adm No: <strong className="text-slate-800">ADM2025001256</strong></span>
                  <span>Roll No: <strong className="text-slate-800">01</strong></span>
                  <span>RFID: <strong className="text-slate-800">RF-8923-455</strong></span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors">
                  Edit Profile
                </button>
                <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                  Download ID Card
                </button>
              </div>
            </div>
            
            {/* Quick Alerts */}
            <div className="flex gap-3 mt-4">
              <div className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                <IndianRupee size={14} /> <span>Fee Due: ₹12,500</span>
              </div>
              <div className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                <Calendar size={14} /> <span>Absent Today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto custom-scrollbar px-6 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.name 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                  {tabs.find(t => t.name === activeTab)?.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">{activeTab} Details</h3>
                <p className="text-sm text-slate-500 max-w-md">
                  This section provides a deep dive into the student's {activeTab.toLowerCase()} data. The data is synced in real-time from the central SSOT database.
                </p>
             </div>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Global Timeline</h3>
              <div className="relative pl-4 border-l border-slate-200 space-y-5 ml-2">
                {[
                  { title: 'Absent marked by Class Teacher', time: 'Today, 08:30 AM', type: 'Attendance', color: 'bg-red-500' },
                  { title: 'Library Book Issued: Physics Vol 1', time: 'Yesterday, 02:15 PM', type: 'Library', color: 'bg-indigo-500' },
                  { title: 'Homework Submitted: Mathematics', time: '14 May, 09:00 PM', type: 'Academics', color: 'bg-emerald-500' },
                  { title: 'Fee Reminder SMS Sent', time: '12 May, 10:00 AM', type: 'Comms', color: 'bg-amber-500' },
                ].map((act, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${act.color}`}></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">{act.type}</span>
                    <p className="text-xs font-bold text-slate-800 leading-tight mb-1">{act.title}</p>
                    <p className="text-[10px] text-slate-400">{act.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
