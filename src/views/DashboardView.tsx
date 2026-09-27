import React, { useState } from 'react';
import {
  Users,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  FileText,
  Calendar,
  Eye,
  Check,
  RotateCcw,
  School as SchoolIcon,
  Activity as ActivityIcon,
  Unlock,
  Lock,
  Printer,
  ChevronLeft,
  KeyRound,
  LogOut,
  Sparkles
} from 'lucide-react';
import { User, WeeklyProgram, ProgramItem, Week } from '../types';
import { storage } from '../services/storage';
import { SubmissionGauge, StatusDistributionBar, ActivityRankChart } from '../components/ChartComponent';
import { CountdownTimer } from '../components/CountdownTimer';
import { Modal } from '../components/Modal';
import { formatDate, formatTime } from '../utils/date';

interface DashboardViewProps {
  currentUser: User;
  onNavigate: (view: string, param?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, onNavigate }) => {
  const isAdmin = currentUser.role === 'Administrator';

  // Modal states for reviewing incoming programs from dashboard
  const [selectedProgram, setSelectedProgram] = useState<WeeklyProgram | null>(null);
  const [selectedItems, setSelectedItems] = useState<ProgramItem[]>([]);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);

  // Review action modal (Approve / Request Revision)
  const [showActionModal, setShowActionModal] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'Approve' | 'RequestRevision'>('Approve');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  const [refreshToggle, setRefreshToggle] = useState(0);

  const supervisors = storage.getSupervisors();
  const activeSupervisors = supervisors.filter(s => s.status === 'Active');
  const currentWeek = storage.getCurrentWeek();
  const currentYear = storage.getCurrentAcademicYear();
  const activities = storage.getActivities().filter(a => a.isActive);
  const schools = storage.getSchools().filter(s => s.isActive);

  // Compliance calculations for current week
  const compliance = storage.getComplianceReport(currentWeek?.id);

  // Supervisor specific data (Strictly isolated to their own supervisorId)
  const supervisorRecord = currentUser.supervisorId ? storage.getSupervisorById(currentUser.supervisorId) : undefined;
  
  const myPlanningProgram = currentWeek && supervisorRecord
    ? storage.getProgramBySupervisorAndWeek(supervisorRecord.id, currentWeek.id, 'Planning')
    : undefined;
  const myPlanningItems = myPlanningProgram ? storage.getProgramItems(myPlanningProgram.id) : [];

  const myActualProgram = currentWeek && supervisorRecord
    ? storage.getProgramBySupervisorAndWeek(supervisorRecord.id, currentWeek.id, 'Actual')
    : undefined;
  const myActualItems = myActualProgram ? storage.getProgramItems(myActualProgram.id) : [];

  // Toggle Planning submission for current week
  const handleTogglePlanning = () => {
    if (!currentWeek) return;
    storage.togglePlanningOpen(currentWeek.id, !currentWeek.planningOpen);
    setRefreshToggle(prev => prev + 1);
  };

  // Toggle Actual submission for current week
  const handleToggleActual = () => {
    if (!currentWeek) return;
    storage.toggleActualOpen(currentWeek.id, !currentWeek.actualOpen);
    setRefreshToggle(prev => prev + 1);
  };

  // Open modal to view program details
  const handleOpenProgramView = (prog: WeeklyProgram) => {
    setSelectedProgram(prog);
    setSelectedItems(storage.getProgramItems(prog.id));
    setShowViewModal(true);
  };

  // Open action modal for approve/revision
  const handleOpenAction = (prog: WeeklyProgram, type: 'Approve' | 'RequestRevision') => {
    setSelectedProgram(prog);
    setActionType(type);
    setActionError('');
    if (type === 'Approve') {
      setActionNotes('تم مراجعة واعتماد البرنامج الأسبوعي وهو متوافق مع معايير قسم الإشراف.');
    } else {
      setActionNotes('يرجى تعديل برنامج يوم الثلاثاء وإضافة النشاط الإشرافي لمتابعة المعلمين.');
    }
    setShowActionModal(true);
  };

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) return;

    if (actionType === 'RequestRevision' && !actionNotes.trim()) {
      setActionError('يجب كتابة ملاحظة التعديل لمساعدة المشرف.');
      return;
    }

    storage.reviewProgram(selectedProgram.id, currentUser, actionType, actionNotes);
    setShowActionModal(false);
    setShowViewModal(false);
    setRefreshToggle(prev => prev + 1);
  };

  // Incoming programs list for Admin
  const incomingList = storage.getIncomingPrograms();

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
              <span>العام الدراسي: {currentYear?.name || '2026-2027'}</span>
              <span>·</span>
              <span>{currentWeek ? currentWeek.name : 'لا يوجد أسبوع نشط حالياً'}</span>
              <span>·</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isAdmin
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
              }`}>
                {isAdmin ? 'مسؤول النظام (Administrator)' : 'مشرف تربوي (Supervisor)'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {isAdmin ? 'لوحة تحكم مسؤول النظام' : `لوحة المشرف التربوي - ${supervisorRecord?.name || currentUser.fullName}`}
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              {isAdmin
                ? 'لوحة إدارة ومتابعة دوام وبرامج المشرفين التربويين بمديرية يطا، واعتماد البرامج وإدارة الصلاحيات.'
                : 'بوابتك المستقلة لإدخال برنامج التخطيط الأسبوعي وإدخال البرنامج الفعلي ومتابعة تقاريرك الخاصة.'}
            </p>
          </div>

          {currentWeek ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 shrink-0 text-right">
              <div className="text-[11px] text-slate-300 mb-0.5">فترة الأسبوع الحالي:</div>
              <div className="text-xs font-bold text-white tabular-nums">
                من {currentWeek.startDate} إلى {currentWeek.endDate}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                <span className={`px-2 py-0.5 rounded-md font-bold ${currentWeek.planningOpen ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' : 'bg-rose-500/30 text-rose-200 border border-rose-400/40'}`}>
                  التخطيط: {currentWeek.planningOpen ? 'مفتوح' : 'مغلق'}
                </span>
                <span className={`px-2 py-0.5 rounded-md font-bold ${currentWeek.actualOpen ? 'bg-sky-500/30 text-sky-200 border border-sky-400/40' : 'bg-slate-500/30 text-slate-300 border border-slate-400/40'}`}>
                  الفعلي: {currentWeek.actualOpen ? 'مفتوح' : 'مغلق'}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/20 text-amber-200 text-xs font-bold p-3 rounded-xl border border-amber-400/30">
              لا يوجد أسبوع نشط حالياً، يرجى إنشاء وتفعيل أسبوع جديد.
            </div>
          )}
        </div>
      </div>

      {/* ===================== SUPERVISOR VIEW DASHBOARD ===================== */}
      {!isAdmin && (
        <div className="space-y-6">
          {/* Supervisor Status Alert */}
          {myPlanningProgram && myPlanningProgram.status === 'NeedsRevision' && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 shadow-xs text-amber-950">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold">مطلوب تعديل برنامج التخطيط من قبل مسؤول النظام</h3>
                  <p className="text-xs font-medium text-amber-900 mt-1.5 bg-white/80 p-3 rounded-xl border border-amber-200 leading-relaxed">
                    «{myPlanningProgram.reviewNotes || 'يرجى مراجعة وتعديل البرنامج وإعادة الإرسال'}»
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => onNavigate('planning-program')}
                      className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    >
                      فتح وتعديل برنامج التخطيط الآن
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Supervisor Dual Cards: Planning vs Actual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: برنامج التخطيط الأسبوعي */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      📋
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">برنامج التخطيط الأسبوعي</h3>
                      <p className="text-[11px] text-slate-400">يُسجل في بداية الأسبوع</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                    myPlanningProgram?.status === 'Submitted' || myPlanningProgram?.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : currentWeek?.planningOpen
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {myPlanningProgram?.status === 'Submitted' || myPlanningProgram?.status === 'Approved'
                      ? 'تم الإرسال'
                      : currentWeek?.planningOpen
                      ? 'مفتوح للإرسال'
                      : 'مغلق'}
                  </span>
                </div>

                <div className="py-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>عدد البنود المخططة:</span>
                    <span className="font-bold text-slate-900 tabular-nums">{myPlanningItems.length} بنود</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>حالة الإرسال:</span>
                    <span className="font-semibold text-slate-800">
                      {myPlanningProgram?.status === 'Submitted' || myPlanningProgram?.status === 'Approved'
                        ? 'تم إرسال البرنامج ومغلق للتعديل'
                        : currentWeek?.planningOpen
                        ? 'بإمكانك إدخال وإرسال البرنامج'
                        : 'فترة إرسال التخطيط مغلقة'}
                    </span>
                  </div>
                  {myPlanningProgram?.submittedAt && (
                    <div className="flex justify-between text-slate-600">
                      <span>تاريخ الإرسال:</span>
                      <span className="text-slate-500 tabular-nums">{formatDate(myPlanningProgram.submittedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('planning-program')}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>{myPlanningProgram?.status === 'Submitted' || myPlanningProgram?.status === 'Approved' ? 'عرض برنامج التخطيط' : 'إدخال برنامج التخطيط'}</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Card 2: البرنامج الفعلي */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                      ✅
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">البرنامج الفعلي</h3>
                      <p className="text-[11px] text-slate-400">يُسجل في نهاية الأسبوع</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                    myActualProgram?.status === 'Submitted' || myActualProgram?.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : currentWeek?.actualOpen
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {myActualProgram?.status === 'Submitted' || myActualProgram?.status === 'Approved'
                      ? 'تم الإرسال'
                      : currentWeek?.actualOpen
                      ? 'مفتوح للإرسال'
                      : 'لم يفتح بعد'}
                  </span>
                </div>

                <div className="py-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>عدد البنود الفعلية:</span>
                    <span className="font-bold text-slate-900 tabular-nums">{myActualItems.length} بنود</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>حالة الإرسال:</span>
                    <span className="font-semibold text-slate-800">
                      {myActualProgram?.status === 'Submitted' || myActualProgram?.status === 'Approved'
                        ? 'تم إرسال البرنامج الفعلي بنجاح'
                        : currentWeek?.actualOpen
                        ? 'بإمكانك إدخال وإرسال البرنامج الفعلي'
                        : 'فترة إرسال البرنامج الفعلي لم تفتح بعد'}
                    </span>
                  </div>
                  {myActualProgram?.submittedAt && (
                    <div className="flex justify-between text-slate-600">
                      <span>تاريخ الإرسال:</span>
                      <span className="text-slate-500 tabular-nums">{formatDate(myActualProgram.submittedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('actual-program')}
                className="w-full mt-2 py-2.5 px-4 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>{myActualProgram?.status === 'Submitted' || myActualProgram?.status === 'Approved' ? 'عرض البرنامج الفعلي' : 'إدخال البرنامج الفعلي'}</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Navigation for Supervisor */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 mb-3">الروابط السريعة:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('planning-program')}
                className="p-3 text-right rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
              >
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📋</span>
                  <span>برنامج التخطيط الأسبوعي</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">إدخال وإرسال الخطة</div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('actual-program')}
                className="p-3 text-right rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-colors"
              >
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>✅</span>
                  <span>البرنامج الفعلي</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">توثيق الدوام الفعلي</div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('my-reports')}
                className="p-3 text-right rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
              >
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📊</span>
                  <span>تقاريري والطباعة</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">استعراض كافة الأسابيع</div>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="p-3 text-right rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-colors"
              >
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🔐</span>
                  <span>تغيير كلمة المرور</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">أمان الحساب</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== ADMIN VIEW DASHBOARD ===================== */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Current Week Quick Controls Banner for Admin */}
          {currentWeek && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">التحكم في الأسبوع الحالي:</span>
                  <span className="font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    {currentWeek.name} ({currentWeek.startDate} إلى {currentWeek.endDate})
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  يمكنك فتح أو إغلاق إرسال برنامج التخطيط في بداية الأسبوع، وفتح البرنامج الفعلي في نهاية الأسبوع.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Planning Program Toggle Button */}
                <button
                  type="button"
                  onClick={handleTogglePlanning}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                    currentWeek.planningOpen
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {currentWeek.planningOpen ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>إغلاق إرسال برنامج التخطيط</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>فتح إرسال برنامج التخطيط</span>
                    </>
                  )}
                </button>

                {/* Actual Program Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleActual}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                    currentWeek.actualOpen
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}
                >
                  {currentWeek.actualOpen ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>إغلاق إرسال البرنامج الفعلي</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>فتح إرسال البرنامج الفعلي</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* The Statistical Metrics Cards requested in Requirement 4 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* 1. عدد المشرفين الإجمالي */}
            <div
              onClick={() => onNavigate('supervisors')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>عدد المشرفين</span>
                <Users className="w-4 h-4 text-slate-500" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                  {supervisors.length}
                </span>
                <span className="text-[11px] text-slate-400">مشرف</span>
              </div>
            </div>

            {/* 2. عدد المشرفين النشطين */}
            <div
              onClick={() => onNavigate('supervisors')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>المشرفون النشطون</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
                  {activeSupervisors.length}
                </span>
                <span className="text-[11px] text-emerald-600 font-bold">حساب فعّال</span>
              </div>
            </div>

            {/* 3. عدد المدارس */}
            <div
              onClick={() => onNavigate('schools')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>عدد المدارس</span>
                <SchoolIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                  {schools.length}
                </span>
                <span className="text-[11px] text-slate-400">مدرسة وروضة</span>
              </div>
            </div>

            {/* 4. عدد الفعاليات */}
            <div
              onClick={() => onNavigate('activities')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-purple-300 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>عدد الفعاليات</span>
                <ActivityIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                  {activities.length}
                </span>
                <span className="text-[11px] text-slate-400">فعالية معتمدة</span>
              </div>
            </div>

            {/* 5. برامج التخطيط المرسلة */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>برامج التخطيط المرسلة</span>
                <Send className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
                  {compliance.planningSubmittedCount}
                </span>
                <span className="text-[11px] text-slate-400">من {activeSupervisors.length}</span>
              </div>
            </div>

            {/* 6. برامج التخطيط غير المرسلة */}
            <div
              onClick={() => onNavigate('compliance-report')}
              className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs cursor-pointer hover:bg-rose-50/40 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
                <span>التخطيط غير المرسل</span>
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-rose-700 tabular-nums">
                  {compliance.planningUnsubmittedCount}
                </span>
                <span className="text-[11px] text-rose-600 font-bold">متابعة ←</span>
              </div>
            </div>

            {/* 7. البرامج الفعلية المرسلة */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>البرامج الفعلية المرسلة</span>
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-sky-700 tabular-nums">
                  {compliance.actualSubmittedCount}
                </span>
                <span className="text-[11px] text-slate-400">من {activeSupervisors.length}</span>
              </div>
            </div>

            {/* 8. البرامج الفعلية غير المرسلة */}
            <div
              onClick={() => onNavigate('compliance-report')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>الفعلي غير المرسل</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-700 tabular-nums">
                  {compliance.actualUnsubmittedCount}
                </span>
                <span className="text-[11px] text-amber-600 font-bold">متابعة ←</span>
              </div>
            </div>
          </div>

          {/* Compliance & Incoming Overview Row */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">متابعة إرسال البرامج للأسبوع الحالي</h2>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {currentWeek?.name || 'الأسبوع'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  جدول سريع يوضح التزام كل مشرف بإرسال برنامج التخطيط والبرنامج الفعلي.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('compliance-report')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0"
              >
                <span>الانتقال للتقرير الإحصائي الشامل للالتزام</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-3 px-4">اسم المشرف</th>
                    <th className="py-3 px-4">المبحث / التخصص</th>
                    <th className="py-3 px-4 text-center">برنامج التخطيط</th>
                    <th className="py-3 px-4 text-center">البرنامج الفعلي</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compliance.rows.slice(0, 8).map(row => (
                    <tr key={row.supervisorId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {row.supervisorName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {row.specialization}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {row.planningSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                            <span>مرسل ({row.planningItemsCount} بنود)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                            <span>✗ غير مرسل</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {row.actualSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-sky-700 font-bold bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                            <Check className="w-3.5 h-3.5" />
                            <span>مرسل ({row.actualItemsCount} بنود)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
                            <span>لم يرسل بعد</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onNavigate('reports', row.supervisorId)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          تقرير المشرف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
