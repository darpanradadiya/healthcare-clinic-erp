import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Loader2 } from 'lucide-react';

export default function FormModal({
  isOpen,
  onClose,
  title,
  children,
  onSave,
  saveLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  loading = false,
  sizeClass = 'sm:max-w-lg',
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={`${sizeClass} w-[calc(100vw-1rem)] sm:w-auto border border-slate-100 dark:border-border bg-white dark:bg-popover shadow-xl rounded-xl p-4 md:p-6 max-h-[90dvh] flex flex-col`}>
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-border shrink-0">
          <DialogTitle className="text-base md:text-lg font-bold text-slate-900 dark:text-foreground tracking-tight">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 text-slate-700 dark:text-slate-300 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100 dark:border-border flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/30 -mx-4 md:-mx-6 -mb-4 md:-mb-6 px-4 md:px-6 py-4 rounded-b-xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 min-h-[44px] border border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-[#dc2626] hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer disabled:opacity-50 min-w-[100px]"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
