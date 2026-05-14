import React, { useState } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { DocumentType, DocumentStatus, DocumentAttachment } from '../types';
import { Sidebar } from 'lucide-react'; // Wait, why import Sidebar icon? Oh, I see.
import { Upload, X, FileText, Camera, Scan, HardDrive, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { ScannerModal } from './ScannerModal';
import { SuccessModal } from './SuccessModal';

export const DocumentForm: React.FC<{ onSuccess: () => void, initialType?: DocumentType }> = ({ onSuccess, initialType = 'INCOMING' }) => {
  const { addDocument, uploadFile, uploadFileToDrive, isGoogleDriveConnected, connectGoogleDrive, internalDepartments } = useDocuments();
  
  const [formData, setFormData] = useState({
    referenceNumber: '',
    type: initialType,
    subject: '',
    department: '',
    internalDepartment: '',
    assignedTo: '',
    date: new Date().toISOString().split('T')[0],
    status: 'PENDING' as DocumentStatus,
    notes: ''
  });

  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempFiles, setTempFiles] = useState<File[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const generateReferenceNumber = () => {
    const year = new Date().getFullYear();
    const typePrefix = formData.type === 'INCOMING' ? 'W' : 'S';
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    setFormData(prev => ({ ...prev, referenceNumber: `${typePrefix}-${year}-${randomPart}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 1. Upload any temp files first
      const uploadedAttachments: DocumentAttachment[] = [...attachments];
      
      for (const file of tempFiles) {
        let uploaded: DocumentAttachment | null = null;
        
        try {
          if (isGoogleDriveConnected) {
            uploaded = await uploadFileToDrive(file);
          } else {
            uploaded = await uploadFile(file);
          }
        } catch (uploadError) {
          console.error('Upload failed for file:', file.name, uploadError);
        }

        if (uploaded) {
          uploadedAttachments.push(uploaded);
        }
      }

      // 2. Add document record
      await addDocument({
        ...formData,
        date: new Date(formData.date).toISOString(),
        attachments: uploadedAttachments,
      });

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
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

  return (
    <div className="glass-panel p-6 lg:p-10 rounded-[2.5rem] max-w-4xl mx-auto border-none ring-1 ring-slate-100 dark:ring-slate-800 bg-white/40 dark:bg-slate-900/40 overflow-hidden relative transition-colors">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none transition-colors" />
      
      <div className="relative mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">إضافة معاملة جديدة</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium italic mt-1 opacity-80 transition-colors">يرجى تعبئة التفاصيل بدقة لضمان دقة التتبع.</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-slate-200 dark:shadow-none transition-all">
           <Upload className="w-6 h-6" />
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <div className="space-y-2 lg:col-span-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">رقم الكتاب (الرقم المرجعي)</label>
              <button 
                type="button"
                onClick={generateReferenceNumber}
                className="text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 px-3 py-1 rounded-full transition-all shadow-md active:scale-95"
              >
                توليد تلقائي
              </button>
            </div>
            <input 
              required
              type="text" 
              name="referenceNumber"
              value={formData.referenceNumber}
              onChange={handleChange}
              className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
              placeholder="مثال: 1245/م"
            />
          </div>

          <div className="space-y-2 lg:col-span-3">
            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">تاريخ تحرير الكتاب</label>
            <input 
              required
              type="date" 
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white"
            />
          </div>
          
          <div className="space-y-2 md:col-span-2 lg:col-span-6">
            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">الموضوع (وصف موجز وواضح)</label>
            <input 
              required
              type="text" 
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="اكتب عنوان الموضوع هنا..."
              className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">التوجيه / النوع</label>
            <select 
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white cursor-pointer appearance-none"
            >
              <option value="INCOMING">وارد</option>
              <option value="OUTGOING">صادر</option>
            </select>
          </div>

          <div className="space-y-2 lg:col-span-3">
            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">الجهة (الخارجية)</label>
            <input 
              required
              type="text" 
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="الوزارة / المؤسسة / الشركة"
              className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2 lg:col-span-3">
            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">القسم الداخلي المعني</label>
            <select 
              name="internalDepartment"
              value={formData.internalDepartment}
              onChange={handleChange}
              className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white cursor-pointer appearance-none"
            >
              <option value="">-- اختر القسم --</option>
              {internalDepartments.map((dept) => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 lg:col-span-6">
            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">المكلف بالمراجعة</label>
            <input 
              required
              type="text" 
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              placeholder="اسم الموظف المسؤول"
              className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2 lg:col-span-6">
            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1 pr-1">الحالة التشغيلية الأولية</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
               {[
                 { id: 'PENDING', label: 'قيد الانتظار', color: 'peer-checked:bg-amber-500 dark:peer-checked:bg-amber-600' },
                 { id: 'IN_PROGRESS', label: 'قيد المتابعة', color: 'peer-checked:bg-blue-500 dark:peer-checked:bg-blue-600' },
                 { id: 'COMPLETED', label: 'منجز ومنتهي', color: 'peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-600' }
               ].map((status) => (
                 <label key={status.id} className="relative cursor-pointer group">
                    <input 
                      type="radio" 
                      name="status" 
                      value={status.id}
                      checked={formData.status === status.id}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className={cn(
                      "w-full py-3.5 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center font-black text-xs text-slate-500 dark:text-slate-400 transition-all peer-checked:text-white ring-offset-4 ring-indigo-500/20",
                      status.color,
                      "hover:bg-slate-100 dark:hover:bg-slate-700"
                    )}>
                      {status.label}
                    </div>
                 </label>
               ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">شرح إضافي / ملاحظات المتابعة</label>
          <textarea 
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none"
            placeholder="أضف تفاصيل إضافية هنا إن وجدت..."
          ></textarea>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1 transition-colors">إرفاق المستندات (Scan Copies)</label>
            {isGoogleDriveConnected ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                <HardDrive className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">تخزين جوجل درايف نشط</span>
              </div>
            ) : (
              <button 
                type="button"
                onClick={connectGoogleDrive}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                <AlertCircle className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">ربط جوجل درايف مطلوب</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-8 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 relative hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer group overflow-hidden">
              <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 dark:group-hover:bg-indigo-500/5 transition-colors pointer-events-none" />
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                 <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white transition-colors">سحب وإفلات الملفات</p>
              <input 
                type="file" 
                multiple 
                onChange={handleFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            <div 
              onClick={() => setIsScannerOpen(true)}
              className="border-2 border-dashed border-indigo-100 dark:border-indigo-900/30 rounded-[2rem] p-8 flex flex-col items-center justify-center bg-indigo-50/20 dark:bg-indigo-950/10 relative hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer group overflow-hidden"
            >
              <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 dark:group-hover:bg-indigo-500/5 transition-colors pointer-events-none" />
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform text-indigo-600 dark:text-indigo-400 transition-colors">
                 <Scan className="w-8 h-8" />
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white transition-colors">بدء المسح الضوئي (Scanner)</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 transition-colors">استخدم كاميرا الهاتف للتصوير</p>
            </div>
          </div>

          {tempFiles.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-4">
              {tempFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm group min-w-[240px] max-w-sm transition-colors">
                  <div className="bg-indigo-50 dark:bg-indigo-900/40 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate transition-colors">{file.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase transition-colors">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeTempFile(idx)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-8 flex flex-col sm:flex-row justify-end gap-4">
          <button 
            type="button" 
            onClick={onSuccess}
            className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-sm rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            إلغاء العملية
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-10 py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ المعاملة'}
          </button>
        </div>
      </form>

      {isScannerOpen && (
        <ScannerModal 
          onCapture={handleScannerCapture} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}

      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          onSuccess();
        }}
        title="تم الحفظ بنجاح"
        message="تم حفظ المعاملة وإضافتها في النظام بنجاح."
      />
    </div>
  );
};
