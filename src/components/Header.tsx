import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  LogOut,
  User as UserIcon,
  Shield,
  ChevronDown,
  Clock,
  Check,
  ExternalLink,
  Users
} from 'lucide-react';
import { User, Notification } from '../types';
import { storage } from '../services/storage';
import { YATTA_LOGO } from '../assets/logo';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
  onNavigate: (view: string, param?: string) => void;
  onUserSwitched?: (user: User) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onNavigate,
  onUserSwitched
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshNotifications = () => {
    setNotifications(storage.getNotifications(currentUser.id));
  };

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    storage.markAllNotificationsAsRead(currentUser.id);
    refreshNotifications();
  };

  const handleNotificationClick = (notif: Notification) => {
    storage.markNotificationAsRead(notif.id);
    refreshNotifications();
    setShowNotifications(false);
    if (currentUser.role === 'Supervisor') {
      onNavigate('my-program');
    } else {
      onNavigate('program-review');
    }
  };

  const allUsers = storage.getUsers();

  const handleQuickSwitchUser = (targetUserId: string) => {
    const target = storage.getUserById(targetUserId);
    if (target && onUserSwitched) {
      storage.saveUser(target);
      localStorage.setItem('wsp_session', JSON.stringify(target));
      onUserSwitched(target);
      setShowUserMenu(false);
    }
  };

  const timeFormatted = currentTime.toLocaleTimeString('ar-PS', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Directorate Identity */}
          <div className="flex items-center gap-3.5">
            <img
              src={YATTA_LOGO}
              alt="شعار مديرية التربية والتعليم يطا"
              className="w-11 h-11 rounded-full object-cover shadow-xs border border-emerald-600/30"
              onError={(e) => {
                // Fallback styled crest if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 tracking-tight">مديرية التربية والتعليم يطا</span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  قسم الإشراف والتأهيل التربوي
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">نظام إدارة البرامج الأسبوعية للمشرفين</p>
            </div>
          </div>

          {/* Right Action Zone */}
          <div className="flex items-center gap-3">
            {/* Asia/Hebron Time */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>توقيت فلسطين:</span>
              <span className="font-bold text-slate-700">{timeFormatted}</span>
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                title="خيارات الحساب"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline text-slate-600">الحساب:</span>
                <span className="text-emerald-700 font-bold max-w-[120px] truncate">{currentUser.fullName}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in text-right">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-800">{currentUser.fullName}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">@{currentUser.username}</p>
                    <div className="mt-1">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        currentUser.role === 'Administrator'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {currentUser.role === 'Administrator' ? 'مسؤول النظام (Administrator)' : 'مشرف تربوي (Supervisor)'}
                      </span>
                    </div>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('profile');
                      }}
                      className="w-full text-right text-xs text-slate-700 hover:text-emerald-800 p-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>الملف الشخصي وتغيير كلمة المرور</span>
                    </button>

                    {currentUser.role === 'Administrator' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigate('supervisors');
                        }}
                        className="w-full text-right text-xs text-slate-700 hover:text-emerald-800 p-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>إدارة حسابات المشرفين</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-right text-xs text-rose-700 hover:bg-rose-50 p-2 rounded-lg flex items-center gap-2 transition-colors font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>تسجيل الخروج والتبديل لمستخدم آخر</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="الإشعارات"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-scale-up">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">الإشعارات</span>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                          {unreadCount} غير مقروء
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
                      >
                        تحديد الكل كمقروء
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">لا توجد إشعارات حالياً</div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                            !notif.isRead ? 'bg-slate-50/80 font-medium' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(notif.createdAt).toLocaleDateString('ar-PS')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Info & Logout Button */}
            <div className="flex items-center gap-2 pr-1 border-r border-slate-200">
              <div className="text-right hidden sm:block pr-1">
                <div className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{currentUser.fullName}</div>
                <div className="text-[10px] text-emerald-700 font-semibold">
                  {currentUser.role === 'Administrator' ? 'مسؤول النظام' : 'مشرف تربوي'}
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/80 transition-colors text-xs font-bold shadow-2xs"
                title="تسجيل الخروج وإنهاء الجلسة بالكامل"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
