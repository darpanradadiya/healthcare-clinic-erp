import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import DateTimePicker from './DateTimePicker';

const PatientForm = forwardRef(({ initialData = null, onSubmit }, ref) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    sex: 'M',
    phone: '',
    email: '',
    address_line: '',
    city: '',
    state: '',
    zip: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: initialData.FIRST_NAME || '',
        last_name: initialData.LAST_NAME || '',
        date_of_birth: initialData.DATE_OF_BIRTH ? initialData.DATE_OF_BIRTH.substring(0, 10) : '',
        sex: initialData.SEX || 'M',
        phone: initialData.PHONE || '',
        email: initialData.EMAIL || '',
        address_line: initialData.ADDRESS_LINE || '',
        city: initialData.CITY || '',
        state: initialData.STATE || '',
        zip: initialData.ZIP || '',
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        sex: 'M',
        phone: '',
        email: '',
        address_line: '',
        city: '',
        state: '',
        zip: '',
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
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
    
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
            placeholder="John"
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
            placeholder="Doe"
            className={inputClass('last_name')}
          />
          {errors.last_name && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.last_name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Date of Birth */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Date of Birth <span className="text-red-500">*</span></label>
          <DateTimePicker
            value={formData.date_of_birth}
            onChange={(val) => {
              setFormData(prev => ({ ...prev, date_of_birth: val }));
              if (errors.date_of_birth) {
                setErrors(prev => ({ ...prev, date_of_birth: '' }));
              }
            }}
            placeholder="Select date of birth"
            showTime={false}
          />
          {errors.date_of_birth && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.date_of_birth}</p>}
        </div>

        {/* Sex */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Sex</label>
          <select
            name="sex"
            value={formData.sex}
            onChange={handleChange}
            className={inputClass('sex')}
          >
            <option value="M">Male (M)</option>
            <option value="F">Female (F)</option>
            <option value="O">Other (O)</option>
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
            placeholder="617-555-0199"
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
            placeholder="john.doe@example.com"
            className={inputClass('email')}
          />
          {errors.email && <p className="text-[11px] font-medium text-red-500 font-sans">{errors.email}</p>}
        </div>
      </div>

      {/* Address Line */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Street Address</label>
        <input
          type="text"
          name="address_line"
          value={formData.address_line}
          onChange={handleChange}
          placeholder="123 Main St"
          className={inputClass('address_line')}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* City */}
        <div className="space-y-1 col-span-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Boston"
            className={inputClass('city')}
          />
        </div>

        {/* State */}
        <div className="space-y-1 col-span-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">State</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="MA"
            className={inputClass('state')}
          />
        </div>

        {/* Zip */}
        <div className="space-y-1 col-span-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-sans">Zip Code</label>
          <input
            type="text"
            name="zip"
            value={formData.zip}
            onChange={handleChange}
            placeholder="02115"
            className={inputClass('zip')}
          />
        </div>
      </div>
    </form>
  );
});

PatientForm.displayName = 'PatientForm';

export default PatientForm;
