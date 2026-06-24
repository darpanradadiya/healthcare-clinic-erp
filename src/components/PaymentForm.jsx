import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { formatCurrency } from '../lib/api';
import DateTimePicker from './DateTimePicker';

const PaymentForm = forwardRef(({ invoice = null, onSubmit }, ref) => {
  const [formData, setFormData] = useState({
    amount: '',
    method: 'Card',
    payment_date: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      amount: invoice ? parseFloat(invoice.balance_due || 0).toFixed(2) : '',
      method: 'Card',
      payment_date: today,
    });
    setErrors({});
  }, [invoice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const amt = parseFloat(formData.amount);
    
    if (isNaN(amt) || amt <= 0) {
      newErrors.amount = 'Amount must be greater than $0.00';
    } else if (invoice && amt > parseFloat(invoice.balance_due)) {
      newErrors.amount = `Amount cannot exceed outstanding balance of ${formatCurrency(invoice.balance_due)}`;
    }
    
    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (validate()) {
        onSubmit({
          amount: parseFloat(formData.amount),
          method: formData.method,
          payment_date: formData.payment_date,
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

  if (!invoice) return null;

  return (
    <form className="space-y-4 font-sans" onSubmit={(e) => e.preventDefault()}>
      {/* Invoice Overview Banner */}
      <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-border rounded-xl p-4 space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
          <span>Invoice Ref</span>
          <span>Balance Details</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-extrabold text-slate-900 dark:text-slate-100 text-base">INV-{invoice.INVOICE_ID}</span>
          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Total: {formatCurrency(invoice.TOTAL_AMOUNT)}</span>
            <span className="text-sm font-bold text-red-650 block mt-0.5">Outstanding: {formatCurrency(invoice.balance_due)}</span>
          </div>
        </div>
      </div>

      {/* Payment Amount */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Payment Amount <span className="text-red-500">*</span></label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 font-bold">$</span>
          <input
            type="number"
            step="0.01"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            className={`pl-7 ${inputClass('amount')}`}
          />
        </div>
        {errors.amount && <p className="text-[11px] font-medium text-red-500">{errors.amount}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Method */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Payment Method</label>
          <select
            name="method"
            value={formData.method}
            onChange={handleChange}
            className={inputClass('method')}
          >
            <option value="Card">Card</option>
            <option value="Cash">Cash</option>
            <option value="Check">Check</option>
            <option value="Insurance">Insurance</option>
          </select>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Payment Date <span className="text-red-500">*</span></label>
          <DateTimePicker
            value={formData.payment_date}
            onChange={(val) => {
              setFormData(prev => ({ ...prev, payment_date: val }));
              if (errors.payment_date) {
                setErrors(prev => ({ ...prev, payment_date: '' }));
              }
            }}
            placeholder="Select payment date"
            showTime={false}
          />
          {errors.payment_date && <p className="text-[11px] font-medium text-red-505">{errors.payment_date}</p>}
        </div>
      </div>
    </form>
  );
});

PaymentForm.displayName = 'PaymentForm';

export default PaymentForm;
