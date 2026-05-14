import React, { useState } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { formatDate, formatDateTime, statusTranslations, typeTranslations, cn, formatFileSize } from '../lib/utils';
import { DocumentStatus, DocumentAttachment } from '../types';
import { ArrowRight, UserCircle, MapPin, Calendar, GitCommit, Check, Plus, CheckCircle2, File, FileText, Image, FileArchive, Upload, Paperclip, X as XIcon, Eye, Camera, Scan, AlertCircle, ExternalLink, Clock, Activity, History } from 'lucide-react';

const statusStyles: Record<DocumentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-200 shadow-sm shadow-amber-100/50 dark:bg-amber-950/20 dark:text-amber-500 dark:border-amber-900/50",
  IN_PROGRESS: "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm shadow-indigo-100/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50",
  COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm shadow-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
  ARCHIVED: "bg-slate-50 text-slate-500 border-slate-200 shadow-sm shadow-slate-100/50 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50",
};

const statusIcons: Record<DocumentStatus, React.ElementType> = {
  PENDING: Clock,
  IN_PROGRESS: Activity,
  COMPLETED: CheckCircle2,
  ARCHIVED: History,
};
import { motion, AnimatePresence } from 'framer-motion';
import { ScannerModal } from './ScannerModal';

export const DocumentDetails: React.FC<{ documentId: string, onBack: () => void }> = ({ documentId, onBack }) => {
  const { documents, updateDocument, updateDocumentStatus, uploadFile, uploadFileToDrive, isGoogleDriveConnected, userRole, userName } = useDocuments();
  const document = documents.find(d => d.id === documentId);
  
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateData, setUpdateData] = useState<{
    status: DocumentStatus;
    action: string;
    notes: string;
    user: string;
  }>({
    status: document?.status || 'IN_PROGRESS',
    action: '',
    notes: '',
    user: userName || 'المستخدم الحالي',
  });

  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    subject: document?.subject || '',
    department: document?.department || '',
    internalDepartment: document?.internalDepartment || '',
    assignedTo: document?.assignedTo || '',
  });

  React.useEffect(() => {
    if (document) {
      setEditFormData({
        subject: document.subject || '',
        department: document.department || '',
        internalDepartment: document.internalDepartment || '',
        assignedTo: document.assignedTo || '',
      });
    }
  }, [document]);

  const [tempFiles, setTempFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<DocumentAttachment | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  React.useEffect(() => {
    if (userName) {
      setUpdateData(prev => ({ ...prev, user: userName }));
    }
  }, [userName]);

  if (!document) {
    return <div className="text-center py-10 text-slate-500">لم يتم العثور على الكتاب</div>;
  }

  const isPreviewable = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(ext || '');
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setTempFiles(prev => [...prev, ...files]);
    }
  };

  const removeTempFile = (index: number) => {
    setTempFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleScannerCapture = (file: File) => {
    setTempFiles(prev => [...prev, file]);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;
    setIsSavingEdit(true);
    try {
      await updateDocument(document.id, editFormData);
      setIsEditingDocument(false);
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    
    try {
      const uploadedAttachments: DocumentAttachment[] = [];
      for (const file of tempFiles) {
        let uploaded: DocumentAttachment | null = null;
        try {
          if (isGoogleDriveConnected) {
            uploaded = await uploadFileToDrive(file);
          } else {
            uploaded = await uploadFile(file);
          }
        } catch (uploadError) {
          console.error('File upload failed in update:', uploadError);
        }

        if (uploaded) {
          uploadedAttachments.push(uploaded);
        }
      }

      await updateDocumentStatus(
        document.id, 
        updateData.status as DocumentStatus, 
        updateData.action, 
        updateData.notes, 
        updateData.user,
        uploadedAttachments
      );
      
      setShowUpdateForm(false);
      setUpdateData(prev => ({ ...prev, action: '', notes: '' }));
      setTempFiles([]);
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="group flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-black text-sm uppercase tracking-widest"
        >
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:translate-x-1 transition-transform">
            <ArrowRight className="w-5 h-5" />
          </div>
          العودة للسجل
        </button>
        
        <div className="flex items-center gap-2">
           <span className={cn(
             "inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black border uppercase tracking-[0.2em] transition-all",
             statusStyles[document.status]
           )}>
             {(() => {
                const Icon = statusIcons[document.status];
                return <Icon className="w-3.5 h-3.5" />;
             })()}
             {statusTranslations[document.status]}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Document Info Card */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass-panel p-8 rounded-[2.5rem] border-none ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">بطاقة المعاملة</h3>
              {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                <button
                  onClick={() => setIsEditingDocument(!isEditingDocument)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {isEditingDocument ? 'إلغاء' : 'تعديل'}
                </button>
              )}
            </div>
            
            <div className="space-y-6">
              {isEditingDocument ? (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">الموضوع الرئيسي</label>
                    <input
                      type="text"
                      required
                      value={editFormData.subject}
                      onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">مصدر / وجهة الكتاب</label>
                    <input
                      type="text"
                      required
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">القسم الداخلي المعني</label>
                    <input
                      type="text"
                      value={editFormData.internalDepartment}
                      onChange={(e) => setEditFormData({ ...editFormData, internalDepartment: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">المكلف بالمتابعة</label>
                    <input
                      type="text"
                      required
                      value={editFormData.assignedTo}
                      onChange={(e) => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    {isSavingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                </form>
              ) : (
                <>
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-none">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">الموضوع الرئيسي</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white leading-relaxed">{document.subject}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">رقم الكتاب</p>
                      <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">{document.referenceNumber}</p>
                    </div>
                    <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">نوع الحركة</p>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider",
                        document.type === 'INCOMING' ? "text-indigo-600 dark:text-indigo-400" : "text-orange-600 dark:text-orange-400"
                      )}>
                        {typeTranslations[document.type]}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 group transition-all hover:bg-white dark:hover:bg-slate-800 hover:ring-1 hover:ring-slate-100 dark:hover:ring-slate-700">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">مصدر / وجهة الكتاب</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white transition-colors">{document.department}</p>
                      </div>
                    </div>

                    {document.internalDepartment && (
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 group transition-all hover:bg-white dark:hover:bg-slate-800 hover:ring-1 hover:ring-slate-100 dark:hover:ring-slate-700">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          <div className="w-5 h-5 flex items-center justify-center font-black text-[10px]">D</div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">القسم الداخلي المعني</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white transition-colors">{document.internalDepartment}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 group transition-all hover:bg-white dark:hover:bg-slate-800 hover:ring-1 hover:ring-slate-100 dark:hover:ring-slate-700">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          <UserCircle className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">المكلف بالمتابعة</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white transition-colors">{document.assignedTo}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 group transition-all hover:bg-white dark:hover:bg-slate-800 hover:ring-1 hover:ring-slate-100 dark:hover:ring-slate-700">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">تاريخ التسجيل</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white transition-colors">{formatDate(document.date)}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {document.attachments && document.attachments.length > 0 && (
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 transition-colors">المرفقات الرقمية</p>
                  <div className="grid grid-cols-1 gap-3">
                    {document.attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-md dark:hover:shadow-none transition-all group">
                        <div className="flex items-center gap-3 min-w-0">
                           <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm transition-colors">
                              {getFileIcon(att.name)}
                           </div>
                           <div className="truncate">
                              <p className="text-[10px] font-black text-slate-900 dark:text-white transition-colors truncate">{att.name}</p>
                              <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 transition-colors">{formatFileSize(att.size)}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isPreviewable(att.name) && (
                            <button 
                              onClick={() => setPreviewFile(att)}
                              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                              title="معاينة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <a 
                            href={att.url} 
                            download={att.name}
                            target="_blank"
                            rel="noreferrer"
                            className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                            title="تحميل"
                          >
                            <Upload className="w-3.5 h-3.5 rotate-180" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline & Progress Card */}
        <div className="lg:col-span-8 space-y-8">
          <div className="glass-panel p-8 rounded-[2.5rem] border-none ring-1 ring-slate-100 dark:ring-slate-800 bg-white/60 dark:bg-slate-900/60 transition-colors relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 mb-12 relative z-10 transition-colors">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">سجل مراحل الإنجاز</h3>
              {!showUpdateForm && document.status !== 'COMPLETED' && (userRole === 'ADMIN' || userRole === 'MANAGER') && (
                <button 
                  onClick={() => setShowUpdateForm(true)}
                  className="px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white font-black text-xs rounded-2xl hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  تحديث الحالة الحالية
                </button>
              )}
            </div>

            {showUpdateForm && (
              <form onSubmit={handleUpdate} className="mb-12 p-8 rounded-[2rem] bg-indigo-50/30 dark:bg-indigo-900/20 border border-indigo-100/50 dark:border-indigo-900/50 shadow-inner relative z-10 transition-colors">
                <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-200 mb-6 flex items-center gap-2">
                   <GitCommit className="w-4 h-4" />
                   تسجيل إجراء جديد على المعاملة
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block pr-1 transition-colors">عنوان الإجراء المتخذ</label>
                    <input 
                      required
                      type="text" 
                      value={updateData.action}
                      onChange={(e) => setUpdateData({...updateData, action: e.target.value})}
                      className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white"
                      placeholder="مثال: تم تدقيق الكتاب وإرساله..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block pr-1 transition-colors">تعديل الحالة التشغيلية</label>
                    <div className="relative">
                      <select 
                        value={updateData.status}
                        onChange={(e) => setUpdateData({...updateData, status: e.target.value as DocumentStatus})}
                        className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white cursor-pointer appearance-none"
                      >
                        <option value="PENDING">قيد الانتظار</option>
                        <option value="IN_PROGRESS">قيد المتابعة والعمل</option>
                        <option value="COMPLETED">تم الإنجاز بالكامل</option>
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block pr-1 transition-colors">شرح تفصيلي للإجراء (اختياري)</label>
                    <textarea 
                      value={updateData.notes}
                      onChange={(e) => setUpdateData({...updateData, notes: e.target.value})}
                      rows={2}
                      className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white resize-none"
                    ></textarea>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block pr-1 transition-colors">إرفاق ملفات إضافية</label>
                    
                    <div className="flex flex-wrap gap-3">
                      {tempFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm group transition-colors">
                          {getFileIcon(file.name)}
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[150px] truncate">{file.name}</span>
                          <button 
                            type="button"
                            onClick={() => removeTempFile(idx)}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                          >
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      
                      <label className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all group">
                        <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black text-indigo-700 dark:text-indigo-400">رفع ملف</span>
                        <input 
                          type="file" 
                          multiple 
                          onChange={handleFileChange} 
                          className="hidden" 
                        />
                      </label>

                      <button 
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer hover:bg-indigo-100 transition-all group"
                      >
                        <Scan className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black text-indigo-700">سكنر (Scanner)</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowUpdateForm(false)}
                    className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-black rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold"
                  >
                    إلغاء
                  </button>
                  <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="px-8 py-3 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 dark:hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUpdating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {isUpdating ? 'جاري التحديث...' : 'حفظ وتحديث السجل'}
                  </button>
                </div>
              </form>
            )}

            <div className="relative space-y-0 pb-10">
              {/* Vertical Timeline Line */}
              <div className="absolute top-0 right-[21px] bottom-0 w-0.5 bg-gradient-to-b from-indigo-100 dark:from-indigo-900 via-slate-100 dark:via-slate-800 to-transparent z-0" />

              {(document.history || []).slice().reverse().map((entry, index) => (
                <div key={entry.id} className="relative flex items-start gap-8 group mb-10 last:mb-0">
                  {/* Timeline Marker */}
                  <div className={cn(
                    "w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 shadow-xl ring-4 flex items-center justify-center z-10 flex-shrink-0 transition-all duration-500",
                    index === 0 
                      ? "ring-indigo-50 dark:ring-indigo-900/50 text-indigo-600 dark:text-indigo-400 scale-110 shadow-indigo-100 dark:shadow-none" 
                      : "ring-slate-50 dark:ring-slate-800 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400"
                  )}>
                    {index === 0 ? (
                      <div className="relative">
                        <Check className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                      </div>
                    ) : (
                      <Check className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                  
                  {/* Content Card */}
                  <div className={cn(
                    "flex-1 p-6 rounded-[2.5rem] border transition-all duration-500 group-hover:-translate-x-1 transition-colors",
                    index === 0 
                      ? "bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/50 shadow-xl shadow-indigo-50/40 dark:shadow-none ring-1 ring-indigo-50 dark:ring-indigo-900/10" 
                      : "bg-white/40 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:shadow-xl dark:group-hover:shadow-none group-hover:shadow-slate-100 group-hover:border-slate-200 dark:group-hover:border-slate-700"
                  )}>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                             <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tight transition-colors">{entry.action}</h4>
                             {index === 0 && (
                               <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg text-[9px] font-black border border-amber-100 dark:border-amber-900/50 uppercase tracking-tighter">الحالة الحالية</span>
                             )}
                          </div>
                          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 font-bold text-[11px] transition-colors">
                             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-900 rounded-lg transition-colors">
                               <UserCircle className="w-3.5 h-3.5" />
                               <span>بواسطة: {entry.user}</span>
                             </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100/50 dark:border-slate-800/50 transition-colors">
                           <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                           <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 font-mono tracking-tight">{formatDateTime(entry.date)}</span>
                        </div>
                    </div>

                    {entry.notes && (
                       <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 mb-4 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 group-hover:border-slate-300 dark:group-hover:border-slate-700 transition-colors">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic transition-colors">
                            "{entry.notes}"
                          </p>
                       </div>
                    )}

                    {/* History entry attachments */}
                    {entry.attachments && entry.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {entry.attachments.map(att => (
                          <div key={att.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl group/att hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-sm transition-all shadow-sm">
                            <div className="bg-slate-50 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                              {getFileIcon(att.name)}
                            </div>
                            <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 max-w-[120px] truncate">{att.name}</span>
                            <div className="flex items-center gap-1 opacity-0 pointer-events-none group-hover/att:opacity-100 group-hover/att:pointer-events-auto transition-opacity mr-2 border-r border-slate-100 dark:border-slate-700 pr-2">
                              {isPreviewable(att.name) && (
                                <button 
                                  onClick={() => setPreviewFile(att)}
                                  className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg transition-all"
                                  title="عرض السريع"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <a 
                                href={att.url} 
                                download={att.name}
                                className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-all"
                                title="تحميل"
                              >
                                <Upload className="w-3.5 h-3.5 rotate-180" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {document.status !== 'COMPLETED' ? (
                <div className="relative flex items-center gap-8 group pt-4">
                  <button 
                    onClick={() => setShowUpdateForm(true)} 
                    className="w-11 h-11 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 z-10 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 hover:scale-110 transition-all duration-300 shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <div className="flex-1 py-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">في انتظار الإجراء القادم...</p>
                  </div>
                </div>
              ) : (
                <div className="relative flex items-center gap-8 group pt-6">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500 shadow-xl shadow-emerald-200 flex items-center justify-center text-white z-10 ring-4 ring-emerald-50 scale-110">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1 bg-emerald-50/30 p-6 rounded-[2.5rem] border border-emerald-100 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100/50 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-emerald-800 tracking-tight">اكتملت جميع الإجراءات</h4>
                        <p className="text-[10px] font-bold text-emerald-600/70 mt-0.5">تم إغلاق المعاملة بنجاح</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attachment Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewFile(null)}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl h-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-colors">
                    {getFileIcon(previewFile.name)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white leading-none transition-colors">{previewFile.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest transition-colors">{formatFileSize(previewFile.size)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                   <a 
                     href={previewFile.url}
                     download={previewFile.name}
                     className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-black hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all active:scale-95"
                   >
                     <Upload className="w-4 h-4 rotate-180" />
                     تحميل الآن
                   </a>
                   <button 
                     onClick={() => setPreviewFile(null)}
                     className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-500 transition-all active:scale-95"
                   >
                     <XIcon className="w-5 h-5" />
                   </button>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 md:p-8 overflow-auto flex items-center justify-center relative transition-colors">
                {previewFile.url.includes('drive.google.com') && (
                  <div className="absolute top-6 right-6 z-30 flex flex-col items-end gap-2">
                    <a 
                      href={previewFile.url.replace('/preview', '/view')} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black hover:bg-white dark:hover:bg-slate-800 transition-all shadow-lg"
                    >
                      <ExternalLink className="w-3 h-3" />
                      فتح في نافذة مستقلة
                    </a>
                    <p className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-lg text-[8px] font-bold border border-amber-100 dark:border-amber-900/50 shadow-sm transition-colors">
                      ملاحظة: إذا لم يظهر الملف، استخدم الرابط أعلاه
                    </p>
                  </div>
                )}

                {previewFile.name.toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={previewFile.url} 
                    className="w-full h-full rounded-2xl border-none shadow-inner bg-white min-h-[500px]"
                    title="PDF Preview"
                  />
                ) : (
                  <img 
                    src={previewFile.url} 
                    alt={previewFile.name} 
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-xl"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isScannerOpen && (
        <ScannerModal 
          onCapture={handleScannerCapture} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}
    </div>
  );
};
