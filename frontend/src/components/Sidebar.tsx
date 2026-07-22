import { 
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck, 
  FileText, IndianRupee, UserCircle, Bus, Library, Building, 
  Archive, MessageSquare, CalendarDays, Globe, BarChart, Settings, 
  ShieldAlert, ChevronRight, X, Building2
} from 'lucide-react';
import { isModuleActive, isSubActive, toViewKey } from '../lib/navigation';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { 
    icon: Users, 
    label: 'Admission CRM',
    subItems: ['Enquiries', 'Leads', 'Applications', 'Follow Ups', 'Counselling', 'Admission Test', 'Merit List', 'Seat Allocation', 'Admissions', 'Fee Collection', 'Reports']
  },
  { 
    icon: GraduationCap, 
    label: 'Student Management',
    subItems: ['Students List', 'Add New Student', 'Student Profiles', 'Student Categories', 'Bulk Import', 'Student Reports', 'Student Analytics', 'Student ID Cards']
  },
  { 
    icon: Users, 
    label: 'Parent Management',
    subItems: ['Parents List', 'Parents Engagement', 'Parent Profiles', 'Communication Log', 'Parent Categories', 'Parent Feedback', 'Parent Meetings (PTM)', 'Consent Management']
  },
  { 
    icon: BookOpen, 
    label: 'Academic Management',
    subItems: ['Class & Sections', 'Curriculum & Syllabus', 'Timetable', 'Lesson Planning', 'Homework', 'Academic Calendar', 'Continuous Evaluation', 'Subject Management', 'Co-Scholastic Activities', 'Teacher Allocation', 'Academic Reports']
  },
  { 
    icon: ClipboardCheck, 
    label: 'Attendance Management',
    subItems: ['Student Attendance', 'Teacher Attendance', 'Staff Attendance', 'Attendance By Date', 'Daily Summary', 'Attendance Report', 'Leave Management', 'Holiday Calendar', 'Gate Pass', 'Late Coming / Early Exit', 'Biometric Devices']
  },
  { 
    icon: FileText, 
    label: 'Examination Management',
    subItems: ['Exam Dashboard', 'Exam Schedule', 'Subjects & Syllabus', 'Question Bank', 'Paper Management', 'Seating Arrangement', 'Invigilation Management', 'Marks Entry', 'Result Processing', 'Report Cards', 'Revaluation / Recheck', 'Grade & Promotion', 'Certificates', 'Exam Analytics']
  },
  { 
    icon: IndianRupee, 
    label: 'Fees & Finance',
    subItems: ['Fee Dashboard', 'Fee Masters', 'Fee Structure', 'Fee Collection', 'Invoices', 'Online Payments', 'Payment Reconciliation', 'Discounts & Concessions', 'Refunds', 'Fine / Penalties', 'Scholarship', 'Transport Fee', 'Hostel Fee', 'Other Charges', 'Accounts & Ledger', 'Expense Management', 'Bank & Cash Book', 'Payroll', 'Financial Reports']
  },
  { 
    icon: UserCircle, 
    label: 'HR & Payroll Management',
    subItems: ['Employee Dashboard', 'Employees Directory', 'Departments', 'Designations', 'Attendance & Leave', 'Leave Management', 'Payroll Management', 'Salary Structure', 'Allowances & Deductions', 'Attendance Policy', 'Shift Management', 'Performance Appraisal', 'Recruitment', 'Training & Development', 'Documents', 'Resignation / Exit', 'Reports']
  },
  { 
    icon: Bus, 
    label: 'Transport Management',
    subItems: ['Transport Dashboard', 'Route & Vehicle Master', 'Route Planning', 'Live Vehicle Tracking', 'Student Transportation', 'Driver & Attendant', 'Trip Management', 'Stops & Geo Fencing', 'Transport Attendance', 'Transport Fees', 'Maintenance & Service', 'Fuel Management', 'Safety & Alerts', 'Incident Reports', 'Reports & Analytics']
  },
  { 
    icon: Library, 
    label: 'Library Management',
    subItems: ['Library Dashboard', 'Book Catalogue', 'Book Issue / Return', 'Members', 'Add / Manage Books', 'Categories & Subjects', 'Rack Management', 'Stock Verification', 'Fine Management', 'Library Attendance', 'Reading Room', 'E-Resources', 'Reports & Analytics']
  },
  { 
    icon: Building, 
    label: 'Hostel Management',
    subItems: ['Hostel Dashboard', 'Rooms & Allotment', 'Students', 'Wardens / Staff', 'Visitor Management', 'Mess Management', 'Leave Management', 'Gate Pass', 'Complaints / Feedback', 'Maintenance', 'Inventory', 'Laundry Management', 'Discipline & Incidents', 'Reports & Analytics']
  },
  { 
    icon: Archive, 
    label: 'Inventory Management',
    subItems: ['Inventory Dashboard', 'Items / Products', 'Categories & Units', 'Stock Inward (GRN)', 'Stock Outward', 'Transfer / Stock Movement', 'Supplier Management', 'Purchase Orders', 'Vendor Bills', 'Stock Adjustment', 'Barcode / QR Code', 'Stock Verification', 'Reorder Level', 'Reports & Analytics']
  },
  { 
    icon: CalendarDays, 
    label: 'Event Management',
    subItems: ['Event Dashboard', 'Events List', 'Create Event', 'Event Calendar', 'Registrations', 'Tickets & Passes', 'Volunteers', 'Vendors & Sponsors', 'Task Management', 'Feedback & Surveys', 'Certificates', 'Reports & Analytics']
  },
  { 
    icon: MessageSquare, 
    label: 'Communication Management',
    subItems: ['Communication Dashboard', 'Compose Message', 'Message Templates', 'SMS Management', 'Email Management', 'WhatsApp Management', 'Push Notifications', 'Circulars / Notices', 'Event Invitations', 'Surveys & Feedback', 'Auto Reminders', 'Message History', 'Reports & Analytics']
  },
  { 
    icon: Globe, 
    label: 'Website & CMS Management',
    subItems: ['Website Dashboard', 'Pages Management', 'Blog Management', 'Media Library', 'Menus & Navigation', 'Sliders & Banners', 'Testimonials', 'Forms Management', 'Popups & Notices', 'SEO Management', 'Theme & Appearance', 'Backup & Restore', 'Analytics & Reports']
  },
  { 
    icon: BarChart, 
    label: 'Reports & Analytics',
    subItems: ['Reports Dashboard', 'Student Reports', 'Academic Reports', 'Attendance Reports', 'Examination Reports', 'Finance Reports', 'HR Reports', 'Library Reports', 'Transport Reports', 'Hostel Reports', 'Inventory Reports', 'Custom Reports']
  },
  { 
    icon: Building2, 
    label: 'Institution Setup',
    subItems: ['Basic Information', 'Academic Setup', 'Classes & Sections', 'Subjects Setup', 'Departments Setup', 'Session & Term Setup', 'Grade & Marks Setup', 'Fee Group Setup', 'Document Setup', 'ID Card & Numbering', 'Calendar Setup', 'Custom Fields Setup', 'Notification Setup', 'Other Preferences']
  },
  { 
    icon: Settings, 
    label: 'Settings Management',
    subItems: ['General Settings', 'School Settings', 'Academic Settings', 'User & Role Settings', 'Module Settings', 'System Settings', 'Notifications Settings', 'Payment Settings', 'Security Settings', 'Backup & Restore', 'API & Integrations', 'Audit Log']
  },
  { 
    icon: ShieldAlert, 
    label: 'System Administration',
    subItems: ['Admin Dashboard', 'User & Access Control', 'Role & Permission', 'System Configuration', 'Database Management', 'Server & Performance', 'Security Management', 'Backup & Restore', 'Audit Logs', 'Email & SMS Gateway', 'API Management', 'System Updates', 'License Management', 'Support & Maintenance']
  },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentView: string;
  setCurrentView: (view: string) => void;
}

export function Sidebar({ isOpen, setIsOpen, currentView, setCurrentView }: SidebarProps) {
  return (
    <aside className={`w-56 bg-[#0f172a] text-white flex flex-col h-screen fixed left-0 top-0 overflow-hidden shrink-0 z-30 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="p-4 border-b border-slate-700/50 relative">
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 p-1 text-slate-400 hover:text-white lg:hidden"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-2 mt-2 lg:mt-0">
          <div className="w-8 h-8 bg-amber-400 rounded flex items-center justify-center font-bold text-[#0f172a] text-lg">360</div>
          <h1 className="text-lg font-bold tracking-tight">360schoolerp</h1>
        </div>
        <p className="text-[9px] text-slate-400 mt-1 leading-tight uppercase tracking-wider">
          One Platform. One Login. Complete Management.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        <nav className="flex flex-col gap-0.5 px-3 text-[11px]">
          {menuItems.map((item, index) => {
            const isActive = isModuleActive(currentView, item.label, item.subItems);
            const isExpanded = isActive;

            return (
              <div key={index} className="flex flex-col">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!item.subItems) {
                      setCurrentView(item.label);
                      if (window.innerWidth < 1024) setIsOpen(false);
                    } else if (!isActive) {
                      setCurrentView(toViewKey(item.label, item.subItems[0]));
                    }
                  }}
                  className={`flex items-center justify-between p-2 rounded transition-colors group cursor-pointer ${
                    isActive 
                      ? 'bg-amber-400 text-slate-900 font-bold' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={16} className={isActive ? 'text-slate-900' : 'text-slate-300'} />
                    <span>{item.label}</span>
                  </div>
                  {!isActive && <ChevronRight size={14} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : 'opacity-0 group-hover:opacity-100'}`} />}
                  {isActive && item.subItems && <ChevronRight size={14} className="text-slate-900 rotate-90" />}
                </a>

                {isExpanded && item.subItems && (
                  <div className="flex flex-col gap-0.5 pl-8 mt-1 border-l-2 border-slate-700/50 ml-4 py-1">
                    {item.subItems.map((subItem, subIndex) => {
                      const subActive = isSubActive(currentView, item.label, subItem);
                      return (
                        <a
                          key={subIndex}
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentView(toViewKey(item.label, subItem));
                            if (window.innerWidth < 1024) setIsOpen(false);
                          }}
                          className={`flex items-center gap-2 py-1.5 px-2 rounded-md text-[10.5px] transition-colors ${
                            subActive
                              ? 'text-amber-400 font-bold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <div className={`w-1 h-1 rounded-full ${subActive ? 'bg-amber-400' : 'bg-slate-500'}`}></div>
                          <span>{subItem}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-slate-800/50 m-2 rounded-lg border border-slate-700">
        <p className="text-[10px] text-slate-400">Need Help?</p>
        <button className="w-full py-1.5 mt-1 bg-amber-400 text-slate-900 rounded text-[10px] font-bold uppercase transition-colors hover:bg-amber-500">
          Contact Support
        </button>
      </div>
      <div className="pb-3 text-[9px] text-slate-500 text-center flex flex-col gap-1">
        <p>© 2026 360schoolerp.</p>
        <div className="flex justify-center gap-1.5">
          <a href="#" className="hover:text-slate-300">Version 3.0.0</a> |
          <a href="#" className="hover:text-slate-300">Privacy</a> |
          <a href="#" className="hover:text-slate-300">Terms</a>
        </div>
      </div>
    </aside>
  );
}

export { menuItems };
