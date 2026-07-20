import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { KPICards } from './components/dashboard/KPICards';
import { ChartsRow } from './components/dashboard/ChartsRow';
import { QuickAccess } from './components/dashboard/QuickAccess';
import { BottomRow } from './components/dashboard/BottomRow';
import { AdmissionCRM } from './components/crm/AdmissionCRM';
import { StudentManagementCRM } from './components/crm/StudentManagementCRM';
import { ParentManagementCRM } from './components/crm/ParentManagementCRM';
import { AcademicManagementCRM } from './components/crm/AcademicManagementCRM';
import { AttendanceManagementCRM } from './components/crm/AttendanceManagementCRM';
import { ExaminationManagementCRM } from './components/crm/ExaminationManagementCRM';
import { FeeFinanceManagementCRM } from './components/crm/FeeFinanceManagementCRM';
import { HrPayrollManagementCRM } from './components/crm/HrPayrollManagementCRM';
import { TransportManagementCRM } from './components/crm/TransportManagementCRM';
import { LibraryManagementCRM } from './components/crm/LibraryManagementCRM';
import { HostelManagementCRM } from './components/crm/HostelManagementCRM';
import { InventoryManagementCRM } from './components/crm/InventoryManagementCRM';
import { CommunicationManagementCRM } from './components/crm/CommunicationManagementCRM';
import { EventManagementCRM } from './components/crm/EventManagementCRM';
import { WebsiteCMSManagementCRM } from './components/crm/WebsiteCMSManagementCRM';
import { ReportsAnalyticsCRM } from './components/crm/ReportsAnalyticsCRM';
import { SettingsManagementCRM } from './components/crm/SettingsManagementCRM';
import { SystemAdministrationCRM } from './components/crm/SystemAdministrationCRM';
import { InstitutionSetupCRM } from './components/crm/InstitutionSetupCRM';
import { Plus, GraduationCap } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('Dashboard');
  const { user, signInWithGoogle, loading, isDemo } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><p>Loading...</p></div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 max-w-sm w-full flex flex-col items-center">
          <div className="bg-blue-600 p-3 rounded-lg mb-4">
            <GraduationCap className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">360schoolERP</h1>
          <p className="text-slate-500 text-sm text-center mb-6">Sign in to access your dashboard</p>
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentView={currentView} setCurrentView={setCurrentView} />
      
      <div className="flex-1 flex flex-col lg:ml-56 h-full overflow-hidden w-full">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col space-y-5">
          {(() => {
            const admissionCrmViews = ['Enquiries', 'Leads', 'Applications', 'Follow Ups', 'Counselling', 'Admission Test', 'Merit List', 'Seat Allocation', 'Admissions', 'Fee Collection', 'Reports'];
            const studentCrmViews = ['Students List', 'Add New Student', 'Student Profiles', 'Student Categories', 'Bulk Import', 'Student Reports', 'Student Analytics', 'Student ID Cards'];
            const parentCrmViews = ['Parents List', 'Add New Parent', 'Parent Profiles', 'Communication Log', 'Parent Categories', 'Parent Feedback', 'Parent Meetings (PTM)', 'Consent Management'];
            const academicCrmViews = ['Class & Sections', 'Curriculum & Syllabus', 'Timetable', 'Lesson Planning', 'Homework', 'Academic Calendar', 'Continuous Evaluation', 'Subject Management', 'Co-Scholastic Activities', 'Teacher Allocation', 'Academic Reports'];
            const attendanceCrmViews = ['Student Attendance', 'Teacher Attendance', 'Staff Attendance', 'Attendance By Date', 'Daily Summary', 'Attendance Report', 'Leave Management', 'Holiday Calendar', 'Gate Pass', 'Late Coming / Early Exit', 'Biometric Devices'];
            const examinationCrmViews = ['Exam Dashboard', 'Exam Schedule', 'Subjects & Syllabus', 'Question Bank', 'Paper Management', 'Seating Arrangement', 'Invigilation Management', 'Marks Entry', 'Result Processing', 'Report Cards', 'Revaluation / Recheck', 'Grade & Promotion', 'Certificates', 'Exam Analytics'];
            const feeFinanceCrmViews = ['Fee Dashboard', 'Fee Masters', 'Fee Structure', 'Fee Collection', 'Invoices', 'Online Payments', 'Payment Reconciliation', 'Discounts & Concessions', 'Refunds', 'Fine / Penalties', 'Scholarship', 'Transport Fee', 'Hostel Fee', 'Other Charges', 'Accounts & Ledger', 'Expense Management', 'Bank & Cash Book', 'Payroll', 'Financial Reports'];
            const hrPayrollCrmViews = ['Employee Dashboard', 'Employees Directory', 'Departments', 'Designations', 'Attendance & Leave', 'Leave Management', 'Payroll Management', 'Salary Structure', 'Allowances & Deductions', 'Attendance Policy', 'Shift Management', 'Performance Appraisal', 'Recruitment', 'Training & Development', 'Documents', 'Resignation / Exit', 'Reports'];
            const transportCrmViews = ['Transport Dashboard', 'Route & Vehicle Master', 'Route Planning', 'Live Vehicle Tracking', 'Student Transportation', 'Driver & Attendant', 'Trip Management', 'Stops & Geo Fencing', 'Transport Attendance', 'Transport Fees', 'Maintenance & Service', 'Fuel Management', 'Safety & Alerts', 'Incident Reports', 'Reports & Analytics'];
            const libraryCrmViews = ['Library Dashboard', 'Book Catalogue', 'Book Issue / Return', 'Members', 'Add / Manage Books', 'Categories & Subjects', 'Rack Management', 'Stock Verification', 'Fine Management', 'Library Attendance', 'Reading Room', 'E-Resources', 'Reports & Analytics'];
            const hostelCrmViews = ['Hostel Dashboard', 'Rooms & Allotment', 'Students', 'Wardens / Staff', 'Visitor Management', 'Mess Management', 'Leave Management', 'Gate Pass', 'Complaints / Feedback', 'Maintenance', 'Inventory', 'Laundry Management', 'Discipline & Incidents', 'Reports & Analytics'];
            const inventoryCrmViews = ['Inventory Dashboard', 'Items / Products', 'Categories & Units', 'Stock Inward (GRN)', 'Stock Outward', 'Transfer / Stock Movement', 'Supplier Management', 'Purchase Orders', 'Vendor Bills', 'Stock Adjustment', 'Barcode / QR Code', 'Stock Verification', 'Reorder Level', 'Reports & Analytics'];
            const communicationCrmViews = ['Communication Dashboard', 'Compose Message', 'Message Templates', 'SMS Management', 'Email Management', 'WhatsApp Management', 'Push Notifications', 'Circulars / Notices', 'Event Invitations', 'Surveys & Feedback', 'Auto Reminders', 'Message History', 'Reports & Analytics'];
            const eventCrmViews = ['Event Dashboard', 'Events List', 'Create Event', 'Event Calendar', 'Registrations', 'Tickets & Passes', 'Volunteers', 'Vendors & Sponsors', 'Task Management', 'Feedback & Surveys', 'Certificates', 'Reports & Analytics'];
            const websiteCrmViews = ['Website Dashboard', 'Pages Management', 'Blog Management', 'Media Library', 'Menus & Navigation', 'Sliders & Banners', 'Testimonials', 'Forms Management', 'Popups & Notices', 'SEO Management', 'Theme & Appearance', 'Backup & Restore', 'Analytics & Reports'];
            const reportsCrmViews = ['Reports Dashboard', 'Student Reports', 'Academic Reports', 'Attendance Reports', 'Examination Reports', 'Finance Reports', 'HR Reports', 'Library Reports', 'Transport Reports', 'Hostel Reports', 'Inventory Reports', 'Custom Reports'];
            const settingsCrmViews = ['General Settings', 'School Settings', 'Academic Settings', 'User & Role Settings', 'Module Settings', 'System Settings', 'Notifications Settings', 'Payment Settings', 'Security Settings', 'Backup & Restore', 'API & Integrations', 'Audit Log'];
            const systemAdminViews = ['Admin Dashboard', 'User & Access Control', 'Role & Permission', 'System Configuration', 'Database Management', 'Server & Performance', 'Security Management', 'Backup & Restore', 'Audit Logs', 'Email & SMS Gateway', 'API Management', 'System Updates', 'License Management', 'Support & Maintenance'];
            const institutionSetupViews = ['Basic Information', 'Academic Setup', 'Classes & Sections', 'Subjects Setup', 'Departments Setup', 'Session & Term Setup', 'Grade & Marks Setup', 'Fee Group Setup', 'Document Setup', 'ID Card & Numbering', 'Calendar Setup', 'Custom Fields Setup', 'Notification Setup', 'Other Preferences'];
            
            if (currentView === 'Dashboard') {
              return (
              <>
                {/* Dashboard Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Welcome Back, Super Admin! <span className="text-xl">👋</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Real-time insights for <span className="font-bold">Greenwood International School</span>
                      {isDemo && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                          Demo
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select className="bg-white border border-slate-200 text-xs px-3 py-2 rounded focus:outline-none text-slate-700 shadow-sm">
                      <option>Academic Year: 2025-26</option>
                      <option>Academic Year: 2024-25</option>
                    </select>
                    
                    <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors uppercase">
                      <Plus size={14} strokeWidth={3} />
                      <span>Add New</span>
                    </button>
                  </div>
                </div>

                {/* Dashboard Content */}
                <KPICards />
                <ChartsRow />
                <QuickAccess />
                <BottomRow />
              </>
              );
            } else if (currentView === 'Admission CRM' || admissionCrmViews.includes(currentView)) {
              return <AdmissionCRM currentView={currentView === 'Admission CRM' ? 'Enquiries' : currentView} />;
            } else if (currentView === 'Student Management' || studentCrmViews.includes(currentView)) {
              return <StudentManagementCRM currentView={currentView === 'Student Management' ? 'Students List' : currentView} />;
            } else if (currentView === 'Parent Management' || parentCrmViews.includes(currentView)) {
              return <ParentManagementCRM />;
            } else if (currentView === 'Academic Management' || academicCrmViews.includes(currentView)) {
              return <AcademicManagementCRM />;
            } else if (currentView === 'Attendance Management' || attendanceCrmViews.includes(currentView)) {
              return <AttendanceManagementCRM />;
            } else if (currentView === 'Examination Management' || examinationCrmViews.includes(currentView)) {
              return <ExaminationManagementCRM />;
            } else if (currentView === 'Fees & Finance' || feeFinanceCrmViews.includes(currentView)) {
              return <FeeFinanceManagementCRM />;
            } else if (currentView === 'HR & Payroll Management' || hrPayrollCrmViews.includes(currentView)) {
              return <HrPayrollManagementCRM />;
            } else if (currentView === 'Transport Management' || transportCrmViews.includes(currentView)) {
              return <TransportManagementCRM />;
            } else if (currentView === 'Library Management' || libraryCrmViews.includes(currentView)) {
              return <LibraryManagementCRM />;
            } else if (currentView === 'Hostel Management' || hostelCrmViews.includes(currentView)) {
              return <HostelManagementCRM />;
            } else if (currentView === 'Inventory Management' || inventoryCrmViews.includes(currentView)) {
              return <InventoryManagementCRM />;
            } else if (currentView === 'Communication Management' || communicationCrmViews.includes(currentView)) {
              return <CommunicationManagementCRM />;
            } else if (currentView === 'Event Management' || eventCrmViews.includes(currentView)) {
              return <EventManagementCRM />;
            } else if (currentView === 'Website & CMS Management' || websiteCrmViews.includes(currentView)) {
              return <WebsiteCMSManagementCRM />;
            } else if (currentView === 'Reports & Analytics' || reportsCrmViews.includes(currentView)) {
              return <ReportsAnalyticsCRM />;
            } else if (currentView === 'Settings Management' || settingsCrmViews.includes(currentView)) {
              return <SettingsManagementCRM />;
            } else if (currentView === 'System Administration' || systemAdminViews.includes(currentView)) {
              return <SystemAdministrationCRM />;
            } else if (currentView === 'Institution Setup' || institutionSetupViews.includes(currentView)) {
              return <InstitutionSetupCRM />;
            } else {
              return (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 mt-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <span className="text-2xl">🚧</span>
                </div>
                <h2 className="text-xl font-bold text-slate-700">{currentView} Module</h2>
                <p className="text-sm">This module is currently under construction.</p>
              </div>
              );
            }
          })()}
        </main>
        
        {/* SYSTEM STATUS BAR */}
        <footer className="bg-white border-t border-slate-200 h-10 px-6 flex items-center justify-between shrink-0 hidden sm:flex">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <p className="text-[10px] text-slate-500">System Health: Good</p>
            </div>
            <p className="text-[10px] text-slate-500">Storage Used: <span className="text-slate-700 font-bold">42% (2.1GB / 5GB)</span></p>
            <p className="text-[10px] text-slate-500">SMS Balance: <span className="text-slate-700 font-bold">12,402 Credits</span></p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-[10px] text-slate-500 italic">Build v4.2.0-stable</p>
            <p className="text-[10px] font-bold text-slate-900 px-2 py-0.5 bg-amber-100 rounded">SUPER ADMIN PRIVILEGES</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
