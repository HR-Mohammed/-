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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/10 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/25 flex items-center justify-center p-6 transition-all duration-500" dir="rtl">
      <div className="max-w-md w-full relative">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-purple-500/10 dark:bg-indigo-550/5 rounded-full blur-3xl pointer-events-none" />

        {/* Logo/Identity */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-3xl shadow-xl shadow-indigo-500/25 mb-5 group transition-transform hover:scale-110 duration-500">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight mb-2 transition-colors">نظام المراسلات والكتب</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold transition-colors text-xs uppercase tracking-wider">يرجى تسجيل الدخول للوصول الآمن</p>
        </div>

        {/* Login Card */}
        <div className="glass-panel bg-white/85 dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-150 dark:border-white/5 shadow-2xl p-10 relative z-10">
          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/40 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2 transition-colors">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-550" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="premium-input pr-12"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2 transition-colors">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-550" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="premium-input pr-12"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-btn-primary w-full py-4 relative overflow-hidden group"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
            </button>
          </form>

          <div className="mt-8 text-center pt-8 border-t border-slate-100 dark:border-slate-800 transition-colors">
            <p className="text-slate-400 dark:text-slate-500 text-[10.5px] font-bold leading-relaxed transition-colors mb-4">
              هذه المنظومة مخصصة للمستخدمين المصرح لهم فقط. إذا كنت لا تملك حساباً، يرجى مراجعة مسؤول النظام.
            </p>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <a 
                  href="https://wa.me/9647734435907" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 rounded-xl hover:bg-emerald-500/25 transition-all font-black text-xs border border-emerald-500/10"
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
                  className="flex items-center gap-3 px-4 py-2.5 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 rounded-xl hover:bg-emerald-500/25 transition-all font-black text-xs border border-emerald-500/10"
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
        
        <p className="text-center mt-8 text-slate-350 dark:text-slate-650 text-[10px] font-black uppercase tracking-wider transition-colors">
          © {new Date().getFullYear()} جميع الحقوق محفوظة - تطوير ومتابعة محمد خالد
        </p>
      </div>
    </div>
  );
};
