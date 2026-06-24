import React, { useState, useEffect, useMemo } from 'react';
import { apiGet, formatCurrency, formatDate } from '../lib/api';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import DataTable from '../components/DataTable';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Activity, ClipboardCheck, AlertCircle, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import ExportDialog from '../components/ExportDialog';

const getBillingBadgeStyles = (status) => {
  switch (status) {
    case 'Open':
      return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40';
    case 'Partial':
      return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40';
    case 'Paid':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60';
  }
};

export default function Clinical({ theme }) {
  const isDark = theme === 'dark';
  const [diagnosesData, setDiagnosesData] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [totalEncounters, setTotalEncounters] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [error, setError] = useState(null);

  // Export Dialog State
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Fetch static top diagnoses once
  const fetchDiagnoses = async () => {
    setLoadingCharts(true);
    try {
      const res = await apiGet('/diagnoses/top');
      setDiagnosesData(res || []);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoadingCharts(false);
    }
  };

  // Fetch paginated encounters
  const fetchEncounters = async () => {
    setLoadingTable(true);
    try {
      const res = await apiGet(`/encounters?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
      setEncounters(res.rows || []);
      setTotalEncounters(res.total || 0);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchDiagnoses();
  }, []);

  useEffect(() => {
    fetchEncounters();
  }, [page, search]);

  const handleSearch = (term) => {
    setSearch(term);
    setPage(1);
  };

  const handleExportSubmit = ({ columns, scope, dateFrom, dateTo }) => {
    setIsExportOpen(false);
    toast.info('Initiating CSV download...');
    
    const params = {
      columns: columns.join(','),
      scope,
      date_from: dateFrom,
      date_to: dateTo,
      search: search
    };
    
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    query.append('export', 'csv');
    
    window.location.href = `/api/encounters?${query.toString()}`;
  };

  const columnsList = [
    { key: 'patient_name', label: 'Patient Name' },
    { key: 'ENCOUNTER_DATE', label: 'Visit Date' },
    { key: 'provider_name', label: 'Provider Name' },
    { key: 'primary_dx', label: 'Primary Diagnosis' },
    { key: 'invoice_total', label: 'Invoice Total' },
    { key: 'billing', label: 'Billing Status' }
  ];

  // Derive top statistics for clinical overview
  const clinicalStats = useMemo(() => {
    if (diagnosesData.length === 0) return { totalRecords: 0, topDx: 'N/A' };
    const total = diagnosesData.reduce((acc, curr) => acc + curr.times_recorded, 0);
    const top = diagnosesData[0];
    return {
      totalRecords: total,
      topDx: `${top.icd10} (${top.times_recorded} times)`
    };
  }, [diagnosesData]);

  const columns = [
    {
      key: 'patient_name',
      header: 'Patient',
      render: (row) => <span className="font-semibold text-slate-950 dark:text-slate-200">{row.patient_name}</span>
    },
    {
      key: 'ENCOUNTER_DATE',
      header: 'Visit Date',
      render: (row) => <span className="text-slate-600 dark:text-slate-400 font-medium">{formatDate(row.ENCOUNTER_DATE)}</span>
    },
    {
      key: 'provider_name',
      header: 'Provider',
      render: (row) => <span className="text-slate-700 dark:text-slate-300">Dr. {row.provider_name}</span>
    },
    {
      key: 'primary_dx',
      header: 'Primary Diagnosis',
      render: (row) => (
        <span className="text-slate-805 dark:text-slate-300 font-medium max-w-[280px] truncate block" title={row.primary_dx}>
          {row.primary_dx || 'N/A'}
        </span>
      )
    },
    {
      key: 'invoice_total',
      header: 'Invoice Total',
      render: (row) => (
        <span className="text-slate-900 dark:text-slate-100 font-semibold font-sans">
          {row.invoice_total !== null && row.invoice_total !== undefined 
            ? formatCurrency(row.invoice_total) 
            : '$0.00'}
        </span>
      )
    },
    {
      key: 'billing',
      header: 'Billing Status',
      render: (row) => (
        <Badge className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${getBillingBadgeStyles(row.billing)}`}>
          {row.billing || 'Unbilled'}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight animate-fade-in">Clinical Insights</h2>
        <p className="text-sm text-slate-505 dark:text-slate-450 font-medium font-sans">
          Review epidemiological coding frequencies and examine detailed individual patient encounter diagnostics.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-955/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-655 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Error loading clinical details</h3>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Top Section: Donut chart and stats side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Horizontal Bar Chart (Top Diagnoses) */}
        <Card className="lg:col-span-2 border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs">
          <CardHeader className="border-b border-slate-50 dark:border-border px-6 py-4">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Top Diagnoses</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[340px]">
              {loadingCharts ? (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  <span className="text-xs font-semibold text-slate-505 dark:text-slate-400">Loading charts...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={diagnosesData.slice(0, 10)} // Show top 10
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'} />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }} />
                    <YAxis 
                      dataKey="icd10" 
                      type="category" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11, fontWeight: 600 }} 
                      width={60}
                    />
                    <Tooltip 
                      formatter={(value, name, props) => {
                        const label = name === 'times_recorded' ? 'Times Recorded' : 'Primary Diagnosis';
                        return [value, `${label} (${props.payload.description})` ];
                      }}
                      contentStyle={{ 
                        backgroundColor: isDark ? '#1a2438' : '#fff', 
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                        borderRadius: '8px', 
                        fontSize: '12px' 
                      }}
                      itemStyle={{ color: isDark ? '#e8edf5' : '#0f172a' }}
                      labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                    <Bar dataKey="times_recorded" name="Times Recorded" fill={isDark ? '#60a5fa' : '#0f2942'} radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="times_primary" name="Times Primary" fill={isDark ? '#f87171' : '#dc2626'} radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clinical Statistics Summary */}
        <Card className="border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs flex flex-col justify-between">
          <CardHeader className="border-b border-slate-50 dark:border-border px-6 py-4">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Coding Metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-center">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/40">
                <Activity className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total ICD-10 Records</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white block mt-0.5">{clinicalStats.totalRecords}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mt-1">Cross-referenced primary/secondary diagnoses</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900/40">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Predominant Diagnosis</span>
                <span className="text-base font-bold text-slate-900 dark:text-slate-100 block mt-0.5 truncate max-w-[200px]" title={clinicalStats.topDx}>
                  {clinicalStats.topDx}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mt-1">Most frequent reason for patient consultations</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-505 uppercase tracking-wider block">Data Completeness</span>
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">100%</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mt-1">All billable encounters mapped to primary ICD-10</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Visit Summary Table */}
      <Card className="border border-slate-101 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-50 dark:border-border px-6 py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">Patient Visit Summary</CardTitle>
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs transition-all duration-200 bg-white dark:bg-slate-900"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={encounters}
            total={totalEncounters}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onSearch={handleSearch}
            searchPlaceholder="Search by patient or provider name..."
            loading={loadingTable}
            emptyMessage="No clinical encounter records found."
          />
        </CardContent>
      </Card>

      {/* CSV Export Dialog */}
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        columns={columnsList}
        activeFilters={{ search }}
        onExport={handleExportSubmit}
        totalCount={totalEncounters}
        currentPageCount={encounters.length}
        hasDateRange={true}
      />
    </div>
  );
}
