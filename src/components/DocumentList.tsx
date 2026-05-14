import React, { useState } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { formatDate, statusTranslations, typeTranslations, cn } from '../lib/utils';
import { Eye, Trash2, Search, Filter, Calendar, ChevronDown, ChevronUp, FilterX, Clock, Activity, CheckCircle, History, Plus } from 'lucide-react';
import { DocumentType, DocumentStatus } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

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

interface DocumentListProps {
  filterType?: DocumentType;
  onView: (id: string) => void;
  onAdd?: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({ filterType, onView, onAdd }) => {
  const { documents, loading, deleteDocument, userRole } = useDocuments();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteDocument(deletingId);
      setDeletingId(null);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-sm">جاري تحميل السجلات...</p>
      </div>
    );
  }
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'COMPLETED' | 'INCOMPLETE'>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const allDepartments = Array.from(new Set(documents.map(d => d.department))).sort();

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedDepartment('');
    setSelectedStatus('ALL');
    setSelectedType('ALL');
  };

  const filteredDocs = documents
    .filter(d => !filterType || d.type === filterType)
    .filter(d => {
      // General search term match
      const matchesSearch = searchTerm === '' || 
        d.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date range match
      const docDate = new Date(d.date);
      const matchesStartDate = !startDate || docDate >= new Date(startDate);
      // Set end date to end of day to include documents on that day
      const matchesEndDate = !endDate || docDate <= new Date(endDate + 'T23:59:59');
      
      // Department match
      const matchesDepartment = !selectedDepartment || d.department === selectedDepartment;

      // Status filter
      const matchesStatus = selectedStatus === 'ALL' || 
        (selectedStatus === 'COMPLETED' && d.status === 'COMPLETED') ||
        (selectedStatus === 'INCOMPLETE' && d.status !== 'COMPLETED');

      // Type filter (if not already filtered by prop)
      const matchesType = filterType ? true : (selectedType === 'ALL' || d.type === selectedType);
      
      return matchesSearch && matchesStartDate && matchesEndDate && matchesDepartment && matchesStatus && matchesType;
    });

  const hasActiveFilters = searchTerm !== '' || startDate !== '' || endDate !== '' || selectedDepartment !== '' || selectedStatus !== 'ALL' || selectedType !== 'ALL';

  return (
    <div className="glass-panel rounded-[2.5rem] overflow-hidden border-none ring-1 ring-slate-100 dark:ring-slate-800 dark:bg-slate-900/70">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {filterType === 'INCOMING' ? 'وارد' : filterType === 'OUTGOING' ? 'صادر' : 'سجل الكتب'}
          </h2>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="البحث برقم الكتاب أو الموضوع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-11 pl-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-medium text-slate-900 dark:text-white"
              />
            </div>
            
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                "p-2.5 rounded-2xl border transition-all flex items-center justify-center gap-2 text-xs font-bold",
                showAdvanced 
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none" 
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-200"
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">خيارات البحث</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {onAdd && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
              <button 
                onClick={onAdd}
                className="p-2.5 sm:px-4 sm:py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">إضافة كتاب جديد</span>
              </button>
            )}
          </div>
        </div>

        {/* Advanced Search Panel */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block pr-1">تاريخ البداية</label>
              <div className="relative">
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pr-10 pl-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block pr-1">تاريخ النهاية</label>
              <div className="relative">
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pr-10 pl-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block pr-1">الجهة المعنية</label>
              <select 
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer appearance-none text-slate-900 dark:text-white"
              >
                <option value="">كل الجهات</option>
                {allDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block pr-1">حالة الكتاب</label>
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer appearance-none text-slate-900 dark:text-white"
              >
                <option value="ALL">كل الحالات</option>
                <option value="COMPLETED">منجز</option>
                <option value="INCOMPLETE">غير منجز</option>
              </select>
            </div>

            {!filterType && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block pr-1">نوع الكتاب</label>
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer appearance-none text-slate-900 dark:text-white"
                >
                  <option value="ALL">كل الأنواع</option>
                  <option value="INCOMING">وارد</option>
                  <option value="OUTGOING">صادر</option>
                </select>
              </div>
            )}

            <div className={cn("flex items-end", filterType ? "lg:col-span-2" : "lg:col-span-1")}>
              <button 
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className={cn(
                  "w-full h-[38px] flex items-center justify-center gap-2 rounded-xl text-xs font-black transition-all",
                  hasActiveFilters 
                    ? "bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" 
                    : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed"
                )}
              >
                <FilterX className="w-3.5 h-3.5" />
                تصفير الفلاتر
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Feed Layout */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
        {filteredDocs.length > 0 ? filteredDocs.map((doc) => (
          <div key={doc.id} onClick={() => onView(doc.id)} className="p-5 active:bg-slate-50 dark:active:bg-slate-800 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-900 dark:text-white transition-colors">{doc.referenceNumber}</span>
                <span className="text-[10px] font-bold text-indigo-500/60 dark:text-indigo-400/60 font-mono mt-0.5 transition-colors">{formatDate(doc.date)}</span>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black border transition-colors",
                statusStyles[doc.status]
              )}>
                {(() => {
                  const Icon = statusIcons[doc.status];
                  return <Icon className="w-3 h-3" />;
                })()}
                {statusTranslations[doc.status]}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4 transition-colors">{doc.subject}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                {doc.department}
              </span>
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-lg transition-colors">
                {typeTranslations[doc.type]}
              </span>
            </div>
          </div>
        )) : (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-bold text-sm transition-colors">لا توجد نتائج تطابق البحث</div>
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-right border-separate border-spacing-y-2 px-4 pb-4">
          <thead className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            <tr>
              <th className="px-6 py-4">الكتاب</th>
              <th className="px-6 py-4">الجهة</th>
              <th className="px-6 py-4">تاريخ الكتاب</th>
              <th className="px-6 py-4">النوع</th>
              <th className="px-6 py-4">الحالة</th>
              <th className="px-6 py-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="">
            {filteredDocs.length > 0 ? filteredDocs.map((doc) => (
              <tr key={doc.id} className="group cursor-pointer" onClick={() => onView(doc.id)}>
                <td className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-r-2xl border-y border-r border-slate-100 dark:border-slate-800 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors max-w-[240px] truncate" title={doc.subject}>{doc.subject}</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{doc.referenceNumber}</span>
                  </div>
                </td>
                <td className="px-6 py-4 bg-white dark:bg-slate-800 border-y border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors">{doc.department}</td>
                <td className="px-6 py-4 bg-white dark:bg-slate-800 border-y border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors">{formatDate(doc.date)}</td>
                <td className="px-6 py-4 bg-white dark:bg-slate-800 border-y border-slate-100 dark:border-slate-800 transition-colors">
                  <span className={cn(
                    "px-2.5 py-1 rounded-xl text-[10px] font-black border inline-block whitespace-nowrap",
                    doc.type === 'INCOMING' 
                      ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50" 
                      : "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/50"
                  )}>
                    {typeTranslations[doc.type]}
                  </span>
                </td>
                <td className="px-6 py-4 bg-white dark:bg-slate-800 border-y border-slate-100 dark:border-slate-800 transition-colors">
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
                <td className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-l-2xl border-y border-l border-slate-100 dark:border-slate-800 transition-colors">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onView(doc.id); }}
                      className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(doc.id);
                        }}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-slate-400 dark:text-slate-500 font-bold text-sm bg-slate-50/30 dark:bg-slate-800/20 rounded-2xl">
                  لا توجد سجلات تطابق عوامل التصفية الحالية.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <DeleteConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="حذف الكتاب"
        message="هل أنت متأكد من رغبتك في حذف هذا الكتاب؟ سيؤدي ذلك لإزالته نهائياً من قاعدة البيانات مع كافة المرفقات المرتبطة به."
      />
    </div>
  );
};
