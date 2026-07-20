import { useState } from 'react';
import { 
  Package, IndianRupee, AlertTriangle, XCircle, Box, ShoppingCart,
  ChevronDown, Plus, Download, Upload, ArrowRightLeft, Settings2,
  CheckCircle2, UserPlus, FileText, Receipt, Barcode, ClipboardList,
  BarChart2, AlertCircle, Info, CheckCircle
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend
} from 'recharts';

const kpis = [
  { title: 'Total Items', value: '3,256', subtitle: 'All Locations', color: 'bg-indigo-500', icon: <Package size={20} />, iconColor: 'text-indigo-500', iconBg: 'bg-indigo-100' },
  { title: 'Total Stock Value', value: '₹ 24,85,760', subtitle: 'At Cost Price', color: 'bg-green-500', icon: <IndianRupee size={20} />, iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { title: 'Low Stock Items', value: '128', subtitle: 'Need Reorder', subtitleColor: 'text-red-500', color: 'bg-orange-500', icon: <AlertTriangle size={20} />, iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
  { title: 'Out of Stock Items', value: '26', subtitle: 'Not Available', color: 'bg-red-500', icon: <XCircle size={20} />, iconColor: 'text-red-500', iconBg: 'bg-red-100' },
  { title: 'Stock in Hand', value: '2,458', subtitle: 'Available Qty', color: 'bg-blue-500', icon: <Box size={20} />, iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { title: 'Pending Orders', value: '18', subtitle: 'To Be Received', color: 'bg-purple-500', icon: <ShoppingCart size={20} />, iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
];

const stockOverview = [
  { name: 'Available', value: 2458, color: '#10b981', percent: '75.4%' },
  { name: 'Low Stock', value: 128, color: '#f59e0b', percent: '3.9%' },
  { name: 'Out of Stock', value: 26, color: '#ef4444', percent: '0.8%' },
  { name: 'In Transit', value: 644, color: '#3b82f6', percent: '19.8%' },
];

const stockTrend = [
  { day: '1 May', inward: 400, outward: 200, value: 8 },
  { day: '5 May', inward: 700, outward: 500, value: 12 },
  { day: '10 May', inward: 600, outward: 400, value: 11 },
  { day: '15 May', inward: 800, outward: 500, value: 15 },
  { day: '20 May', inward: 700, outward: 450, value: 14 },
  { day: '25 May', inward: 900, outward: 600, value: 18 },
  { day: '30 May', inward: 800, outward: 550, value: 16 },
];

const categoryWiseStock = [
  { name: 'Books & Stationery', value: 845230, color: '#10b981', percent: '34%' },
  { name: 'Lab Equipment', value: 625540, color: '#3b82f6', percent: '25%' },
  { name: 'Furniture & Fixtures', value: 435780, color: '#f59e0b', percent: '17%' },
  { name: 'Sports & Games', value: 240600, color: '#ef4444', percent: '10%' },
  { name: 'Electronics', value: 185960, color: '#8b5cf6', percent: '8%' },
  { name: 'Others', value: 152650, color: '#64748b', percent: '6%' },
];

const topLowStock = [
  { name: 'A4 Size Paper (70 GSM)', stock: '10 Ream', reorder: '50 Ream' },
  { name: 'White Board Marker (Black)', stock: '5 Pcs', reorder: '20 Pcs' },
  { name: 'Science Lab Kit - Basic', stock: '2 Kits', reorder: '10 Kits' },
  { name: 'Cricket Bat', stock: '1 Pcs', reorder: '5 Pcs' },
  { name: 'Computer Mouse', stock: '3 Pcs', reorder: '15 Pcs' },
];

const recentInward = [
  { grn: 'GRN-1024', date: '17 May 2025', supplier: 'ABC Traders', items: 15, value: '₹ 42,560', status: 'Received' },
  { grn: 'GRN-1023', date: '16 May 2025', supplier: 'Global Supplies', items: 8, value: '₹ 28,750', status: 'Received' },
  { grn: 'GRN-1022', date: '15 May 2025', supplier: 'School Mart', items: 12, value: '₹ 36,400', status: 'Received' },
  { grn: 'GRN-1021', date: '14 May 2025', supplier: 'Lab World', items: 6, value: '₹ 19,850', status: 'Received' },
  { grn: 'GRN-1020', date: '13 May 2025', supplier: 'EduPlus', items: 9, value: '₹ 24,300', status: 'Received' },
];

const topByValue = [
  { name: 'Physics Lab Equipment Set', category: 'Lab Equipment', value: '₹ 2,45,600' },
  { name: 'Science Lab Kit - Advanced', category: 'Lab Equipment', value: '₹ 1,98,750' },
  { name: 'Computers (All-in-One)', category: 'Electronics', value: '₹ 1,75,400' },
  { name: 'Library Books Collection', category: 'Books & Stationery', value: '₹ 1,65,230' },
  { name: 'Smart LED TV 55 inch', category: 'Electronics', value: '₹ 1,25,000' },
];

const topByUsage = [
  { name: 'A4 Size Paper (70 GSM)', issued: 120, unit: 'Ream' },
  { name: 'Notebook (200 Pages)', issued: 85, unit: 'Pcs' },
  { name: 'White Board Marker', issued: 75, unit: 'Pcs' },
  { name: 'Chalk Box', issued: 60, unit: 'Boxes' },
  { name: 'Ball Pen (Blue)', issued: 55, unit: 'Pcs' },
];

const alerts = [
  { text: '26 items are out of stock. Place order immediately.', date: '17 May 2025', icon: <AlertCircle size={14} className="text-red-500" />, bg: 'bg-red-50' },
  { text: '128 items are below reorder level.', date: '17 May 2025', icon: <AlertTriangle size={14} className="text-amber-500" />, bg: 'bg-amber-50' },
  { text: 'PO #PO-2025-018 is pending from supplier.', date: '16 May 2025', icon: <Info size={14} className="text-blue-500" />, bg: 'bg-blue-50' },
  { text: 'Stock verification is due for Main Store.', date: '16 May 2025', icon: <CheckCircle size={14} className="text-green-500" />, bg: 'bg-green-50' },
];

const locations = [
  { name: 'Main Store', value: '₹ 12,45,780', items: 1458 },
  { name: 'Science Lab Store', value: '₹ 4,78,650', items: 856 },
  { name: 'Sports Store', value: '₹ 2,15,340', items: 412 },
  { name: 'Library Store', value: '₹ 3,25,760', items: 530 },
  { name: 'IT Store', value: '₹ 2,20,230', items: 412 },
];

const quickActions = [
  { label: 'Add New Item', icon: <Package size={16} className="text-blue-600" /> },
  { label: 'Stock Inward (GRN)', icon: <Download size={16} className="text-green-600" /> },
  { label: 'Stock Outward', icon: <Upload size={16} className="text-orange-600" /> },
  { label: 'Transfer Stock', icon: <ArrowRightLeft size={16} className="text-purple-600" /> },
  { label: 'Stock Adjustment', icon: <Settings2 size={16} className="text-slate-600" /> },
  { label: 'Stock Verification', icon: <CheckCircle2 size={16} className="text-green-600" /> },
  { label: 'Add Supplier', icon: <UserPlus size={16} className="text-blue-600" /> },
  { label: 'Purchase Order', icon: <FileText size={16} className="text-indigo-600" /> },
  { label: 'Vendor Bills', icon: <Receipt size={16} className="text-slate-600" /> },
  { label: 'Barcode Print', icon: <Barcode size={16} className="text-slate-800" /> },
  { label: 'Reorder Report', icon: <ClipboardList size={16} className="text-amber-600" /> },
  { label: 'Inventory Report', icon: <BarChart2 size={16} className="text-blue-600" /> },
];

import { SubModuleView } from './shared/SubModuleView';

export function InventoryManagementCRM({ currentView = 'Inventory Dashboard' }: { currentView?: string }) {
  if (currentView && currentView !== 'Inventory Dashboard') {
    return <SubModuleView module="Inventory Management" title={currentView} />;
  }

  const [selectedLocation, setSelectedLocation] = useState('Main Store');

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Inventory Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track • Manage • Control • Optimize</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            <span className="text-slate-400 mr-2">Academic Year</span>
            <span>2025-26</span>
            <ChevronDown size={14} className="ml-2 text-slate-400" />
          </div>
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm cursor-pointer hover:bg-slate-50">
            <span className="text-slate-400 mr-2">Store/Location</span>
            <select 
              className="bg-transparent border-none outline-none text-slate-700 cursor-pointer appearance-none pr-4"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="All Locations">All Locations</option>
              <option value="Main Store">Main Store</option>
              <option value="Science Lab Store">Science Lab Store</option>
              <option value="Sports Store">Sports Store</option>
              <option value="Library Store">Library Store</option>
              <option value="IT Store">IT Store</option>
            </select>
            <ChevronDown size={14} className="ml-[-12px] text-slate-400 pointer-events-none" />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={14} />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shadow-sm shrink-0`}>
                {kpi.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-slate-500 font-bold truncate">{kpi.title}</p>
                <p className="text-[13px] font-bold text-slate-900 truncate leading-tight mt-0.5">{kpi.value}</p>
              </div>
            </div>
            {kpi.subtitle && (
              <div className={`text-[8px] flex items-center gap-1 ${kpi.subtitleColor || 'text-slate-500'}`}>
                {kpi.subtitle}
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`}></div>
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Stock Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Stock Overview</h3>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={stockOverview} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                     {stockOverview.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[13px] font-bold text-slate-800">3,256</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Total Items</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {stockOverview.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 text-[9px] font-medium whitespace-nowrap">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-1 text-[8px]">
                      <span className="font-bold text-slate-800">{item.value}</span>
                      <span className="text-slate-400">({item.percent})</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
          <div className="mt-2 text-[9px] text-slate-600 font-medium text-center border-t border-slate-100 pt-2">Total Stock Value: <span className="font-bold text-slate-900">₹ 24,85,760</span></div>
        </div>

        {/* Stock Trend */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Stock Trend <span className="font-normal text-slate-500">(This Month)</span></h3>
          </div>
          <div className="flex-1 w-full h-full min-h-[160px] relative mt-2">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={stockTrend} margin={{ top: 20, right: -5, left: -25, bottom: -10 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                 <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} domain={[0, 1000]} />
                 <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} domain={[0, 25]} tickFormatter={(val) => `${val}L`} />
                 <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                 <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -10 }} />
                 <Line yAxisId="left" type="monotone" dataKey="inward" name="Stock Inward" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                 <Line yAxisId="left" type="monotone" dataKey="outward" name="Stock Outward" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                 <Line yAxisId="right" type="monotone" dataKey="value" name="Stock Value (₹)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
               </LineChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Category Wise Stock Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Category Wise Stock Value</h3>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={categoryWiseStock} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                     {categoryWiseStock.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[9px] font-bold text-slate-800">₹ 24,85,760</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Total Value</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {categoryWiseStock.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 text-[8px] font-medium whitespace-nowrap truncate w-20">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-800">₹ {(item.value/100000).toFixed(2)}L</span>
                      <span className="text-slate-400 text-[8px]">({item.percent})</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Top 5 Low Stock Items */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Top 5 Low Stock Items</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
             <table className="w-full text-[8px] text-left">
                <thead>
                   <tr className="text-slate-400 font-medium border-b border-slate-100">
                      <th className="pb-1">Item Name</th>
                      <th className="pb-1 text-center">Current</th>
                      <th className="pb-1 text-center">Reorder</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {topLowStock.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                         <td className="py-1.5 text-slate-700 font-medium max-w-[80px] truncate" title={item.name}>{item.name}</td>
                         <td className="py-1.5 text-center text-red-600 font-bold">{item.stock}</td>
                         <td className="py-1.5 text-center text-slate-500">{item.reorder}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          <button className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold py-1.5 rounded transition-colors shadow-sm">
            Purchase / Reorder Now
          </button>
        </div>

      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Recent Stock Inward (GRN) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Recent Stock Inward (GRN)</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[9px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">GRN No.</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Supplier</th>
                      <th className="pb-2 font-medium text-center">Items</th>
                      <th className="pb-2 font-medium text-right">Total Value</th>
                      <th className="pb-2 font-medium text-right">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {recentInward.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-2 text-blue-600 font-bold cursor-pointer hover:underline">{row.grn}</td>
                         <td className="py-2 text-slate-600 whitespace-nowrap">{row.date}</td>
                         <td className="py-2 text-slate-600 max-w-[80px] truncate" title={row.supplier}>{row.supplier}</td>
                         <td className="py-2 text-center font-medium text-slate-700">{row.items}</td>
                         <td className="py-2 text-right font-bold text-slate-800">{row.value}</td>
                         <td className="py-2 text-right"><span className="text-[7px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">{row.status}</span></td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

        {/* Stock Movement */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Stock Movement <span className="font-normal text-slate-500">(This Month)</span></h3>
           </div>
           
           <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center text-center">
                 <Download size={14} className="text-green-500 mb-1" />
                 <span className="text-[7px] text-slate-500 font-medium mb-0.5 line-clamp-1">Stock Inward</span>
                 <span className="text-[11px] font-bold text-slate-900">1,245</span>
              </div>
              <div className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center text-center">
                 <Upload size={14} className="text-blue-500 mb-1" />
                 <span className="text-[7px] text-slate-500 font-medium mb-0.5 line-clamp-1">Stock Outward</span>
                 <span className="text-[11px] font-bold text-slate-900">856</span>
              </div>
              <div className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center text-center">
                 <ArrowRightLeft size={14} className="text-purple-500 mb-1" />
                 <span className="text-[7px] text-slate-500 font-medium mb-0.5 line-clamp-1">Transfers</span>
                 <span className="text-[11px] font-bold text-slate-900">120</span>
              </div>
              <div className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center text-center">
                 <Settings2 size={14} className="text-amber-500 mb-1" />
                 <span className="text-[7px] text-slate-500 font-medium mb-0.5 line-clamp-1">Adjustments</span>
                 <span className="text-[11px] font-bold text-slate-900">32</span>
              </div>
           </div>

           <div>
              <h4 className="text-[9px] font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1">Movement Value (₹)</h4>
              <div className="grid grid-cols-3 gap-2 text-center mt-2">
                 <div>
                    <span className="text-[7px] text-slate-500 font-medium block mb-1">Inward Value</span>
                    <span className="text-[10px] font-bold text-green-600">₹ 18,75,400</span>
                 </div>
                 <div>
                    <span className="text-[7px] text-slate-500 font-medium block mb-1">Outward Value</span>
                    <span className="text-[10px] font-bold text-blue-600">₹ 11,42,230</span>
                 </div>
                 <div>
                    <span className="text-[7px] text-slate-500 font-medium block mb-1">Net Movement</span>
                    <span className="text-[10px] font-bold text-purple-600">₹ 7,33,170</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Stock Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Stock Status</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex flex-col gap-4 flex-1 justify-center">
             <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[9px]">
                   <span className="text-slate-600 font-medium">Good Stock <span className="text-[7px] text-slate-400">(&gt; Reorder Level)</span></span>
                   <span className="font-bold text-slate-900">2,458 <span className="text-slate-400 font-normal">(75.4%)</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                   <div className="bg-green-500 h-full rounded-full" style={{ width: '75.4%' }}></div>
                </div>
             </div>
             <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[9px]">
                   <span className="text-slate-600 font-medium">Low Stock <span className="text-[7px] text-slate-400">(&lt; Reorder Level)</span></span>
                   <span className="font-bold text-slate-900">128 <span className="text-slate-400 font-normal">(3.9%)</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                   <div className="bg-amber-500 h-full rounded-full" style={{ width: '3.9%' }}></div>
                </div>
             </div>
             <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[9px]">
                   <span className="text-slate-600 font-medium">Out of Stock</span>
                   <span className="font-bold text-slate-900">26 <span className="text-slate-400 font-normal">(0.8%)</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                   <div className="bg-red-500 h-full rounded-full" style={{ width: '1.8%' }}></div> {/* slightly wider for visibility */}
                </div>
             </div>
             <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[9px]">
                   <span className="text-slate-600 font-medium">In Transit</span>
                   <span className="font-bold text-slate-900">644 <span className="text-slate-400 font-normal">(19.8%)</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                   <div className="bg-blue-500 h-full rounded-full" style={{ width: '19.8%' }}></div>
                </div>
             </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 flex-1 content-start">
            {quickActions.map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-start text-center p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group">
                <div className="w-6 h-6 rounded flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <span className="text-[7px] text-slate-600 font-medium leading-tight px-0.5 whitespace-normal">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Top Items by Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Top Items by Value</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[8px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-1.5 font-medium">Item Name</th>
                      <th className="pb-1.5 font-medium">Category</th>
                      <th className="pb-1.5 font-medium text-right">Stock Value (₹)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {topByValue.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-1.5 text-slate-800 font-medium max-w-[80px] truncate" title={row.name}>{row.name}</td>
                         <td className="py-1.5 text-slate-600 whitespace-nowrap">{row.category}</td>
                         <td className="py-1.5 text-right font-bold text-slate-800">{row.value}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

        {/* Top Items by Usage */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Top Items by Usage <span className="font-normal text-slate-500">(This Month)</span></h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[8px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-1.5 font-medium">Item Name</th>
                      <th className="pb-1.5 font-medium text-center">Issued Qty</th>
                      <th className="pb-1.5 font-medium">Unit</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {topByUsage.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-1.5 text-slate-800 font-medium max-w-[100px] truncate" title={row.name}>{row.name}</td>
                         <td className="py-1.5 text-center font-bold text-blue-600">{row.issued}</td>
                         <td className="py-1.5 text-slate-500">{row.unit}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Inventory Alerts</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
             {alerts.map((alert, i) => (
                <div key={i} className="flex gap-2 items-center">
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${alert.bg}`}>
                      {alert.icon}
                   </div>
                   <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-[8px] font-medium text-slate-800 leading-tight pr-2">{alert.text}</p>
                      <span className="text-[7px] text-slate-500 whitespace-nowrap mt-0.5">{alert.date}</span>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Store / Location Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Store / Location Summary</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[8px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-1.5 font-medium">Store / Location</th>
                      <th className="pb-1.5 font-medium text-right">Stock Value (₹)</th>
                      <th className="pb-1.5 font-medium text-right">Items</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {locations.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-1.5 text-slate-800 font-medium whitespace-nowrap">{row.name}</td>
                         <td className="py-1.5 text-right font-bold text-slate-800">{row.value}</td>
                         <td className="py-1.5 text-right text-slate-600 font-medium">{row.items}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

      </div>

    </div>
  );
}
