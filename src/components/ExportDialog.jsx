import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import DateTimePicker from './DateTimePicker';
import { Loader2, Download, HelpCircle, CheckSquare, Square, Calendar } from 'lucide-react';

export default function ExportDialog({
  isOpen,
  onClose,
  columns = [],
  activeFilters = {},
  onExport,
  totalCount = 0,
  currentPageCount = 0,
  hasDateRange = false,
  loading = false,
}) {
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [scope, setScope] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Reset states when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedColumns(columns.map(c => c.key));
      setScope('all');
      setDateFrom('');
      setDateTo('');
    }
  }, [isOpen, columns]);

  const handleToggleColumn = (key) => {
    setSelectedColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setSelectedColumns(columns.map(c => c.key));
  };

  const handleSelectNone = () => {
    setSelectedColumns([]);
  };

  const handleDownload = () => {
    if (selectedColumns.length === 0) {
      alert('Please select at least one column to export.');
      return;
    }
    onExport({
      columns: selectedColumns,
      scope,
      dateFrom,
      dateTo
    });
  };

  // Build active filter chips for display
  const filterChips = [];
  if (activeFilters.search) {
    filterChips.push({ label: 'Search', value: `"${activeFilters.search}"` });
  }
  if (activeFilters.status && activeFilters.status !== 'All') {
    filterChips.push({ label: 'Status', value: activeFilters.status });
  }
  if (activeFilters.specialty && activeFilters.specialty !== 'All') {
    filterChips.push({ label: 'Specialty', value: activeFilters.specialty });
  }

  const estimatedRows = scope === 'page' ? currentPageCount : totalCount;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-xl w-[calc(100vw-1rem)] sm:w-auto border border-slate-100 dark:border-border bg-white dark:bg-popover shadow-2xl rounded-2xl p-4 md:p-6 transition-all duration-200 max-h-[90dvh] flex flex-col">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-border shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-foreground tracking-tight flex items-center gap-2">
            <Download className="h-5 w-5 text-red-600" />
            CSV Export Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-5 text-slate-700 dark:text-slate-300 text-sm overflow-y-auto flex-1 min-h-0">
          {/* Active Filters Display */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
              Active Table Filters
            </span>
            <div className="flex flex-wrap gap-1.5">
              {filterChips.length > 0 ? (
                filterChips.map((chip, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border"
                  >
                    {chip.label}: <strong className="ml-1 text-slate-900 dark:text-slate-100">{chip.value}</strong>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-sans italic">
                  No active query filters applied.
                </span>
              )}
            </div>
          </div>

          {/* Scope Options */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
              Export Scope
            </span>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                scope === 'page' 
                  ? 'border-red-500 bg-red-50/10 dark:bg-red-950/10' 
                  : 'border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-white/5'
              }`}>
                <input 
                  type="radio" 
                  name="scope" 
                  value="page" 
                  checked={scope === 'page'} 
                  onChange={() => setScope('page')}
                  className="mt-1 cursor-pointer accent-[#dc2626]"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">Current Page Only</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                    Exports active grid view rows only ({currentPageCount} rows).
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                scope === 'all' 
                  ? 'border-red-500 bg-red-50/10 dark:bg-red-950/10' 
                  : 'border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-white/5'
              }`}>
                <input 
                  type="radio" 
                  name="scope" 
                  value="all" 
                  checked={scope === 'all'} 
                  onChange={() => setScope('all')}
                  className="mt-1 cursor-pointer accent-[#dc2626]"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">All Matching Records</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                    Exports the full query result matching active filters (~{totalCount} rows).
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Date Range Options (Conditional) */}
          {hasDateRange && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-200/50 dark:border-border">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Additional Date Range Filter (Optional)
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-455 block mb-1">From Date</label>
                  <DateTimePicker 
                    value={dateFrom} 
                    onChange={setDateFrom} 
                    showTime={false} 
                    placeholder="YYYY-MM-DD"
                    className="py-1 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-505 dark:text-slate-455 block mb-1">To Date</label>
                  <DateTimePicker 
                    value={dateTo} 
                    onChange={setDateTo} 
                    showTime={false} 
                    placeholder="YYYY-MM-DD"
                    className="py-1 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Columns Selector Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Select Columns to Export ({selectedColumns.length}/{columns.length})
              </span>
              <div className="flex gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <button type="button" onClick={handleSelectAll} className="hover:text-red-500 cursor-pointer">
                  SELECT ALL
                </button>
                <span>•</span>
                <button type="button" onClick={handleSelectNone} className="hover:text-red-500 cursor-pointer">
                  CLEAR ALL
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3.5 border border-slate-100 dark:border-border bg-slate-50/30 dark:bg-slate-950/30 rounded-xl max-h-36 md:max-h-48 overflow-y-auto scrollbar-thin">
              {columns.map(col => {
                const isChecked = selectedColumns.includes(col.key);
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => handleToggleColumn(col.key)}
                    className="flex items-center gap-2 text-xs font-semibold py-1 px-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-left text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    {isChecked ? (
                      <CheckSquare className="h-4 w-4 text-[#dc2626] shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{col.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100 dark:border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30 -mx-4 md:-mx-6 -mb-4 md:-mb-6 px-4 md:px-6 py-4 rounded-b-2xl shrink-0">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Preview: <strong className="text-slate-805 dark:text-slate-200">{estimatedRows} rows</strong> will be generated.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-[#1a2438] text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || selectedColumns.length === 0}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-[#dc2626] hover:bg-red-750 text-white font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer disabled:opacity-50 min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download CSV
                </>
              )}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
