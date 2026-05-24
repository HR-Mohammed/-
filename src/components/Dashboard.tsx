import React, { useMemo } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { FileText, Inbox, Send, CheckCircle, Clock, AlertCircle, ArrowUpRight, TrendingUp, Filter, Activity, History, Archive } from 'lucide-react';
import { cn, formatDate, statusTranslations } from '../lib/utils';
import { OfficialDocument, DocumentStatus } from '../types';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

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

  const incomingCount = documents.filter(d => d.type === 'INCOMING').length;
  const outgoingCount = documents.filter(d => d.type === 'OUTGOING').length;

  // Chart Data calculations
  const bookTypesData = React.useMemo(() => [
    { name: 'وارد', value: incomingCount, color: '#4f46e5' }, // indigo-600
    { name: 'صادر', value: outgoingCount, color: '#ea580c' }  // orange-600
  ], [incomingCount, outgoingCount]);

  const deptData = React.useMemo(() => {
    const map = new Map<string, any>();
    documents.forEach(doc => {
      const dept = doc.department || 'غير محدد';
      if (!map.has(dept)) {
        map.set(dept, { 
          name: dept, 
          'منجز': 0, 
          'قيد المتابعة': 0, 
          'قيد الانتظار': 0,
          total: 0
        });
      }
      const data = map.get(dept);
      if (doc.status === 'COMPLETED') data['منجز'] += 1;
      else if (doc.status === 'IN_PROGRESS') data['قيد المتابعة'] += 1;
      else if (doc.status === 'PENDING') data['قيد الانتظار'] += 1;
      data.total += 1;
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [documents]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 font-sans">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-sm">جاري تحميل البيانات من Supabase...</p>
      </div>
    );
  }

  const totalDocuments = documents.length;
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
    <div className="space-y-8 animate-in fade-in duration-700 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-indigo-100/20 dark:border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">الرئيسية والمؤشرات</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-bold uppercase tracking-wider opacity-85">إحصائيات تفاعلية وتحليلات فورية لحركة الكتب والمراسلات</p>
        </div>
        <div className="flex items-center gap-3 bg-white/75 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
          <div className="flex -space-x-reverse space-x-1.5 p-1">
            {teamMembers.map((member, i) => (
              <div 
                key={member.id || i} 
                className="w-9 h-9 rounded-xl border-2 border-white dark:border-slate-900 bg-gradient-to-tr from-indigo-500 to-violet-500 ring-1 ring-indigo-200/50 dark:ring-white/5 flex items-center justify-center text-xs font-black text-white" 
                title={member.name || 'مستخدم'}
              >
                {member.name ? member.name.charAt(0).toUpperCase() : 'م'}
              </div>
            ))}
            {teamMembers.length === 0 && (
              <div className="text-[10px] text-slate-400 px-2 py-1">لا يوجد مستخدمين</div>
            )}
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2.5">فريق العمل النشط</span>
        </div>
      </div>

      {/* Alert Banner / Urgent Info */}
      {overdueDocs.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-rose-600 to-red-500 text-white rounded-[2.5rem] p-6 shadow-xl shadow-rose-500/10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="bg-white/15 p-4 rounded-3xl backdrop-blur-md border border-white/20 shadow-inner">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">إجراء عاجل مطلوب</h3>
              <p className="text-rose-100 text-sm font-bold opacity-90 mt-1 leading-relaxed">تنبيه: يوجد {overdueDocs.length} من المراسلات الهامة تجاوزت موعد الاستحقاق المعتمد للرد أو الإنجاز.</p>
            </div>
          </div>
          <button 
            onClick={() => onView(overdueDocs[0].id)}
            className="bg-white text-rose-600 px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-2 whitespace-nowrap animate-pulse"
          >
            متابعة الموانع والمواعيد
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Bantu Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, idx) => {
          let subText = "";
          let percentage = 0;
          if (totalDocuments > 0) {
            percentage = Math.round((stat.value / totalDocuments) * 100);
          }
          
          if (stat.label === 'إجمالي الكتب') {
            const pct = totalDocuments > 0 ? Math.round((completedCount / totalDocuments) * 100) : 0;
            subText = `منها ${pct}% منجز بالكامل`;
          } else if (stat.label === 'الكتب المنجزة') {
            subText = `نسبة الإنجاز العامة ${percentage}%`;
          } else if (stat.label === 'وارد') {
            subText = `${percentage}% من المعاملات`;
          } else if (stat.label === 'صادر') {
            subText = `${percentage}% من المعاملات`;
          } else if (stat.label === 'قيد المتابعة') {
            subText = `${percentage}% تحت المتابعة`;
          }

          const cardDesigns: Record<string, { gradient: string; glow: string; border: string; badge: string; dotsColor: string }> = {
            'إجمالي الكتب': {
              gradient: "from-blue-500/10 via-blue-500/5 to-transparent hover:from-blue-500/15 dark:from-blue-500/15 dark:via-blue-500/5",
              glow: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
              border: "border-blue-100/50 dark:border-blue-900/30",
              badge: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100/30 dark:border-blue-900/40",
              dotsColor: "bg-blue-550 dark:bg-blue-400"
            },
            'وارد': {
              gradient: "from-indigo-500/10 via-indigo-500/5 to-transparent hover:from-indigo-500/15 dark:from-indigo-500/15 dark:via-indigo-500/5",
              glow: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
              border: "border-indigo-100/50 dark:border-indigo-900/30",
              badge: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100/30 dark:border-indigo-900/40",
              dotsColor: "bg-indigo-550 dark:bg-indigo-400"
            },
            'صادر': {
              gradient: "from-orange-500/10 via-orange-500/5 to-transparent hover:from-orange-500/15 dark:from-orange-500/15 dark:via-orange-500/5",
              glow: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
              border: "border-orange-100/50 dark:border-orange-900/30",
              badge: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-100/30 dark:border-orange-900/40",
              dotsColor: "bg-orange-550 dark:bg-orange-400"
            },
            'الكتب المنجزة': {
              gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent hover:from-emerald-500/15 dark:from-emerald-500/15 dark:via-emerald-500/5",
              glow: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
              border: "border-emerald-100/50 dark:border-emerald-900/30",
              badge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100/30 dark:border-emerald-900/40",
              dotsColor: "bg-emerald-555 dark:bg-emerald-400"
            },
            'قيد المتابعة': {
              gradient: "from-purple-500/10 via-purple-500/5 to-transparent hover:from-purple-500/15 dark:from-purple-500/15 dark:via-purple-500/5",
              glow: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
              border: "border-purple-100/50 dark:border-purple-900/30",
              badge: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100/30 dark:border-purple-900/40",
              dotsColor: "bg-purple-550 dark:bg-purple-400"
            }
          };

          const design = cardDesigns[stat.label] || {
            gradient: "from-slate-550/10 via-slate-550/5 to-transparent",
            glow: "bg-slate-50 text-slate-600 dark:bg-slate-950/40 dark:text-slate-400",
            border: "border-slate-100/50 dark:border-slate-900/30",
            badge: "bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 border-slate-100/30 dark:border-slate-900/40",
            dotsColor: "bg-slate-500"
          };

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              whileHover={{ 
                y: -6, 
                transition: { duration: 0.2, ease: "easeOut" } 
              }}
              className={cn(
                "relative group overflow-hidden rounded-[2.25rem] p-6 border transition-all duration-305 flex flex-col justify-between h-48 cursor-default",
                "bg-white/90 dark:bg-slate-900/80 backdrop-blur-md shadow-md hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700",
                design.border
              )}
            >
              {/* Ambient Glowing Aura Accent */}
              <div className={cn(
                "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-40 transition-opacity group-hover:opacity-65 pointer-events-none bg-gradient-to-br",
                design.gradient
              )} />
              
              {/* Header block */}
              <div className="flex justify-between items-start relative z-10 w-full">
                <div className={cn(
                  "p-3 rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110", 
                  design.glow
                )}>
                  <stat.icon className="w-5 h-5" />
                </div>
                
                {/* Modern subtle pulse indicator */}
                <span className="relative flex h-2 w-2 mt-2">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", design.dotsColor)} />
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", design.dotsColor)} />
                </span>
              </div>

              {/* Main Content Info */}
              <div className="mt-4 relative z-10">
                <p className="text-3xl font-black text-slate-950 dark:text-white tracking-tight transform transition-transform group-hover:translate-x-1 duration-300">
                  {stat.value}
                </p>
                <p className="text-xs font-black text-slate-500 dark:text-slate-400 tracking-wider mt-1 uppercase">
                  {stat.label}
                </p>
              </div>

              {/* Footer Badge/Detail Block */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between relative z-10">
                <span className={cn(
                  "px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all duration-300 group-hover:bg-opacity-90",
                  design.badge
                )}>
                  {subText}
                </span>

                <div className="text-slate-300 dark:text-slate-700 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors">
                  <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="glass-panel p-6 rounded-[2.25rem] border border-slate-100 dark:border-white/5 shadow-lg bg-white/80 dark:bg-slate-900/60 lg:col-span-1"
        >
          <div className="mb-6 flex items-center justify-between">
             <div>
                <h3 className="text-base font-black text-slate-950 dark:text-white">توزيع الكتب والمراسلات</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">مقارنة إجمالية لنوع المعاملات (الوارد مقابل الصادر)</p>
             </div>
             <span className="relative flex h-2.5 w-2.5">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
             </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bookTypesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {bookTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                   contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '16px', border: 'none', color: '#fff' }}
                   itemStyle={{ fontWeight: 905, fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="glass-panel p-6 rounded-[2.25rem] border border-slate-100 dark:border-white/5 shadow-lg bg-white/80 dark:bg-slate-900/60 lg:col-span-2"
        >
          <div className="mb-6 flex items-center justify-between">
             <div>
                <h3 className="text-base font-black text-slate-950 dark:text-white">حالة المعاملات بكل قسم تشغيلي</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">توزيع حجم ونسب الإنجاز والمتابعة للأقسام التشغيلية</p>
             </div>
             <span className="text-[9px] font-black bg-slate-100 dark:bg-white/5 text-indigo-650 dark:text-indigo-400 px-2.5 py-1 rounded-lg">إحصائية دقيقة</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" opacity={0.08} />
                <XAxis 
                   dataKey="name" 
                   axisLine={false}
                   tickLine={false}
                   tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }}
                   dy={10}
                />
                <YAxis 
                   axisLine={false}
                   tickLine={false}
                   tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <RechartsTooltip 
                   cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                   contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: '16px', border: 'none', color: '#fff' }}
                   itemStyle={{ fontWeight: 900, fontSize: '11px' }}
                />
                <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="منجز" stackId="a" fill="#10b981" radius={[0, 0, 5, 5]} barSize={14} />
                <Bar dataKey="قيد المتابعة" stackId="a" fill="#6366f1" barSize={14} />
                <Bar dataKey="قيد الانتظار" stackId="a" fill="#f59e0b" radius={[5, 5, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity Table Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div>
               <h3 className="text-xl font-black text-slate-950 dark:text-white tracking-tight">أحدث المراسلات المضافة</h3>
               <p className="text-[10px] text-slate-450 mt-0.5">المراسلات المضافة مؤخراً لغرض المراجعة والإجراء السريع</p>
            </div>
            <div className="flex gap-2">
                <span className="text-[10.5px] font-black text-indigo-650 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full border border-indigo-100/30">جدول محدث تلقائياً</span>
            </div>
          </div>
          
          <div className="glass-panel rounded-[2.25rem] p-4 overflow-hidden dark:bg-slate-900/60 dark:border-slate-800/50 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-separate border-spacing-y-2.5 font-sans">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center w-14">#</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">البيان والموضوع</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">القسم / الجهة</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">الحالة الحالية</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {recentDocuments.map((doc, idx) => (
                    <tr 
                      key={doc.id} 
                      onClick={() => onView(doc.id)}
                      className="group transition-all hover:translate-x-[-5px] cursor-pointer"
                    >
                      <td className="px-5 py-3 bg-slate-50/70 dark:bg-slate-800/20 rounded-r-2xl text-xs font-mono font-bold text-slate-400 dark:text-slate-550 text-center border-y border-r border-slate-100/50 dark:border-white/5">
                        {(idx + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 bg-white/40 dark:bg-slate-900/15 border-y border-slate-100/50 dark:border-white/5">
                        <div className="flex flex-col">
                           <span className="text-sm font-black text-slate-950 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[280px]">
                              {doc.subject}
                           </span>
                           <span className="text-[9.5px] font-bold text-indigo-500/80 dark:text-indigo-400/80 mt-1 font-mono tracking-wider">المعرف: {doc.referenceNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 bg-white/40 dark:bg-slate-900/15 border-y border-slate-100/50 dark:border-white/5">
                        <div className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
                           <span className="text-xs font-bold text-slate-600 dark:text-slate-450">{doc.department}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 bg-white/40 dark:bg-slate-900/15 border-y border-l border-slate-100/50 dark:border-white/5 rounded-l-2xl">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all duration-300 group-hover:scale-105 shadow-sm",
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
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-white/5">
                  <Inbox className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-slate-400 font-bold text-sm">لم يتم تسجيل أي كتب أو مراسلات حتى الآن</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tools Sidebar */}
        <div className="space-y-6">
          <div className="px-2">
             <h3 className="text-xl font-black text-slate-950 dark:text-white tracking-tight">أدوات إدارية</h3>
             <p className="text-[10px] text-slate-450 mt-0.5">اختصارات ذكية للوصول والعمل المباشر</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
             <button className="glass-panel p-6 rounded-[2.25rem] hover:bg-gradient-to-l hover:from-indigo-600 hover:to-indigo-500 hover:text-white transition-all duration-350 shadow-md group flex items-center justify-between text-right border border-slate-100 dark:border-white/5 dark:bg-slate-900/45 cursor-pointer hover:shadow-indigo-650/10">
                <div className="flex-1">
                   <p className="text-sm font-black">تصنيف وترتيب الكتب</p>
                   <p className="text-[10px] font-bold opacity-70 mt-1.5">فرز تلقائي حسب الأهمية وتحديد المواعيد</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3.5 rounded-2xl group-hover:bg-white/20 transition-all group-hover:rotate-6">
                   <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
                </div>
             </button>

             <button className="glass-panel p-6 rounded-[2.25rem] hover:bg-gradient-to-l hover:from-slate-950 hover:to-slate-900 dark:hover:from-indigo-600 dark:hover:to-indigo-500 hover:text-white transition-all duration-350 shadow-md group flex items-center justify-between text-right border border-slate-100 dark:border-white/5 dark:bg-slate-900/45 cursor-pointer">
                <div className="flex-1">
                   <p className="text-sm font-black">تقارير الأداء والمتابعة</p>
                   <p className="text-[10px] font-bold opacity-70 mt-1.5">توليد ملفات إحصائية لحركة المعاملات والردود</p>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-2xl group-hover:bg-white/20 transition-all group-hover:-rotate-6">
                   <TrendingUp className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-white" />
                </div>
             </button>

             {/* Upgrade/Ads Card */}
             <div className="relative rounded-[2.25rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 dark:from-slate-950 dark:via-indigo-950 dark:to-indigo-900 p-8 text-white overflow-hidden shadow-2xl border border-white/5">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center gap-2 mb-6">
                   <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-indigo-400" />
                   </div>
                   <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">محرك التحقق الإصدار 4.0</span>
                </div>
                <h4 className="text-lg font-black leading-snug">النظام الذكي نشط وحالة المزامنة مثالية</h4>
                <p className="text-[10.5px] font-bold text-slate-400 mt-3.5 leading-relaxed">
                   أنت متصل بالنسخة المستقرة. تتم جدولة المواعيد وتتبع المستجدات آلياً مع دعم كامل للبريد الداخلي وتخزين الملفات السحابي.
                </p>
                
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75 mr-0.5"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">مزامنة البيانات فورية</span>
                   </div>
                   <ArrowUpRight className="w-4 h-4 text-slate-455" />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
