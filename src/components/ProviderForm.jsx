import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const SPECIALTIES = [
  'Family Medicine', 'Internal Medicine', 'Cardiology', 'Pediatrics', 'Dermatology',
  'Orthopedics', 'Neurology', 'Psychiatry', 'OB-GYN', 'Endocrinology'
];

const ProviderForm = forwardRef(({ initialData = null, onSubmit }, ref) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    npi: '',
    specialty: 'Family Medicine',
    phone: '',
    email: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: initialData.FIRST_NAME || '',
        last_name: initialData.LAST_NAME || '',
        npi: initialData.NPI || '',
        specialty: initialData.SPECIALTY || 'Family Medicine',
        phone: initialData.PHONE || '',
        email: initialData.EMAIL || '',
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        npi: '',
        specialty: 'Family Medicine',
        phone: '',
        email: '',
      });
    }
    setErrors({});
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    
    // NPI validation: exactly 10 digits
    if (!formData.npi.trim()) {
      newErrors.npi = 'NPI is required';
    } else if (!/^\d{10}$/.test(formData.npi.trim())) {
      newErrors.npi = 'NPI must be exactly 10 digits';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (validate()) {
        onSubmit(formData);
        return true;
      }
      return false;
    }
  }));

  const inputClass = (name) => `
    w-full px-3 py-2 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-[#131c2e] placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-[#e8edf5] font-sans
    ${errors[name] ? 'border-red-500 focus:border-red-500 dark:border-red-500/50' : 'border-slate-200 dark:border-border focus:border-blue-500'}
  `;

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-2 gap-4">
        {/* First Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">First Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="Jane"
            className={inputClass('first_name')}
          />
          {errors.first_name && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.first_name}</p>}
        </div>

        {/* Last Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Last Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Smith"
            className={inputClass('last_name')}
          />
          {errors.last_name && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.last_name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* NPI */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">NPI Number (10 digits) <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="npi"
            value={formData.npi}
            onChange={handleChange}
            placeholder="1234567890"
            className={inputClass('npi')}
          />
          {errors.npi && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.npi}</p>}
        </div>

        {/* Specialty */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Specialty</label>
          <select
            name="specialty"
            value={formData.specialty}
            onChange={handleChange}
            className={inputClass('specialty')}
          >
            {SPECIALTIES.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Phone */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Phone Number</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="617-555-0105"
            className={inputClass('phone')}
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="jane.smith@northeasternclinic.org"
            className={inputClass('email')}
          />
          {errors.email && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.email}</p>}
        </div>
      </div>
    </form>
  );
});

ProviderForm.displayName = 'ProviderForm';

export default ProviderForm;
