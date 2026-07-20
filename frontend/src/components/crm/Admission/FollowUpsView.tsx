import React from 'react';
import { Clock, Calendar, CheckCircle, Video, Phone, Mail, MoreHorizontal } from 'lucide-react';

export function FollowUpsView() {
  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Follow Ups</h1>
          <p className="text-sm text-slate-500 mt-1">Manage tasks and recurring triggers</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2">
          <Calendar size={16} /> Schedule Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-slate-800 mb-2">Upcoming Tasks</h3>
          
          {[
            { title: "Call Rahul's Father regarding fee structure", time: "Today, 10:30 AM", type: "Phone", icon: <Phone size={14} className="text-blue-500" /> },
            { title: "Campus visit for Nursery Admission", time: "Today, 02:00 PM", type: "Visit", icon: <Calendar size={14} className="text-emerald-500" /> },
            { title: "Video counselling for Class 11 Science", time: "Tomorrow, 11:00 AM", type: "Video Call", icon: <Video size={14} className="text-purple-500" /> },
            { title: "Send Prospectus to 10 new leads", time: "Tomorrow, EOD", type: "Email", icon: <Mail size={14} className="text-amber-500" /> },
          ].map((task, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                  {task.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{task.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{task.type}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10} /> {task.time}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-green-50 hover:text-green-600 transition-colors border border-slate-100">
                  <CheckCircle size={14} />
                </button>
                <button className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors border border-slate-100">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Task Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">Pending</span>
                <span className="text-sm font-bold text-slate-800">12</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-sm text-slate-600">Completed (This Week)</span>
                <span className="text-sm font-bold text-green-600">45</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Overdue</span>
                <span className="text-sm font-bold text-red-500">3</span>
              </div>
            </div>
          </div>
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
            <h3 className="font-semibold text-indigo-900 text-sm mb-2">Automated Sequences</h3>
            <p className="text-xs text-indigo-700/80 mb-4">2 active workflows running</p>
            <div className="space-y-2">
              <div className="bg-white/60 p-2 rounded text-xs text-indigo-800 flex justify-between">
                <span>Welcome Email Sequence</span>
                <span className="bg-indigo-100 px-1.5 rounded text-[10px]">Active</span>
              </div>
              <div className="bg-white/60 p-2 rounded text-xs text-indigo-800 flex justify-between">
                <span>Missed Call WhatsApp</span>
                <span className="bg-indigo-100 px-1.5 rounded text-[10px]">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
