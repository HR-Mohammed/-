import React, { useEffect, useState } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { UserProfile, UserRole } from '../types';
import { Users, Shield, UserCog, Check, Loader2, Search, Plus, X, Mail, Lock, Edit2, Save } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// خاص لإنشاء مستخدمين دون الخروج من حساب المسؤول
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

export const UserManager: React.FC = () => {
  const { fetchAllProfiles, updateUserRole, updateUserProfile, userRole, internalDepartments } = useDocuments();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Name editing state
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  
  // New user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllProfiles();
      setProfiles(data);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل قائمة المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      // 1. Create Auth User
      const { data, error: signUpError } = await tempClient.auth.signUp({
        email: newEmail,
        password: newPassword,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // 2. Create Profile
        const { error: profileError } = await tempClient.from('profiles').insert([
          { id: data.user.id, email: newEmail, full_name: newName, role: 'VIEWER' }
        ]);

        if (profileError) throw profileError;

        // Success
        setShowAddForm(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        loadProfiles();
      }
    } catch (err: any) {
      let message = err.message;
      if (message.includes('rate limit exceeded')) {
        message = 'تم تجاوز الحد المسموح لإنشاء الحسابات حالياً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
      } else if (message.includes('already registered')) {
        message = 'هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر.';
      } else if (message.includes('Password should be')) {
        message = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
      }
      setCreateError(message || 'حدث خطأ أثناء إنشاء المستخدم');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      await updateUserRole(userId, newRole);
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
    } catch (error) {
      alert('خطأ في تحديث الصلاحية');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateName = async (userId: string) => {
    setSavingName(true);
    try {
      await updateUserProfile(userId, { full_name: editingNameValue });
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, full_name: editingNameValue } : p));
      setEditingNameId(null);
      setEditingNameValue('');
    } catch (error: any) {
      alert('خطأ في تحديث الاسم: ' + (error.message || 'فشل الاتصال بقاعدة البيانات'));
    } finally {
      setSavingName(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.full_name && p.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (userRole !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-rose-500 font-bold underline">عذراً، ليس لديك صلاحية الوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 transition-colors" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 transition-colors">
            <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            إدارة مستخدمي النظام
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 transition-colors">تحديد صلاحيات الوصول والتحكم في حسابات المستخدمين</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-slate-900 dark:hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إضافة مستخدم جديد
        </button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6 transition-colors">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl shadow-indigo-900/20 dark:shadow-none overflow-hidden relative transition-colors">
            <button 
              onClick={() => setShowAddForm(false)}
              className="absolute top-8 left-8 p-2 text-slate-300 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-10">
              <div className="mb-8">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">إضافة مستخدم جديد</h3>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-1 transition-colors">سيتم إنشاء حساب جديد ومنحه صلاحية "مشاهد" تلقائياً</p>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-6">
                {createError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold text-center transition-colors">
                    {createError}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2 transition-colors">اسم المستخدم الكامل</label>
                  <div className="relative">
                    <UserCog className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full pr-12 pl-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white"
                      placeholder="الأسم الكامل"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2 transition-colors">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full pr-12 pl-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white"
                      placeholder="user@example.com"
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
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pr-12 pl-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-slate-900 dark:hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    إنشاء الحساب
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-sm rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="البحث عن طريق البريد الإلكتروني..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none transition-all focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 text-slate-900 dark:text-white"
            />
          </div>
          <button 
            onClick={loadProfiles}
            className="px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            تحديث القائمة
          </button>
        </div>

        {error && (
          <div className="p-6 bg-rose-50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/50 transition-colors">
            <p className="text-rose-600 dark:text-rose-400 text-sm font-bold text-center">خطأ: {error}. تأكد من إنشاء جدول profiles وإعداد الـ RLS.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">المستخدم</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">تاريخ الانضمام</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">القسم</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">تغيير الصلاحية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-slate-400 dark:text-slate-500 font-bold text-sm transition-colors">جاري تحميل قائمة المستخدمين...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <p className="text-slate-400 dark:text-slate-500 font-bold transition-colors">لا يوجد مستخدمون مطابقون للبحث</p>
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {(profile.full_name || profile.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          {editingNameId === profile.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/50 rounded-lg text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white"
                                placeholder="الاسم الكامل"
                              />
                              <button
                                onClick={() => handleUpdateName(profile.id)}
                                disabled={savingName}
                                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-indigo-500 transition-colors disabled:opacity-50"
                              >
                                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => setEditingNameId(null)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/name">
                              <p className="text-sm font-bold text-slate-900 dark:text-white transition-colors">
                                {profile.full_name || 'غير محدد'}
                              </p>
                              <button
                                onClick={() => {
                                  setEditingNameId(profile.id);
                                  setEditingNameValue(profile.full_name || '');
                                }}
                                className="p-1 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover/name:opacity-100 transition-all"
                                title="تعديل الاسم"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold transition-colors">{profile.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-500 dark:text-slate-400 transition-colors">
                      {new Date(profile.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-8 py-5">
                      <select
                        value={profile.department_id || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setUpdatingId(profile.id);
                          try {
                            await updateUserProfile(profile.id, { department_id: val || null });
                            setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, department_id: val || undefined } : p));
                          } catch (err) {
                            alert('خطأ في تحديث القسم');
                          } finally {
                            setUpdatingId(null);
                          }
                        }}
                        className="bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold outline-none"
                      >
                        <option value="">بدون قسم</option>
                        {internalDepartments.map(dept => (
                           <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="relative group/select">
                          <select
                            disabled={updatingId === profile.id || profile.email === 'it.moh.k.smart@gmail.com'}
                            value={profile.role}
                            onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                            className="appearance-none bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 px-4 py-2 pr-4 pl-10 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 outline-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="ADMIN">مسؤول النظام</option>
                            <option value="MANAGER">إداري</option>
                            <option value="VIEWER">مشاهد فقط</option>
                          </select>
                          <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        </div>
                        {updatingId === profile.id && (
                          <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
