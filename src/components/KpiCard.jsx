import React from 'react';
import { Card, CardContent } from './ui/card';

export default function KpiCard({ icon: Icon, value, label, subtitle, color = 'blue' }) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30',
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30',
    },
    green: {
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30',
    },
    red: {
      bg: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30',
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <Card className="overflow-hidden border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs hover:shadow-md transition-all duration-300">
      <CardContent className="p-6 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-tight uppercase">
            {label}
          </span>
          {Icon && (
            <div className={`p-2.5 rounded-xl border ${scheme.bg} shadow-xs`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        <div>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-[#e8edf5] tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
