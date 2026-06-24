import React, { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, formatCurrency, formatDate } from '../lib/api';
import KpiCard from '../components/KpiCard';
import { AlertCircle, PlusCircle, Download } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import DataTable from '../components/DataTable';
import { toast } from 'sonner';
import FormModal from '../components/FormModal';
import PaymentForm from '../components/PaymentForm';
import ExportDialog from '../components/ExportDialog';

const getStatusBadgeStyles = (status) => {
  switch (status) {
    case 'Open':
      return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40 hover:bg-rose-50';
    case 'Partial':
      return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 hover:bg-amber-50';
    case 'Paid':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 hover:bg-emerald-50';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-205 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-50';
  }
};

export default function Billing({ theme }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [outstandingAr, setOutstandingAr] = useState('$0.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const paymentFormRef = useRef();

  const [isExportOpen, setIsExportOpen] = useState(false);

  const fetchBillingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = status === 'All' ? '' : status;
      
      const [invoiceRes, kpiRes] = await Promise.all([
        apiGet(`/invoices?page=${page}&limit=${limit}&status=${statusParam}&search=${encodeURIComponent(search)}`),
        apiGet('/dashboard/kpis')
      ]);

      setData(invoiceRes.rows || []);
      setTotal(invoiceRes.total || 0);
      setOutstandingAr(formatCurrency(kpiRes.outstandingAR));
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [page, status, search]);

  const handleSearch = (term) => {
    setSearch(term);
    setPage(1);
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleRecordPayment = async (formData) => {
    if (!selectedInvoice) return;
    setSaving(true);
    try {
      await apiPost(`/invoices/${selectedInvoice.INVOICE_ID}/payments`, formData);
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      toast.success(`Payment of ${formatCurrency(formData.amount)} recorded successfully.`);
      fetchBillingData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportSubmit = ({ columns, scope, dateFrom, dateTo }) => {
    setIsExportOpen(false);
    toast.info('Initiating CSV download...');
    
    const statusParam = status === 'All' ? '' : status;
    const params = {
      columns: columns.join(','),
      scope,
      date_from: dateFrom,
      date_to: dateTo,
      status: statusParam,
      search: search
    };
    
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    query.append('export', 'csv');
    
    window.location.href = `/api/invoices?${query.toString()}`;
  };

  const columnsList = [
    { key: 'INVOICE_ID', label: 'Invoice ID' },
    { key: 'patient_name', label: 'Patient Name' },
    { key: 'INVOICE_DATE', label: 'Invoice Date' },
    { key: 'TOTAL_AMOUNT', label: 'Total Amount' },
    { key: 'AMOUNT_PAID', label: 'Amount Paid' },
    { key: 'balance_due', label: 'Balance Due' },
    { key: 'STATUS', label: 'Status' }
  ];

  const filterOptions = ['All', 'Open', 'Partial', 'Paid'];

  const columns = [
    {
      key: 'INVOICE_ID',
      header: 'Invoice ID',
      render: (row) => <span className="font-bold text-slate-900 dark:text-slate-100">INV-{row.INVOICE_ID}</span>
    },
    {
      key: 'patient_name',
      header: 'Patient',
      render: (row) => <span className="font-semibold text-slate-955 dark:text-slate-200">{row.patient_name}</span>
    },
    {
      key: 'INVOICE_DATE',
      header: 'Invoice Date',
      render: (row) => <span className="text-slate-650 dark:text-slate-400 font-medium font-sans">{formatDate(row.INVOICE_DATE)}</span>
    },
    {
      key: 'TOTAL_AMOUNT',
      header: 'Total Amount',
      render: (row) => <span className="text-slate-700 dark:text-slate-350 font-sans">{formatCurrency(row.TOTAL_AMOUNT)}</span>
    },
    {
      key: 'AMOUNT_PAID',
      header: 'Amount Paid',
      render: (row) => <span className="text-emerald-700 dark:text-emerald-400 font-semibold font-sans">{formatCurrency(row.AMOUNT_PAID)}</span>
    },
    {
      key: 'balance_due',
      header: 'Balance Due',
      render: (row) => {
        const balance = parseFloat(row.balance_due || 0);
        return (
          <span className={`font-bold font-sans ${balance > 0 ? 'text-red-650 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {formatCurrency(row.balance_due)}
          </span>
        );
      }
    },
    {
      key: 'STATUS',
      header: 'Status',
      render: (row) => (
        <Badge className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide uppercase ${getStatusBadgeStyles(row.STATUS)}`}>
          {row.STATUS}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      cellClassName: 'text-right pr-6',
      render: (row) => {
        const hasBalance = parseFloat(row.balance_due || 0) > 0;
        if (!hasBalance) {
          return <span className="text-xs text-slate-450 dark:text-slate-550 italic font-semibold">Fully Paid</span>;
        }

        return (
          <button
            onClick={() => {
              setSelectedInvoice(row);
              setIsPaymentModalOpen(true);
            }}
            className="flex items-center gap-1.5 ml-auto px-2.5 py-1.5 border border-[#dc2626] hover:bg-red-50 dark:hover:bg-red-950/20 text-[#dc2626] dark:text-red-400 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Record Payment
          </button>
        );
      }
    }
  ];

  const mappedData = data.map(invoice => {
    const balanceDue = parseFloat(invoice.balance_due || 0);
    return {
      ...invoice,
      rowClassName: balanceDue > 0 ? 'bg-rose-50/10 dark:bg-rose-950/5 hover:bg-rose-50/20 dark:hover:bg-rose-950/10' : ''
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight animate-fade-in">Billing & Accounts Receivable</h2>
          <p className="text-sm text-slate-500 dark:text-slate-450 font-medium font-sans">Track claims, invoice balances, patient payment collections, and AR statuses.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
            {filterOptions.map(option => (
              <button
                key={option}
                onClick={() => handleStatusChange(option)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  status === option
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-205/50 dark:border-slate-700/50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs transition-all duration-200 bg-white dark:bg-slate-900"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="max-w-md">
        <KpiCard 
          label="Total Outstanding AR" 
          value={outstandingAr} 
          icon={AlertCircle} 
          color="red"
          subtitle="Net uncollected patient balances"
        />
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-655 dark:text-red-405 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Failed to load billing ledgers</h3>
            <p className="text-xs text-red-750 dark:text-red-404 mt-1">{error}</p>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={mappedData}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onSearch={handleSearch}
        searchPlaceholder="Search by patient name or MRN..."
        loading={loading}
        emptyMessage="No invoices found matching the selected filter."
      />

      <FormModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedInvoice(null);
        }}
        title="Record Invoice Payment"
        saveLabel="Apply Payment"
        loading={saving}
        onSave={() => paymentFormRef.current?.submit()}
      >
        <PaymentForm
          ref={paymentFormRef}
          invoice={selectedInvoice}
          onSubmit={handleRecordPayment}
        />
      </FormModal>

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
