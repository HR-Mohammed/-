import React from 'react';
import { useDocuments } from '../context/DocumentContext';
import { FileText, Inbox, Send, CheckCircle, Clock, AlertCircle, ArrowUpRight, TrendingUp, Filter, Activity, History, Archive } from 'lucide-react';
import { cn, formatDate, statusTranslations } from '../lib/utils';
import { OfficialDocument, DocumentStatus } from '../types';
import { motion } from 'framer-motion';

const statusStyles: Record<DocumentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-200 shadow-sm shadow-amber-100/50 dark:bg-amber-950/20 dark:text-amber-500 dark:border-amber-900/50",
  IN_PROGRESS: "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm shadow-indigo-100/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50",
  COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm shadow-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
  ARCHIVED: "bg-slate-50 text-slate-500 border-slate-200 shadow-sm shadow-slate-100/50 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50",
};

const statusIcons: Record<DocumentStatus, React.ElementType> = {
  PENDING: Clock,
  IN_PROGRESS: Activity,
  COMPLETED: CheckCircle,
  ARCHIVED: History,
};

interface DashboardProps {
  onView: (id: string) => void;
  overdueDocs?: OfficialDocument[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onView, overdueDocs = [] }) => {
  const { documents, loading, fetchAllProfiles } = useDocuments();
  const [teamMembers, setTeamMembers] = React.useState<{id: string, name: string | null}[]>([]);

  React.useEffect(() => {
    const loadTeam = async () => {
      try {
        const profiles = await fetchAllProfiles();
        setTeamMembers(profiles.slice(0, 3).map(p => ({ id: p.id, name: p.full_name }))); // Show up to 3 members
      } catch (e) {
        console.error("Failed to load team members:", e);
      }
    };
    loadTeam();
  }, [fetchAllProfiles]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-sm">جاري تحميل البيانات من Supabase...</p>
      </div>
    );
  }

  const totalDocuments = documents.length;
  const incomingCount = documents.filter(d => d.type === 'INCOMING').length;
  const outgoingCount = documents.filter(d => d.type === 'OUTGOING').length;
  const completedCount = documents.filter(d => d.status === 'COMPLETED').length;
  const pendingCount = documents.filter(d => d.status === 'PENDING').length;
  const inProgressCount = documents.filter(d => d.status === 'IN_PROGRESS').length;

  const stats = [
    { label: 'إجمالي الكتب', value: totalDocuments, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'وارد', value: incomingCount, icon: Inbox, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'صادر', value: outgoingCount, icon: Send, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'الكتب المنجزة', value: completedCount, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'قيد المتابعة', value: inProgressCount, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  const recentDocuments = documents.slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">نظرة عامة</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic opacity-80">إحصائيات وتحليلات فورية لنظام المراسلات.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-white dark:border-slate-800 mx-2 sm:mx-0">
          <div className="flex -space-x-reverse space-x-2 p-1">
            {teamMembers.map((member, i) => (
              <div key={member.id || i} className="w-8 h-8 rounded-xl border-2 border-white dark:border-slate-900 bg-indigo-100 dark:bg-indigo-900/50 ring-1 ring-slate-100/50 dark:ring-slate-800/50 flex items-center justify-center text-xs font-black text-indigo-700 dark:text-indigo-400" title={member.name || 'مستخدم'}>
                {member.name ? member.name.charAt(0).toUpperCase() : 'م'}
              </div>
            ))}
            {teamMembers.length === 0 && (
              <div className="text-[10px] text-slate-400 px-2 py-1">لا يوجد مستخدمين</div>
            )}
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">فريق العمل</span>
        </div>
      </div>

      {/* Alert Banner / Urgent Info */}
      {overdueDocs.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500 text-white rounded-[2.5rem] p-6 shadow-2xl shadow-red-100/50 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md border border-white/20">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">إجراء عاجل مطلوب</h3>
              <p className="text-red-50 text-sm font-bold opacity-90 mt-1 leading-relaxed">لديك {overdueDocs.length} موضوعاً تجاوز موعد الإستحقاق، يرجى المراجعة والاتخاذ الإجراء اللازم.</p>
            </div>
          </div>
          <button 
            onClick={() => onView(overdueDocs[0].id)}
            className="bg-white text-red-600 px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all shadow-xl active:scale-95 relative z-10 flex items-center gap-2 whitespace-nowrap"
          >
            مراجعة المواعيد
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Bantu Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="glass-panel p-6 rounded-[2rem] flex flex-col justify-between h-44 group cursor-default transition-all border-none ring-1 ring-slate-100 dark:ring-white/5"
          >
            <div className="flex justify-between items-start">
              <div className={cn("p-3 rounded-2xl transition-all group-hover:scale-110 shadow-sm", 
                 stat.bg,
                 stat.bg.includes('blue') ? 'dark:bg-blue-500/10' : 
                 stat.bg.includes('indigo') ? 'dark:bg-indigo-500/10' : 
                 stat.bg.includes('orange') ? 'dark:bg-orange-500/10' : 
                 stat.bg.includes('emerald') ? 'dark:bg-emerald-500/10' : 
                 stat.bg.includes('purple') ? 'dark:bg-purple-500/10' : ''
              )}>
                <stat.icon className={cn("w-6 h-6", stat.color, stat.color.replace('text-', 'dark:text-'))} />
              </div>
              <TrendingUp className="w-4 h-4 text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{stat.value}</p>
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity Table Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">أحدث المعاملات المضافة</h3>
            <div className="flex gap-2">
                <button className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
            </div>
          </div>
          
          <div className="glass-panel rounded-[2.5rem] p-2 overflow-hidden dark:bg-slate-900/70 dark:border-slate-800/50">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-16">#</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">الموضوع والرقم المرجعي</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">الجهة المرسلة</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">الحالة التشغيلية</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {recentDocuments.map((doc, idx) => (
                    <tr 
                      key={doc.id} 
                      onClick={() => onView(doc.id)}
                      className="group transition-all hover:translate-x-[-4px] cursor-pointer"
                    >
                      <td className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-r-2xl text-xs font-black text-slate-400 dark:text-slate-500 text-center">
                        {(idx + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="px-4 py-4 bg-white dark:bg-slate-900/40 border-y border-slate-100 dark:border-white/5 overflow-hidden">
                        <div className="flex flex-col">
                           <span className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[240px]">
                              {doc.subject}
                           </span>
                           <span className="text-[10px] font-bold text-indigo-500/60 dark:text-indigo-400/60 mt-0.5 font-mono">ID: {doc.referenceNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 bg-white dark:bg-slate-900/40 border-y border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                           <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{doc.department}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 bg-white dark:bg-slate-900/40 border-y border-l border-slate-100 dark:border-white/5 rounded-l-2xl">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all duration-300 group-hover:scale-105",
                          statusStyles[doc.status]
                        )}>
                          {(() => {
                            const Icon = statusIcons[doc.status];
                            return <Icon className="w-3 h-3" />;
                          })()}
                          {statusTranslations[doc.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recentDocuments.length === 0 && (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                </div>
                <p className="text-slate-400 font-bold text-sm">لا توجد بيانات متاحة حالياً</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tools Sidebar */}
        <div className="space-y-8">
          <div className="px-2">
             <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">الأدوات السريعة</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
             <button className="glass-panel p-6 rounded-[2rem] hover:bg-indigo-600 hover:text-white transition-all group flex items-center justify-between text-right border-none ring-1 ring-slate-100 dark:ring-white/5 dark:bg-slate-900/40">
                <div className="flex-1">
                   <p className="text-sm font-black">تصنيف الكتب</p>
                   <p className="text-[10px] font-bold opacity-70 mt-1">تنظيم حسب النوع والمستوى</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl group-hover:bg-white/20 transition-all group-hover:rotate-6">
                   <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
                </div>
             </button>

             <button className="glass-panel p-6 rounded-[2rem] hover:bg-slate-900 dark:hover:bg-indigo-600 hover:text-white transition-all group flex items-center justify-between text-right border-none ring-1 ring-slate-100 dark:ring-white/5 dark:bg-slate-900/40">
                <div className="flex-1">
                   <p className="text-sm font-black">تقارير المتابعة</p>
                   <p className="text-[10px] font-bold opacity-70 mt-1">تصدير إحصائيات الأداء الأسبوعي</p>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl group-hover:bg-white/20 transition-all group-hover:-rotate-6">
                   <TrendingUp className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-white" />
                </div>
             </button>

             {/* Upgrade/Ads Card */}
             <div className="relative rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-8 text-white overflow-hidden mt-4 shadow-2xl">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
                
                <CheckCircle className="w-10 h-10 text-indigo-400 mb-6" />
                <h4 className="text-xl font-black leading-tight">النسخة الاحترافية<br />نشطة حالياً</h4>
                <p className="text-[11px] font-medium text-slate-400 mt-4 leading-relaxed line-clamp-3">
                   أنت تستخدم محرك التحقق الذكي الإصدار 4.0. تمت اتمتة أكثر من 90% من عمليات تتبع التواريخ.
                </p>
                
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                      <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">Live Data Sync</span>
                   </div>
                   <ArrowUpRight className="w-4 h-4 text-slate-600" />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
