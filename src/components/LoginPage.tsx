import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Loader2, ShieldCheck, MessageCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'خطأ في تسجيل الدخول. يرجى التحقق من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors" dir="rtl">
      <div className="max-w-md w-full">
        {/* Logo/Identity */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none mb-6 group transition-transform hover:scale-110">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 transition-colors">نظام الادارة والمتابعة</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold transition-colors">يرجى تسجيل الدخول للمتابعة</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-200/60 dark:shadow-none p-10 border border-slate-100 dark:border-slate-800 transition-colors">
          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2 transition-colors">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-12 pl-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2 transition-colors">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-12 pl-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-slate-900 dark:hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 dark:shadow-none hover:shadow-slate-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-8 text-center pt-8 border-t border-slate-50 dark:border-slate-800 transition-colors">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold leading-relaxed transition-colors mb-4">
              هذه المنظومة مخصصة للمستخدمين المصرح لهم فقط. إذا كنت لا تملك حساباً، يرجى مراجعة مسؤول النظام.
            </p>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <a 
                  href="https://wa.me/9647734435907" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all font-black text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <div className="flex items-center gap-2">
                    <span className="font-sans">محمد خالد:</span>
                    <span className="font-mono">07734435907</span>
                  </div>
                </a>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href="https://wa.me/9647825587712" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all font-black text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <div className="flex items-center gap-2">
                    <span className="font-sans">محمد خالد:</span>
                    <span className="font-mono">07825587712</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-10 text-slate-300 dark:text-slate-700 text-[10px] font-black uppercase tracking-tighter transition-colors">
          © {new Date().getFullYear()} جميع الحقوق محفوظة - برمجة وتطوير محمد خالد
        </p>
      </div>
    </div>
  );
};
