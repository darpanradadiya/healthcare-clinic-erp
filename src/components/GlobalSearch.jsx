import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, Stethoscope, Loader2, Command } from 'lucide-react';
import { apiGet } from '../lib/api';

export default function GlobalSearch({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Focus bindings (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowDropdown(true);
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await apiGet(`/search?q=${encodeURIComponent(query)}`);
        setResults(data || []);
        setActiveIndex(-1);
        setShowDropdown(true);
      } catch (err) {
        console.error('Global search query failure', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  // Click outside to close dropdown suggestions list
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (item) => {
    setQuery('');
    setShowDropdown(false);
    setActiveIndex(-1);
    inputRef.current?.blur();

    if (item.type === 'patient') {
      onNavigate({ name: 'patient-detail', id: item.id });
    } else if (item.type === 'provider') {
      onNavigate('providers');
    }
  };

  const handleKeyDown = (e) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelectResult(results[activeIndex]);
      }
    }
  };

  const patientsList = results.filter(r => r.type === 'patient');
  const providersList = results.filter(r => r.type === 'provider');

  return (
    <div className="relative w-full max-w-md font-sans">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search patients, providers..."
          className="w-full pl-9 pr-14 py-1.5 border border-slate-200/80 dark:border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 dark:bg-[#131c2e] placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100 transition-all font-semibold"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 bg-white dark:bg-[#131c2e] border border-slate-200 dark:border-border px-1.5 py-0.5 rounded-md pointer-events-none select-none">
          <Command className="h-2.5 w-2.5" />
          <span>K</span>
        </div>
      </div>

      {showDropdown && (query || results.length > 0) && (
        <div 
          ref={dropdownRef}
          className="absolute left-0 right-0 z-50 bg-white dark:bg-[#1a2438] border border-slate-100 dark:border-border rounded-xl shadow-xl mt-1.5 p-2 max-h-96 overflow-y-auto space-y-3"
        >
          {loading && (
            <div className="flex items-center justify-center py-6 gap-2 text-slate-400 dark:text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Searching database registry...</span>
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-semibold">
              No matching records found.
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              {/* Patients Group */}
              {patientsList.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                    <Users className="h-3 w-3" />
                    <span>Patients Registry</span>
                  </div>
                  {patientsList.map((item) => {
                    const idx = results.indexOf(item);
                    const isActive = activeIndex === idx;
                    return (
                      <button
                      key={`p-${item.id}`}
                      type="button"
                      onClick={() => handleSelectResult(item)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        isActive 
                          ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-slate-100' 
                          : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/60 border border-slate-200/45 dark:border-slate-800 px-1.5 py-0.5 rounded-md">
                        {item.sublabel}
                      </span>
                    </button>
                    );
                  })}
                </div>
              )}

              {/* Providers Group */}
              {providersList.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                    <Stethoscope className="h-3 w-3" />
                    <span>Providers Roster</span>
                  </div>
                  {providersList.map((item) => {
                    const idx = results.indexOf(item);
                    const isActive = activeIndex === idx;
                    return (
                      <button
                        key={`pr-${item.id}`}
                        type="button"
                        onClick={() => handleSelectResult(item)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          isActive 
                            ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-slate-100' 
                            : 'hover:bg-slate-55 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-semibold">Dr. {item.label}</span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {item.sublabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
