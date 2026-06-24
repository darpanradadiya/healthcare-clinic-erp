import React from 'react';
import { 
  Activity, 
  LayoutDashboard, 
  Users,
  Calendar, 
  Stethoscope, 
  Receipt, 
  ClipboardList, 
  Network,
  X
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, isOpen, onClose }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'providers', label: 'Providers', icon: Stethoscope },
    { id: 'billing', label: 'Billing', icon: Receipt },
    { id: 'clinical', label: 'Clinical', icon: ClipboardList },
    { id: 'datamodel', label: 'Data Model', icon: Network },
  ];

  const activeName = typeof activePage === 'object' ? activePage.name : activePage;

  return (
    <>
      {/* Desktop: fixed sidebar — hidden below md */}
      {/* Mobile: slide-in drawer controlled by isOpen */}
      <aside
        className={`
          fixed inset-y-0 left-0 w-64 bg-[#0f2942] text-slate-300 flex flex-col justify-between
          border-r border-[#1a3d5e] z-50 font-sans shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Brand Section */}
        <div>
          <div className="h-14 md:h-16 flex items-center px-6 border-b border-[#1a3d5e] gap-3">
            <Activity className="h-6 w-6 text-red-500 animate-pulse shrink-0" />
            <span className="text-white font-bold text-lg tracking-wide">HealthCare ERP</span>
            {/* Close button — mobile only */}
            <button
              onClick={onClose}
              className="ml-auto md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 px-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeName === item.id || (item.id === 'patients' && activeName === 'patient-detail');
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'bg-[#1d4d7a] text-white border-l-4 border-[#dc2626] shadow-sm'
                      : 'hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-colors duration-200 shrink-0 ${isActive ? 'text-red-500' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Branding */}
        <div className="p-4 border-t border-[#1a3d5e] bg-[#0c2237] text-center">
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">ITC 6000</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Northeastern University</p>
        </div>
      </aside>
    </>
  );
}
