import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { QUICK_ACTIONS } from '../../lib/appNavigation';

type QuickActionMenuProps = {
  onNavigate: (view: string) => void;
  triggerClassName?: string;
  label?: string;
  icon?: React.ReactNode;
};

export function QuickActionMenu({
  onNavigate,
  triggerClassName = '',
  label = 'Quick Access',
  icon,
}: QuickActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName || 'hidden sm:flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold px-4 py-1.5 rounded uppercase transition-colors'}
      >
        {icon}
        {label}
        <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 max-h-72 overflow-y-auto">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                onNavigate(action.view);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            >
              <span>{action.icon}</span>
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
