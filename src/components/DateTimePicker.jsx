import React, { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Calendar as CalendarIcon, Clock, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const TIME_SLOTS = [];
for (let hour = 8; hour <= 18; hour++) {
  for (let min = 0; min < 60; min += 15) {
    if (hour === 18 && min > 0) break; // End at 6:00 PM
    const hStr = String(hour).padStart(2, '0');
    const mStr = String(min).padStart(2, '0');
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    TIME_SLOTS.push({
      value: `${hStr}:${mStr}:00`,
      label: `${displayHour}:${mStr} ${ampm}`
    });
  }
}

export default function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick a date & time',
  minDate = null,
  showTime = true,
  className,
}) {
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const timeScrollContainerRef = useRef(null);

  // Sync state with incoming value prop
  useEffect(() => {
    if (value) {
      const normalizedValue = value.replace('T', ' ');
      if (normalizedValue.includes(' ')) {
        const [datePart, timePart] = normalizedValue.split(' ');
        const parsedDate = new Date(datePart + 'T00:00:00');
        if (!isNaN(parsedDate.getTime())) {
          setSelectedDate(parsedDate);
        }
        setSelectedTime(timePart);
      } else {
        const parsedDate = new Date(normalizedValue + 'T00:00:00');
        if (!isNaN(parsedDate.getTime())) {
          setSelectedDate(parsedDate);
        }
        setSelectedTime('');
      }
    } else {
      setSelectedDate(undefined);
      setSelectedTime('');
    }
  }, [value]);

  // Auto-scroll to selected time slot when popover opens
  useEffect(() => {
    if (isOpen && selectedTime && timeScrollContainerRef.current) {
      setTimeout(() => {
        const selectedBtn = timeScrollContainerRef.current.querySelector('[data-selected="true"]');
        if (selectedBtn) {
          selectedBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 50);
    }
  }, [isOpen, selectedTime]);

  const formatDateToIso = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleDateSelect = (date) => {
    if (!date) return;
    setSelectedDate(date);

    if (!showTime) {
      const formattedDate = formatDateToIso(date);
      onChange(formattedDate);
      setIsOpen(false);
    } else {
      // If time is already selected, emit full string and close popover
      if (selectedTime) {
        const formattedDate = formatDateToIso(date);
        onChange(`${formattedDate} ${selectedTime}`);
        setIsOpen(false);
      }
    }
  };

  const handleTimeSelect = (timeStr) => {
    setSelectedTime(timeStr);
    
    if (selectedDate) {
      const formattedDate = formatDateToIso(selectedDate);
      onChange(`${formattedDate} ${timeStr}`);
      setIsOpen(false);
    }
  };

  const getDisplayString = () => {
    if (!selectedDate) return placeholder;
    const dateStr = selectedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    if (!showTime) return dateStr;
    
    if (!selectedTime) return `${dateStr} · Select time`;
    const [h, m] = selectedTime.split(':');
    const hr = parseInt(h, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHour = hr % 12 === 0 ? 12 : hr % 12;
    return `${dateStr} · ${displayHour}:${m} ${ampm}`;
  };

  const isDisabledDay = (date) => {
    if (!minDate) return false;
    const minParsed = new Date(minDate + 'T00:00:00');
    const minCompare = new Date(minParsed.getFullYear(), minParsed.getMonth(), minParsed.getDate());
    const dateCompare = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return dateCompare < minCompare;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-border rounded-xl bg-white dark:bg-card text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-sans cursor-pointer",
            !selectedDate ? "text-slate-400 dark:text-slate-500 font-normal" : "text-slate-900 dark:text-[#e8edf5] font-semibold",
            className
          )}
        >
          <div className="flex items-center gap-2">
            {showTime ? (
              <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            ) : (
              <CalendarIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            )}
            <span className="truncate">{getDisplayString()}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        align="start" 
        className="w-auto p-0 flex flex-row overflow-hidden shadow-2xl rounded-xl border border-slate-100 dark:border-border bg-white dark:bg-popover"
      >
        {/* Calendar Picker */}
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={isDisabledDay}
          // Enable year & month select buttons in react-day-picker v9 for date-only (like DOB)
          captionLayout={showTime ? "label" : "dropdown"}
          startMonth={showTime ? undefined : new Date(1900, 0)}
          endMonth={showTime ? undefined : new Date(new Date().getFullYear(), 11)}
          className="border-0 p-3"
        />

        {/* Time Selection Column */}
        {showTime && (
          <div className="w-36 border-l border-slate-100 dark:border-border flex flex-col h-[290px] bg-slate-50/20 dark:bg-slate-950/20">
            <div className="p-2 border-b border-slate-100 dark:border-border bg-slate-50/50 dark:bg-slate-950/40 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center select-none shrink-0">
              Select Time
            </div>
            <div 
              ref={timeScrollContainerRef}
              className="overflow-y-auto flex-1 p-1.5 space-y-1"
            >
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedTime === slot.value;
                return (
                  <button
                    key={slot.value}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => handleTimeSelect(slot.value)}
                    className={cn(
                      "w-full text-center px-2 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer",
                      isSelected
                        ? "bg-[#0f2942] dark:bg-blue-600 text-white shadow-xs"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-355"
                    )}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
