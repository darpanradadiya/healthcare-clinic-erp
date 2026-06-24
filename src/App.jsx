import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Appointments from './pages/Appointments';
import Providers from './pages/Providers';
import Billing from './pages/Billing';
import Clinical from './pages/Clinical';
import DataModel from './pages/DataModel';
import GlobalSearch from './components/GlobalSearch';
import SqlViewer from './components/SqlViewer';
import { CalendarDays, Sun, Moon, Database, Menu, X, Search } from 'lucide-react';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [theme, setTheme] = useState('light');
  const [sqlOpen, setSqlOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Sync theme to HTML class
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Close mobile sidebar on route change
  const handleNavigate = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
    setMobileSearchOpen(false);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const getPageTitle = () => {
    const pageName = typeof activePage === 'object' ? activePage.name : activePage;
    switch (pageName) {
      case 'dashboard': return 'Clinical & Financial Ops';
      case 'patients': return 'Patient Registry';
      case 'patient-detail': return 'Patient Chart';
      case 'appointments': return 'Appointment Manager';
      case 'providers': return 'Provider Rosters';
      case 'billing': return 'AR Ledger';
      case 'clinical': return 'Clinical Insights';
      case 'datamodel': return 'Schema / ERD';
      default: return 'Dashboard';
    }
  };

  const renderActivePage = () => {
    const pageName = typeof activePage === 'object' ? activePage.name : activePage;
    switch (pageName) {
      case 'dashboard':
        return <Dashboard theme={theme} />;
      case 'patients':
        return <Patients onNavigate={(page) => handleNavigate(page)} theme={theme} />;
      case 'patient-detail':
        return (
          <PatientDetail
            patientId={activePage.id}
            onBack={() => handleNavigate('patients')}
            onNavigate={(page) => handleNavigate(page)}
            theme={theme}
          />
        );
      case 'appointments':
        return <Appointments theme={theme} />;
      case 'providers':
        return <Providers theme={theme} />;
      case 'billing':
        return <Billing theme={theme} />;
      case 'clinical':
        return <Clinical theme={theme} />;
      case 'datamodel':
        return <DataModel theme={theme} />;
      default:
        return <Dashboard theme={theme} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex font-sans transition-colors duration-200">
      {/* ── Mobile sidebar overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (desktop: fixed, mobile: drawer) ── */}
      <Sidebar
        activePage={activePage}
        setActivePage={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main Content Area ── */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">

        {/* ── Top Header Bar ── */}
        <header className="h-14 md:h-16 bg-white dark:bg-[#131c2e] border-b border-slate-100 dark:border-[rgba(255,255,255,0.08)] flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-xs transition-colors duration-200">

          {/* Left: Hamburger (mobile) + Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger – mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Page title – hidden when mobile search is open */}
            <h1 className={`text-xs font-extrabold text-slate-900 dark:text-white tracking-tight uppercase truncate transition-all ${mobileSearchOpen ? 'hidden sm:block' : 'block'}`}>
              {getPageTitle()}
            </h1>
          </div>

          {/* Center: Global Search – desktop always visible, mobile toggle */}
          <div className={`
            ${mobileSearchOpen
              ? 'absolute inset-x-0 top-0 h-14 md:h-16 px-4 flex items-center z-10 bg-white dark:bg-[#131c2e] md:relative md:inset-auto md:h-auto md:px-0 md:flex-1 md:flex md:justify-center md:px-4'
              : 'hidden md:flex flex-1 justify-center px-4'
            }`}
          >
            {mobileSearchOpen && (
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="md:hidden mr-2 p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <GlobalSearch onNavigate={handleNavigate} />
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {/* Search icon – mobile only, toggles search bar */}
            {!mobileSearchOpen && (
              <button
                onClick={() => setMobileSearchOpen(true)}
                className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 md:p-2 border border-slate-200 dark:border-[rgba(255,255,255,0.08)] hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
              title={theme === 'light' ? 'Activate Dark Mode' : 'Activate Light Mode'}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            {/* Date Banner – hidden on small screens */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-[rgba(255,255,255,0.08)] px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-semibold">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>June 12, 2026</span>
            </div>

            {/* Online Badge – hidden on xs */}
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="hidden md:inline">Live Database</span>
            </div>
          </div>
        </header>

        {/* ── Content Body ── */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#f8fafc] dark:bg-[#0b1120]">
          <div className="animate-fade-in">
            {renderActivePage()}
          </div>
        </main>
      </div>

      {/* ── Floating SQL Button ── */}
      <button
        onClick={() => setSqlOpen(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-[#0f2942] hover:bg-slate-800 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-xl hover:shadow-2xl transition-all duration-200 z-40 border border-[#1a2b4c] cursor-pointer group"
      >
        <Database className="h-4 w-4 text-pink-500 group-hover:animate-pulse" />
        <span className="hidden sm:inline">View SQL</span>
        <span className="sm:hidden">SQL</span>
      </button>

      {/* ── SQL Viewer Drawer ── */}
      <SqlViewer
        isOpen={sqlOpen}
        onClose={() => setSqlOpen(false)}
        activePage={activePage}
      />

      {/* ── Sonner Toaster ── */}
      <Toaster theme={theme} position="top-right" closeButton richColors />
    </div>
  );
}
