import React, { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, apiPut, formatDateTime } from '../lib/api';
import { Badge } from '../components/ui/badge';
import DataTable from '../components/DataTable';
import { AlertCircle, Plus, CheckCircle, XCircle, AlertTriangle, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import FormModal from '../components/FormModal';
import AppointmentForm from '../components/AppointmentForm';
import DateTimePicker from '../components/DateTimePicker';
import ExportDialog from '../components/ExportDialog';

const getBadgeStyles = (status) => {
  switch (status) {
    case 'Scheduled':
      return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40 hover:bg-blue-50';
    case 'Checked In':
      return 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/40 hover:bg-pink-50';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 hover:bg-emerald-50';
    case 'Cancelled':
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60 hover:bg-slate-50';
    case 'No-Show':
      return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40 hover:bg-rose-50';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-slate-400 hover:bg-gray-100';
  }
};

export default function Appointments({ theme }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal Control States
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const apptFormRef = useRef();

  // Export Dialog State
  const [isExportOpen, setIsExportOpen] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = status === 'All' || status === 'Today' ? '' : status;
      const dateParam = status === 'Today' ? new Date().toISOString().split('T')[0] : dateFilter;
      
      const res = await apiGet(
        `/appointments?page=${page}&limit=${limit}&status=${statusParam}&search=${encodeURIComponent(search)}&date=${dateParam}`
      );
      setData(res.rows || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [page, status, search, dateFilter]);

  const handleSearch = (term) => {
    setSearch(term);
    setPage(1);
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setPage(1);
    if (newStatus === 'Today') {
      setDateFilter(''); // Reset manual date filter when using "Today" quick filter
    }
  };

  const handleBookAppt = async (formData) => {
    setSaving(true);
    try {
      await apiPost('/appointments', formData);
      setIsBookModalOpen(false);
      toast.success('Appointment booked successfully.');
      fetchAppointments();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to book appointment.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (apptId, newStatus) => {
    try {
      await apiPut(`/appointments/${apptId}`, { status: newStatus });
      toast.success(`Appointment status updated to ${newStatus}.`);
      fetchAppointments();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update status.');
    }
  };

  const handleExportSubmit = ({ columns, scope, dateFrom, dateTo }) => {
    setIsExportOpen(false);
    toast.info('Initiating CSV download...');
    
    const statusParam = status === 'All' || status === 'Today' ? '' : status;
    const dateParam = status === 'Today' ? new Date().toISOString().split('T')[0] : dateFilter;

    const params = {
      columns: columns.join(','),
      scope,
      date_from: dateFrom,
      date_to: dateTo,
      status: statusParam,
      date: dateParam,
      search: search
    };
    
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    query.append('export', 'csv');
    
    window.location.href = `/api/appointments?${query.toString()}`;
  };

  const columnsList = [
    { key: 'patient_name', label: 'Patient Name' },
    { key: 'provider_name', label: 'Provider Name' },
    { key: 'SPECIALTY', label: 'Provider Specialty' },
    { key: 'location_name', label: 'Facility Location' },
    { key: 'SCHEDULED_START', label: 'Start Time' },
    { key: 'SCHEDULED_END', label: 'End Time' },
    { key: 'STATUS', label: 'Status' },
    { key: 'REASON', label: 'Reason' }
  ];

  const filterOptions = ['All', 'Today', 'Scheduled', 'Checked In', 'Completed', 'Cancelled', 'No-Show'];

  const columns = [
    {
      key: 'patient_name',
      header: 'Patient',
      render: (row) => <span className="font-semibold text-slate-950 dark:text-slate-200">{row.patient_name}</span>
    },
    {
      key: 'provider_name',
      header: 'Provider',
      render: (row) => <span className="text-slate-700 dark:text-slate-300">Dr. {row.provider_name}</span>
    },
    {
      key: 'SPECIALTY',
      header: 'Specialty',
      render: (row) => (
        <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          {row.SPECIALTY}
        </span>
      )
    },
    {
      key: 'location_name',
      header: 'Location',
      render: (row) => <span className="text-slate-600 dark:text-slate-400">{row.location_name}</span>
    },
    {
      key: 'SCHEDULED_START',
      header: 'Start Time',
      render: (row) => <span className="text-slate-600 dark:text-slate-350 font-medium font-sans">{formatDateTime(row.SCHEDULED_START)}</span>
    },
    {
      key: 'SCHEDULED_END',
      header: 'End Time',
      render: (row) => <span className="text-slate-600 dark:text-slate-350 font-medium font-sans">{formatDateTime(row.SCHEDULED_END)}</span>
    },
    {
      key: 'STATUS',
      header: 'Status',
      render: (row) => (
        <Badge className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide uppercase ${getBadgeStyles(row.STATUS)}`}>
          {row.STATUS}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      cellClassName: 'text-right pr-6',
      render: (row) => {
        if (row.STATUS !== 'Scheduled' && row.STATUS !== 'Checked In') {
          return <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold italic">No actions available</span>;
        }

        return (
          <div className="flex items-center justify-end gap-1.5">
            {row.STATUS === 'Scheduled' && (
              <button
                onClick={() => handleUpdateStatus(row.APPOINTMENT_ID, 'Checked In')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 dark:border-pink-900/30 text-pink-700 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
                title="Check In Patient"
              >
                <CheckCircle className="h-3.5 w-3.5 text-pink-550" />
                Check In
              </button>
            )}
            {row.STATUS === 'Checked In' && (
              <button
                onClick={() => handleUpdateStatus(row.APPOINTMENT_ID, 'Completed')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
                title="Mark Appointment Completed"
              >
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                Complete
              </button>
            )}
            <button
              onClick={() => handleUpdateStatus(row.APPOINTMENT_ID, 'Cancelled')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
              title="Cancel Appointment"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              onClick={() => handleUpdateStatus(row.APPOINTMENT_ID, 'No-Show')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/30 text-rose-700 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
              title="Mark as No-Show"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              No-Show
            </button>
          </div>
        );
      }
    }
  ];

  const handleDateSelect = (val) => {
    setDateFilter(val);
    setStatus('All'); // Clear quick filters when choosing specific date
  };

  const clearDateFilter = () => {
    setDateFilter('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight animate-fade-in">Appointment Schedule</h2>
          <p className="text-sm text-slate-500 dark:text-slate-450 font-medium font-sans">Manage, check-in, and review all scheduled clinic encounters.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto lg:justify-end">
          {/* Custom Date Filter Pickers */}
          <div className="flex items-center gap-2">
            <div className="w-48">
              <DateTimePicker
                value={dateFilter}
                onChange={handleDateSelect}
                placeholder="Filter by specific date"
                showTime={false}
                className="py-1.5"
              />
            </div>
            {dateFilter && (
              <button
                onClick={clearDateFilter}
                className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl cursor-pointer transition-colors"
                title="Reset Date Filter"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 w-fit">
            {filterOptions.map(option => (
              <button
                key={option}
                onClick={() => handleStatusChange(option)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  status === option
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/50 dark:border-slate-700/50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* CSV Export Button */}
            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-805 hover:bg-slate-55 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs transition-all duration-200 bg-white dark:bg-slate-900"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>

            <button
              onClick={() => setIsBookModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#dc2626] hover:bg-red-750 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs hover:shadow-md transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Book Appointment
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-655 dark:text-red-405 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800 dark:text-red-350">Failed to load appointments</h3>
            <p className="text-xs text-red-700 dark:text-red-404 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Appointment Data Table */}
      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onSearch={handleSearch}
        searchPlaceholder="Search by patient or provider name..."
        loading={loading}
        emptyMessage="No appointments found for the selected filter."
      />

      {/* Appointment Booking Modal */}
      <FormModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Book New Appointment"
        saveLabel="Confirm Appointment"
        loading={saving}
        onSave={() => apptFormRef.current?.submit()}
      >
        <AppointmentForm
          ref={apptFormRef}
          onSubmit={handleBookAppt}
        />
      </FormModal>

      {/* CSV Export Dialog */}
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        columns={columnsList}
        activeFilters={{ search, status: status !== 'All' ? status : '' }}
        onExport={handleExportSubmit}
        totalCount={total}
        currentPageCount={data.length}
        hasDateRange={true}
      />
    </div>
  );
}
