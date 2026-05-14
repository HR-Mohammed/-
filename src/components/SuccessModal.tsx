import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  buttonLabel?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title = "عملية ناجحة",
  message = "تم تنفيذ الإجراء بنجاح في النظام.",
  buttonLabel = "حسناً"
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
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
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
              <div className="w-20 h-20 rounded-[2rem] bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mx-auto mb-6 text-emerald-500 ring-8 ring-emerald-50/50 dark:ring-emerald-950/10 relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                
                {/* Ping animation behind icon */}
                <span className="absolute w-full h-full rounded-[2rem] bg-emerald-400 opacity-20 animate-ping" />
              </div>

              {/* Text */}
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                {title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mb-8 px-4">
                {message}
              </p>

              {/* Actions */}
              <button
                onClick={onClose}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {buttonLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
