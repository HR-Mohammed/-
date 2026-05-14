import React, { useState } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { Building2, Plus, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

export const DepartmentManager: React.FC = () => {
  const { internalDepartments, addInternalDepartment, deleteInternalDepartment, userRole } = useDocuments();
  const [newDeptName, setNewDeptName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addInternalDepartment(newDeptName.trim());
      setNewDeptName('');
    } catch (error: any) {
      alert('حدث خطأ أثناء إضافة القسم: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteInternalDepartment(deletingId);
      setDeletingId(null);
    } catch (error: any) {
      alert('حدث خطأ أثناء حذف القسم: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (userRole !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-slate-300" />
        <p className="font-bold">ليس لديك صلاحية للوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">إدارة الأقسام الداخلية</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">إضافة وتعديل الأقسام المعنية بمتابعة المراسلات</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Form */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 rounded-[2rem] border-none ring-1 ring-slate-100 dark:ring-white/5 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              إضافة قسم جديد
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 mr-1 uppercase tracking-wider">اسم القسم</label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="مثال: قسم الحسابات"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !newDeptName.trim()}
                className="w-full bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl py-3 px-4 font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/10 dark:shadow-none"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة القسم
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-[2rem] border-none ring-1 ring-slate-100 dark:ring-white/5 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">قائمة الأقسام الحالية</h3>
              <span className="text-[10px] font-black bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500 shadow-sm border border-slate-100 dark:border-white/5">
                {internalDepartments.length} قسم
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              <AnimatePresence initial={false}>
                {internalDepartments.length === 0 ? (
                  <div className="p-12 text-center text-slate-300 dark:text-slate-600 font-bold">لا توجد أقسام مضافة بعد</div>
                ) : (
                  internalDepartments.map((dept) => (
                    <motion.div
                      key={dept.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-5 flex items-center justify-between group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{dept.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          setDeletingId(dept.id);
                          setDeletingName(dept.name);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                        title="حذف القسم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal 
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="حذف القسم"
        message={`هل أنت متأكد من حذف القسم "${deletingName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
      />
    </div>
  );
};
