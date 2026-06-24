import React, { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';
import { X, Copy, Code, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SqlViewer({ isOpen, onClose, activePage }) {
  const [queries, setQueries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    const loadQueries = async () => {
      try {
        const data = await apiGet('/meta/queries');
        setQueries(data);
      } catch (err) {
        console.error('Failed to load SQL queries', err);
      } finally {
        setLoading(false);
      }
    };
    loadQueries();
  }, []);

  const handleCopy = (key, sqlText) => {
    navigator.clipboard.writeText(sqlText);
    setCopiedKey(key);
    toast.success('SQL query copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getPageQueries = () => {
    if (!queries) return [];
    
    // Resolve active page name if object
    const pageName = typeof activePage === 'object' ? activePage.name : activePage;

    switch (pageName) {
      case 'dashboard':
        return [
          { key: 'kpis', title: 'Dashboard KPIs', data: queries.dashboardKpis },
          { key: 'revenue', title: 'Revenue by Provider', data: queries.revenueByProvider },
          { key: 'status', title: 'Appointment Statuses', data: queries.appointmentStatus },
          { key: 'monthly', title: 'Monthly Revenue trend', data: queries.monthlyRevenue }
        ];
      case 'patients':
        return [
          { key: 'list', title: 'Patients Registry List', data: queries.patientsList }
        ];
      case 'patient-detail':
        return [
          { key: 'detail', title: 'Patient Profile Details', description: 'Gathers demographic profile parameters.', sql: 'SELECT p.*, pa.USERNAME, pa.IS_ACTIVE as PORTAL_ACTIVE FROM PATIENT p LEFT JOIN PORTAL_ACCOUNT pa ON pa.FK_PATIENT_ID = p.PATIENT_ID WHERE p.PATIENT_ID = ?;' },
          { key: 'appts', title: 'Patient Scheduled Slots', data: queries.patientAppointments },
          { key: 'encounters', title: 'Patient Encounters History', description: 'Fetches encounters, attending doctor, and primary ICD-10 diagnosis.', sql: "SELECT e.*, pr.LAST_NAME AS provider_name, d.ICD10_CODE||' - '||d.DESCRIPTION AS primary_dx FROM ENCOUNTER e JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID LEFT JOIN ENCOUNTER_DIAGNOSIS ed ON ed.FK_ENCOUNTER_ID = e.ENCOUNTER_ID AND ed.IS_PRIMARY = 1 LEFT JOIN DIAGNOSIS d ON d.DIAGNOSIS_ID = ed.FK_DIAGNOSIS_ID WHERE a.FK_PATIENT_ID = ? ORDER BY e.ENCOUNTER_DATE DESC;" },
          { key: 'invoices', title: 'Patient Invoices ledger', data: queries.patientAppointments }
        ];
      case 'appointments':
        return [
          { key: 'list', title: 'Appointments Ledger', description: 'Gathers appointments, patient details, facility location and specialties.', sql: 'SELECT a.*, p.FIRST_NAME||\' \'||p.LAST_NAME AS patient_name, pr.FIRST_NAME||\' \'||pr.LAST_NAME AS provider_name, pr.SPECIALTY, l.LOCATION_NAME AS location_name FROM APPOINTMENT a JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID JOIN LOCATION l ON l.LOCATION_ID = a.FK_LOCATION_ID WHERE a.STATUS = ? AND (p.FIRST_NAME LIKE ? OR pr.LAST_NAME LIKE ?) ORDER BY a.SCHEDULED_START DESC LIMIT ? OFFSET ?;' }
        ];
      case 'providers':
        return [
          { key: 'prod', title: 'Provider Productivity Card Metrics', data: queries.providerProductivity }
        ];
      case 'billing':
        return [
          { key: 'invoices', title: 'Billing AR Ledger List', data: queries.invoicesList }
        ];
      case 'clinical':
        return [
          { key: 'dx', title: 'Top Diagnosis Frequencies', data: queries.topDiagnoses },
          { key: 'enc', title: 'Patient Visit Summary Encounters', data: queries.patientVisitSummary }
        ];
      case 'datamodel':
        return [
          { key: 'erd', title: 'Database Schema Inspection', description: 'Reads active create statements and constraints of all tables.', sql: "SELECT name, sql FROM sqlite_master WHERE type='table';" }
        ];
      default:
        return [];
    }
  };

  const highlightSql = (sqlText) => {
    if (!sqlText) return '';
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'ON', 'GROUP BY', 
      'ORDER BY', 'LIMIT', 'OFFSET', 'SUM', 'COUNT', 'ROUND', 'COALESCE', 'AS', 
      'IN', 'AND', 'OR', 'DESC', 'ASC', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM'
    ];
    let highlighted = sqlText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="text-[#f472b6] font-bold">${kw}</span>`);
    });

    // Highlight strings
    highlighted = highlighted.replace(/('[^']*')/g, '<span class="text-[#a7f3d0]">$1</span>');
    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="text-[#93c5fd]">$1</span>');

    return highlighted;
  };

  if (!isOpen) return null;

  const currentQueries = getPageQueries();

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-[#0a0f1d] border-l border-[#1a2b4c] text-slate-100 z-50 shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-[#1a2b4c] bg-[#0f172a]/70">
        <div className="flex items-center gap-2.5">
          <Code className="h-5 w-5 text-pink-500" />
          <span className="font-bold text-sm tracking-wide uppercase">SQL Query Viewer</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Query List Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="h-6 w-6 text-pink-500 animate-spin" />
            <span className="text-xs text-slate-400 font-semibold">Loading SQL metadata...</span>
          </div>
        ) : currentQueries.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-xs font-semibold">
            No queries mapped for this page.
          </div>
        ) : (
          currentQueries.map((item) => {
            const desc = item.data?.description || item.description;
            const sqlText = item.data?.sql || item.sql || '';

            return (
              <div key={item.key} className="space-y-2 border-b border-[#1e293b]/40 pb-5 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400">
                    {item.title}
                  </h4>
                  <button
                    onClick={() => handleCopy(item.key, sqlText)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                  >
                    {copiedKey === item.key ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                
                {desc && (
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    {desc}
                  </p>
                )}

                <div className="bg-[#020617] border border-[#1a2b4c] rounded-xl p-4 overflow-x-auto text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all scrollbar-thin max-h-48 text-[#cbd5e1]">
                  <code dangerouslySetInnerHTML={{ __html: highlightSql(sqlText) }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer metadata */}
      <div className="p-4 border-t border-[#1a2b4c] bg-[#020617] text-center text-[10px] text-slate-500 font-medium">
        HealthCare ERP • Advanced SQLite Integration
      </div>
    </div>
  );
}
