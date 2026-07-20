import { Menu, Search, Bell, ChevronDown, Zap, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="text-slate-400 hover:text-slate-600 lg:hidden"
        >
          <Menu size={24} />
        </button>
        
        <div className="hidden md:flex items-center bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 w-full max-w-sm">
          <Search className="text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search students, staff, modules..." 
            className="bg-transparent border-none focus:outline-none text-xs ml-2 w-full text-slate-700 placeholder-slate-400"
          />
        </div>

      </div>

      <div className="flex items-center gap-5">
        <button className="hidden sm:flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold px-4 py-1.5 rounded uppercase transition-colors">
          <Zap size={14} />
          Quick Access
        </button>

        <div className="hidden lg:block text-right">
          <p className="text-[10px] font-bold text-slate-600">17 May 2026</p>
          <p className="text-[9px] text-slate-400">10:30:00 AM</p>
        </div>

        <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1 rounded-full border border-white min-w-[16px] text-center">
            8
          </span>
        </button>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-4 cursor-pointer group">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500 text-xs overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User profile" referrerPolicy="no-referrer" />
            ) : (
              user?.email?.charAt(0).toUpperCase() || 'SA'
            )}
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <p className="text-xs font-bold text-slate-800">{user?.displayName || 'Super Admin'}</p>
            <p className="text-[9px] text-slate-400 group-hover:text-slate-600">{user?.email || 'Administrator'}</p>
          </div>
          <button onClick={logout} className="ml-2 text-slate-400 hover:text-red-500 transition-colors" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
