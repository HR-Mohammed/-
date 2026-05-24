import React, { useState, useEffect, useRef } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { supabase } from '../lib/supabase';
import { MailMessage, DocumentAttachment } from '../types';
import { Mail, Send, Inbox, PenSquare, ArrowRight, UserCircle, Building2, Clock, CheckCircle2, MailOpen, Paperclip, X as XIcon, File, Image as ImageIcon, FileText, FileArchive, Upload, HardDrive, Trash2, Forward, Settings } from 'lucide-react';
import { cn, formatDateTime, formatFileSize } from '../lib/utils';

export const MailBox: React.FC = () => {
  const { userProfile, internalDepartments, uploadFileToDrive, uploadFile, isGoogleDriveConnected, globalMailReceiptMode, toggleGlobalMailReceiptMode } = useDocuments();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose' | 'settings'>('inbox');
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);

  // Mail receipt optional mode state
  const [mailReceiptMode, setMailReceiptMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mail_receipt_mode');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const finalReceiptMode = globalMailReceiptMode || mailReceiptMode;

  // Track locally received message IDs in state
  const [receivedMessages, setReceivedMessages] = useState<Record<string, boolean>>(() => {
    try {
      const keys = Object.keys(localStorage);
      const acc: Record<string, boolean> = {};
      keys.forEach(key => {
        if (key.startsWith('received_')) {
          const id = key.replace('received_', '');
          acc[id] = localStorage.getItem(key) === 'true';
        }
      });
      return acc;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mail_receipt_mode', String(mailReceiptMode));
    } catch (e) {
      console.warn('Failed to save setting to localStorage', e);
    }
  }, [mailReceiptMode]);

  const [togglingGlobal, setTogglingGlobal] = useState(false);

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

  const handleAcknowledgeReceipt = async (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    try {
      localStorage.setItem(`received_${msgId}`, 'true');
      setReceivedMessages(prev => ({ ...prev, [msgId]: true }));
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
        audio.volume = 0.4;
        await audio.play();
      } catch {}
      alert('تم استلام البريد بنجاح! يمكنك الآن النقر على الرسالة لقراءة المحتوى.');
    } catch (err) {
      console.error('Error receiving mail:', err);
    }
  };

  const handleViewMessage = async (msg: MailMessage) => {
    // If mail receipt mode is active and we haven't clicked "Receive Mail", block and prompt
    if (activeTab === 'inbox' && finalReceiptMode && !msg.is_read && !receivedMessages[msg.id]) {
      const isSystemMandatory = globalMailReceiptMode;
      const promptMsg = isSystemMandatory 
        ? '⚠️ تم تفعيل نظام الاستلام الإلزامي للبريد من قِبل إدارة النظام.\n\nلقراءة محتوى هذه الرسالة، يجب تأكيد استلام البريد أولاً.\nالرجاء الضغط على "موافق" لتأكيد الاستلام الرسمي للبريد.'
        : '⚠️ لفتح هذه الرسالة وقراءتها، يجب تأكيد استلام البريد أولاً.\n\nهل تود تأكيد استلام هذا البريد الآن لفتح محتواه؟';
        
      const confirmReceipt = window.confirm(promptMsg);
      if (confirmReceipt) {
        localStorage.setItem(`received_${msg.id}`, 'true');
        setReceivedMessages(prev => ({ ...prev, [msg.id]: true }));
      } else {
        return;
      }
    }

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
      let deletedOnBackend = false;
      try {
        const response = await fetch('/api/mail/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messageId: id, 
            userId: userProfile?.id, 
            userRole: userProfile?.role 
          }),
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
          deletedOnBackend = true;
        } else if (response.status !== 500 && data.error) {
          // If the server specifically checked and rejected unauthorized or missing file/database, propagate that error directly
          throw new Error(data.error);
        }
      } catch (beError: any) {
        console.warn('Backend delete failed, falling back to direct supabase delete:', beError);
        if (beError.message && !beError.message.includes('fetch')) {
          throw beError;
        }
      }

      if (!deletedOnBackend) {
        // Fallback to client-side direct supabase delete
        const { error } = await supabase
          .from('mail_messages')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      alert('تم حذف الرسالة بنجاح');
    } catch (error: any) {
      console.error('Error deleting message:', error);
      alert('فشل حذف الرسالة: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleForwardMessage = (msg: MailMessage) => {
    setComposeSubject(`إعادة توجيه: ${msg.subject}`);
    setComposeContent(`\n\n---------- رسالة محولة ----------\nمن: ${msg.sender?.full_name || msg.sender?.email}\nبتاريخ: ${formatDateTime(msg.created_at)}\nالموضوع: ${msg.subject}\n\n${msg.content}`);
    setAttachments(msg.attachments || []);
    setComposeTo('');
    setActiveTab('compose');
    setSelectedMessage(null);
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
            <button 
              onClick={() => handleForwardMessage(selectedMessage)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
            >
              <Forward className="w-5 h-5" />
              إعادة توجيه
            </button>
            {(userProfile?.role === 'ADMIN' || 
              selectedMessage.sender_id === userProfile?.id || 
              selectedMessage.receiver_dept_id === userProfile?.department_id) && (
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

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl flex-wrap gap-1 md:gap-0">
           <button
             onClick={() => setActiveTab('inbox')}
             className={cn(
               "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all",
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
               "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all",
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
               "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all",
               activeTab === 'compose' 
                 ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                 : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
             )}
           >
             <PenSquare className="w-4 h-4" />
             رسالة جديدة
           </button>
           <button
             onClick={() => setActiveTab('settings')}
             className={cn(
               "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all",
               activeTab === 'settings' 
                 ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                 : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
             )}
           >
             <Settings className="w-4 h-4" />
             الإعدادات
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
        ) : activeTab === 'settings' ? (
          <div className="max-w-2xl mx-auto space-y-8 py-4 animate-in fade-in">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                <Settings className="w-6 h-6 animate-spin-slow" />
              </div>
              <div className="text-right">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">إعدادات البريد الداخلي</h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">تخصيص نظام استلام وتوثيق المعاملات والرسائل الواردة</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* If user is an Admin, show the System-wide Mandatory Toggle */}
              {userProfile?.role === 'ADMIN' && (
                <div className="p-6 bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-indigo-950/20 dark:to-slate-900/30 rounded-3xl border border-indigo-100/55 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-md transition-all duration-300">
                  <div className="flex-1 min-w-0 text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/30 text-rose-650 dark:text-rose-400 text-[10px] font-black tracking-wider uppercase mb-3 border border-red-150 dark:border-red-900/30">
                      ★ خاص بمشرف النظام (ADMIN)
                    </span>
                    <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 justify-end">
                      تفعيل نظام الاستلام الإلزامي العام لجميع المستخدمين
                    </h4>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      عند تفعيل هذا الخيار الإداري، يصبح <strong>تأكيد الاستلام إجبارياً وإلزامياً على جميع مستخدمي النظام دون استثناء</strong>. لن يتمكن أي موظف من قراءة محتوى الكتب أو الرسائل الواردة إليه إلا بعد تأكيد استلامها رسمياً أولاً.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center justify-end">
                    {togglingGlobal ? (
                      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
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
                        <div className="w-14 h-7 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-all dark:after:bg-slate-950 dark:after:border-slate-750 peer-checked:bg-rose-650"></div>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Individual user toggle or overridden display */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-sm transition-all duration-300">
                <div className="flex-1 min-w-0 text-right">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 justify-end">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                    تأكيد استلام البريد قبل الفتح (إعداد شخصي)
                  </h4>
                  <p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">
                    يُلزم مستلم البريد بالضغط على زر "استلام البريد" أولاً قبل السماح له بقراءة محتوى الرسالة.
                  </p>
                  {globalMailReceiptMode && (
                    <div className="mt-3 p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 text-rose-650 dark:text-rose-400 rounded-xl text-xs font-bold leading-normal">
                      ⚠️ هذا الخيار مفعّل وإلزامي حالياً لجميع المستخدمين بقرار من إدارة النظام. تم تعطيل الإعداد الشخصي مؤقتاً.
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center justify-end">
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={finalReceiptMode} 
                      disabled={globalMailReceiptMode}
                      onChange={(e) => setMailReceiptMode(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className={cn(
                      "w-14 h-7 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-all dark:after:bg-slate-950 dark:after:border-slate-750 peer-checked:bg-indigo-600",
                      globalMailReceiptMode ? "opacity-60 cursor-not-allowed" : ""
                    )}></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Premium Info Box */}
            <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/20 text-indigo-700 dark:text-indigo-400 flex items-start gap-3 text-right">
              <span className="text-lg">📢</span>
              <div className="space-y-1">
                <p className="text-xs font-black">توضيح أمان وتتبع البيانات</p>
                <p className="text-[11px] font-medium leading-relaxed">
                  تساهم هذه الميزة في توثيق وضمان استلام المعاملات والكتب الرسمية المرسلة بين الأقسام، بحيث لا يُعذر الموظف المستقبل بعدم الاطلاع أو الضياع بمجرد استلامه الرسمي للبريد.
                </p>
              </div>
            </div>
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
                    <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">
                      {finalReceiptMode && activeTab === 'inbox' ? 'حالة الاستلام والوارد' : 'حالة القراءة'}
                    </th>
                    <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => {
                    const isUnread = activeTab === 'inbox' && !msg.is_read;
                    const isNotReceivedInbox = activeTab === 'inbox' && finalReceiptMode && !msg.is_read && !receivedMessages[msg.id];
                    
                    // Distinct backgrounds
                    const rowClass = cn(
                      "group cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm",
                      isNotReceivedInbox
                        ? "bg-amber-50/65 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/15 shadow-[0_4px_12px_rgba(245,158,11,0.06)] font-semibold text-amber-950 dark:text-amber-100"
                        : isUnread 
                          ? "bg-indigo-50/95 dark:bg-indigo-950/40 hover:bg-indigo-100/90 dark:hover:bg-indigo-900/40 shadow-[0_4px_16px_rgba(99,102,241,0.08)] font-semibold text-indigo-950 dark:text-indigo-100" 
                          : "bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md hover:shadow-slate-200/40 dark:hover:shadow-none text-slate-700 dark:text-slate-300"
                    );

                    // Dynamic border parameters
                    const borderBase = isNotReceivedInbox
                      ? "border-amber-300 dark:border-amber-900/40 border-t border-b"
                      : isUnread
                        ? "border-indigo-400 dark:border-indigo-500/80 border-t-2 border-b-2"
                        : "border-slate-200 dark:border-slate-700 border-t border-b";

                    // The right-most corner cell (Sender info) gets rounded-r-2xl, border-y, and a thick colored indicator on the right side
                    const rightCellBorder = isNotReceivedInbox
                      ? "border-r-[6px] border-r-amber-500 dark:border-r-amber-600 rounded-r-2xl border-y border-amber-300 dark:border-amber-900/40 border-l-0"
                      : isUnread
                        ? "border-r-[6px] border-r-indigo-600 dark:border-r-indigo-500 rounded-r-2xl border-y-2 border-indigo-400 dark:border-indigo-500/80 border-l-0"
                        : "border-r-[4px] border-r-slate-400 dark:border-r-slate-500 rounded-r-2xl border-y border-slate-200 dark:border-slate-700 border-l-0";

                    // The left-most corner cell (either Status or Delete operations) gets rounded-l-2xl and a solid left border
                    const leftCellBorder = isNotReceivedInbox
                      ? "border-l border-l-amber-305 dark:border-l-amber-900/40 rounded-l-2xl border-y border-amber-300 dark:border-amber-900/40 border-r-0"
                      : isUnread
                        ? "border-l-2 border-l-indigo-400 dark:border-l-indigo-500/80 rounded-l-2xl border-y-2 border-indigo-400 dark:border-indigo-500/80 border-r-0"
                        : "border-l border-l-slate-200 dark:border-l-slate-700 rounded-l-2xl border-y border-slate-200 dark:border-slate-700 border-r-0";

                    return (
                      <tr 
                        key={msg.id} 
                        onClick={() => handleViewMessage(msg)}
                        className={rowClass}
                      >
                        <td className={cn("px-4 py-4 transition-all", rightCellBorder)}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                              isNotReceivedInbox
                                ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 scale-105"
                                : isUnread 
                                  ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 scale-105" 
                                  : activeTab === 'inbox' 
                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" 
                                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                            )}>
                              {isNotReceivedInbox ? <Mail className="w-5 h-5 animate-bounce text-amber-500" /> : isUnread ? <Mail className="w-5 h-5 animate-pulse" /> : activeTab === 'inbox' ? <UserCircle className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                            </div>
                            <div>
                              <span className={cn("text-sm block transition-colors", isNotReceivedInbox ? "font-bold text-amber-900 dark:text-amber-200" : isUnread ? "font-black text-indigo-900 dark:text-indigo-100" : "text-slate-900 dark:text-white")}>
                                {activeTab === 'inbox' 
                                  ? (msg.sender?.full_name || msg.sender?.email || 'غير معروف')
                                  : msg.receiver_dept?.name || 'غير معروف'
                                }
                              </span>
                              <span className="text-[10px] text-slate-500 font-normal">{activeTab === 'inbox' ? msg.sender?.role : 'القسم'}</span>
                            </div>
                          </div>
                        </td>
                        <td className={cn("px-4 py-4 transition-all", borderBase)}>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm max-w-md truncate transition-all", isNotReceivedInbox ? "font-bold text-amber-950 dark:text-amber-100" : isUnread ? "font-black text-slate-950 dark:text-white" : "text-slate-700 dark:text-slate-300")}>
                              {msg.subject}
                            </span>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <Paperclip className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </td>
                        <td className={cn("px-4 py-4 transition-all", borderBase)}>
                          <span className={cn("text-xs font-mono transition-colors", isNotReceivedInbox ? "text-amber-600 dark:text-amber-400 font-semibold" : isUnread ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-500")}>
                            {formatDateTime(msg.created_at)}
                          </span>
                        </td>
                        <td className={cn(
                          "px-4 py-4 text-left transition-all",
                          borderBase
                        )}>
                          {msg.is_read ? (
                            finalReceiptMode ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-55 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-black border border-emerald-200 dark:border-emerald-800/40">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                بريد مستلم ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                                <MailOpen className="w-3.5 h-3.5" />
                                مقروء
                              </span>
                            )
                          ) : finalReceiptMode && activeTab === 'inbox' ? (
                            receivedMessages[msg.id] ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/25 text-violet-600 dark:text-violet-400 text-[10px] uppercase font-black border border-violet-200 dark:border-violet-800/30">
                                <MailOpen className="w-3.5 h-3.5" />
                                مستلم (جاهز للقراءة)
                              </span>
                            ) : (
                              <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/25 text-amber-600 dark:text-amber-400 text-[10px] uppercase font-black border border-amber-200/50 dark:border-amber-800/40">
                                  بانتظار الاستلام
                                </span>
                                <button
                                  onClick={(e) => handleAcknowledgeReceipt(e, msg.id)}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-[11px] font-black shadow-md hover:shadow-indigo-500/15 duration-200 scale-100 hover:scale-[1.03] active:scale-95 transition-all text-center"
                                >
                                  <Mail className="w-3.5 h-3.5 text-white" />
                                  استلام البريد 📥
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] uppercase font-black tracking-widest border border-indigo-200 dark:border-indigo-800/50 shadow-sm animate-pulse">
                              <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              غير مقروء
                            </span>
                          )}
                        </td>
                        <td className={cn("px-4 py-4 text-left transition-all", leftCellBorder)}>
                          {(userProfile?.role === 'ADMIN' || 
                            msg.sender_id === userProfile?.id || 
                            msg.receiver_dept_id === userProfile?.department_id) ? (
                            <button 
                              onClick={(e) => handleDeleteMessage(e, msg.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                              title="حذف الرسالة"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
