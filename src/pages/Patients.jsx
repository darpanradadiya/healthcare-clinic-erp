import React, { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, apiPut } from '../lib/api';
import DataTable from '../components/DataTable';
import { Badge } from '../components/ui/badge';
import { Plus, AlertCircle, Edit, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import FormModal from '../components/FormModal';
import PatientForm from '../components/PatientForm';
import ExportDialog from '../components/ExportDialog';

export default function Patients({ onNavigate, theme }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);
  const patientFormRef = useRef();

  // Export Dialog State
  const [isExportOpen, setIsExportOpen] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet(`/patients?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
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
    fetchPatients();
  }, [page, search]);

  const handleSearch = (term) => {
    setSearch(term);
    setPage(1); // Reset to page 1 on new search
  };

  const getPortalBadgeStyles = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 hover:bg-emerald-50';
      case 'Inactive':
        return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 hover:bg-amber-50';
      case 'No Account':
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60 hover:bg-slate-50';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-50';
    }
  };

  const openAddModal = () => {
    setSelectedPatient(null);
    setIsModalOpen(true);
  };

  const openEditModal = (patient) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const handleSavePatient = async (formData) => {
    setSaving(true);
    try {
      if (selectedPatient) {
        await apiPut(`/patients/${selectedPatient.PATIENT_ID}`, formData);
        toast.success(`Patient "${formData.first_name} ${formData.last_name}" updated successfully.`);
      } else {
        await apiPost('/patients', formData);
        toast.success(`Patient "${formData.first_name} ${formData.last_name}" created successfully.`);
      }
      setIsModalOpen(false);
      fetchPatients();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save patient record.');
    } finally {
      setSaving(false);
    }
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
    
    window.location.href = `/api/patients?${query.toString()}`;
  };

  const columnsList = [
    { key: 'MRN', label: 'MRN' },
    { key: 'FIRST_NAME', label: 'First Name' },
    { key: 'LAST_NAME', label: 'Last Name' },
    { key: 'DATE_OF_BIRTH', label: 'Date of Birth' },
    { key: 'SEX', label: 'Sex' },
    { key: 'PHONE', label: 'Phone' },
    { key: 'EMAIL', label: 'Email' },
    { key: 'portal_status', label: 'Portal Status' }
  ];

  const columns = [
    {
      key: 'MRN',
      header: 'MRN',
      render: (row) => <span className="font-bold text-slate-900 dark:text-slate-105">{row.MRN}</span>
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-semibold text-slate-950 dark:text-slate-200">{row.FIRST_NAME} {row.LAST_NAME}</span>
    },
    {
      key: 'age',
      header: 'Age',
      render: (row) => <span className="font-medium text-slate-700 dark:text-slate-350">{row.age ?? 'N/A'}</span>
    },
    {
      key: 'SEX',
      header: 'Sex',
      render: (row) => (
        <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-slate-200/50 dark:border-slate-700/60">
          {row.SEX || 'O'}
        </span>
      )
    },
    {
      key: 'PHONE',
      header: 'Phone',
      render: (row) => <span className="text-slate-605 dark:text-slate-350 font-sans">{row.PHONE || 'N/A'}</span>
    },
    {
      key: 'EMAIL',
      header: 'Email',
      render: (row) => <span className="text-slate-500 dark:text-slate-400 font-sans lowercase">{row.EMAIL || 'N/A'}</span>
    },
    {
      key: 'portal_status',
      header: 'Portal Status',
      render: (row) => (
        <Badge className={`px-2 py-0.5 border rounded-full text-[11px] font-semibold tracking-wide ${getPortalBadgeStyles(row.portal_status)}`}>
          {row.portal_status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      cellClassName: 'text-right pr-6',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onNavigate({ name: 'patient-detail', id: row.PATIENT_ID })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 text-slate-750 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-50/80 rounded-lg text-xs font-semibold tracking-wide cursor-pointer transition-all duration-200"
            title="View Patient Chart"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 hover:border-slate-355 dark:border-slate-800 dark:hover:border-slate-700 text-slate-750 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-50/80 rounded-lg text-xs font-semibold tracking-wide cursor-pointer transition-all duration-200"
            title="Edit Details"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight animate-fade-in">Patients</h2>
          <p className="text-sm text-slate-500 dark:text-slate-450 font-medium font-sans">Search and manage all clinic patient records and portal accounts.</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* CSV Export Button */}
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs transition-all duration-200 bg-white dark:bg-slate-900"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#dc2626] hover:bg-red-750 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs hover:shadow-md transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            Add Patient
          </button>
        </div>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-405 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Failed to load patients list</h3>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Grid List Table */}
      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onSearch={handleSearch}
        searchPlaceholder="Search by name, MRN, email, phone..."
        loading={loading}
        emptyMessage="No patients match your search criteria."
      />

      {/* Patient Add/Edit Form Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedPatient ? 'Edit Patient Details' : 'Register New Patient'}
        saveLabel={selectedPatient ? 'Save Changes' : 'Register'}
        loading={saving}
        onSave={() => patientFormRef.current?.submit()}
      >
        <PatientForm
          ref={patientFormRef}
          initialData={selectedPatient}
          onSubmit={handleSavePatient}
        />
      </FormModal>

      {/* CSV Export Dialog */}
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        columns={columnsList}
        activeFilters={{ search }}
        onExport={handleExportSubmit}
        totalCount={total}
        currentPageCount={data.length}
        hasDateRange={false}
      />
    </div>
  );
}
