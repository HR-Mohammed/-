import React from 'react';
import { 
  BarChart3, 
  FileText, 
  Inbox, 
  Send, 
  Settings, 
  PlusCircle, 
  ShieldCheck,
  History,
  LogOut,
  Users,
  HardDrive,
  Building2,
  Mail
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

import { useDocuments } from '../context/DocumentContext';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onLogout?: () => void;
  unreadMailCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onLogout, unreadMailCount = 0 }) => {
  const { userRole, isGoogleDriveConnected, connectGoogleDrive } = useDocuments();

  const menuItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: BarChart3 },
    { id: 'all-documents', label: 'سجل الكتب', icon: FileText },
    { id: 'internal-departments', label: 'الأقسام', icon: Building2, roles: ['ADMIN', 'MANAGER'] },
    { id: 'incoming', label: 'وارد', icon: Inbox },
    { id: 'outgoing', label: 'صادر', icon: Send },
    { id: 'mailbox', label: 'البريد الداخلي', icon: Mail },
    { id: 'user-management', label: 'إدارة المستخدمين', icon: Users, roles: ['ADMIN'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || (userRole && item.roles.includes(userRole))
  );

  const getRoleLabel = () => {
    switch(userRole) {
      case 'ADMIN': return 'مسؤول النظام';
      case 'MANAGER': return 'إداري';
      case 'VIEWER': return 'مشاهد فقط';
      default: return 'جاري التحميل...';
    }
  };

  return (
    <aside className="w-full lg:w-80 h-full flex flex-col gap-6 font-sans">
      {/* Dynamic Brand Section */}
      <div className="glass-panel p-6 rounded-[2.5rem] flex items-center justify-between group cursor-default dark:bg-slate-900/70 dark:border-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 group-hover:rotate-12 transition-transform duration-500">
             <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
             <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">نظام الادارة والمتابعة</h1>
             <div className="flex items-center gap-1.5 mt-0.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{getRoleLabel()}</p>
             </div>
          </div>
        </div>
      </div>

      {/* Navigation Ecosystem */}
      <nav className="glass-panel flex-1 rounded-[2.5rem] p-4 flex flex-col justify-between overflow-hidden relative border-none ring-1 ring-slate-100 dark:ring-white/5">
        <div className="absolute top-0 right-0 w-full h-24 bg-gradient-to-b from-slate-50/50 dark:from-indigo-950/20 to-transparent pointer-events-none" />
        
        <div className="space-y-1.5 relative z-10">
          {filteredMenuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-[1.75rem] transition-all duration-300 group relative",
                  isActive 
                    ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-xl shadow-slate-900/20 dark:shadow-indigo-900/40 translate-x-[-1px]" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform group-active:scale-90",
                  isActive ? "text-indigo-400 dark:text-indigo-200" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                )} />
                <span className="text-sm font-black tracking-tight">{item.label}</span>
                
                {item.id === 'mailbox' && unreadMailCount > 0 && (
                  <span className="mr-auto bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm animate-bounce">
                    {unreadMailCount}
                  </span>
                )}

                {isActive && item.id !== 'mailbox' && (
                   <motion.div 
                     layoutId="active-indicator"
                     className="mr-auto w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                   />
                )}
              </button>
            );
          })}
        </div>

        {/* System & Access Footer */}
        <div className="space-y-1 pt-4 border-t border-slate-50 dark:border-slate-800 relative z-10">
          {userRole === 'ADMIN' && (
            <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white transition-all group">
              <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              <span className="text-sm font-bold">إعدادات النظام</span>
            </button>
          )}
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold">تسجيل الخروج</span>
          </button>
        </div>
      </nav>

      {/* Connectivity Status Capsule */}
      <div className="glass-panel p-5 rounded-[2rem] bg-indigo-50/20 dark:bg-indigo-900/10 border-none ring-1 ring-slate-100 dark:ring-slate-800 hidden lg:block">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">خادم النظام: متصل الآن</p>
          </div>
          
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
            <button 
              onClick={connectGoogleDrive}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                isGoogleDriveConnected 
                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 cursor-default" 
                  : "bg-indigo-600 text-white hover:bg-slate-900 dark:hover:bg-indigo-500 shadow-md shadow-indigo-100 dark:shadow-none active:scale-95"
              )}
            >
              <HardDrive className="w-3.5 h-3.5" />
              {isGoogleDriveConnected ? 'جوجل درايف: متصل' : 'ربط جوجل درايف'}
            </button>
            {!isGoogleDriveConnected && (
              <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-1.5 text-center">مطلوب لتخزين الملفات في مساحتك الشخصية</p>
            )}
          </div>
        </div>
      </div>

      {/* Developer Credit Footer */}
      <div className="text-center pb-2 opacity-40 hover:opacity-100 transition-opacity">
        <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          برمجة وتطوير: محمد خالد
        </p>
      </div>
    </aside>
  );
};
