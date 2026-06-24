import React from 'react';
import { Card, CardContent } from '../components/ui/card';

export default function DataModel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Database Schema (ERD)</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium font-sans">
          Visualize the clinic's underlying data model structures, keys, and relational card-to-encounter mappings.
        </p>
      </div>

      {/* Image Container Card */}
      <Card className="border border-slate-100 dark:border-border bg-white dark:bg-card rounded-xl shadow-xs overflow-hidden">
        <CardContent className="p-6 flex flex-col items-center">
          <div className="w-full bg-white rounded-lg p-4 border border-slate-200/60 overflow-hidden flex items-center justify-center">
            <img 
              src="/erd.png" 
              alt="Clinic ERP Entity-Relationship Diagram" 
              className="max-w-full h-auto object-contain rounded-md shadow-xs max-h-[600px]"
            />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Entity-Relationship Diagram — 10 tables, crow's-foot notation
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium font-sans">
              Maintains relationships between Patient registries, Clinical Encounter logs, ICD-10 Diagnoses, Provider rosters, and Billing Ledger balances.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
