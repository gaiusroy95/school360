import React from 'react';
import { Enquiry, EnquiryStatus } from '../../../lib/admissionServices';
import { Edit, Phone, Calendar, User } from 'lucide-react';

export function LeadsKanban({ 
  enquiries, 
  onStatusUpdate, 
  onEdit 
}: { 
  enquiries: Enquiry[], 
  onStatusUpdate: (id: string, status: EnquiryStatus) => void, 
  onEdit: (enq: Enquiry) => void 
}) {
  const columns: EnquiryStatus[] = ['New', 'In Process', 'Follow Up', 'Converted', 'Not Interested'];

  const handleDragStart = (e: React.DragEvent, enquiryId: string) => {
    e.dataTransfer.setData('enquiryId', enquiryId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: EnquiryStatus) => {
    e.preventDefault();
    const enquiryId = e.dataTransfer.getData('enquiryId');
    if (enquiryId) {
      onStatusUpdate(enquiryId, status);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto p-4 h-[calc(100vh-120px)] bg-slate-50">
      {columns.map(status => {
        const columnEnquiries = enquiries.filter(e => e.status === status);
        return (
          <div 
            key={status} 
            className="flex-shrink-0 w-80 bg-slate-100/50 rounded-xl border border-slate-200 flex flex-col h-full"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className={`p-3 border-b border-slate-200 rounded-t-xl flex justify-between items-center ${
              status === 'New' ? 'bg-blue-50' : 
              status === 'In Process' || status === 'Follow Up' ? 'bg-amber-50' : 
              status === 'Converted' ? 'bg-emerald-50' : 
              'bg-red-50'
            }`}>
              <h3 className={`font-bold text-sm ${
                status === 'New' ? 'text-blue-800' : 
                status === 'In Process' || status === 'Follow Up' ? 'text-amber-800' : 
                status === 'Converted' ? 'text-emerald-800' : 
                'text-red-800'
              }`}>{status}</h3>
              <span className="bg-white text-xs font-semibold px-2 py-1 rounded-md text-slate-500 shadow-sm border border-slate-200">
                {columnEnquiries.length}
              </span>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {columnEnquiries.map(enq => (
                <div 
                  key={enq.id} 
                  draggable
                  onDragStart={(e) => enq.id && handleDragStart(e, enq.id)}
                  className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{enq.enquirerName}</p>
                      <p className="text-xs text-indigo-600 font-medium">{enq.enquiryId}</p>
                    </div>
                    <button onClick={() => onEdit(enq)} className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                      <Edit size={14} />
                    </button>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone size={12} className="text-slate-400" />
                      <span>{enq.mobile}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Calendar size={12} className="text-slate-400" />
                      <span>Class: {enq.classInterested}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {enq.source}
                    </span>
                    {enq.assignedTo && (
                      <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded text-[10px] font-medium text-indigo-700">
                        <User size={10} />
                        <span className="truncate max-w-[80px]">{enq.assignedTo.split(' ')[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {columnEnquiries.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-lg">
                  Drop leads here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
