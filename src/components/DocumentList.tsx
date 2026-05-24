import React, { useState, useMemo } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { formatDate, statusTranslations, typeTranslations, cn, formatFileSize, formatDateTime } from '../lib/utils';
import { 
  Eye, Trash2, Search, Filter, Calendar, ChevronDown, ChevronUp, FilterX, Clock, 
  Activity, CheckCircle, History, Plus, FileText, Download, Check, ArrowLeft, 
  X, Briefcase, Paperclip, ChevronRight, CheckCircle2, AlertCircle, Sparkles, Send, Scan, EyeOff, File, Image, FileArchive, Upload, ExternalLink, ClipboardList
} from 'lucide-react';
import { DocumentType, DocumentStatus, OfficialDocument, DocumentAttachment } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';

const statusStyles: Record<DocumentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-200 shadow-sm shadow-amber-105/50 dark:bg-amber-950/20 dark:text-amber-500 dark:border-amber-900/50",
  IN_PROGRESS: "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm shadow-indigo-105/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50",
  COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm shadow-emerald-105/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
  ARCHIVED: "bg-slate-50 text-slate-500 border-slate-200 shadow-sm shadow-slate-105/50 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50",
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
  const { 
    documents, 
    loading, 
    deleteDocument, 
    userRole, 
    userName, 
    updateDocumentStatus, 
    uploadFile,
    uploadFileToDrive, 
    isGoogleDriveConnected 
  } = useDocuments();
  
  // Basic states
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter settings
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | DocumentStatus | 'OVERDUE'>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Selected document for Split-Screen Processor / Workspace View
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  // Interactive inline update values
  const [quickMemo, setQuickMemo] = useState('');
  const [quickAction, setQuickAction] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [quickFiles, setQuickFiles] = useState<File[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<DocumentAttachment | null>(null);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-500 animate-pulse" />;
      case 'doc':
      case 'docx': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'xls':
      case 'xlsx': return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return <Image className="w-4 h-4 text-purple-500" />;
      case 'zip':
      case 'rar': return <FileArchive className="w-4 h-4 text-amber-500" />;
      default: return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  const isPreviewable = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(ext || '');
  };

  const handleUploadQuickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setQuickFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeQuickFile = (index: number) => {
    setQuickFiles(prev => prev.filter((_, i) => i !== index));
  };

  const selectedDocument = useMemo(() => {
    return documents.find(d => d.id === activeDocId) || null;
  }, [documents, activeDocId]);

  // Determine if a doc is overdue
  const isDocOverdue = (doc: OfficialDocument) => {
    if (!doc.dueDate || doc.status === 'COMPLETED') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(doc.dueDate);
    return dueDate < today;
  };

  // KPI metrics stats counts for filtered type
  const counts = useMemo(() => {
    const baseDocs = documents.filter(d => !filterType || d.type === filterType);
    const total = baseDocs.length;
    const pending = baseDocs.filter(d => d.status === 'PENDING').length;
    const inProgress = baseDocs.filter(d => d.status === 'IN_PROGRESS').length;
    const completed = baseDocs.filter(d => d.status === 'COMPLETED').length;
    const overdue = baseDocs.filter(isDocOverdue).length;
    return { total, pending, inProgress, completed, overdue };
  }, [documents, filterType]);

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteDocument(deletingId);
      if (activeDocId === deletingId) {
        setActiveDocId(null);
      }
      setDeletingId(null);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const allDepartments = Array.from(new Set(documents.map(d => d.department))).sort();

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedDepartment('');
    setSelectedStatusTab('ALL');
    setSelectedType('ALL');
  };

  const filteredDocs = useMemo(() => {
    return documents
      .filter(d => !filterType || d.type === filterType)
      .filter(d => {
        // General search term match
        const searchLower = searchTerm.trim().toLowerCase();
        const matchesSearch = searchLower === '' || 
          d.referenceNumber.toLowerCase().includes(searchLower) ||
          d.subject.toLowerCase().includes(searchLower) ||
          d.department.toLowerCase().includes(searchLower) ||
          (d.internalDepartment && d.internalDepartment.toLowerCase().includes(searchLower)) ||
          (d.assignedTo && d.assignedTo.toLowerCase().includes(searchLower));
        
        // Date range match
        const docDate = new Date(d.date);
        const matchesStartDate = !startDate || docDate >= new Date(startDate);
        const matchesEndDate = !endDate || docDate <= new Date(endDate + 'T23:59:59');
        
        // Department match
        const matchesDepartment = !selectedDepartment || d.department === selectedDepartment;

        // Status tab filter
        let matchesStatusTab = true;
        if (selectedStatusTab === 'OVERDUE') {
          matchesStatusTab = isDocOverdue(d);
        } else if (selectedStatusTab !== 'ALL') {
          matchesStatusTab = d.status === selectedStatusTab;
        }

        // Type filter (if not already filtered by prop)
        const matchesType = filterType ? true : (selectedType === 'ALL' || d.type === selectedType);
        
        return matchesSearch && matchesStartDate && matchesEndDate && matchesDepartment && matchesStatusTab && matchesType;
      });
  }, [documents, filterType, searchTerm, startDate, endDate, selectedDepartment, selectedStatusTab, selectedType]);

  const hasActiveFilters = searchTerm !== '' || startDate !== '' || endDate !== '' || selectedDepartment !== '' || selectedStatusTab !== 'ALL' || selectedType !== 'ALL';

  // Instant workflow action handler
  const handleInlineStatusUpdate = async (status: DocumentStatus) => {
    if (!selectedDocument) return;
    setIsUpdatingStatus(true);
    try {
      const actionTitle = quickAction.trim() || `تحديث حالة المعاملة إلى: ${statusTranslations[status]}`;
      const memoText = quickMemo.trim() || 'تم تعديل السجل المباشر من منصة الأداء السريع.';

      // Process quick uploaded files
      const uploadedAttachments: DocumentAttachment[] = [];
      for (const file of quickFiles) {
        let uploaded: DocumentAttachment | null = null;
        if (isGoogleDriveConnected) {
          uploaded = await uploadFileToDrive(file);
        } else {
          uploaded = await uploadFile(file);
        }
        if (uploaded) {
          uploadedAttachments.push(uploaded);
        }
      }

      await updateDocumentStatus(
        selectedDocument.id,
        status,
        actionTitle,
        memoText,
        userName || 'مدير الحساب',
        uploadedAttachments
      );
      
      // Clear workspace status fields on success
      setQuickAction('');
      setQuickMemo('');
      setQuickFiles([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-indigo-400 animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1.5 animate-pulse">
          <p className="text-slate-700 dark:text-slate-300 font-black text-sm">جاري تنصيب وجلب البيانات التشغيلية...</p>
          <p className="text-slate-400 text-xs">يرجى الانتظار قليلاً</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 🚀 Segmented Multi-Metric Quick Workflows Tabs (KPI Header) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { id: 'ALL', label: 'الكتب الإجمالية', count: counts.total, icon: ClipboardList, colorClass: 'border-slate-200 text-slate-700 bg-white/70 hover:bg-white dark:bg-slate-900/60 dark:text-white dark:border-white/5', activeColorClass: 'bg-indigo-650/10 border-indigo-500 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/50 shadow-md shadow-indigo-100/30' },
          { id: 'PENDING', label: 'بانتظار الإجراء', count: counts.pending, icon: Clock, colorClass: 'border-amber-200 text-amber-500 bg-white/70 hover:bg-white dark:bg-slate-900/60 dark:border-amber-900/30 dark:border-white/5', activeColorClass: 'bg-amber-50 dark:bg-amber-950/25 border-amber-400 text-amber-600 dark:text-amber-400 shadow-md shadow-amber-100/30' },
          { id: 'IN_PROGRESS', label: 'قيد المعالجة', count: counts.inProgress, icon: Activity, colorClass: 'border-indigo-200 text-indigo-500 bg-white/70 hover:bg-white dark:bg-slate-900/60 dark:border-indigo-900/30 dark:border-white/5', activeColorClass: 'bg-indigo-50 dark:bg-indigo-950/25 border-indigo-400 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-100/30' },
          { id: 'COMPLETED', label: 'المنجزة بالكامل', count: counts.completed, icon: CheckCircle2, colorClass: 'border-emerald-200 text-emerald-500 bg-white/70 hover:bg-white dark:bg-slate-900/60 dark:border-emerald-900/30 dark:border-white/5', activeColorClass: 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-400 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-100/30' },
          { id: 'OVERDUE', label: 'المتأخرة زمانياً', count: counts.overdue, icon: AlertCircle, colorClass: 'border-red-200 text-red-500 bg-white/70 hover:bg-white dark:bg-slate-900/60 dark:border-red-905/30 dark:border-white/5 col-span-2 md:col-span-1', activeColorClass: 'bg-red-50 dark:bg-red-950/25 border-red-400 text-red-650 dark:text-red-450 shadow-md shadow-red-100/30' }
        ].map((tab) => {
          const IconComponent = tab.icon;
          const isActive = selectedStatusTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStatusTab(tab.id as any)}
              className={cn(
                "flex items-center justify-between p-4 rounded-3xl border text-right transition-all duration-300 group cursor-pointer active:scale-95",
                isActive ? tab.activeColorClass : tab.colorClass
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-2xl transition-all duration-300",
                  isActive ? "bg-white/90 dark:bg-slate-800 shadow-sm" : "bg-slate-50 dark:bg-slate-800/40 group-hover:scale-110"
                )}>
                  <IconComponent className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-505 block">{tab.label}</p>
                  <p className="text-xl font-black mt-0.5">{tab.count}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 🛠️ Dynamic Dual Column Workspace Engine */}
      <div className="flex flex-col lg:flex-row gap-6 items-start h-full">
        
        {/* LEFT COLUMN: Data grid representing the active stack (dense workspace) */}
        <div className={cn(
          "w-full transition-all duration-500",
          selectedDocument ? "lg:w-[60%]" : "lg:w-[100%]"
        )}>
          
          <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] border border-slate-150/80 dark:border-white/5 bg-white/70 dark:bg-slate-900/50 shadow-2xl overflow-hidden">
            
            {/* Table Controller bar & quick headers */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-6 bg-indigo-650 dark:bg-indigo-500 rounded-full" />
                  <h2 className="text-lg font-black text-slate-950 dark:text-white tracking-tight">
                    {filterType === 'INCOMING' ? 'المراسلات والكتب الواردة' : filterType === 'OUTGOING' ? 'الكتب الصادرة والمذكرات' : 'سجل الكتب والمعاملات العام'}
                  </h2>
                  <span className="text-xs font-black px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
                    {filteredDocs.length} سجل متاح
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="ابحث بالرقم، الموضوع، الجهة..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pr-9 pl-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 outline-none transition-all font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  
                  <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={cn(
                      "p-2.5 rounded-2xl border text-xs font-black flex items-center gap-1.5 transition-all",
                      showAdvanced 
                        ? "bg-indigo-600 border-indigo-650 text-white shadow-md" 
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    )}
                  >
                    <Filter className="w-4 h-4" />
                    <span>تصفية</span>
                    {showAdvanced ? <ChevronUp className="w-3" /> : <ChevronDown className="w-3" />}
                  </button>

                  {onAdd && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
                    <button 
                      onClick={onAdd}
                      className="p-2.5 sm:px-4 bg-indigo-650 text-white rounded-2xl font-black text-xs flex items-center gap-1.5 hover:bg-indigo-705 transition-all shadow-md shrink-0 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden md:inline">إضافة كتاب</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 🔍 Refined Filters Expandable Dashboard */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50/50 dark:bg-slate-800/25 border border-slate-100 dark:border-white/5 rounded-3xl mt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 block mr-1">تاريخ البداية من</label>
                        <input 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 block mr-1">تاريخ النهاية إلى</label>
                        <input 
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 block mr-1">الجهة / الشريك</label>
                        <select 
                          value={selectedDepartment}
                          onChange={(e) => setSelectedDepartment(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                        >
                          <option value="">كل الجهات</option>
                          {allDepartments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>

                      {!filterType && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 block mr-1">حركة الصادر والوارد</label>
                          <select 
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value as any)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                          >
                            <option value="ALL">الكل</option>
                            <option value="INCOMING">وارد فقط</option>
                            <option value="OUTGOING">صادر فقط</option>
                          </select>
                        </div>
                      )}

                      <div className={cn("flex items-end justify-end", filterType ? "lg:col-span-1" : "lg:col-span-4")}>
                        <button 
                          onClick={clearFilters}
                          disabled={!hasActiveFilters}
                          className={cn(
                            "w-full py-2 flex items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-all border",
                            hasActiveFilters 
                              ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100" 
                              : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:border-transparent"
                          )}
                        >
                          <FilterX className="w-3.5 h-3.5" />
                          <span>إعادة تعيين وبدء تصفية نظيفة</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 📱 Mobile List Feed (Tighter & Highly Operational with Quick selection) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDocs.length > 0 ? filteredDocs.map((doc) => {
                const isOverdue = isDocOverdue(doc);
                const isSelected = activeDocId === doc.id;
                return (
                  <div 
                    key={doc.id} 
                    onClick={() => {
                      setActiveDocId(doc.id);
                    }} 
                    className={cn(
                      "p-5 cursor-pointer transition-all relative",
                      isSelected ? "bg-indigo-50/70 border-r-4 border-indigo-650" : "active:bg-slate-50 hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400">{doc.referenceNumber}</span>
                        <span className="text-xs font-black text-indigo-650 mt-0.5">{typeTranslations[doc.type]}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isOverdue && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-650 text-[9px] font-black rounded-lg">متأخر</span>
                        )}
                        <span className={cn(
                          "px-2 px-1 py-0.5 rounded-lg text-[9px] font-black border",
                          statusStyles[doc.status]
                        )}>
                          {statusTranslations[doc.status]}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white leading-relaxed line-clamp-2">{doc.subject}</p>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        {doc.department}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 font-mono">{formatDate(doc.date)}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-bold text-sm">لا توجد كتب ومعاملات مطابقة</div>
              )}
            </div>

            {/* 💻 Desktop Dense Data Grid Table (Premium Operational Visuals) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-separate border-spacing-y-1.5 px-4 pb-4">
                <thead>
                  <tr className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                    <th className="px-4 py-3">الكتاب والمعاملة</th>
                    <th className="px-4 py-3">الجهة / المصدر</th>
                    <th className="px-4 py-3">التاريخ والنوع</th>
                    <th className="px-4 py-3">الملفات والمتابعة</th>
                    <th className="px-4 py-3">الحالة التشغيلية</th>
                    <th className="px-4 py-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.length > 0 ? filteredDocs.map((doc) => {
                    const isSelected = activeDocId === doc.id;
                    const isOverdue = isDocOverdue(doc);
                    return (
                      <tr 
                        key={doc.id} 
                        onClick={() => setActiveDocId(isSelected ? null : doc.id)}
                        className={cn(
                          "group cursor-pointer transition-all duration-300",
                          isSelected 
                            ? "bg-indigo-50/85 dark:bg-indigo-950/30 scale-[0.99] ring-2 ring-indigo-500/10 dark:ring-indigo-500/20" 
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        )}
                      >
                        {/* Column 1: Subject + Reference */}
                        <td className="px-4 py-3 bg-white/40 dark:bg-slate-900/10 rounded-r-2xl border-y border-r border-slate-150/40 dark:border-white/5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-950 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors max-w-[280px] truncate" title={doc.subject}>
                              {doc.subject}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{doc.referenceNumber}</span>
                              {isOverdue && (
                                <span className="bg-red-50 dark:bg-red-950/40 text-red-500 text-[8.5px] font-black px-1.5 py-0.5 rounded-lg border border-red-200/50">تجاوز الموعد</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Department */}
                        <td className="px-4 py-3 bg-white/40 dark:bg-slate-900/10 border-y border-slate-150/40 dark:border-white/5">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-350">{doc.department}</span>
                            {doc.internalDepartment && (
                              <span className="text-[10px] font-bold text-slate-400 mt-0.5">{doc.internalDepartment}</span>
                            )}
                          </div>
                        </td>

                        {/* Column 3: Date & Type */}
                        <td className="px-4 py-3 bg-white/40 dark:bg-slate-900/10 border-y border-slate-150/40 dark:border-white/5 text-xs text-slate-650">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold">{formatDate(doc.date)}</span>
                            <span className={cn(
                              "text-[9px] font-black mt-0.5",
                              doc.type === 'INCOMING' ? "text-indigo-650 dark:text-indigo-400" : "text-orange-600 dark:text-orange-400"
                            )}>
                              {typeTranslations[doc.type]}
                            </span>
                          </div>
                        </td>

                        {/* Column 4: Files / Attachments count & Assigned Person */}
                        <td className="px-4 py-3 bg-white/40 dark:bg-slate-900/10 border-y border-slate-150/40 dark:border-white/5 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-600 dark:text-slate-400">{doc.assignedTo || 'غير مكلف'}</span>
                            {doc.attachments && doc.attachments.length > 0 ? (
                              <div className="flex items-center gap-1 text-slate-450">
                                <Paperclip className="w-3 h-3 text-indigo-500" />
                                <span className="text-[9px] font-bold font-mono">{doc.attachments.length} مرفقات</span>
                              </div>
                            ) : (
                              <span className="text-[8.5px] font-bold text-slate-350">لا يوجد ملفات</span>
                            )}
                          </div>
                        </td>

                        {/* Column 5: Status Tag */}
                        <td className="px-4 py-3 bg-white/40 dark:bg-slate-900/10 border-y border-slate-150/40 dark:border-white/5">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all duration-300",
                            statusStyles[doc.status]
                          )}>
                            {(() => {
                              const StatusIcon = statusIcons[doc.status] || Clock;
                              return <StatusIcon className="w-3 h-3 shrink-0" />;
                            })()}
                            <span>{statusTranslations[doc.status]}</span>
                          </span>
                        </td>

                        {/* Column 6: Action Buttons */}
                        <td className="px-4 py-3 bg-white/40 dark:bg-slate-900/10 rounded-l-2xl border-y border-l border-slate-155/40 dark:border-white/5">
                          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => onView(doc.id)}
                              className="p-1.5 text-indigo-650 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-indigo-100"
                              title="عرض التفاصيل المتكاملة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                              <button 
                                onClick={() => setDeletingId(doc.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100/50"
                                title="حذف بالكامل"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-slate-400 dark:text-slate-500 font-bold text-sm bg-slate-50/10 rounded-2xl">
                        لا توجد هناك معاملات أو كتب حالية تطابق فلاتر البحث والفرز.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Quick workbench detail editor/viewer (Active Split pane) */}
        <AnimatePresence>
          {selectedDocument && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full lg:w-[40%] sticky top-6 z-10 shrink-0"
            >
              <div className="glass-panel overflow-hidden border border-slate-200/90 dark:border-white/5 bg-white/95 dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 space-y-5">
                
                {/* Header widget */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 animate-spin-slow" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-950 dark:text-white text-sm">معالج الإجراءات السريع</h3>
                      <p className="text-[10px] text-slate-400">تحديث فوري دون الحاجة لمغادرة السجل</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setActiveDocId(null)}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-805 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all active:scale-95"
                    title="إغلاق اللوحة الجانبية"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Correspondence Summary tag info */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-805 border border-slate-100 dark:border-transparent space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                      رقم: {selectedDocument.referenceNumber}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{formatDate(selectedDocument.date)}</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white leading-relaxed line-clamp-2">
                    {selectedDocument.subject}
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                    <span className="flex items-center gap-1">الجهة: <span className="text-slate-800 dark:text-slate-350">{selectedDocument.department}</span></span>
                    {selectedDocument.assignedTo && (
                      <span className="flex items-center gap-1">المكلف: <span className="text-slate-800 dark:text-slate-350">{selectedDocument.assignedTo}</span></span>
                    )}
                  </div>
                </div>

                {/* ⚡ Action Center - Dynamic State Buttons (Highly operational / One click save) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mr-1">الحالة التشغيلية الحالية</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { status: 'PENDING', label: 'بانتظار الإجراء', style: 'border-amber-200 text-amber-500 bg-amber-50/40 hover:bg-amber-100 dark:bg-amber-950/15 dark:border-amber-900/50', activeStyle: 'bg-amber-500 border-amber-600 hover:bg-amber-600 text-white' },
                      { status: 'IN_PROGRESS', label: 'بدء السير', style: 'border-indigo-200 text-indigo-650 bg-indigo-50/45 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-400', activeStyle: 'bg-indigo-650 border-indigo-700 hover:bg-indigo-705 text-white' },
                      { status: 'COMPLETED', label: 'إنجاز منتهي', style: 'border-emerald-200 text-emerald-600 bg-emerald-50/40 hover:bg-emerald-110 dark:bg-emerald-950/15 dark:border-emerald-900/50 dark:text-emerald-400', activeStyle: 'bg-emerald-600 border-emerald-700 hover:bg-emerald-700 text-white' }
                    ].map((btn) => {
                      const isActive = selectedDocument.status === btn.status;
                      const activeIcon = btn.status === 'COMPLETED' ? <Check className="w-3.5 h-3.5" /> : null;
                      return (
                        <button
                          key={btn.status}
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleInlineStatusUpdate(btn.status as DocumentStatus)}
                          className={cn(
                            "py-2.5 px-1.5 border rounded-2xl text-[10.5px] font-black tracking-tight text-center flex items-center justify-center gap-1 transition-all active:scale-95 duration-200 disabled:opacity-50 cursor-pointer",
                            isActive ? btn.activeStyle : btn.style
                          )}
                        >
                          {activeIcon}
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 📝 Event Maker Widget (Write quick actions logs instantly) */}
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 block mr-1">عنوان الإجراء / Memo Action</label>
                    <input 
                      type="text"
                      placeholder="مثال: تم إرسال المعاملة إلى التدقيق المالي..."
                      value={quickAction}
                      onChange={(e) => setQuickAction(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-805 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-350 dark:placeholder:text-slate-550 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 block mr-1">شرح تفصيلي أو ملاحظات موازية</label>
                    <textarea 
                      placeholder="اكتب ملاحظة أو توجيه مالي/إداري للمتابعة مع المعاملة..."
                      rows={2}
                      value={quickMemo}
                      onChange={(e) => setQuickMemo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-855 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-350 dark:placeholder:text-slate-555 outline-none resize-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  {/* Attachment inputs inside Split Workspace Panel */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                      <span>إرفاق ملفات إثبات / سكنر</span>
                      {quickFiles.length > 0 && <span className="font-mono text-indigo-650 font-black">{quickFiles.length} ملفات جاهزة</span>}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {quickFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[10px] font-bold text-slate-700">
                          <span className="truncate max-w-[110px]">{f.name}</span>
                          <button type="button" onClick={() => removeQuickFile(i)} className="text-slate-400 hover:text-rose-500 font-bold">✕</button>
                        </div>
                      ))}

                      <label className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer text-[10px] font-black transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>اختيار ملف</span>
                        <input type="file" multiple onChange={handleUploadQuickFile} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Insert action trace log button */}
                  {(quickAction.trim() || quickMemo.trim() || quickFiles.length > 0) && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleInlineStatusUpdate(selectedDocument.status)}
                      className="w-full bg-slate-950 dark:bg-indigo-600 text-white font-black text-xs py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-indigo-650 active:scale-95"
                    >
                      {isUpdatingStatus ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>تثبيت هذا الإجراء وحفظ الملحق</span>
                    </button>
                  )}
                </div>

                {/* 📂 Shared Attachments Segment */}
                {selectedDocument.attachments && selectedDocument.attachments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-black text-slate-400 block mr-1">المرفقات الرقمية الحالية ({selectedDocument.attachments.length})</p>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-855 rounded-2xl border border-slate-100">
                      {selectedDocument.attachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {getFileIcon(att.name)}
                            <div className="truncate text-right">
                              <p className="text-[10.5px] font-black text-slate-800 dark:text-slate-200 truncate">{att.name}</p>
                              <p className="text-[8.5px] font-mono text-slate-400 font-semibold">{formatFileSize(att.size)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isPreviewable(att.name) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewAttachment(att);
                                  setIsPreviewModalOpen(true);
                                }}
                                className="p-1 px-2.5 rounded-lg text-indigo-650 hover:bg-indigo-50 text-[10px] font-black bg-white shadow-sm border"
                              >
                                معاينة
                              </button>
                            )}
                            <a
                              href={att.url}
                              download={att.name}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 📊 Prior History Events Feed (Accordion compact view) */}
                <div className="space-y-2 pt-1 bg-slate-50/50 dark:bg-slate-850/20 p-4 rounded-3xl border border-dashed">
                  <p className="text-[10px] font-black text-slate-400 block mr-1 uppercase tracking-widest">موجز الخط الزمني للمعاملة ({selectedDocument.history?.length || 0})</p>
                  <div className="max-h-36 overflow-y-auto space-y-3 pr-1 pl-1">
                    {selectedDocument.history && selectedDocument.history.slice().reverse().map((step, idx) => (
                      <div key={step.id || idx} className="relative pr-4 border-r-2 border-slate-205 dark:border-slate-800 pb-2 last:pb-0">
                        <div className="absolute -right-[4.5px] top-[4px] w-2 h-2 rounded-full bg-slate-350 dark:bg-slate-600" />
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-black text-slate-850 dark:text-slate-100">{step.action}</p>
                          <span className="text-[8.5px] font-mono font-bold text-slate-400">{formatDateTime(step.date).split(' ')[0]}</span>
                        </div>
                        {step.notes && (
                          <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic mt-0.5">"{step.notes}"</p>
                        )}
                        <p className="text-[8px] font-bold text-indigo-500 mt-1">الموظف: {step.user}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main Action buttons for full experience */}
                <div className="flex gap-2 pt-2 border-t">
                  <button 
                    type="button"
                    onClick={() => onView(selectedDocument.id)}
                    className="flex-1 bg-indigo-650 hover:bg-slate-900 text-white font-black text-xs py-3 rounded-2xl text-center shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    فتح المعاملة بالكامل
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveDocId(null)}
                    className="px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-bold text-xs py-3 rounded-2xl transition-colors shrink-0 cursor-pointer"
                  >
                    إلغاء المعاينة
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <DeleteConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="حذف الكتاب نهائياً من قاعدة البيانات"
        message="هل أنت متأكد من رغبتك في حذف هذا الكتاب؟ سيؤدي ذلك لإزالته تماماً مع كافة المرفقات والمستندات الرقمية المرتبطة به ولا يمكن التراجع عن هذا الإجراء."
      />

      {/* Attachment Preview Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && previewAttachment && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsPreviewModalOpen(false);
                setPreviewAttachment(null);
              }}
              className="absolute inset-0 bg-slate-900/95 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-5xl h-full max-h-[85vh] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col z-[120]"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    {getFileIcon(previewAttachment.name)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white leading-none text-xs">{previewAttachment.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">{formatFileSize(previewAttachment.size)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                   <a 
                     href={previewAttachment.url}
                     download={previewAttachment.name}
                     target="_blank"
                     rel="noreferrer"
                     className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black transition-all"
                   >
                     <Download className="w-3.5 h-3.5" />
                     تحميل المرفق
                   </a>
                   <button 
                     type="button"
                     onClick={() => {
                       setIsPreviewModalOpen(false);
                       setPreviewAttachment(null);
                     }}
                     className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all"
                   >
                     <X className="w-4 h-4" />
                   </button>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 md:p-6 overflow-auto flex items-center justify-center relative">
                {previewAttachment.url.includes('drive.google.com') && (
                  <div className="absolute top-4 right-4 z-35 flex flex-col items-end gap-1.5">
                    <a 
                      href={previewAttachment.url.replace('/preview', '/view')} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 border rounded-xl text-[9px] font-black hover:bg-white transition-all shadow-md"
                    >
                      <ExternalLink className="w-3" />
                      فتح في نافذة مستقلة
                    </a>
                  </div>
                )}

                {previewAttachment.name.toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={previewAttachment.url} 
                    className="w-full h-full rounded-2xl border-none shadow-inner bg-white min-h-[420px]"
                    title="PDF Viewer"
                  />
                ) : (
                  <img 
                    src={previewAttachment.url} 
                    alt={previewAttachment.name} 
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
