import React, { useState, useEffect } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { 
  Settings, 
  ShieldAlert, 
  CheckCircle2, 
  HardDrive, 
  Building2, 
  Users, 
  Mail, 
  Info, 
  Loader2, 
  Server, 
  RefreshCw,
  Trash2,
  Calendar,
  AlertTriangle
} from 'lucide-react';

export const SystemSettings: React.FC = () => {
  const { 
    globalMailReceiptMode, 
    toggleGlobalMailReceiptMode, 
    isGoogleDriveConnected, 
    connectGoogleDrive,
    internalDepartments,
    fetchAllProfiles,
    userRole,
    userProfile
  } = useDocuments();

  const [togglingGlobal, setTogglingGlobal] = useState(false);
  const [userCount, setUserCount] = useState<number>(0);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Mail clearing feature states
  const [clearType, setClearType] = useState<'all' | 'period'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  const handleClearMail = async () => {
    if (!userProfile?.id) {
      alert("لم يتم التعرف على المعرف الخاص بك");
      return;
    }

    if (!confirmCheckbox) {
      alert("الرجاء تأكيد رغبتك في تصفير رسائل البريد من خلال تحديد مربع التأكيد.");
      return;
    }

    if (clearType === 'period' && !startDate && !endDate) {
      alert("الرجاء تحديد تاريخ بداية أو نهاية الفترة المطلوبة.");
      return;
    }

    const confirmMsg = clearType === 'all' 
      ? 'تحذير نهائي: هل أنت متأكد من تصفير وحذف جميع رسائل البريد لكل المستخدمين في النظام؟ هذا الإجراء لا يمكن التراجع عنه وسيمسح كامل الأرشيف والمراسلات!'
      : `تحذير نهائي: هل أنت متأكد من تصفير وحذف رسائل البريد للفترة من [${startDate || 'البداية'}] إلى [${endDate || 'النهاية'}]؟ هذا الإجراء لا يمكن التراجع عنه!`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch('/api/admin/clear-mail-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clearType,
          startDate: startDate || null,
          endDate: endDate || null,
          adminUserId: userProfile.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل تنفيذ العملية على الخادم');
      }

      alert("تم تصفير وحذف رسائل البريد المطلوبة بنجاح!");
      setConfirmCheckbox(false);
      setStartDate('');
      setEndDate('');
    } catch (err: any) {
      console.error(err);
      alert("فشل التصفير: " + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    const getUsers = async () => {
      setLoadingUsers(true);
      try {
        const profiles = await fetchAllProfiles();
        setUserCount(profiles.length);
      } catch (err) {
        console.error('Error fetching user count:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    getUsers();
  }, [fetchAllProfiles]);

  if (userRole !== 'ADMIN') {
    return (
      <div className="glass-panel rounded-[2.5rem] p-8 text-center max-w-lg mx-auto border border-red-100 dark:border-red-950/20 bg-red-50/5 dark:bg-red-950/5 mt-10 animate-in fade-in">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-black text-slate-900 dark:text-white">خطأ في الصلاحيات</h3>
        <p className="text-sm font-semibold text-slate-500 mt-2 leading-relaxed">
          عذراً، هذه الصفحة مخصصة لمسؤول النظام فقط (ADMIN) ولا تملك الصلاحية للوصول إليها.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="glass-panel rounded-[2.5rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-br from-white/95 via-white/85 to-indigo-50/15 dark:from-slate-900/95 dark:via-slate-900/85 dark:to-indigo-500/5 border border-indigo-100/30 dark:border-white/5 shadow-xl shadow-indigo-100/10 dark:shadow-none">
        <div className="flex items-center gap-4 text-right">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Settings className="w-7 h-7 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">إعدادات النظام</h1>
            <p className="text-xs font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-wider mt-1">التحكم المركزي في المعاملات، التكامل، والتراخيص</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core Settings Column (Left 2-span) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Internal Mail Receipt Setting */}
          <div className="glass-panel rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 bg-white/60 dark:bg-slate-900/40 relative overflow-hidden shadow-lg shadow-slate-100/30 dark:shadow-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
            
            <div className="flex items-start justify-between gap-6 relative z-10">
              <div className="flex-1 min-w-0 text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black tracking-wider uppercase mb-3 border border-indigo-100/40 dark:border-indigo-900/30">
                  ★ تتبع البريد الداخلي
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">تفعيل نظام الاستلام الإلزامي العام لجميع المستخدمين</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                  عند تفعيل هذا الخيار الإداري، يصبح <strong>تأكيد الاستلام إجبارياً وإلزامياً على جميع مستخدمي النظام دون استثناء</strong>. لن يتمكن أي موظف من قراءة محتوى الكتب أو الرسائل الواردة إليه إلا بعد تأكيد استلامها رسمياً أولاً.
                </p>
                <div className="mt-4 p-4 bg-amber-500/5 dark:bg-amber-400/5 rounded-2xl border border-amber-500/10 dark:border-amber-400/10 flex items-start gap-3">
                  <span className="text-base text-amber-500">⚠</span>
                  <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 leading-relaxed text-right">
                    تنبيـه: لن يتمكن الموظفون والمنسقون من تجاوز هذه الشاشة عند قراءة المعاملات والكتب السرية أو العادية بمجرد تفعيلها، حيث سيطلب النظام موافقتهم الصريحة على الاستلام لتوثيقها لغرض تدقيق الوقت والمستقبلين.
                  </p>
                </div>
              </div>
              
              <div className="shrink-0">
                {togglingGlobal ? (
                  <div className="w-12 h-12 rounded-2xl border-2 border-indigo-500 border-t-transparent animate-spin flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/20" />
                ) : (
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={globalMailReceiptMode} 
                      onChange={async (e) => {
                        setTogglingGlobal(true);
                        try {
                          await toggleGlobalMailReceiptMode(e.target.checked);
                        } catch (err: any) {
                          alert("حدث خطأ أثناء تغيير الإعداد الموحد: " + err.message);
                        } finally {
                          setTogglingGlobal(false);
                        }
                      }} 
                      className="sr-only peer"
                    />
                    <div className="w-16 h-8 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:right-[6px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-all dark:after:bg-slate-950 dark:after:border-slate-850 peer-checked:bg-indigo-600"></div>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Cloud Storage & Backup Area */}
          <div className="glass-panel rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 bg-white/60 dark:bg-slate-900/40 relative overflow-hidden shadow-lg shadow-slate-100/30 dark:shadow-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
              <div className="flex-1 min-w-0 text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black tracking-wider uppercase mb-3 border border-emerald-150/30 dark:border-emerald-900/30">
                  ☁ التخزين والأمان
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">ربط ومزامنة Google Drive لحفظ المرفقات</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2leading-relaxed">
                  يتيح هذا الإعداد رفع وحفظ ملفات الكتب والمخاطبات الرسمية من خلال حساب <strong>Google Drive</strong> مباشرة. يضمن ذلك حماية البيانات والوصول إليها بأمان تامة مع الاحتفاظ بنسخة احتياطية في السحابة الخاصة بك.
                </p>
                
                <div className="mt-4 flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${
                    isGoogleDriveConnected 
                      ? "bg-emerald-50 dark:bg-emerald-950/10 border-emerald-250 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-50 dark:bg-amber-950/10 border-amber-200 text-amber-600 dark:text-amber-400"
                  }`}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {isGoogleDriveConnected ? 'جوجل درايف متصل ومفعل' : 'جوجل درايف غير متصل حالياً'}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-end">
                <button
                  type="button"
                  onClick={connectGoogleDrive}
                  className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                    isGoogleDriveConnected
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-indigo-650 text-white hover:bg-indigo-700 shadow-indigo-500/15"
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                  {isGoogleDriveConnected ? 'تغيير أو إعادة ربط Google Drive' : 'ربط ومزامنة جوجل درايف'}
                </button>
              </div>
            </div>
          </div>

          {/* Mail Messages Clearing Section */}
          <div className="glass-panel rounded-[2.5rem] p-8 border border-rose-100/30 dark:border-rose-950/20 bg-white/60 dark:bg-slate-900/40 relative overflow-hidden shadow-lg shadow-slate-100/30 dark:shadow-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl" />
            
            <div className="relative z-10 text-right space-y-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 text-[10px] font-black tracking-wider uppercase mb-3 border border-rose-150/30 dark:border-rose-900/30">
                  ⚠ إدارة النظام وتنظيف البيانات
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 justify-end">
                  تصفير وإفراغ رسائل البريد الإلكتروني الداخلي
                  <Trash2 className="w-5 h-5 text-rose-500" />
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  صلاحية حصرية لمسؤول النظام تمكنك من مسح وتصفير كافة المراسلات والرسائل في البريد الداخلي والوارد لجميع المستخدمين بضغطة زر واحدة، مع إمكانية تحديد الحذف كلياً أو حصر المسح لفترة تاريخية معيّنة.
                </p>
              </div>

              {/* Reset Mode Selection (Tabs/Segmented Buttons) */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-705 dark:text-slate-350 block">نطاق عملية التصفير والمسح:</label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100/80 dark:bg-slate-950/50 rounded-2xl border border-slate-200/40 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setClearType('all')}
                    className={`py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      clearType === 'all'
                        ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                    }`}
                  >
                    تصفير بالكامل (كافة الرسائل والأزمنة)
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearType('period')}
                    className={`py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      clearType === 'period'
                        ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-450 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                    }`}
                  >
                    تحديد فترة أو نطاق زمني معيّن
                  </button>
                </div>
              </div>

              {/* Dates input when 'period' is active */}
              {clearType === 'period' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-3 duration-240">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 dark:text-slate-400 flex items-center gap-1.5 justify-end">
                      من تاريخ (تاريخ البداية)
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-rose-550 focus:outline-none transition-all text-right"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 dark:text-slate-400 flex items-center gap-1.5 justify-end">
                      إلى تاريخ (تاريخ النهاية)
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-rose-550 focus:outline-none transition-all text-right"
                    />
                  </div>
                </div>
              )}

              {/* Danger Warning Notice */}
              <div className="p-4 bg-rose-500/5 dark:bg-rose-400/5 rounded-2xl border border-rose-500/15 dark:border-rose-400/15 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-right">
                  <h4 className="text-xs font-black text-rose-600 dark:text-rose-400">تحذير أمني خطير!</h4>
                  <p className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    عملية تصفير أو حذف رسائل البريد الإلكتروني لا يمكن التراجع عنها وهي عملية نهائية. سوف يتم تصفير وحذف الرسائل من خوادم قاعدة البيانات نهائياً وتصفير البريد لكافة المستخدمين في النظام.
                  </p>
                </div>
              </div>

              {/* Confirmation checkbox required to unlock button */}
              <div className="flex items-center justify-end gap-3 py-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-350 cursor-pointer select-none" htmlFor="confirmMailClear">
                  أؤكد بأنني أرغب بتصفير رسائل البريد وحذفها وتحمل كامل المسؤولية عن مسح الأرشيف.
                </label>
                <input
                  type="checkbox"
                  id="confirmMailClear"
                  checked={confirmCheckbox}
                  onChange={(e) => setConfirmCheckbox(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-rose-600 focus:ring-rose-550 dark:bg-slate-950/60 border-slate-300 dark:border-white/10"
                />
              </div>

              {/* Start clear action button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleClearMail}
                  disabled={isClearing || !confirmCheckbox}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    isClearing
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                      : confirmCheckbox
                      ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/15"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-650 border border-slate-200 dark:border-white/5 cursor-not-allowed shadow-none"
                  }`}
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      جاري تصفير وحذف رسائل البريد حالياً...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4.5 h-4.5" />
                      البدء في تصفير وحذف رسائل البريد
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
          
        </div>

        {/* Right Info Column (1-span) */}
        <div className="space-y-8">
          
          {/* System Vital Stats */}
          <div className="glass-panel rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/60 shadow-md">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 justify-end">
              <Server className="w-4 h-4 text-indigo-500" />
              إحصائيات وقواعد البيانات الحالية
            </h3>
            
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-100/50 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">مجموع المستخدمين</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      {loadingUsers ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : `${userCount} مستخدم`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Departments Card */}
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-100/50 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">الأقسام والشُعب</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{internalDepartments.length} أقسام مفعلة</p>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-100/50 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">حالة اتصال الخادم</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">متصل (قاعدة البيانات Supabase)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Informational Box */}
          <div className="glass-panel rounded-[2.5rem] p-6 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-right space-y-3">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-sm font-black">معلومات الترخيص والدعم</span>
              <Info className="w-4 h-4 shrink-0" />
            </div>
            <p className="text-[11px] font-semibold leading-relaxed">
              هذه المنصة مبنية لدعم المراسلات الداخلية وأرشفة المعاملات والكتب الرسمية للدوائر الحكومية أو المؤسسية بنظام تشفير وحفظ فائق الدقة.
            </p>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold border-t border-indigo-150/40 dark:border-indigo-900/25 pt-2">
              الإصدار الحالي: v2.4.0 (مستقر)
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
