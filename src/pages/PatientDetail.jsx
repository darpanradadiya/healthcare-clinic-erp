import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, formatCurrency, formatDate, formatDateTime } from '../lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, 
  Calendar, 
  Clipboard, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  AlertCircle, 
  Loader2, 
  Clock,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import FormModal from '../components/FormModal';
import PatientForm from '../components/PatientForm';
import AppointmentForm from '../components/AppointmentForm';
import PaymentForm from '../components/PaymentForm';

export default function PatientDetail({ patientId, onBack, onNavigate }) {
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal control states
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);

  const patientFormRef = React.useRef();
  const apptFormRef = React.useRef();
  const paymentFormRef = React.useRef();

  const fetchPatientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientRes, apptsRes, encountersRes, invoicesRes] = await Promise.all([
        apiGet(`/patients/${patientId}`),
        apiGet(`/patients/${patientId}/appointments`),
        apiGet(`/patients/${patientId}/encounters`),
        apiGet(`/patients/${patientId}/invoices`)
      ]);
      setPatient(patientRes);
      setAppointments(apptsRes || []);
      setEncounters(encountersRes || []);
      setInvoices(invoicesRes || []);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const handleUpdatePatient = async (formData) => {
    setSaving(true);
    try {
      const updated = await apiPut(`/patients/${patientId}`, formData);
      setPatient(updated);
      setIsPatientModalOpen(false);
      toast.success('Patient details updated successfully.');
      fetchPatientData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update patient details.');
    } finally {
      setSaving(false);
    }
  };

  const handleBookAppointment = async (formData) => {
    setSaving(true);
    try {
      await apiPost('/appointments', formData);
      setIsApptModalOpen(false);
      toast.success('Appointment booked successfully.');
      fetchPatientData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to book appointment.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (formData) => {
    if (!selectedInvoice) return;
    setSaving(true);
    try {
      await apiPost(`/invoices/${selectedInvoice.INVOICE_ID}/payments`, formData);
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      toast.success(`Payment of ${formatCurrency(formData.amount)} recorded successfully.`);
      fetchPatientData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  };

  const getPortalBadgeStyles = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40';
      case 'Inactive':
        return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40';
      case 'No Account':
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60';
    }
  };

  const getApptBadgeStyles = (status) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
      case 'Completed': return 'bg-emerald-55 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'Cancelled': return 'bg-slate-55 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60';
      case 'No-Show': return 'bg-rose-50 text-rose-700 border-rose-105 dark:bg-rose-955/20 dark:text-rose-400 dark:border-rose-900/30';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-450 dark:border-slate-700/60';
    }
  };

  const getInvoiceBadgeStyles = (status) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'Partial': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-955/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'Open': return 'bg-rose-50 text-rose-700 border-rose-105 dark:bg-rose-955/20 dark:text-rose-450 dark:border-rose-900/30';
      default: return 'bg-slate-55 text-slate-707 border-slate-202 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/60';
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-9 w-9 text-blue-600 animate-spin" />
        <span className="text-sm font-semibold text-slate-500 font-sans">Loading patient records...</span>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-6 flex items-start gap-4 max-w-xl mx-auto my-10 shadow-xs">
        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-base font-bold text-red-800 dark:text-red-300">Failed to load patient chart</h3>
          <p className="text-sm text-red-700 dark:text-red-400 mt-2">{error || 'Patient record could not be found.'}</p>
          <button 
            onClick={onBack}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Registry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Back link & breadcrumb */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-foreground transition-colors cursor-pointer group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Patients
      </button>

      {/* Demographics Overview Card */}
      <Card className="border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-border flex items-center justify-center shrink-0">
                <User className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center flex-wrap gap-2.5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-foreground leading-none">
                    {patient.FIRST_NAME} {patient.LAST_NAME}
                  </h2>
                  <Badge className={`px-2 py-0.5 border rounded-full text-[10px] font-bold tracking-wide uppercase ${getPortalBadgeStyles(patient.portal_status)}`}>
                    Portal: {patient.portal_status}
                  </Badge>
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-455">
                  <span>MRN: <span className="text-slate-800 dark:text-slate-200 font-bold">{patient.MRN}</span></span>
                  <span>•</span>
                  <span>Age: <span className="text-slate-800 dark:text-slate-200 font-bold">{patient.age ?? 'N/A'}</span></span>
                  <span>•</span>
                  <span>Sex: <span className="text-slate-800 dark:text-slate-200 font-bold uppercase">{patient.SEX || 'O'}</span></span>
                </div>
              </div>
            </div>

            {/* Quick Action Button Box */}
            <div className="flex items-center gap-2 self-start">
              <button
                onClick={() => setIsPatientModalOpen(true)}
                className="px-4 py-2 border border-slate-200 dark:border-border hover:border-slate-350 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-[#1a2438] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 shadow-xs"
              >
                Edit Patient
              </button>
              <button
                onClick={() => setIsApptModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#dc2626] hover:bg-red-750 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs hover:shadow-md transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                Book Appointment
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-border my-5" />

          {/* Contact and address metadata columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            {/* Phone */}
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Phone Number</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">{patient.PHONE || 'N/A'}</span>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Email Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5 lowercase">{patient.EMAIL || 'N/A'}</span>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Street Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {patient.ADDRESS_LINE ? (
                    <>
                      {patient.ADDRESS_LINE}
                      {patient.CITY && `, ${patient.CITY}`}
                      {patient.STATE && ` ${patient.STATE}`}
                      {patient.ZIP && ` ${patient.ZIP}`}
                    </>
                  ) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs list area */}
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-[#131c2e] border border-slate-200/60 dark:border-border p-1 rounded-xl mb-4">
          <TabsTrigger value="appointments" className="font-semibold px-4 py-1.5 rounded-lg text-xs cursor-pointer">
            Appointments ({appointments.length})
          </TabsTrigger>
          <TabsTrigger value="encounters" className="font-semibold px-4 py-1.5 rounded-lg text-xs cursor-pointer">
            Encounters ({encounters.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="font-semibold px-4 py-1.5 rounded-lg text-xs cursor-pointer">
            Invoices ({invoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Appointments Tab Content */}
        <TabsContent value="appointments">
          <div className="border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#1a2438]/50 border-b border-slate-100 dark:border-border text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Provider</th>
                    <th className="px-6 py-3.5">Facility Location</th>
                    <th className="px-6 py-3.5">Start Time</th>
                    <th className="px-6 py-3.5">End Time</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Reason</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100 dark:divide-border">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 dark:text-slate-500 font-semibold">
                        No appointments scheduled.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((appt) => (
                      <tr key={appt.APPOINTMENT_ID} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors">
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">Dr. {appt.provider_name}</span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 block font-semibold uppercase">{appt.SPECIALTY}</span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-650 dark:text-slate-350 font-medium">{appt.location_name}</td>
                        <td className="px-6 py-3.5 text-slate-650 dark:text-slate-350 font-medium">{formatDateTime(appt.SCHEDULED_START)}</td>
                        <td className="px-6 py-3.5 text-slate-650 dark:text-slate-350 font-medium">{formatDateTime(appt.SCHEDULED_END)}</td>
                        <td className="px-6 py-3.5">
                          <Badge className={`px-2 py-0.5 border rounded-full text-[10px] font-bold tracking-wide uppercase ${getApptBadgeStyles(appt.STATUS)}`}>
                            {appt.STATUS}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={appt.REASON}>
                          {appt.REASON || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Encounters Tab Content */}
        <TabsContent value="encounters">
          <div className="border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#1a2438]/50 border-b border-slate-100 dark:border-border text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Encounter Date</th>
                    <th className="px-6 py-3.5">Attending Provider</th>
                    <th className="px-6 py-3.5">Primary Diagnosis</th>
                    <th className="px-6 py-3.5">Clinical Note</th>
                    <th className="px-6 py-3.5">Encounter Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100 dark:divide-border">
                  {encounters.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 dark:text-slate-500 font-semibold">
                        No clinical encounters recorded.
                      </td>
                    </tr>
                  ) : (
                    encounters.map((enc) => (
                      <tr key={enc.ENCOUNTER_ID} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors">
                        <td className="px-6 py-3.5 text-slate-805 dark:text-slate-205 font-semibold">{formatDate(enc.ENCOUNTER_DATE)}</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-350 font-semibold">Dr. {enc.provider_name}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{enc.primary_dx || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-505 dark:text-slate-400 max-w-[250px] truncate" title={enc.VISIT_NOTE}>
                          {enc.VISIT_NOTE || 'N/A'}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge className={`px-2 py-0.5 border rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            enc.STATUS === 'Signed' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                              : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-955/20 dark:text-rose-400 dark:border-rose-900/30'
                          }`}>
                            {enc.STATUS}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Invoices Tab Content */}
        <TabsContent value="invoices">
          <div className="border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#1a2438]/50 border-b border-slate-100 dark:border-border text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Invoice ID</th>
                    <th className="px-6 py-3.5">Invoice Date</th>
                    <th className="px-6 py-3.5">Total Amount</th>
                    <th className="px-6 py-3.5">Amount Paid</th>
                    <th className="px-6 py-3.5">Balance Due</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right pr-8">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100 dark:divide-border">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 dark:text-slate-500 font-semibold">
                        No invoices recorded.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => {
                      const balanceDue = parseFloat(inv.balance_due || 0);
                      const isOverdue = balanceDue > 0;
                      
                      return (
                        <tr 
                          key={inv.INVOICE_ID} 
                          className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors ${isOverdue ? 'bg-rose-50/10 dark:bg-rose-950/5' : ''}`}
                        >
                          <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-slate-100">INV-{inv.INVOICE_ID}</td>
                          <td className="px-6 py-3.5 text-slate-600 dark:text-slate-350 font-medium">{formatDate(inv.INVOICE_DATE)}</td>
                          <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300 font-medium font-sans">{formatCurrency(inv.TOTAL_AMOUNT)}</td>
                          <td className="px-6 py-3.5 text-emerald-700 dark:text-emerald-400 font-semibold font-sans">{formatCurrency(inv.AMOUNT_PAID)}</td>
                          <td className="px-6 py-3.5">
                            <span className={`font-bold font-sans ${isOverdue ? 'text-red-605 dark:text-red-400' : 'text-slate-500 dark:text-slate-450'}`}>
                              {formatCurrency(inv.balance_due)}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <Badge className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide uppercase ${getInvoiceBadgeStyles(inv.STATUS)}`}>
                              {inv.STATUS}
                            </Badge>
                          </td>
                          <td className="px-6 py-3.5 text-right pr-8">
                            {isOverdue && (
                              <button
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setIsPaymentModalOpen(true);
                                }}
                                className="px-3 py-1.5 border border-[#dc2626] hover:bg-red-50 dark:hover:bg-red-950/20 text-[#dc2626] dark:text-red-405 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
                              >
                                Record Payment
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Patient Edit Modal */}
      <FormModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        title="Edit Patient Details"
        saveLabel="Update"
        loading={saving}
        onSave={() => patientFormRef.current?.submit()}
      >
        <PatientForm
          ref={patientFormRef}
          initialData={patient}
          onSubmit={handleUpdatePatient}
        />
      </FormModal>

      {/* Book Appointment Modal */}
      <FormModal
        isOpen={isApptModalOpen}
        onClose={() => setIsApptModalOpen(false)}
        title="Book New Appointment"
        saveLabel="Book Slot"
        loading={saving}
        onSave={() => apptFormRef.current?.submit()}
      >
        <AppointmentForm
          ref={apptFormRef}
          initialPatient={patient}
          onSubmit={handleBookAppointment}
        />
      </FormModal>

      {/* Record Payment Modal */}
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
    </div>
  );
}
