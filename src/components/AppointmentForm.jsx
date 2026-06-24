import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { apiGet } from '../lib/api';
import { Search, Loader2, X } from 'lucide-react';
import DateTimePicker from './DateTimePicker';

const AppointmentForm = forwardRef(({ initialPatient = null, onSubmit }, ref) => {
  const [providers, setProviders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  
  // Patient Search State
  const [patientSearch, setPatientSearch] = useState('');
  const [patientMatches, setPatientMatches] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);

  const [formData, setFormData] = useState({
    provider_id: '',
    location_id: '',
    scheduled_start: '',
    scheduled_end: '',
    reason: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Fetch Providers and Locations
    const loadDropdownData = async () => {
      try {
        const [provRes, locRes] = await Promise.all([
          apiGet('/providers'),
          apiGet('/locations')
        ]);
        setProviders(provRes || []);
        setLocations(locRes || []);
        
        if (provRes?.length > 0) {
          setFormData(prev => ({ ...prev, provider_id: provRes[0].PROVIDER_ID }));
        }
        if (locRes?.length > 0) {
          setFormData(prev => ({ ...prev, location_id: locRes[0].LOCATION_ID }));
        }
      } catch (err) {
        console.error('Failed to load form dropdown data', err);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    loadDropdownData();
  }, []);

  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
      setPatientSearch(`${initialPatient.FIRST_NAME} ${initialPatient.LAST_NAME}`);
    } else {
      setSelectedPatient(null);
      setPatientSearch('');
    }
  }, [initialPatient]);

  // Handle patient searching with debounce
  useEffect(() => {
    if (initialPatient || !patientSearch || selectedPatient) {
      setPatientMatches([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearchingPatients(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiGet(`/patients?search=${encodeURIComponent(patientSearch)}&limit=10`);
        setPatientMatches(res.rows || []);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [patientSearch, selectedPatient, initialPatient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch(`${patient.FIRST_NAME} ${patient.LAST_NAME}`);
    setPatientMatches([]);
    setShowDropdown(false);
    if (errors.patient_id) {
      setErrors(prev => ({ ...prev, patient_id: '' }));
    }
  };

  const clearSelectedPatient = () => {
    if (initialPatient) return;
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientMatches([]);
  };

  const handleStartChange = (val) => {
    setFormData(prev => {
      const updated = { ...prev, scheduled_start: val };
      
      // Calculate end date automatically (30 mins later)
      if (val) {
        const normalized = val.replace(' ', 'T');
        const startDate = new Date(normalized);
        if (!isNaN(startDate.getTime())) {
          startDate.setMinutes(startDate.getMinutes() + 30);
          
          // Format back to YYYY-MM-DD HH:MM:SS
          const y = startDate.getFullYear();
          const m = String(startDate.getMonth() + 1).padStart(2, '0');
          const d = String(startDate.getDate()).padStart(2, '0');
          const hh = String(startDate.getHours()).padStart(2, '0');
          const mm = String(startDate.getMinutes()).padStart(2, '0');
          const ss = String(startDate.getSeconds()).padStart(2, '0');
          
          updated.scheduled_end = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
        }
      }
      return updated;
    });

    if (errors.scheduled_start) {
      setErrors(prev => ({ ...prev, scheduled_start: '' }));
    }
    if (errors.scheduled_end) {
      setErrors(prev => ({ ...prev, scheduled_end: '' }));
    }
  };

  const handleEndChange = (val) => {
    setFormData(prev => ({ ...prev, scheduled_end: val }));
    if (errors.scheduled_end) {
      setErrors(prev => ({ ...prev, scheduled_end: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!selectedPatient) {
      newErrors.patient_id = 'Please select a patient';
    }
    if (!formData.provider_id) {
      newErrors.provider_id = 'Please select a provider';
    }
    if (!formData.location_id) {
      newErrors.location_id = 'Please select a location';
    }
    if (!formData.scheduled_start) {
      newErrors.scheduled_start = 'Start date/time is required';
    }
    if (!formData.scheduled_end) {
      newErrors.scheduled_end = 'End date/time is required';
    } else if (formData.scheduled_start) {
      const startMs = new Date(formData.scheduled_start.replace(' ', 'T')).getTime();
      const endMs = new Date(formData.scheduled_end.replace(' ', 'T')).getTime();
      if (!isNaN(startMs) && !isNaN(endMs) && startMs >= endMs) {
        newErrors.scheduled_end = 'End time must be after start time';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (validate()) {
        onSubmit({
          patient_id: selectedPatient.PATIENT_ID,
          provider_id: parseInt(formData.provider_id, 10),
          location_id: parseInt(formData.location_id, 10),
          scheduled_start: formData.scheduled_start,
          scheduled_end: formData.scheduled_end,
          reason: formData.reason,
        });
        return true;
      }
      return false;
    }
  }));

  const inputClass = (name) => `
    w-full px-3 py-2 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-[#131c2e] placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-[#e8edf5] font-sans
    ${errors[name] ? 'border-red-500 focus:border-red-500 dark:border-red-500/50' : 'border-slate-200 dark:border-border focus:border-blue-500'}
  `;

  if (loadingDropdowns) {
    return (
      <div className="flex items-center justify-center py-10 gap-3">
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Loading form options...</span>
      </div>
    );
  }

  // Set minDate as today's ISO date string
  const todayIso = new Date().toISOString().split('T')[0];

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      {/* Patient Selection */}
      <div className="space-y-1 relative">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Patient Search <span className="text-red-500">*</span></label>
        <div className="relative">
          <input
            type="text"
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              if (selectedPatient) clearSelectedPatient();
            }}
            placeholder="Type name, MRN, phone..."
            disabled={!!initialPatient}
            className={`pl-9 pr-8 ${inputClass('patient_id')}`}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          {selectedPatient && !initialPatient && (
            <button
              type="button"
              onClick={clearSelectedPatient}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {searchingPatients && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600 animate-spin" />
          )}
        </div>

        {/* Selected Patient Details Hint */}
        {selectedPatient && (
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg px-2.5 py-1 w-fit mt-1">
            Selected: {selectedPatient.FIRST_NAME} {selectedPatient.LAST_NAME} (MRN: {selectedPatient.MRN})
          </div>
        )}

        {errors.patient_id && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.patient_id}</p>}

        {/* Patient Selection Dropdown */}
        {showDropdown && patientMatches.length > 0 && (
          <div className="absolute left-0 right-0 z-50 bg-white dark:bg-[#1a2438] border border-slate-200 dark:border-border rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
            {patientMatches.map(patient => (
              <button
                key={patient.PATIENT_ID}
                type="button"
                onClick={() => selectPatient(patient)}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex justify-between items-center border-b border-slate-100 dark:border-border last:border-b-0 cursor-pointer"
              >
                <span>{patient.FIRST_NAME} {patient.LAST_NAME}</span>
                <span className="text-[10px] text-slate-450 dark:text-slate-400 bg-slate-105 dark:bg-slate-900/60 px-1.5 py-0.5 rounded-md font-sans font-bold">MRN: {patient.MRN}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Provider */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Attending Provider <span className="text-red-500">*</span></label>
          <select
            name="provider_id"
            value={formData.provider_id}
            onChange={handleChange}
            className={inputClass('provider_id')}
          >
            {providers.map(p => (
              <option key={p.PROVIDER_ID} value={p.PROVIDER_ID}>
                Dr. {p.FIRST_NAME} {p.LAST_NAME} ({p.SPECIALTY})
              </option>
            ))}
          </select>
          {errors.provider_id && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.provider_id}</p>}
        </div>

        {/* Location */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Facility Location <span className="text-red-500">*</span></label>
          <select
            name="location_id"
            value={formData.location_id}
            onChange={handleChange}
            className={inputClass('location_id')}
          >
            {locations.map(l => (
              <option key={l.LOCATION_ID} value={l.LOCATION_ID}>
                {l.LOCATION_NAME}
              </option>
            ))}
          </select>
          {errors.location_id && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.location_id}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Scheduled Start */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Scheduled Start <span className="text-red-500">*</span></label>
          <DateTimePicker
            value={formData.scheduled_start}
            onChange={handleStartChange}
            placeholder="Pick start date & time"
            minDate={todayIso}
            showTime={true}
          />
          {errors.scheduled_start && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.scheduled_start}</p>}
        </div>

        {/* Scheduled End */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Scheduled End <span className="text-red-500">*</span></label>
          <DateTimePicker
            value={formData.scheduled_end}
            onChange={handleEndChange}
            placeholder="Pick end date & time"
            minDate={todayIso}
            showTime={true}
          />
          {errors.scheduled_end && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.scheduled_end}</p>}
        </div>
      </div>

      {/* Reason */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Appointment Reason</label>
        <textarea
          name="reason"
          rows={3}
          value={formData.reason}
          onChange={handleChange}
          placeholder="General follow-up or chief complaints..."
          className={`${inputClass('reason')} resize-none`}
        />
      </div>
    </form>
  );
});

AppointmentForm.displayName = 'AppointmentForm';

export default AppointmentForm;
