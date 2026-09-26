import React from 'react';
import {
  Users,
  School,
  CalendarDays,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  FileText
} from 'lucide-react';
import { User } from '../types';
import { storage } from '../services/storage';
import { SubmissionGauge, StatusDistributionBar, ActivityRankChart } from '../components/ChartComponent';
import { CountdownTimer } from '../components/CountdownTimer';
import { formatDate } from '../utils/date';

interface DashboardViewProps {
  currentUser: User;
  onNavigate: (view: string, param?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, onNavigate }) => {
  const isAdmin = currentUser.role === 'Administrator';

  const supervisors = storage.getSupervisors().filter(s => s.status === 'Active');
  const schools = storage.getSchools().filter(s => s.isActive);
  const currentWeek = storage.getCurrentWeek();
  const currentYear = storage.getCurrentAcademicYear();
  const programs = storage.getWeeklyPrograms();
  const activities = storage.getActivities();

  // Filter programs for current week
  const currentWeekPrograms = currentWeek
    ? programs.filter(p => p.weekId === currentWeek.id)
    : [];

  const submittedPrograms = currentWeekPrograms.filter(p => p.status === 'Submitted');
  const approvedPrograms = currentWeekPrograms.filter(p => p.status === 'Approved');
  const needsRevisionPrograms = currentWeekPrograms.filter(p => p.status === 'NeedsRevision');
  const draftPrograms = currentWeekPrograms.filter(p => p.status === 'Draft');

  // Any supervisor who has either no program record or status === 'Draft' is considered unsubmitted
  const submittedSupervisorIds = new Set(
    currentWeekPrograms
      .filter(p => p.status === 'Submitted' || p.status === 'Approved' || p.status === 'NeedsRevision' || p.status === 'UnderReview')
      .map(p => p.supervisorId)
  );

  const unsubmittedCount = Math.max(0, supervisors.length - submittedSupervisorIds.size);
  const totalSubmitted = submittedSupervisorIds.size;
  const submissionRate = supervisors.length > 0 ? Math.round((totalSubmitted / supervisors.length) * 100) : 0;

  // Supervisor specific data
  const supervisorRecord = currentUser.supervisorId ? storage.getSupervisorById(currentUser.supervisorId) : undefined;
  const myProgram = currentWeek && supervisorRecord
    ? storage.getProgramBySupervisorAndWeek(supervisorRecord.id, currentWeek.id)
    : undefined;
  const myItems = myProgram ? storage.getProgramItems(myProgram.id) : [];

  // Top activities calculation
  const allItems = currentWeekPrograms.flatMap(p => storage.getProgramItems(p.id));
  const activityCounts: Record<string, number> = {};
  allItems.forEach(i => {
    const act = activities.find(a => a.id === i.activityId);
    const name = act?.name || 'أخرى';
    activityCounts[name] = (activityCounts[name] || 0) + 1;
  });

  const sortedActivities = Object.entries(activityCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (sortedActivities.length === 0) {
    sortedActivities.push(
      { name: 'زيارة إشرافية', count: 12 },
      { name: 'متابعة معلم', count: 8 },
      { name: 'ورشة عمل', count: 5 },
      { name: 'متابعة خطة', count: 4 },
      { name: 'نشاط علاجي', count: 3 }
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
              <span>العام الدراسي: {currentYear?.name || '2026-2027'}</span>
              <span>·</span>
              <span>{currentWeek ? currentWeek.name : 'الأسبوع الدراسي'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              أهلاً وسهلاً، {currentUser.fullName}
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              {isAdmin
                ? 'مرحباً بك في لوحة الإدارة والمتابعة المركزية للبرامج الأسبوعية للمشرفين التربويين بمديرية يطا.'
                : 'مرحباً بك في بوابتك الإلكترونية لإعداد وإرسال البرامج الأسبوعية ومتابعة الاعتمادات.'}
            </p>
          </div>

          {currentWeek && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 shrink-0">
              <div className="text-[11px] text-slate-300 mb-1">حالة إرسال برامج الأسبوع الحالي:</div>
              {currentWeek.status === 'Open' ? (
                <CountdownTimer targetDate={currentWeek.closeSubmissionAt} variant="compact" />
              ) : currentWeek.status === 'Closed' ? (
                <span className="text-xs font-bold text-rose-300">مغلق - انتهت فترة الإرسال</span>
              ) : (
                <span className="text-xs font-bold text-amber-300">لم تبدأ فترة الإرسال بعد</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SUPERVISOR VIEW DASHBOARD */}
      {!isAdmin && (
        <div className="space-y-6">
          {/* Status Alert Banner */}
          {myProgram && myProgram.status === 'NeedsRevision' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-xs text-amber-950">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold">مطلوب تعديل البرنامج الأسبوعي من قبل رئيس القسم</h3>
                  <p className="text-xs font-medium text-amber-900 mt-1 bg-white/70 p-2.5 rounded-xl border border-amber-200">
                    «{myProgram.reviewNotes || 'يرجى مراجعة وتعديل البرنامج وإعادة الإرسال'}»
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => onNavigate('my-program')}
                      className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg shadow-xs"
                    >
                      تعديل البرنامج الآن وإعادة الإرسال
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stat Cards for Supervisor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold">حالة برنامجي الحالي</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-base font-extrabold text-slate-900">
                  {myProgram ? (
                    myProgram.status === 'Approved' ? 'معتمد رسمياً' :
                    myProgram.status === 'Submitted' ? 'تم الإرسال (قيد المراجعة)' :
                    myProgram.status === 'NeedsRevision' ? 'يحتاج تعديل' : 'مسودة'
                  ) : 'لم يتم البدء'}
                </span>
                <div className={`p-2 rounded-xl ${
                  myProgram?.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                  myProgram?.status === 'Submitted' ? 'bg-blue-50 text-blue-600' :
                  myProgram?.status === 'NeedsRevision' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                }`}>
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold">عدد الأنشطة المجدولة</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-2xl font-black text-slate-900 tabular-nums">{myItems.length}</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold">موعد إغلاق الإرسال</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {currentWeek ? formatDate(currentWeek.closeSubmissionAt) : '-'}
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center">
              <button
                type="button"
                onClick={() => onNavigate('my-program')}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>فتح جدول البرنامج الأسبوعي</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN VIEW DASHBOARD */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Central 8 Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* 1. Supervisors */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>المشرفون التربويون</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                  {supervisors.length}
                </span>
                <span className="text-[11px] text-slate-400">مشرف معتمد</span>
              </div>
            </div>

            {/* 2. Schools */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>مدارس المديرية</span>
                <School className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                  {schools.length}
                </span>
                <span className="text-[11px] text-slate-400">مدرسة وروضة</span>
              </div>
            </div>

            {/* 3. Submitted */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>البرامج المرسلة</span>
                <Send className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
                  {totalSubmitted}
                </span>
                <span className="text-[11px] text-slate-400">من {supervisors.length}</span>
              </div>
            </div>

            {/* 4. Unsubmitted */}
            <div
              onClick={() => onNavigate('unsubmitted-report')}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-xs cursor-pointer hover:bg-rose-50/30 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
                <span>لم يرسلوا بعد</span>
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-rose-700 tabular-nums">
                  {unsubmittedCount}
                </span>
                <span className="text-[11px] text-rose-500 font-bold">عرض القائمة ←</span>
              </div>
            </div>

            {/* 5. Under Review / Submitted */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>قيد المراجعة</span>
                <Clock className="w-4 h-4 text-sky-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-sky-700 tabular-nums">
                  {submittedPrograms.length}
                </span>
                <span className="text-[11px] text-slate-400">برنامج بانتظار التدقيق</span>
              </div>
            </div>

            {/* 6. Approved */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>البرامج المعتمدة</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-800 tabular-nums">
                  {approvedPrograms.length}
                </span>
                <span className="text-[11px] text-slate-400">معتمد نهائياً</span>
              </div>
            </div>

            {/* 7. Needs Revision */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>تحتاج إلى تعديل</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-700 tabular-nums">
                  {needsRevisionPrograms.length}
                </span>
                <span className="text-[11px] text-slate-400">تم إعادتها للمشرف</span>
              </div>
            </div>

            {/* 8. Rate */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>نسبة الإرسال الإجمالية</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                  {submissionRate}%
                </span>
                <span className="text-[11px] text-slate-400">للأسبوع الحالي</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Gauge */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">نسبة إرسال المشرفين</h3>
                <p className="text-xs text-slate-400 mt-0.5">مؤشر الإنجاز للأسبوع الحالي</p>
              </div>
              <SubmissionGauge
                rate={submissionRate}
                submittedCount={totalSubmitted}
                totalSupervisors={supervisors.length}
              />
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">حالة الإرسال:</span>
                <span className="font-bold text-emerald-700">
                  {submissionRate >= 80 ? 'ممتاز' : submissionRate >= 50 ? 'جيد' : 'قيد المتابعة'}
                </span>
              </div>
            </div>

            {/* Chart 2: Status Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">توزيع البرامج حسب الحالة</h3>
                <p className="text-xs text-slate-400 mt-0.5">تفصيل الحالات لجميع المشرفين</p>
              </div>
              <StatusDistributionBar
                items={[
                  { label: 'معتمد', count: approvedPrograms.length, colorClass: 'bg-emerald-600' },
                  { label: 'قيد المراجعة', count: submittedPrograms.length, colorClass: 'bg-sky-500' },
                  { label: 'يحتاج تعديل', count: needsRevisionPrograms.length, colorClass: 'bg-amber-500' },
                  { label: 'مسودة', count: draftPrograms.length, colorClass: 'bg-slate-400' },
                  { label: 'لم يرسل', count: unsubmittedCount, colorClass: 'bg-rose-500' }
                ]}
                total={supervisors.length}
              />
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate('program-review')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  الانتقال لجدول المتابعة والتدقيق ←
                </button>
              </div>
            </div>

            {/* Chart 3: Top Activities */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">الأنشطة الإشرافية الأكثر استخداماً</h3>
                <p className="text-xs text-slate-400 mt-0.5">تكرار الأنشطة في خطط هذا الأسبوع</p>
              </div>
              <ActivityRankChart activities={sortedActivities} />
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  عرض تقرير الأنشطة التفصيلي ←
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
