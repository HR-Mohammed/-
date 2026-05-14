import React, { useState, useEffect, useMemo } from 'react';
import { DocumentProvider } from './context/DocumentContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DocumentList } from './components/DocumentList';
import { DocumentForm } from './components/DocumentForm';
import { DocumentDetails } from './components/DocumentDetails';
import { LoginPage } from './components/LoginPage';
import { UserManager } from './components/UserManager';
import { DepartmentManager } from './components/DepartmentManager';
import { MailBox } from './components/MailBox';
import { useDocuments } from './context/DocumentContext';
import { supabase } from './lib/supabase';
import { Search, AlertTriangle, X, Bell, User, Menu, LogOut, Moon, Sun } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Session } from '@supabase/supabase-js';

function AppContent({ session, isDarkMode, setIsDarkMode }: { session: Session, isDarkMode: boolean, setIsDarkMode: (val: boolean) => void }) {
  const { documents, userName, userRole, userProfile } = useDocuments();
  const [currentView, setCurrentView] = useState('dashboard');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [mailToast, setMailToast] = useState({ show: false, subject: '' });
  const [unreadMailCount, setUnreadMailCount] = useState(0);
  const [notifications, setNotifications] = useState<{id: string, subject: string, time: Date, read: boolean}[]>([]);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [defaultDocType, setDefaultDocType] = useState<'INCOMING' | 'OUTGOING'>('INCOMING');
  
  const user = session.user;
  const userInitials = userName 
    ? userName.trim().charAt(0).toUpperCase() 
    : (user.email ? user.email.charAt(0).toUpperCase() : 'U');

  const overdueDocuments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return documents.filter(doc => {
      if (!doc.dueDate || doc.status === 'COMPLETED') return false;
      const dueDate = new Date(doc.dueDate);
      return dueDate < today;
    });
  }, [documents]);

  useEffect(() => {
    if (overdueDocuments.length > 0) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [overdueDocuments.length]);

  useEffect(() => {
    if (!userProfile?.department_id) return;

    const fetchUnreadCount = async () => {
      if (!userProfile?.department_id) return;
      const { count, error } = await supabase
        .from('mail_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_dept_id', userProfile.department_id)
        .eq('is_read', false);
      
      if (!error && count !== null) {
        setUnreadMailCount(count);
      }
    };

    fetchUnreadCount();

    // Polling Fallback: Refresh count every 30 seconds as a safety net
    const pollingInterval = setInterval(fetchUnreadCount, 30000);

    const channel = supabase
      .channel(`dept-mail-${userProfile.department_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mail_messages',
        },
        async (payload) => {
          console.log('Realtime Event Received:', payload);
          
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          const isRelevant = 
            (newData && String(newData.receiver_dept_id) === String(userProfile.department_id)) ||
            (oldData && String(oldData.receiver_dept_id) === String(userProfile.department_id));

          if (isRelevant) {
            fetchUnreadCount();
          }

          if (payload.eventType === 'INSERT') {
            const receiverDeptId = String(newData.receiver_dept_id);
            const userDeptId = String(userProfile.department_id);
            
            if (receiverDeptId === userDeptId && newData.sender_id !== userProfile.id) {
              try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.volume = 0.6;
                await audio.play();
              } catch (error) {
                console.warn('Audio play blocked:', error);
              }
              
              setMailToast({ show: true, subject: newData.subject || 'رسالة جديدة' });
              
              setNotifications(prev => [
                {
                  id: newData.id,
                  subject: newData.subject || 'رسالة بريد جديدة',
                  time: new Date(),
                  read: false
                },
                ...prev
              ]);
              
              setTimeout(() => setMailToast({ show: false, subject: '' }), 10000);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime Status for Dept ${userProfile.department_id}: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime error. Polling fallback is active. Enable Replication in Supabase if problem persists.');
        }
      });

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id, userProfile?.department_id]);

  const handleViewDocument = (id: string) => {
    setEditingDocId(id);
    setCurrentView('document-details');
    setSearchQuery('');
    setIsMobileMenuOpen(false);
  };

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = documents.find(d => d.referenceNumber.toLowerCase() === searchQuery.toLowerCase());
    if (found) {
      handleViewDocument(found.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderContent = () => {
    if (currentView === 'user-management') {
      return <UserManager />;
    }
    if (currentView === 'internal-departments') {
      return <DepartmentManager />;
    }
    if (currentView === 'mailbox') {
      return <MailBox />;
    }
    if (currentView === 'document-details' && editingDocId) {
      return (
        <DocumentDetails 
          documentId={editingDocId} 
          onBack={() => {
            setEditingDocId(null);
            setCurrentView('all-documents');
          }} 
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard onView={handleViewDocument} overdueDocs={overdueDocuments} />;
      case 'add-document':
        return <DocumentForm initialType={defaultDocType} onSuccess={() => setCurrentView('all-documents')} />;
      case 'all-documents':
        return <DocumentList onView={handleViewDocument} onAdd={() => { setDefaultDocType('INCOMING'); setCurrentView('add-document'); }} />;
      case 'incoming':
        return <DocumentList filterType="INCOMING" onView={handleViewDocument} onAdd={() => { setDefaultDocType('INCOMING'); setCurrentView('add-document'); }} />;
      case 'outgoing':
        return <DocumentList filterType="OUTGOING" onView={handleViewDocument} onAdd={() => { setDefaultDocType('OUTGOING'); setCurrentView('add-document'); }} />;
      default:
        return <Dashboard onView={handleViewDocument} overdueDocs={overdueDocuments} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 overflow-x-hidden transition-colors duration-300" dir="rtl">
      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Dynamic Nav Sidebar */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-[90] w-80 transform transition-transform duration-500 lg:relative lg:inset-auto lg:transform-none lg:w-80",
        isMobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <Sidebar 
          currentView={currentView} 
          setCurrentView={(view) => {
            setEditingDocId(null);
            setCurrentView(view);
            setIsMobileMenuOpen(false);
          }} 
          onLogout={handleLogout}
          unreadMailCount={unreadMailCount}
        />
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col gap-6 w-full max-w-[1600px] mx-auto min-w-0">
        {/* Superior Integrated Header */}
        <header className="glass-panel flex items-center justify-between gap-4 p-4 rounded-[2rem] lg:rounded-[2.5rem] dark:bg-slate-900/40 dark:border-white/5">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
             >
                <Menu className="w-5 h-5" />
                <span className="sr-only">فتح القائمة</span>
             </button>
             
             <form onSubmit={handleQuickSearch} className="flex-1 max-w-lg relative group">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                  type="text"
                  placeholder="بحث سريع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl py-2.5 pr-11 pl-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 dark:focus:border-indigo-500/50 transition-all font-medium text-slate-900 dark:text-white"
                />
             </form>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm active:rotate-12"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                className={cn(
                  "flex relative p-2.5 rounded-2xl transition-all active:scale-90 group",
                  (overdueDocuments.length > 0 || notifications.some(n => !n.read))
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 ring-4 ring-indigo-500/10" 
                    : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 text-slate-400 hover:text-indigo-600 shadow-sm"
                )}
              >
                <Bell className={cn("w-6 h-6", (overdueDocuments.length > 0 || notifications.some(n => !n.read)) && "animate-pulse")} />
                {(overdueDocuments.length > 0 || notifications.some(n => !n.read)) && (
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white text-xs font-black rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                    {(overdueDocuments.length + notifications.filter(n => !n.read).length)}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotificationMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-[100]" 
                      onClick={() => setShowNotificationMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl rounded-3xl overflow-hidden z-[101]"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 dark:text-white">الإشعارات</h3>
                        <button 
                          onClick={() => {
                            setNotifications(notifications.map(n => ({ ...n, read: true })));
                            setShowToast(false);
                          }}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                          تم قراءة الكل
                        </button>
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto">
                        {overdueDocuments.length === 0 && notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                            <p className="text-sm text-slate-400 font-bold">لا توجد إشعارات جديدة</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {/* Overdue Notifications */}
                            {overdueDocuments.map((doc) => (
                              <button
                                key={`overdue-${doc.id}`}
                                onClick={() => {
                                  handleViewDocument(doc.id);
                                  setShowNotificationMenu(false);
                                }}
                                className="w-full p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-right"
                              >
                                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl shrink-0">
                                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">تأخير في الموعد</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                    الموضوع: {doc.subject}
                                  </p>
                                  <p className="text-[10px] text-red-500 font-bold mt-1">متأخر جداً</p>
                                </div>
                              </button>
                            ))}

                            {/* Mail Notifications */}
                            {notifications.map((notif) => (
                              <button
                                key={notif.id}
                                onClick={() => {
                                  setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                  setCurrentView('mailbox');
                                  setShowNotificationMenu(false);
                                }}
                                className={cn(
                                  "w-full p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-right",
                                  !notif.read && "bg-indigo-50/50 dark:bg-indigo-900/10"
                                )}
                              >
                                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-xl shrink-0">
                                  <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">بريد جديد</p>
                                    {!notif.read && <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" />}
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                    {notif.subject}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    {new Date(notif.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => {
                          setCurrentView('mailbox');
                          setShowNotificationMenu(false);
                        }}
                        className="w-full p-3 bg-slate-50 dark:bg-white/5 text-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        عرض كل البريد
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={handleLogout}
              className="hidden sm:flex p-2.5 rounded-2xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all group"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{userName || user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
                  {userRole === 'ADMIN' ? 'مسؤول النظام' : userRole === 'MANAGER' ? 'إداري' : 'مستخدم النظام'}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center text-white font-bold lg:text-lg ring-4 ring-white dark:ring-slate-900">
                {userInitials}
              </div>
            </div>
          </div>
        </header>

        {/* Smooth Transition Content Wrapper */}
        <div className="flex-1 overflow-visible">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + (editingDocId || '')}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ 
                duration: 0.4, 
                ease: [0.23, 1, 0.32, 1] 
              }}
              className="w-full h-full"
            >
              <div className="pb-24">
                {renderContent()}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mail Toast */}
        <AnimatePresence>
          {mailToast.show && (
            <motion.div 
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              className="fixed bottom-32 left-10 z-[100]"
            >
              <div className="bg-indigo-600 border border-white/10 shadow-2xl rounded-3xl p-4 flex items-center gap-4 max-w-[320px] backdrop-blur-xl">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white font-bold text-sm text-right">بريد جديد!</p>
                  <p className="text-white/80 text-xs mt-0.5 truncate text-right">
                    {mailToast.subject}
                  </p>
                </div>
                <button 
                  onClick={() => setMailToast({ ...mailToast, show: false })}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-white/50 hover:text-white" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reimagined Toast Notification */}
        <AnimatePresence>
          {showToast && overdueDocuments.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              className="fixed bottom-10 left-10 z-[100]"
            >
              <div className="bg-slate-900 border border-white/10 shadow-2xl rounded-3xl p-4 flex items-center gap-4 max-w-[320px] backdrop-blur-xl">
                <div className="bg-red-500/10 p-3 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">تنبيه المواعيد</p>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">
                    يوجد {overdueDocuments.length} مواضيع متأخرة
                  </p>
                </div>
                <button 
                  onClick={() => setShowToast(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <DocumentProvider>
      <AppContent 
        session={session} 
        isDarkMode={isDarkMode} 
        setIsDarkMode={setIsDarkMode} 
      />
    </DocumentProvider>
  );
}


