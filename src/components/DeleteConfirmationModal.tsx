import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "تأكيد الحذف",
  message = "هل أنت متأكد من رغبتك في حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.",
  confirmLabel = "نعم، حذف الآن",
  cancelLabel = "إلغاء",
  isDeleting = false
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 pt-12 text-center">
              {/* Icon */}
              <div className="w-20 h-20 rounded-[2rem] bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center mx-auto mb-6 text-rose-500 ring-8 ring-rose-50/50 dark:ring-rose-950/10">
                <Trash2 className="w-10 h-10" />
              </div>

              {/* Text */}
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                {title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mb-10 px-4">
                {message}
              </p>

              {/* Warning Box */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4 mb-8 flex items-start gap-3 text-right" dir="rtl">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-black text-amber-800 dark:text-amber-500 leading-normal uppercase tracking-tight">
                  تحذير: البيانات المحذوفة سوف يتم إزالتها نهائياً من قاعدة البيانات والسجلات المرتبطة بها.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-rose-200 dark:shadow-none hover:bg-rose-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {isDeleting ? 'جاري الحذف...' : confirmLabel}
                </button>
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
