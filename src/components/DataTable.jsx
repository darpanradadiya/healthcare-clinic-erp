import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from './ui/table';

export default function DataTable({
  columns,
  data = [],
  total = 0,
  page = 1,
  limit = 25,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Search...',
  loading = false,
  emptyMessage = 'No records found.'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const isFirstRender = useRef(true);

  // Debounced search trigger
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      if (onSearch) onSearch(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const totalPages = Math.ceil(total / limit) || 1;
  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      {onSearch && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 border border-slate-200/80 dark:border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-[#131c2e] placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-foreground transition-all font-sans"
          />
        </div>
      )}

      {/* Main Grid Wrapper */}
      <div className="border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-[#1a2438]/50 border-b border-slate-100 dark:border-border">
              <TableRow className="border-b border-slate-100 dark:border-border hover:bg-transparent">
                {columns.map((col, idx) => (
                  <TableHead 
                    key={col.key || idx} 
                    className={`font-semibold text-slate-600 dark:text-slate-400 py-3.5 ${col.className || ''}`}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading State Skeletons
                Array.from({ length: 5 }).map((_, rowIdx) => (
                  <TableRow key={rowIdx} className="border-b border-slate-100 dark:border-border/60 hover:bg-transparent">
                    {columns.map((col, colIdx) => (
                      <TableCell key={col.key || colIdx} className="py-4">
                        <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-md animate-pulse w-3/4" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                // Empty State
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="text-center py-20 text-slate-400 dark:text-slate-500 font-medium text-sm">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                // Data Rows
                data.map((row, rowIdx) => (
                  <TableRow
                    key={row.id || rowIdx}
                    className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.06] border-b border-slate-100 dark:border-border transition-colors duration-150 ${
                      rowIdx % 2 === 1 ? 'bg-slate-50/20 dark:bg-white/[0.03]' : ''
                    } ${row.rowClassName || ''}`}
                  >
                    {columns.map((col, colIdx) => (
                      <TableCell 
                        key={col.key || colIdx} 
                        className={`text-slate-700 dark:text-slate-300 py-3.5 ${col.cellClassName || ''}`}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Server-Side Pagination Controls */}
        {onPageChange && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-border bg-slate-50/30 dark:bg-slate-950/10">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {total > 0 ? (
                <span>Showing <span className="text-slate-800 dark:text-slate-200">{startIdx}</span> to <span className="text-slate-800 dark:text-slate-200">{endIdx}</span> of <span className="text-slate-800 dark:text-slate-200">{total}</span> records</span>
              ) : (
                <span>0 records found</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-[#1a2438] hover:bg-slate-55 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-[#1a2438] transition-all cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2 select-none">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-[#1a2438] hover:bg-slate-55 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-[#1a2438] transition-all cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
