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
  Mail,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

import { useDocuments } from '../context/DocumentContext';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onLogout?: () => void;
  unreadMailCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  onLogout, 
  unreadMailCount = 0,
  isCollapsed = false,
  onToggleCollapse
}) => {
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
    <aside className={cn(
      "w-full h-full flex flex-col gap-6 font-sans transition-all duration-300",
      isCollapsed ? "lg:w-24" : "lg:w-80"
    )}>
      {/* Dynamic Brand Section */}
      <div className={cn(
        "glass-panel rounded-[2.5rem] flex items-center justify-between group cursor-default bg-gradient-to-br from-white/90 via-white/80 to-indigo-50/20 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-indigo-950/20 border border-indigo-100/30 dark:border-white/5 shadow-xl transition-all duration-300",
        isCollapsed ? "p-4 justify-center flex-col gap-4" : "p-6"
      )}>
        <div className={cn("flex items-center", isCollapsed ? "flex-col gap-2" : "gap-4")}>
          <div className="w-12 h-12 shrink-0 bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 group-hover:rotate-12 transition-transform duration-500">
             <ShieldCheck className="w-7 h-7" />
          </div>
          {!isCollapsed && (
            <div className="animate-fadeIn">
               <h1 className="text-lg font-black text-slate-950 dark:text-white tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">نظام المراسلات والكتب</h1>
               <div className="flex items-center gap-1.5 mt-1">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                 </span>
                 <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest whitespace-nowrap">{getRoleLabel()}</p>
               </div>
            </div>
          )}
        </div>

        {/* Desktop Collapse/Expand Trigger Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              "hidden lg:flex w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700/80 transition-all cursor-pointer active:scale-90",
              isCollapsed && "mt-2"
            )}
            title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            {isCollapsed ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation Ecosystem */}
      <nav className="glass-panel flex-1 rounded-[2.5rem] p-4 flex flex-col justify-between overflow-hidden relative border border-slate-100 dark:border-white/5 dark:bg-slate-900/50">
        <div className="absolute top-0 right-0 w-full h-24 bg-gradient-to-b from-indigo-500/5 dark:from-indigo-950/10 to-transparent pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          {filteredMenuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  "w-full flex items-center rounded-2xl transition-all duration-350 ease-out group relative",
                  isCollapsed ? "lg:px-0 lg:justify-center lg:gap-0 h-12" : "px-5 py-3.5 gap-4",
                  isActive 
                    ? "bg-gradient-to-r from-slate-950 to-slate-900 dark:from-indigo-600 dark:to-indigo-500 text-white shadow-xl shadow-indigo-600/20 dark:shadow-indigo-500/30 translate-x-[-2px]" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-white"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-110 shrink-0",
                  isActive 
                    ? "text-indigo-400 dark:text-indigo-200" 
                    : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                )} />
                {!isCollapsed && (
                  <span className="text-sm font-bold tracking-tight whitespace-nowrap">{item.label}</span>
                )}
                
                {item.id === 'mailbox' && unreadMailCount > 0 && (
                  isCollapsed ? (
                    <span className="absolute top-1.5 left-2 bg-rose-500 text-white text-[8px] h-4 w-4 flex items-center justify-center font-black rounded-full ring-1 ring-white dark:ring-slate-900 shadow-sm animate-pulse">
                      {unreadMailCount}
                    </span>
                  ) : (
                    <span className="mr-auto bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-md animate-pulse">
                      {unreadMailCount}
                    </span>
                  )
                )}

                {isActive && item.id !== 'mailbox' && !isCollapsed && (
                   <motion.div 
                     layoutId="active-indicator"
                     className="mr-auto w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                   />
                )}
              </button>
            );
          })}
        </div>

        {/* System & Access Footer */}
        <div className="space-y-1 pt-4 border-t border-slate-100 dark:border-slate-800/60 relative z-10 mt-6">
          {userRole === 'ADMIN' && (
            <button 
              className={cn(
                "w-full flex items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-white transition-all group",
                isCollapsed ? "lg:px-0 lg:justify-center lg:gap-0 h-10" : "px-5 py-3.5 gap-4"
              )}
              title={isCollapsed ? "إعدادات النظام" : undefined}
            >
              <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500 shrink-0" />
              {!isCollapsed && <span className="text-sm font-bold whitespace-nowrap">إعدادات النظام</span>}
            </button>
          )}
          <button 
            onClick={onLogout}
            className={cn(
              "w-full flex items-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/10 hover:text-rose-600 transition-all group",
              isCollapsed ? "lg:px-0 lg:justify-center lg:gap-0 h-10" : "px-5 py-3.5 gap-4"
            )}
            title={isCollapsed ? "تسجيل الخروج" : undefined}
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform shrink-0" />
            {!isCollapsed && <span className="text-sm font-bold whitespace-nowrap">تسجيل الخروج</span>}
          </button>
        </div>
      </nav>

      {/* Connectivity Status Capsule */}
      <div className={cn(
        "glass-panel rounded-[2rem] bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/20 dark:border-white/5 hidden lg:flex shadow-md transition-all duration-300",
        isCollapsed ? "p-3 justify-center" : "p-5 flex-col gap-3"
      )}>
        {isCollapsed ? (
          <button 
            onClick={connectGoogleDrive}
            title={isGoogleDriveConnected ? 'جوجل درايف: متصل' : 'ربط ومزامنة جوجل درايف'}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative shrink-0",
              isGoogleDriveConnected 
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                : "bg-indigo-650 text-white shadow-md shadow-indigo-500/15"
            )}
          >
            <HardDrive className="w-4 h-4" />
            <span className={cn(
              "absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900",
              isGoogleDriveConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            )} />
          </button>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest whitespace-nowrap">المزامنة مع السحابة: نشطة</p>
            </div>
            
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-1">
              <button 
                onClick={connectGoogleDrive}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  isGoogleDriveConnected 
                    ? "bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20" 
                    : "bg-indigo-650 dark:bg-indigo-600 text-white hover:bg-indigo-750 dark:hover:bg-indigo-500 shadow-md shadow-indigo-500/15"
                )}
              >
                <HardDrive className="w-3.5 h-3.5" />
                {isGoogleDriveConnected ? 'جوجل درايف: متصل' : 'ربط ومزامنة جوجل درايف'}
              </button>
              {!isGoogleDriveConnected && (
                <p className="text-[8.5px] text-slate-450 dark:text-slate-500 font-bold mt-2 text-center leading-relaxed">يرجى تسجيل الدخول لحفظ ملفاتك في السحابة</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Developer Credit Footer */}
      <div className="text-center pb-2 opacity-35 hover:opacity-100 transition-opacity">
        <p className="text-[9px] font-black text-slate-450 dark:text-slate-550 uppercase tracking-widest">
          {isCollapsed ? 'م.خ' : 'تطوير وإشراف: محمد خالد'}
        </p>
      </div>
    </aside>
  );
};
