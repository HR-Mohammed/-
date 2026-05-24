import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, X, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setNewPassword('');
        setConfirmPassword('');
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث كلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150]" 
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 m-auto w-full max-w-md h-fit z-[151] p-4"
            dir="rtl"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-white/5">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
                      <KeyRound className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">تغيير كلمة المرور</h2>
                      <p className="text-sm font-bold text-slate-500 mt-1">تحديث كلمة مرور الحساب الخاص بك</p>
                    </div>
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">تم تغيير كلمة المرور بنجاح</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">كلمة المرور الجديدة</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl py-3 px-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 font-medium dark:text-white transition-all text-left"
                        dir="ltr"
                        required
                        disabled={isLoading || success}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl py-3 px-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 font-medium dark:text-white transition-all text-left"
                        dir="ltr"
                        required
                        disabled={isLoading || success}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      disabled={isLoading}
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || success}
                      className={cn(
                        "px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-2",
                        isLoading || success
                          ? "bg-indigo-400 shadow-indigo-200" 
                          : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300 dark:shadow-none"
                      )}
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : success ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <KeyRound className="w-5 h-5" />
                      )}
                      حفظ التغييرات
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
