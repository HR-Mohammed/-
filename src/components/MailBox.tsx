import React, { useState, useEffect, useRef } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { supabase } from '../lib/supabase';
import { MailMessage, DocumentAttachment } from '../types';
import { Mail, Send, Inbox, PenSquare, ArrowRight, UserCircle, Building2, Clock, CheckCircle2, MailOpen, Paperclip, X as XIcon, File, Image as ImageIcon, FileText, FileArchive, Upload, HardDrive, Trash2 } from 'lucide-react';
import { cn, formatDateTime, formatFileSize } from '../lib/utils';

export const MailBox: React.FC = () => {
  const { userProfile, internalDepartments, uploadFileToDrive, uploadFile, isGoogleDriveConnected } = useDocuments();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);

  // Compose State
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (activeTab === 'inbox' || activeTab === 'sent') {
      fetchMessages();
    }
  }, [activeTab, userProfile]);

  const fetchMessages = async () => {
    if (!userProfile) return;
    setLoading(true);
    
    try {
      let query = supabase
        .from('mail_messages')
        .select(`
          *,
          sender:profiles!sender_id(id, email, full_name, role),
          receiver_dept:internal_departments!receiver_dept_id(id, name)
        `)
        .order('created_at', { ascending: false });

      if (activeTab === 'inbox') {
        if (!userProfile.department_id) {
          setMessages([]);
          setLoading(false);
          return;
        }
        query = query.eq('receiver_dept_id', userProfile.department_id);
      } else if (activeTab === 'sent') {
        query = query.eq('sender_id', userProfile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMessages((data as any) || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let attachment: DocumentAttachment | null = null;
      if (isGoogleDriveConnected) {
        attachment = await uploadFileToDrive(file);
      } else {
        attachment = await uploadFile(file);
      }
      
      if (attachment) {
        setAttachments(prev => [...prev, attachment]);
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert('فشل في رفع الملف: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !composeTo || !composeSubject || !composeContent) return;

    setSending(true);
    try {
      const { error } = await supabase.from('mail_messages').insert({
        sender_id: userProfile.id,
        receiver_dept_id: composeTo,
        subject: composeSubject,
        content: composeContent,
        is_read: false,
        attachments: attachments
      });

      if (error) throw error;

      setActiveTab('sent');
      setComposeTo('');
      setComposeSubject('');
      setComposeContent('');
      setAttachments([]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert('حدث خطأ أثناء إرسال البريد: ' + (error.message || JSON.stringify(error)));
    } finally {
      setSending(false);
    }
  };

  const handleViewMessage = async (msg: MailMessage) => {
    setSelectedMessage(msg);
    
    if (activeTab === 'inbox' && !msg.is_read) {
      try {
        const { error } = await supabase
          .from('mail_messages')
          .update({ is_read: true })
          .eq('id', msg.id);
          
        if (!error) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
        }
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    }
  };

  const handleDeleteMessage = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة نهائياً؟')) return;

    try {
      const { error } = await supabase
        .from('mail_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      alert('تم حذف الرسالة بنجاح');
    } catch (error: any) {
      console.error('Error deleting message:', error);
      alert('فشل حذف الرسالة: ' + error.message);
    }
  };

  const renderFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-indigo-500" />;
    if (type === 'application/pdf') return <FileText className="w-8 h-8 text-rose-500" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchive className="w-8 h-8 text-amber-500" />;
    return <File className="w-8 h-8 text-emerald-500" />;
  };

  if (selectedMessage) {
    return (
      <div className="space-y-6 animate-in slide-in-from-bottom flex flex-col h-full">
        <div className="flex items-center justify-between">
          <div>
             <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">قراءة البريد</h2>
             <p className="text-sm font-bold text-slate-500 mt-1">عرض تفاصيل الرسالة</p>
          </div>
          <div className="flex items-center gap-3">
            {userProfile?.role === 'ADMIN' && (
              <button 
                onClick={(e) => handleDeleteMessage(e, selectedMessage.id)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors ml-4"
              >
                <Trash2 className="w-5 h-5" />
                حذف الرسالة
              </button>
            )}
            <button 
              onClick={() => setSelectedMessage(null)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              رجوع
            </button>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-[2.5rem] border-none ring-1 ring-slate-100 dark:ring-white/5 bg-white dark:bg-slate-900 flex-1">
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedMessage.subject}</h3>
          </div>

          <div className="flex items-center justify-between py-4 border-y border-slate-100 dark:border-slate-800 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <UserCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{selectedMessage.sender?.full_name || selectedMessage.sender?.email}</p>
                <p className="text-xs font-bold text-slate-500">إلى القسم: {selectedMessage.receiver_dept?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-mono">{formatDateTime(selectedMessage.created_at)}</span>
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {selectedMessage.content}
          </div>

          {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-400" />
                المرفقات ({selectedMessage.attachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedMessage.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-xl group transition-all text-right"
                  >
                    {renderFileIcon(att.type)}
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={att.name}>{att.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-500 justify-end">
                        <span>{formatFileSize(att.size)}</span>
                        {att.type.includes('google-apps') && (
                          <HardDrive className="w-3 h-3 text-emerald-500" />
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-4">
             <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
               <Mail className="w-8 h-8 text-indigo-500" />
               البريد الداخلي
             </h2>
             <button 
               onClick={async () => {
                 try {
                   const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                   await audio.play();
                   alert('تم تفعيل التنبيهات الصوتية بنجاح!');
                 } catch (e) {
                   alert('فشل تشغيل الصوت. يرجى الضغط على أي مكان في الصفحة أولاً.');
                 }
               }}
               className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl hover:bg-indigo-200 transition-colors"
             >
               تفعيل/تجربة الصوت 🔊
             </button>
           </div>
           <p className="text-sm font-bold text-slate-500 mt-1">إرسال واستقبال الرسائل بين الأقسام</p>
           {!userProfile?.department_id && (
             <p className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg mt-2 inline-block">
               لا يوجد قسم مخصص لحسابك. راجع مسؤول النظام لربط حسابك بقسم لإستقبال البريد.
             </p>
           )}
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
           <button
             onClick={() => setActiveTab('inbox')}
             className={cn(
               "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
               activeTab === 'inbox' 
                 ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                 : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
             )}
           >
             <Inbox className="w-4 h-4" />
             البريد الوارد
           </button>
           <button
             onClick={() => setActiveTab('sent')}
             className={cn(
               "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
               activeTab === 'sent' 
                 ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                 : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
             )}
           >
             <Send className="w-4 h-4" />
             المرسل
           </button>
           <button
             onClick={() => setActiveTab('compose')}
             className={cn(
               "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
               activeTab === 'compose' 
                 ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                 : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
             )}
           >
             <PenSquare className="w-4 h-4" />
             رسالة جديدة
           </button>
        </div>
      </div>

      <div className="glass-panel p-6 lg:p-8 rounded-[2.5rem] border-none ring-1 ring-slate-100 dark:ring-white/5 bg-white dark:bg-slate-900 flex-1">
        {activeTab === 'compose' ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">إنشاء رسالة جديدة</h3>
            <form onSubmit={handleSendMessage} className="space-y-6">
              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">القسم الموجه إليه / المرسل إليه</label>
                <select
                  required
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-900 dark:text-white"
                >
                  <option value="">اختر القسم...</option>
                  {internalDepartments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">موضوع الرسالة</label>
                <input
                  required
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-900 dark:text-white"
                  placeholder="موضوع الرسالة"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">محتوى الرسالة</label>
                <textarea
                  required
                  value={composeContent}
                  onChange={(e) => setComposeContent(e.target.value)}
                  className="w-full h-48 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white resize-none"
                  placeholder="اكتب رسالتك هنا..."
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">المرفقات</label>
                <div className="space-y-4">
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attachments.map((att) => (
                        <div key={att.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                          <div className="flex items-center gap-3 overflow-hidden text-right">
                            {renderFileIcon(att.type)}
                            <div className="overflow-hidden">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={att.name}>{att.name}</p>
                              <div className="flex items-center justify-end gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-slate-500">{formatFileSize(att.size)}</span>
                                {att.type.includes('google-apps') && (
                                  <HardDrive className="w-3 h-3 text-emerald-500" />
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-full sm:w-auto font-bold text-sm bg-slate-50/50 dark:bg-slate-900/50"
                    >
                      {isUploading ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 animate-spin" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-5 h-5" />
                          إرفاق ملف
                        </>
                      )}
                    </button>
                    {isGoogleDriveConnected && (
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg">
                        <HardDrive className="w-4 h-4" />
                        التخزين عبر Google Drive مفعل
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={sending || !composeTo || !composeSubject || !composeContent}
                  className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  <Send className="w-5 h-5" />
                  {sending ? 'جاري الإرسال...' : 'إرسال الرسالة'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-20 text-indigo-600">
                <CheckCircle2 className="w-8 h-8 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-20 text-slate-400">
                <Mail className="w-16 h-16 mb-4 opacity-50" />
                <p className="font-bold text-lg">لا توجد رسائل في {activeTab === 'inbox' ? 'صندوق الوارد' : 'الرسائل المرسلة'}</p>
              </div>
            ) : (
              <table className="w-full text-right border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">{activeTab === 'inbox' ? 'من (المرسل)' : 'إلى (القسم)'}</th>
                    <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">الموضوع</th>
                    <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">التاريخ</th>
                    <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">حالة القراءة</th>
                    {userProfile?.role === 'ADMIN' && (
                      <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">الإجراءات</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => (
                    <tr 
                      key={msg.id} 
                      onClick={() => handleViewMessage(msg)}
                      className={cn(
                        "group cursor-pointer transition-all hover:-translate-y-0.5",
                        activeTab === 'inbox' && !msg.is_read 
                          ? "bg-indigo-50/50 dark:bg-indigo-900/20 font-black" 
                          : "bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg shadow-slate-200/50 dark:shadow-none"
                      )}
                    >
                      <td className="px-4 py-4 rounded-r-2xl border-y border-r border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            activeTab === 'inbox' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                          )}>
                            {activeTab === 'inbox' ? <UserCircle className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                          </div>
                          <div>
                            <span className="text-sm text-slate-900 dark:text-white block">
                              {activeTab === 'inbox' 
                                ? (msg.sender?.full_name || msg.sender?.email || 'غير معروف')
                                : msg.receiver_dept?.name || 'غير معروف'
                              }
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal">{activeTab === 'inbox' ? msg.sender?.role : 'القسم'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-900 dark:text-white max-w-md truncate">
                            {msg.subject}
                          </span>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <Paperclip className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y border-slate-100 dark:border-white/5">
                        <span className="text-xs font-mono text-slate-500">{formatDateTime(msg.created_at)}</span>
                      </td>
                      <td className={cn(
                        "px-4 py-4 border-y border-slate-100 dark:border-white/5 text-left",
                        userProfile?.role !== 'ADMIN' && "rounded-l-2xl border-l"
                      )}>
                        {msg.is_read ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                            <MailOpen className="w-3.5 h-3.5" />
                            مقروء
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] uppercase font-black tracking-widest">
                            <Mail className="w-3.5 h-3.5" />
                            غير مقروء
                          </span>
                        )}
                      </td>
                      {userProfile?.role === 'ADMIN' && (
                        <td className="px-4 py-4 rounded-l-2xl border-y border-l border-slate-100 dark:border-white/5 text-left">
                          <button 
                            onClick={(e) => handleDeleteMessage(e, msg.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                            title="حذف الرسالة"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
