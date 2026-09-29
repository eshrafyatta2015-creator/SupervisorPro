import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck2,
  AlertCircle,
  GraduationCap,
  School as SchoolIcon,
  Activity as ActivityIcon,
  CalendarDays,
  CalendarRange,
  FileSpreadsheet,
  Users2,
  FileText,
  Settings,
  Calendar,
  History,
  Bell,
  UserCheck,
  ChevronLeft
} from 'lucide-react';
import { User } from '../types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
}

interface SidebarProps {
  currentUser: User;
  activeView: string;
  onNavigate: (view: string) => void;
  unsubmittedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeView,
  onNavigate,
  unsubmittedCount = 0
}) => {
  const isAdmin = currentUser.role === 'Administrator';

  const adminNavItems: NavItem[] = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'program-review', label: 'متابعة البرامج الأسبوعية', icon: CalendarCheck2 },
    {
      id: 'unsubmitted-report',
      label: 'المشرفون الذين لم يرسلوا',
      icon: AlertCircle,
      badge: unsubmittedCount > 0 ? unsubmittedCount : undefined,
      badgeColor: 'bg-rose-600 text-white'
    },
    { id: 'supervisors', label: 'إدارة المشرفين', icon: GraduationCap },
    { id: 'schools', label: 'إدارة المدارس', icon: SchoolIcon },
    { id: 'activities', label: 'إدارة الأنشطة', icon: ActivityIcon },
    { id: 'weeks', label: 'إدارة الأسابيع', icon: CalendarDays },
    { id: 'academic-years', label: 'السنوات الدراسية', icon: CalendarRange },
    { id: 'reports', label: 'التقارير الشاملة', icon: FileSpreadsheet },
    { id: 'users', label: 'إدارة المستخدمين', icon: Users2 },
    { id: 'audit-logs', label: 'سجل العمليات', icon: FileText },
    { id: 'settings', label: 'الإعدادات والنسخ الاحتياطي', icon: Settings }
  ];

  const supervisorNavItems: NavItem[] = [
    { id: 'my-program', label: 'برنامج الأسبوع', icon: Calendar },
    { id: 'previous-programs', label: 'أرشيف البرامج السابقة', icon: History },
    { id: 'notifications', label: 'الإشعارات والتنبيهات', icon: Bell },
    { id: 'dashboard', label: 'لوحة الإحصائيات العامة', icon: LayoutDashboard },
    { id: 'profile', label: 'الملف الشخصي وكلمة المرور', icon: UserCheck }
  ];

  const navItems = isAdmin ? adminNavItems : supervisorNavItems;

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-l border-slate-800 shadow-md no-print">
      {/* Role identity badge */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
            {currentUser.fullName.charAt(0)}
          </div>
          <div className="truncate">
            <h4 className="text-sm font-bold text-white truncate">{currentUser.fullName}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className="text-[11px] text-slate-400 font-medium">
                {isAdmin ? 'مسؤول النظام (Admin)' : 'مشرف تربوي'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full tabular-nums ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/20 text-[11px] text-slate-400">
        <div className="font-semibold text-slate-300">مديرية يطا - فلسطين</div>
        <div className="text-[10px] text-slate-500 mt-0.5">الإصدار: v10.0 (ASP.NET Core / Web)</div>
      </div>
    </aside>
  );
};
