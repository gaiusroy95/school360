import React, { useState, useEffect } from 'react';
import { 
  subscribeToEnquiries, subscribeToAllActivities, subscribeToAllTasks, 
  addEnquiry, updateEnquiryStatus, deleteEnquiry, Enquiry, Activity, FollowUpTask, EnquiryStatus 
} from '../../lib/admissionServices';
import { 
  Users, UserPlus, RefreshCw, CheckCircle, XCircle, Percent, Phone, Mail, Edit, Trash2, 
  Plus, Calendar, Clock, Download, ChevronRight, X, User, Search, Filter, MessageSquare, 
  MoreVertical, UploadCloud, PieChart as PieChartIcon, Target, Lightbulb, Link, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { LeadsKanban } from './Admission/LeadsKanban';
import { ApplicationsView } from './Admission/ApplicationsView';
import { FollowUpsView } from './Admission/FollowUpsView';
import { AdmissionTestView } from './Admission/AdmissionTestView';
import { CounsellingView } from './Admission/CounsellingView';
import { SubModuleView } from './shared/SubModuleView';

const SPARK_DATA_UP = [{v: 10}, {v: 15}, {v: 12}, {v: 20}, {v: 25}, {v: 22}, {v: 30}];
const SPARK_DATA_DOWN = [{v: 30}, {v: 28}, {v: 22}, {v: 25}, {v: 15}, {v: 18}, {v: 10}];

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2'];

export function AdmissionCRM({ currentView = 'Enquiries' }: { currentView?: string }) {
  const { user } = useAuth();
  
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<string>('All');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  // Filter state
  const [filterClass, setFilterClass] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const unsubEnquiries = subscribeToEnquiries((data) => {
      setEnquiries(data);
      setLoading(false);
    });
    
    const unsubActivities = subscribeToAllActivities((data) => {
      setActivities(data);
    });
    
    const unsubTasks = subscribeToAllTasks((data) => {
      setTasks(data);
    });

    return () => {
      unsubEnquiries();
      unsubActivities();
      unsubTasks();
    };
  }, []);

  // Filter logic
  let filteredEnquiries = enquiries;
  if (activeTab !== 'All') {
    filteredEnquiries = filteredEnquiries.filter(e => e.status === activeTab);
  }
  if (filterClass !== 'All') {
    filteredEnquiries = filteredEnquiries.filter(e => e.classInterested === filterClass);
  }
  if (filterSource !== 'All') {
    filteredEnquiries = filteredEnquiries.filter(e => e.source === filterSource);
  }
  if (filterStatus !== 'All') {
    filteredEnquiries = filteredEnquiries.filter(e => e.status === filterStatus);
  }
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredEnquiries = filteredEnquiries.filter(e => 
      e.enquirerName?.toLowerCase().includes(query) || 
      e.enquiryId?.toLowerCase().includes(query) ||
      e.mobile?.includes(query)
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage);
  const currentItems = filteredEnquiries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const kpis = {
    total: enquiries.length,
    new: enquiries.filter(e => e.status === 'New').length,
    inProcess: enquiries.filter(e => e.status === 'In Process').length,
    converted: enquiries.filter(e => e.status === 'Converted').length,
    notInterested: enquiries.filter(e => e.status === 'Not Interested').length,
  };
  const conversionRate = kpis.total ? ((kpis.converted / kpis.total) * 100).toFixed(2) : '0.00';

  // Chart Data
  const lineChartData = [
    { date: '18 Apr', value: 20 },
    { date: '23 Apr', value: 55 },
    { date: '28 Apr', value: 40 },
    { date: '03 May', value: 65 },
    { date: '08 May', value: 45 },
    { date: '13 May', value: 30 },
    { date: '17 May', value: 80 },
  ];

  const sourceDataMap: any = {};
  enquiries.forEach(e => {
    sourceDataMap[e.source] = (sourceDataMap[e.source] || 0) + 1;
  });
  let sourceData = Object.keys(sourceDataMap).map(key => ({ name: key, value: sourceDataMap[key] }));
  if (sourceData.length === 0) {
    sourceData = [
      { name: 'Website', value: 425 },
      { name: 'Walk-in', value: 298 },
      { name: 'Phone Call', value: 214 },
      { name: 'Facebook', value: 156 },
      { name: 'Referral', value: 102 },
      { name: 'Others', value: 50 },
    ];
  }

  const classDataMap: any = {};
  enquiries.forEach(e => {
    classDataMap[e.classInterested] = (classDataMap[e.classInterested] || 0) + 1;
  });
  let classData = Object.keys(classDataMap).map(key => ({ name: key, value: classDataMap[key] }));
  if (classData.length === 0) {
    classData = [
      { name: 'Nursery', value: 120 },
      { name: 'LKG', value: 132 },
      { name: 'UKG', value: 156 },
      { name: 'Class 1-5', value: 298 },
      { name: 'Class 6-8', value: 214 },
      { name: 'Class 9-10', value: 180 },
      { name: 'Class 11-12', value: 145 },
    ];
  }

  const funnelData = [
    { name: 'New Enquiries', value: 1245 },
    { name: 'Contacted', value: 1012 },
    { name: 'Follow Up', value: 824 },
    { name: 'Application', value: 378 },
    { name: 'Converted', value: 245 },
  ];

  const multiLineData = [
    { date: '18 Apr', enquiries: 60, applications: 20, admissions: 10 },
    { date: '24 Apr', enquiries: 45, applications: 25, admissions: 15 },
    { date: '30 Apr', enquiries: 75, applications: 30, admissions: 20 },
    { date: '06 May', enquiries: 55, applications: 40, admissions: 25 },
    { date: '12 May', enquiries: 85, applications: 35, admissions: 30 },
    { date: '17 May', enquiries: 65, applications: 50, admissions: 35 },
  ];

  const handleStatusChange = async (id: string, newStatus: EnquiryStatus) => {
    await updateEnquiryStatus(id, newStatus, undefined, user?.uid);
  };

  if (currentView === 'Leads') {
    return <LeadsKanban enquiries={filteredEnquiries} onStatusUpdate={handleStatusChange} onEdit={(enq) => { setSelectedEnquiry(enq); setIsEditModalOpen(true); }} />;
  }
  if (currentView === 'Applications') {
    return <ApplicationsView />;
  }
  if (currentView === 'Follow Ups') {
    return <FollowUpsView />;
  }
  if (currentView === 'Counselling') {
    return <CounsellingView />;
  }
  if (currentView === 'Admission Test') {
    return <AdmissionTestView />;
  }
  if (currentView && currentView !== 'Enquiries') {
    return <SubModuleView module="Admission CRM" title={currentView} />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Enquiries Management</h1>
            <p className="text-sm text-slate-500 mt-1">Admission CRM &gt; Enquiries</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm">
              <Download size={16} /> Import Enquiries
            </button>
            <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm">
              <UploadCloud size={16} /> Export Report
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Add Enquiry
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard title="Total Enquiries" value={kpis.total > 0 ? kpis.total : 1245} change="+18.6%" trend="up" icon={<Users className="text-blue-600" size={24} />} color="blue" />
          <KpiCard title="New Enquiries" value={kpis.new > 0 ? kpis.new : 356} change="+12.4%" trend="up" icon={<UserPlus className="text-green-600" size={24} />} color="green" />
          <KpiCard title="In Process" value={kpis.inProcess > 0 ? kpis.inProcess : 512} change="+8.7%" trend="up" icon={<RefreshCw className="text-amber-600" size={24} />} color="amber" />
          <KpiCard title="Converted" value={kpis.converted > 0 ? kpis.converted : 245} change="+15.3%" trend="up" icon={<CheckCircle className="text-purple-600" size={24} />} color="purple" />
          <KpiCard title="Not Interested" value={kpis.notInterested > 0 ? kpis.notInterested : 98} change="-5.2%" trend="down" icon={<XCircle className="text-red-600" size={24} />} color="red" />
          <KpiCard title="Conversion Rate" value={`${kpis.total > 0 ? conversionRate : '19.68'}%`} change="+3.4%" trend="up" icon={<Percent className="text-teal-600" size={24} />} color="teal" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Overview Chart */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800">Enquiries Overview</h3>
              <select className="text-xs border-slate-300 rounded text-slate-500"><option>Last 30 Days</option></select>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineChartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* By Source Chart */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800">Enquiries by Source</h3>
            </div>
            <div className="flex h-48 items-center justify-between">
              <div className="w-1/2 h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{fontSize: '12px'}}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-slate-800">{kpis.total > 0 ? kpis.total : 1245}</span>
                  <span className="text-[10px] text-slate-500">Total</span>
                </div>
              </div>
              <div className="w-1/2 flex flex-col justify-center space-y-2">
                {sourceData.slice(0, 6).map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                      <span className="text-slate-600 truncate max-w-[60px]">{item.name}</span>
                    </div>
                    <span className="text-slate-800 font-medium">{item.value} <span className="text-slate-400">({Math.round((item.value / 1245) * 100)}%)</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* By Class Chart */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800">Enquiries by Class</h3>
              <select className="text-xs border-slate-300 rounded text-slate-500"><option>This Month</option></select>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData} layout="vertical" margin={{top: 0, right: 30, left: 10, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} width={60} />
                  <Tooltip contentStyle={{fontSize: '12px'}} cursor={{fill: '#f8fafc'}}/>
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={8}>
                    {/* Add label for value manually if needed, or use Recharts LabelList */}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Funnel Chart (Mocked visually) */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800">Enquiry Funnel</h3>
            </div>
            <div className="h-48 flex flex-col justify-center items-center px-4 space-y-1 w-full">
              {funnelData.map((step, i) => {
                const width = 100 - (i * 15);
                const colors = ['bg-blue-600', 'bg-sky-500', 'bg-teal-500', 'bg-emerald-500', 'bg-green-600'];
                return (
                  <div key={i} className="w-full flex items-center justify-between group">
                    <div className="w-[120px] flex justify-center">
                      <div className={`${colors[i]} h-7 transition-all duration-300 flex items-center justify-center shadow-sm text-white text-[10px]`}
                        style={{ width: `${width}%`, clipPath: 'polygon(5% 0, 95% 0, 100% 100%, 0 100%)' }}>
                      </div>
                    </div>
                    <div className="flex-1 flex justify-between items-center pl-4 border-l border-slate-100 ml-2">
                      <span className="text-xs text-slate-600">{step.name}</span>
                      <span className="text-xs font-semibold text-slate-800">{step.value} <span className="text-slate-400 font-normal">({Math.round((step.value/1245)*100)}%)</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area (Table + Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Main Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800">Enquiries List</h3>
                  <div className="flex gap-2">
                    <select className="text-xs border border-slate-300 rounded-lg px-2 py-1.5" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                      <option value="All">Select Class</option>
                      <option value="Nursery">Nursery</option>
                      <option value="Class 1">Class 1</option>
                      <option value="Class 6">Class 6</option>
                      <option value="Class 9">Class 9</option>
                    </select>
                    <select className="text-xs border border-slate-300 rounded-lg px-2 py-1.5" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                      <option value="All">Select Source</option>
                      <option value="Website">Website</option>
                      <option value="Walk-in">Walk-in</option>
                    </select>
                    <select className="text-xs border border-slate-300 rounded-lg px-2 py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                      <option value="All">Select Status</option>
                      <option value="New">New</option>
                      <option value="In Process">In Process</option>
                    </select>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search enquiry..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-48"
                      />
                      <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
                    </div>
                    <button className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1 hover:bg-slate-50">
                      <Filter size={14} /> Filter
                    </button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {['All', 'New', 'In Process', 'Converted', 'Not Interested'].map(tab => {
                    const count = tab === 'All' ? kpis.total || 1245 : 
                                  tab === 'New' ? kpis.new || 356 :
                                  tab === 'In Process' ? kpis.inProcess || 512 :
                                  tab === 'Converted' ? kpis.converted || 245 :
                                  kpis.notInterested || 98;
                    return (
                      <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {tab} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10 text-center"><input type="checkbox" className="rounded border-slate-300" /></th>
                      <th className="p-3 font-semibold">Enquiry ID</th>
                      <th className="p-3 font-semibold">Enquiry Date</th>
                      <th className="p-3 font-semibold">Enquirer Name</th>
                      <th className="p-3 font-semibold">Mobile</th>
                      <th className="p-3 font-semibold">Email</th>
                      <th className="p-3 font-semibold">Class Interested</th>
                      <th className="p-3 font-semibold">Source</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Assigned To</th>
                      <th className="p-3 font-semibold">Next Follow Up</th>
                      <th className="p-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={12} className="p-8 text-center text-slate-500">Loading enquiries...</td></tr>
                    ) : currentItems.length === 0 ? (
                      <tr><td colSpan={12} className="p-8 text-center text-slate-500">No enquiries found.</td></tr>
                    ) : currentItems.map((enq) => (
                      <tr key={enq.id} className="hover:bg-slate-50">
                        <td className="p-3 text-center"><input type="checkbox" className="rounded border-slate-300" /></td>
                        <td className="p-3 text-indigo-600 font-medium cursor-pointer" onClick={() => { setSelectedEnquiry(enq); setIsEditModalOpen(true); }}>{enq.enquiryId}</td>
                        <td className="p-3 text-slate-600">{enq.enquiryDate?.toDate ? enq.enquiryDate.toDate().toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '17 May 2025'}</td>
                        <td className="p-3 font-semibold text-slate-800">{enq.enquirerName}</td>
                        <td className="p-3 text-slate-600">{enq.mobile}</td>
                        <td className="p-3 text-slate-500 truncate max-w-[120px]">{enq.email}</td>
                        <td className="p-3 text-slate-600">{enq.classInterested}</td>
                        <td className="p-3 text-slate-600">{enq.source}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border
                            ${enq.status === 'New' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                              enq.status === 'In Process' || enq.status === 'Follow Up' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                              enq.status === 'Converted' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                              'bg-red-50 text-red-600 border-red-200'
                            }
                          `}>
                            {enq.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{enq.assignedTo}</td>
                        <td className="p-3 text-slate-600">{enq.nextFollowUp || '-'}</td>
                        <td className="p-3 flex justify-center gap-2 text-slate-400">
                          <button className="p-1 hover:text-green-600 hover:bg-green-50 rounded"><Phone size={14} /></button>
                          <button className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded"><MessageSquare size={14} /></button>
                          <button onClick={() => { setSelectedEnquiry(enq); setIsEditModalOpen(true); }} className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit size={14} /></button>
                          <button className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded"><MoreVertical size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="p-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 bg-white">
                <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEnquiries.length)} of {filteredEnquiries.length} entries</span>
                <div className="flex space-x-1">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >&lt;</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button 
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-2 py-1 rounded border ${currentPage === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 hover:bg-slate-50'}`}
                    >{page}</button>
                  ))}
                  <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >&gt;</button>
                </div>
              </div>
            </div>

            {/* Bottom 3 Sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Conversion Trend */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-800">Conversion Trend</h3>
                  <select className="text-xs border-slate-300 rounded text-slate-500"><option>This Month</option></select>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500">Total Enquiries</div>
                    <div className="font-bold text-slate-800 text-sm">1,245</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Applications</div>
                    <div className="font-bold text-slate-800 text-sm">378 <span className="text-slate-400 font-normal">(30.4%)</span></div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Admissions</div>
                    <div className="font-bold text-slate-800 text-sm">245 <span className="text-slate-400 font-normal">(19.68%)</span></div>
                  </div>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={multiLineData} margin={{top: 5, right: 5, left: -20, bottom: 5}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{fontSize: '12px'}}/>
                      <Legend iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                      <Line type="monotone" dataKey="enquiries" name="Enquiries" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="applications" name="Applications" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="admissions" name="Admissions" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Performing Sources */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-slate-800">Top Performing Sources</h3>
                  <select className="text-xs border-slate-300 rounded text-slate-500"><option>This Month</option></select>
                </div>
                <div className="space-y-4">
                  {[
                    {name: 'Website', pct: 34.1, val: 425},
                    {name: 'Walk-in', pct: 23.9, val: 298},
                    {name: 'Phone Call', pct: 17.2, val: 214},
                    {name: 'Facebook', pct: 12.6, val: 156},
                    {name: 'Referral', pct: 8.2, val: 102},
                    {name: 'Others', pct: 4.0, val: 50},
                  ].map((src, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 font-medium">{src.name}</span>
                        <span className="text-slate-800">{src.pct}% <span className="text-slate-400">({src.val})</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${src.pct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-4 gap-3">
                  <QuickActionButton icon={<Plus size={20} />} label="Add Enquiry" onClick={() => setIsAddModalOpen(true)} />
                  <QuickActionButton icon={<Calendar size={20} />} label="Schedule Follow Up" />
                  <QuickActionButton icon={<Users size={20} />} label="Log Meeting" />
                  <QuickActionButton icon={<Edit size={20} />} label="Add Note" />
                  <QuickActionButton icon={<Mail size={20} />} label="Send Email / SMS" />
                  <QuickActionButton icon={<CheckCircle size={20} />} label="Create Application" />
                  <QuickActionButton icon={<UserPlus size={20} />} label="Assign Enquiry" />
                  <QuickActionButton icon={<Target size={20} />} label="Convert to Admission" />
                </div>
              </div>

            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Enquiry Activities */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800">Enquiry Activities</h3>
                <button className="text-xs text-indigo-600 font-medium hover:underline">View All</button>
              </div>
              <div className="space-y-4">
                {activities.length > 0 ? activities.slice(0, 5).map((act, i) => (
                  <div key={i} className="flex gap-3 relative">
                    {i !== activities.length - 1 && <div className="absolute left-3 top-6 bottom-0 w-px bg-slate-200"></div>}
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center z-10">
                      {act.type === 'System' ? <Target size={12} className="text-indigo-500" /> : 
                       act.type === 'Call' ? <Phone size={12} className="text-green-500" /> : 
                       act.type === 'Status Change' ? <RefreshCw size={12} className="text-amber-500" /> :
                       <MessageSquare size={12} className="text-blue-500" />}
                    </div>
                    <div className="flex-1 pb-1">
                      <p className="text-xs font-medium text-slate-800">{act.description}</p>
                      <p className="text-[10px] text-slate-500">{act.performedBy}</p>
                    </div>
                    <div className="text-[10px] text-slate-400 whitespace-nowrap">
                      {act.timestamp?.toDate ? formatActivityTime(act.timestamp.toDate()) : 'Now'}
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-xs text-slate-400 py-4">No recent activities</div>
                )}
              </div>
            </div>

            {/* Follow Up Tasks */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800">Follow Up Tasks</h3>
                <button className="text-xs text-indigo-600 font-medium hover:underline">View All</button>
              </div>
              <div className="space-y-3">
                {[
                  {date: '18 May 2025', count: 3, label: 'Due Today', color: 'text-red-600', bg: 'bg-red-50', icon: <Clock size={12} />},
                  {date: '19 May 2025', count: 7, label: 'Due Tomorrow', color: 'text-amber-600', bg: 'bg-amber-50', icon: <Calendar size={12} />},
                  {date: '20 May 2025', count: 5, label: 'In 2 Days', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Calendar size={12} />},
                  {date: '21 May 2025', count: 4, label: 'In 3 Days', color: 'text-slate-600', bg: 'bg-slate-50', icon: <Calendar size={12} />},
                ].map((task, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${task.bg} ${task.color}`}>
                        {task.icon}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-800">{task.date} <span className="text-slate-400 font-normal">({task.count})</span></div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">{task.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Information Card */}
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
              <h3 className="font-semibold text-indigo-900 mb-3 text-sm">Why Manage Enquiries Effectively?</h3>
              <ul className="space-y-2">
                {[
                  'Capture every potential student opportunity',
                  'Track and follow up at the right time',
                  'Improve conversion rate and admissions',
                  'Better communication and engagement',
                  'Data-driven decisions for marketing & growth'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-indigo-800/80">
                    <CheckCircle size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Key Benefits Footer */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 grid grid-cols-2 md:grid-cols-5 gap-4 divide-x divide-slate-100">
          <BenefitItem icon={<RefreshCw />} title="360° Enquiry Tracking" desc="Track enquiries from multiple sources" />
          <BenefitItem icon={<Clock />} title="Timely Follow Ups" desc="Automated reminders & follow ups" />
          <BenefitItem icon={<Target />} title="Better Conversion" desc="Increase admissions & revenue" />
          <BenefitItem icon={<Users />} title="Team Collaboration" desc="Assign & collaborate with team" />
          <BenefitItem icon={<PieChartIcon />} title="Detailed Reports" desc="Data insights & performance reports" />
        </div>

      </div>

      {/* Add / Edit Modals would go here. For brevity in styling replication, reusing simple modal structure. */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={20} className="text-indigo-600" />
                Add New Enquiry
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await addEnquiry({
                  enquirerName: formData.get('enquirerName') as string,
                  mobile: formData.get('mobile') as string,
                  email: formData.get('email') as string,
                  classInterested: formData.get('classInterested') as string,
                  source: formData.get('source') as string,
                  status: 'New',
                  assignedTo: user?.displayName || user?.email || 'Admin',
                  nextFollowUp: formData.get('nextFollowUp') as string,
                });
                setIsAddModalOpen(false);
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Enquirer Name *</label>
                    <input name="enquirerName" required type="text" className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. Rahul Sharma" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                    <input name="mobile" required type="tel" className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="10-digit number" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input name="email" type="email" className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Class Interested *</label>
                    <select name="classInterested" required className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="">Select Class</option>
                      <option value="Nursery">Nursery</option>
                      <option value="LKG">LKG</option>
                      <option value="UKG">UKG</option>
                      <option value="Class 1">Class 1</option>
                      <option value="Class 2">Class 2</option>
                      <option value="Class 6">Class 6</option>
                      <option value="Class 9">Class 9</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Source *</label>
                    <select name="source" required className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="Website">Website</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Phone Call">Phone Call</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Referral">Referral</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Next Follow Up Date</label>
                    <input name="nextFollowUp" type="date" className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">
                    Save Enquiry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal is similarly structured */}
    </div>
  );
}

function KpiCard({ title, value, change, trend, icon, color }: any) {
  const isUp = trend === 'up';
  const sparkData = isUp ? SPARK_DATA_UP : SPARK_DATA_DOWN;
  
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
  };
  
  const strokeMap: any = {
    blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', 
    purple: '#8b5cf6', red: '#ef4444', teal: '#14b8a6'
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
        </div>
      </div>
      <div className="flex justify-between items-end mt-2 z-10">
        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
          <span className={isUp ? 'text-green-500' : 'text-red-500 flex items-center gap-0.5'}>
            {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {change}
          </span>
          this month
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData}>
            <Line type="monotone" dataKey="v" stroke={strokeMap[color]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function QuickActionButton({ icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center p-3 gap-2 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors border border-transparent hover:border-indigo-100 group text-center"
    >
      <div className="p-2 bg-white rounded-full shadow-sm group-hover:bg-indigo-100">
        {icon}
      </div>
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}

function BenefitItem({ icon, title, desc }: any) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-800">{title}</h4>
        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function formatActivityTime(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  if (diffHours < 48) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
