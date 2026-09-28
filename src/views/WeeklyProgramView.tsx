import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Send,
  Trash2,
  Calendar,
  School as SchoolIcon,
  Activity as ActivityIcon,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Printer,
  FileSpreadsheet,
  Search,
  Check,
  History,
  X,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  HelpCircle
} from 'lucide-react';
import {
  User,
  WeeklyProgram,
  ProgramItem,
  Week,
  School,
  Activity,
  Supervisor,
  PlanType,
  ProgramStatus,
  ProgramSubmissionHistory
} from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate, formatDateTime, getArabicDayName } from '../utils/date';
import { exportToExcel, triggerPrint } from '../utils/export';

interface WeeklyProgramViewProps {
  currentUser: User;
  initialPlanType?: PlanType;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const WeeklyProgramView: React.FC<WeeklyProgramViewProps> = ({
  currentUser,
  initialPlanType = 'Planning',
  onShowToast
}) => {
  const [activePlanType, setActivePlanType] = useState<PlanType>(initialPlanType);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [program, setProgram] = useState<WeeklyProgram | null>(null);
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Modals
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [showRevisionRequestModal, setShowRevisionRequestModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [submissionsHistory, setSubmissionsHistory] = useState<ProgramSubmissionHistory[]>([]);

  // Item Addition / Inline entry modal for specific day
  const [activeDayForAdd, setActiveDayForAdd] = useState<{ dayName: string; date: string } | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);

  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState(false);
  const [itemNote, setItemNote] = useState('');
  const [addError, setAddError] = useState('');

  const weeks = storage.getWeeks();
  const currentAcademicYear = storage.getCurrentAcademicYear();
  const allSchools = storage.getActiveSchools();
  const allActivities = storage.getActiveActivities();

  // Supervisor identification
  const supervisor: Supervisor | undefined = currentUser.supervisorId
    ? storage.getSupervisorById(currentUser.supervisorId)
    : storage.getSupervisors()[0]; // Fallback for admin preview

  // Initialize selected week
  useEffect(() => {
    const currentWeek = storage.getCurrentWeek();
    if (currentWeek) {
      setSelectedWeekId(currentWeek.id);
    } else if (weeks.length > 0) {
      setSelectedWeekId(weeks[0].id);
    }
  }, []);

  useEffect(() => {
    if (initialPlanType) {
      setActivePlanType(initialPlanType);
    }
  }, [initialPlanType]);

  const selectedWeek: Week | undefined = weeks.find(w => w.id === selectedWeekId);

  // Load program for supervisor + week + activePlanType
  const loadProgramData = () => {
    if (!supervisor || !selectedWeekId) return;

    if (activePlanType === 'Planning') {
      let p = storage.getProgramBySupervisorAndWeek(supervisor.id, selectedWeekId, 'Planning');
      if (!p) {
        const maxSubs = selectedWeek ? storage.getSupervisorMaxSubmissions(selectedWeek, supervisor.id, 'Planning') : 1;
        p = {
          id: `prog_plan_${supervisor.id}_${selectedWeekId}`,
          supervisorId: supervisor.id,
          academicYearId: selectedWeek?.academicYearId || currentAcademicYear?.id || 'year_2026_2027',
          weekId: selectedWeekId,
          planType: 'Planning',
          status: 'Draft',
          submissionCount: 0,
          maxSubmissions: maxSubs,
          editingAllowed: true,
          dayNotes: {},
          createdAt: new Date().toISOString()
        };
        storage.saveProgram(p);
      }
      setProgram(p);
      setItems(storage.getProgramItems(p.id));
      setDayNotes(p.dayNotes || {});
      setSubmissionsHistory(storage.getProgramSubmissions(p.id));
    } else {
      // Smart Actual Program: clones from planning baseline if not already created
      const { program: actProg, items: actItems } = storage.getOrCreateActualProgram(supervisor.id, selectedWeekId);
      setProgram(actProg);
      setItems(actItems);
      setDayNotes(actProg.dayNotes || {});
      setSubmissionsHistory(storage.getProgramSubmissions(actProg.id));
    }
  };

  useEffect(() => {
    loadProgramData();
  }, [selectedWeekId, supervisor?.id, activePlanType]);

  // Determine window & submission permission states
  const windowStatus = useMemo(() => {
    if (!selectedWeek) return { isOpen: false, reason: 'لا يوجد أسبوع محدد.' };
    return activePlanType === 'Planning'
      ? storage.isPlanningWindowOpen(selectedWeek)
      : storage.isActualWindowOpen(selectedWeek);
  }, [selectedWeek, activePlanType]);

  const maxSubmissions = useMemo(() => {
    if (!selectedWeek || !supervisor) return 1;
    return storage.getSupervisorMaxSubmissions(selectedWeek, supervisor.id, activePlanType);
  }, [selectedWeek, supervisor, activePlanType]);

  const submissionCount = program?.submissionCount || 0;
  const isSubmissionLimitReached = submissionCount >= maxSubmissions;

  // Status flags
  const isSubmitted = program?.status === 'Submitted' || program?.status === 'Approved' || program?.status === 'UnderReview';
  const isRevisionRequested = program?.status === 'RevisionRequested';
  const isEditingAllowed = program?.status === 'EditingAllowed' || program?.editingAllowed === true;
  const isDraft = !program || program.status === 'Draft';

  // Can the user edit the program items and notes right now?
  const canEdit = (isDraft || isEditingAllowed || program?.status === 'NeedsRevision') && !isRevisionRequested;

  // Days configuration for current week
  const requiredDays = useMemo(() => {
    if (!selectedWeek) return ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    return (selectedWeek.requiredDays && selectedWeek.requiredDays.length > 0)
      ? selectedWeek.requiredDays
      : ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  }, [selectedWeek]);

  // Compute fixed dates for each required day based on week startDate
  const weekDayDates = useMemo(() => {
    const list: { dayName: string; date: string }[] = [];
    if (!selectedWeek?.startDate) return list;
    const start = new Date(selectedWeek.startDate);

    requiredDays.forEach((dayName, idx) => {
      const cur = new Date(start);
      cur.setDate(start.getDate() + idx);
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const dd = String(cur.getDate()).padStart(2, '0');
      list.push({
        dayName,
        date: `${yyyy}-${mm}-${dd}`
      });
    });
    return list;
  }, [selectedWeek, requiredDays]);

  // Check which days have at least one valid item
  const daysCompletionStatus = useMemo(() => {
    const statusMap: Record<string, boolean> = {};
    requiredDays.forEach(day => {
      const hasItem = items.some(item =>
        (item.dayOfWeek === day || item.dayName === day) && item.schoolId && item.activityId
      );
      statusMap[day] = hasItem;
    });
    return statusMap;
  }, [items, requiredDays]);

  const missingDays = useMemo(() => {
    return requiredDays.filter(d => !daysCompletionStatus[d]);
  }, [requiredDays, daysCompletionStatus]);

  const isAllDaysCompleted = missingDays.length === 0;

  // Filtered schools & activities for search dropdown
  const filteredSchools = useMemo(() => {
    if (!schoolSearchQuery.trim()) return allSchools;
    const query = schoolSearchQuery.trim().toLowerCase();
    return allSchools.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.region && s.region.toLowerCase().includes(query))
    );
  }, [allSchools, schoolSearchQuery]);

  const filteredActivities = useMemo(() => {
    if (!activitySearchQuery.trim()) return allActivities;
    const query = activitySearchQuery.trim().toLowerCase();
    return allActivities.filter(a =>
      a.name.toLowerCase().includes(query) ||
      (a.code && a.code.toLowerCase().includes(query))
    );
  }, [allActivities, activitySearchQuery]);

  // Open modal to add item for a specific day
  const handleOpenAddForDay = (dayName: string, date: string) => {
    if (!canEdit) return;
    setActiveDayForAdd({ dayName, date });
    setSelectedSchoolId('');
    setSchoolSearchQuery('');
    setSelectedActivityId('');
    setActivitySearchQuery('');
    setItemNote('');
    setAddError('');
    setIsSchoolDropdownOpen(false);
    setIsActivityDropdownOpen(false);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !activeDayForAdd || !canEdit) return;

    if (!selectedSchoolId) {
      setAddError('يرجى اختيار المدرسة من القائمة المنسدلة.');
      return;
    }
    if (!selectedActivityId) {
      setAddError('يرجى اختيار نوع الفعالية أو النشاط.');
      return;
    }

    const newItem: ProgramItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      weeklyProgramId: program.id,
      dayOfWeek: activeDayForAdd.dayName,
      dayDate: activeDayForAdd.date,
      dayName: activeDayForAdd.dayName,
      schoolId: selectedSchoolId,
      activityId: selectedActivityId,
      notes: itemNote.trim(),
      sortOrder: items.length + 1,
      createdAt: new Date().toISOString()
    };

    storage.saveProgramItem(newItem);
    setItems(storage.getProgramItems(program.id));
    setActiveDayForAdd(null);
    onShowToast(`تمت إضافة الفعالية ليوم ${activeDayForAdd.dayName} بنجاح.`, 'success');
  };

  const handleDeleteItem = (itemId: string) => {
    if (!canEdit) return;
    storage.deleteProgramItem(itemId);
    if (program) {
      setItems(storage.getProgramItems(program.id));
      onShowToast('تم حذف البند من البرنامج.', 'info');
    }
  };

  const handleDayNoteChange = (dayName: string, note: string) => {
    if (!canEdit) return;
    const updated = { ...dayNotes, [dayName]: note };
    setDayNotes(updated);
    if (program) {
      program.dayNotes = updated;
      storage.saveProgram(program);
    }
  };

  const handleSaveDraft = () => {
    if (!program || !canEdit) return;
    setIsSavingDraft(true);
    program.dayNotes = dayNotes;
    program.status = program.status === 'NeedsRevision' ? 'NeedsRevision' : 'Draft';
    program.lastModifiedAt = new Date().toISOString();
    storage.saveProgram(program);

    setTimeout(() => {
      setIsSavingDraft(false);
      onShowToast('تم حفظ مسودة البرنامج بنجاح. يمكنك استكمالها في أي وقت.', 'success');
    }, 300);
  };

  const handleConfirmSubmit = () => {
    if (!program) return;
    const res = storage.submitWeeklyProgram(program.id, currentUser);
    setShowSubmitConfirmModal(false);

    if (res.success) {
      loadProgramData();
      onShowToast(
        activePlanType === 'Planning'
          ? 'تم إرسال برنامج التخطيط الأسبوعي بنجاح إلى مسؤول النظام.'
          : 'تم إرسال البرنامج الفعلي بنجاح إلى مسؤول النظام.',
        'success'
      );
    } else {
      onShowToast(res.error || 'تعذر إرسال البرنامج.', 'error');
    }
  };

  const handleSendRevisionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !supervisor || !revisionReason.trim()) return;

    const res = storage.requestProgramRevision(program.id, supervisor, revisionReason.trim());
    setShowRevisionRequestModal(false);
    setRevisionReason('');

    if (res.success) {
      loadProgramData();
      onShowToast('تم إرسال طلب التعديل إلى مسؤول النظام وبانتظار الموافقة.', 'warning');
    } else {
      onShowToast(res.error || 'تعذر إرسال طلب التعديل.', 'error');
    }
  };

  const handleExportExcelProgram = () => {
    if (!program || !selectedWeek) return;
    const headers = ['اليوم', 'التاريخ', 'المدرسة', 'الفعالية / النشاط', 'ملاحظات البند', 'ملاحظات اليوم العامة'];
    const rows = items.map(item => {
      const sch = allSchools.find(s => s.id === item.schoolId)?.name || '-';
      const act = allActivities.find(a => a.id === item.activityId)?.name || '-';
      const dayNote = dayNotes[item.dayOfWeek || item.dayName || ''] || '-';
      return [
        item.dayOfWeek || item.dayName || '-',
        item.dayDate || '-',
        sch,
        act,
        item.notes || '-',
        dayNote
      ];
    });

    const filename = `${activePlanType === 'Planning' ? 'برنامج_التخطيط' : 'البرنامج_الفعلي'}_${supervisor?.name || 'مشرف'}_${selectedWeek.name}`;
    exportToExcel(filename, headers, rows);
  };

  // Helper for Status Badge styling
  const getStatusBadge = (status: ProgramStatus = 'Draft') => {
    switch (status) {
      case 'Approved':
        return { label: 'معتمد', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-600' };
      case 'Submitted':
        return { label: 'تم الإرسال – بانتظار الاعتماد', bg: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-600' };
      case 'UnderReview':
        return { label: 'قيد المراجعة والتدقيق', bg: 'bg-sky-100 text-sky-800 border-sky-300', dot: 'bg-sky-600' };
      case 'NeedsRevision':
        return { label: 'مطلوب تعديل من المسؤول', bg: 'bg-amber-100 text-amber-900 border-amber-300', dot: 'bg-amber-600' };
      case 'EditingAllowed':
        return { label: 'مسموح بالتعديل – مفتوح', bg: 'bg-purple-100 text-purple-900 border-purple-300', dot: 'bg-purple-600' };
      case 'RevisionRequested':
        return { label: 'بانتظار موافقة المسؤول على طلب التعديل', bg: 'bg-orange-100 text-orange-900 border-orange-300', dot: 'bg-orange-600' };
      case 'Closed':
        return { label: 'مغلق', bg: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-600' };
      default:
        return { label: 'مسودة قيد الإعداد', bg: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' };
    }
  };

  const statusBadge = getStatusBadge(program?.status);

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Dual Phase Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActivePlanType('Planning')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activePlanType === 'Planning'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>📋</span>
            <span>1. برنامج التخطيط الأسبوعي</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlanType('Actual')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activePlanType === 'Actual'
                ? 'bg-sky-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>✅</span>
            <span>2. البرنامج الفعلي (الميداني)</span>
          </button>
        </div>

        {/* Week Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 shrink-0">الأسبوع:</span>
          <select
            value={selectedWeekId}
            onChange={(e) => setSelectedWeekId(e.target.value)}
            className="w-full sm:w-auto text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
          >
            {weeks.map(w => (
              <option key={w.id} value={w.id}>
                {w.name} ({formatDate(w.startDate)} - {formatDate(w.endDate)}) {w.isActive ? '★ الحالي' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Program Information & Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.bg}`}>
                <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                {statusBadge.label}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {activePlanType === 'Planning' ? 'خطة الأسبوع' : 'التنفيذ الفعلي'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              {activePlanType === 'Planning' ? 'برنامج التخطيط الأسبوعي' : 'البرنامج الفعلي'} – {supervisor?.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {selectedWeek?.name} | السنة الدراسية: {currentAcademicYear?.name} | من {formatDate(selectedWeek?.startDate)} إلى {formatDate(selectedWeek?.endDate)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcelProgram}
              className="px-3 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>تصدير Excel</span>
            </button>
            <button
              type="button"
              onClick={() => triggerPrint()}
              className="px-3 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>طباعة</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="سجل الإرسال السابق"
            >
              <History className="w-4 h-4 text-slate-600" />
              <span>سجل الإرسال ({submissionsHistory.length})</span>
            </button>
          </div>
        </div>

        {/* Timing Window & Submission Limits Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-500 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[11px]">حالة فترة الإرسال:</span>
              <span className={`font-bold ${windowStatus.isOpen ? 'text-emerald-700' : 'text-rose-600'}`}>
                {windowStatus.isOpen ? 'مفتوحة حالياً للإرسال' : (windowStatus.reason || 'مغلقة')}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <Send className="w-5 h-5 text-slate-500 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[11px]">مرات الإرسال المسموحة:</span>
              <span className="font-bold text-slate-800">
                تم الإرسال {submissionCount} من أصل {maxSubmissions} مرات
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <CheckCircle2 className={`w-5 h-5 shrink-0 ${isAllDaysCompleted ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div>
              <span className="text-slate-400 block text-[11px]">اكتمال الأيام المطلوبة:</span>
              <span className={`font-bold ${isAllDaysCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isAllDaysCompleted
                  ? `مكتمل (${requiredDays.length}/${requiredDays.length} أيام)`
                  : `متبقي ${missingDays.length} أيام (${missingDays.join('، ')})`}
              </span>
            </div>
          </div>
        </div>

        {/* Alert when Reviewer requested revision */}
        {program?.status === 'NeedsRevision' && program.reviewNotes && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">ملاحظات مسؤول النظام لإجراء التعديل:</p>
              <p className="mt-1 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-amber-200">
                «{program.reviewNotes}»
              </p>
            </div>
          </div>
        )}

        {/* Notice when Editing was allowed */}
        {isEditingAllowed && (
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <span>تم السماح لك بتعديل البرنامج من قبل مسؤول النظام. يمكنك إجراء التعديلات ثم إعادة الإرسال.</span>
          </div>
        )}

        {/* Notice when Actual Program auto-seeded from Planning */}
        {activePlanType === 'Actual' && (
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>التوثيق الفعلي للدوام والمهمات:</strong> تم توليد البرنامج الفعلي تلقائياً بناءً على ما قمت بالتخطيط له مسبقاً.
              يمكنك الآن تعديل المدرسة الفعلية، الفعالية المنفذة، أو إضافة مهمات ومدارس أخرى لما تم تنفيذه فعلياً مع الحفاظ التام على نسختك المخططة الأصلية.
            </div>
          </div>
        )}
      </div>

      {/* Main Day-By-Day Schedule Table */}
      <div className="space-y-4">
        {weekDayDates.map(({ dayName, date }) => {
          const dayItems = items.filter(i => (i.dayOfWeek === dayName || i.dayName === dayName));
          const isDayComplete = dayItems.length > 0;
          const currentDayNote = dayNotes[dayName] || '';

          return (
            <div
              key={dayName}
              className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-xs ${
                isDayComplete ? 'border-slate-200' : 'border-amber-300 bg-amber-50/20'
              }`}
            >
              {/* Day Header */}
              <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
                isDayComplete ? 'bg-slate-50/80 border-slate-200' : 'bg-amber-100/40 border-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isDayComplete ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {dayName.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{dayName}</h3>
                      <span className="text-xs text-slate-500 font-mono" dir="ltr">
                        {date}
                      </span>
                      {isDayComplete ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" />
                          <span>مكتمل ({dayItems.length} بنود)</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          ⚠️ مطلوب تعبئة هذا اليوم
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add actions for this day */}
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAddForDay(dayName, date)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{dayItems.length === 0 ? 'إضافة مدرسة وفعالية' : '+ مدرسة / فعالية أخرى'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Day Items List */}
              <div className="p-4 space-y-3">
                {dayItems.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                    <Calendar className="w-6 h-6 mx-auto mb-1 text-slate-300 stroke-[1.5]" />
                    <p className="font-medium text-slate-600">لم يتم تسجيل أي مهمة أو مدرسة ليوم {dayName}</p>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddForDay(dayName, date)}
                        className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
                      >
                        اضغط هنا لإضافة مدرسة وفعالية لهذا اليوم
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayItems.map((item, idx) => {
                      const school = allSchools.find(s => s.id === item.schoolId);
                      const activity = allActivities.find(a => a.id === item.activityId);
                      const plannedSchool = item.plannedSchoolId ? allSchools.find(s => s.id === item.plannedSchoolId) : undefined;
                      const plannedActivity = item.plannedActivityId ? allActivities.find(a => a.id === item.plannedActivityId) : undefined;

                      const isChanged = activePlanType === 'Actual' && (
                        (item.plannedSchoolId && item.plannedSchoolId !== item.schoolId) ||
                        (item.plannedActivityId && item.plannedActivityId !== item.activityId)
                      );

                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex-1 space-y-1">
                            {/* In Actual view, show planned baseline if exists */}
                            {activePlanType === 'Actual' && (plannedSchool || plannedActivity) && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                                <span className="font-semibold text-slate-500">المخطط الأصلي:</span>
                                <span>{plannedSchool?.name || '-'}</span>
                                <span>•</span>
                                <span>{plannedActivity?.name || '-'}</span>
                                {isChanged && (
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                                    تم تعديل التنفيذ الفعلي
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <SchoolIcon className="w-3.5 h-3.5 text-blue-600" />
                                {school?.name || 'مدرسة غير محددة'}
                              </span>

                              <span className="text-slate-300">|</span>

                              <span className="font-bold text-emerald-800 text-xs flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                <ActivityIcon className="w-3.5 h-3.5 text-emerald-600" />
                                {activity?.name || 'فعالية غير محددة'}
                              </span>

                              {school?.region && (
                                <span className="text-[11px] text-slate-400">
                                  ({school.region})
                                </span>
                              )}
                            </div>

                            {item.notes && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                <span className="text-slate-400">ملاحظة البند:</span> {item.notes}
                              </p>
                            )}
                          </div>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors self-end md:self-auto cursor-pointer"
                              title="حذف هذا البند"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Day Notes Field */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    ملاحظات يوم {dayName}:
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={currentDayNote}
                    onChange={(e) => handleDayNoteChange(dayName, e.target.value)}
                    placeholder={`ملاحظات عامة حول برنامج يوم ${dayName} (مثل: متابعة الخطة العلاجية، اجتماع مديري المدارس...)`}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-4 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 z-20">
        <div>
          {isAllDaysCompleted ? (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>اكتملت تعبئة جميع الأيام المحددة ({requiredDays.length} من {requiredDays.length}). البرنامج جاهز للإرسال.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                يلزم استكمال تعبئة جميع الأيام المحددة من المسؤول قبل الإرسال. الأيام المتبقية: ({missingDays.join('، ')}).
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Save Draft Button */}
          {canEdit && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              {isSavingDraft ? 'جارٍ الحفظ...' : 'حفظ كمسودة'}
            </button>
          )}

          {/* Submit Program Button */}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                if (!isAllDaysCompleted) {
                  onShowToast(
                    `لا يمكن إرسال البرنامج، يرجى استكمال بيانات جميع الأيام المحددة من قبل المسؤول: (${missingDays.join('، ')})`,
                    'error'
                  );
                  return;
                }
                setShowSubmitConfirmModal(true);
              }}
              disabled={!isAllDaysCompleted || isSubmissionLimitReached}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer ${
                isAllDaysCompleted && !isSubmissionLimitReached
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                  : 'bg-slate-300 cursor-not-allowed opacity-60'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>إرسال البرنامج للمسؤول</span>
            </button>
          )}

          {/* Request Revision Button */}
          {!canEdit && (isSubmitted || isSubmissionLimitReached) && (
            <button
              type="button"
              onClick={() => setShowRevisionRequestModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>طلب تعديل البرنامج من المسؤول</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================== MODALS ===================== */}

      {/* 1. Add School & Activity Entry Modal */}
      <Modal
        isOpen={activeDayForAdd !== null}
        onClose={() => setActiveDayForAdd(null)}
        title={`إضافة مدرسة وفعالية – يوم ${activeDayForAdd?.dayName || ''}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
            <span className="font-bold text-slate-800">اليوم والتاريخ:</span>
            <span className="font-mono text-emerald-800 font-bold" dir="ltr">
              {activeDayForAdd?.dayName} – {activeDayForAdd?.date}
            </span>
          </div>

          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {addError}
            </div>
          )}

          {/* Searchable School Dropdown */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المدرسة أو المؤسسة التعليمية <span className="text-rose-500">*</span>
            </label>
            <div
              onClick={() => setIsSchoolDropdownOpen(true)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white cursor-pointer flex items-center justify-between"
            >
              <span className={selectedSchoolId ? 'font-bold text-slate-900' : 'text-slate-400'}>
                {selectedSchoolId
                  ? allSchools.find(s => s.id === selectedSchoolId)?.name
                  : 'ابحث واختر المدرسة من القائمة...'}
              </span>
              <Search className="w-4 h-4 text-slate-400" />
            </div>

            {isSchoolDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-2 border-b border-slate-100">
                  <input
                    type="text"
                    value={schoolSearchQuery}
                    onChange={(e) => setSchoolSearchQuery(e.target.value)}
                    placeholder="اكتب للبحث باسم المدرسة أو المنطقة..."
                    autoFocus
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                  {filteredSchools.map(sch => (
                    <div
                      key={sch.id}
                      onClick={() => {
                        setSelectedSchoolId(sch.id);
                        setIsSchoolDropdownOpen(false);
                      }}
                      className="p-2.5 hover:bg-emerald-50/60 cursor-pointer text-xs flex items-center justify-between"
                    >
                      <span className="font-bold text-slate-800">{sch.name}</span>
                      <span className="text-[11px] text-slate-400">{sch.region}</span>
                    </div>
                  ))}
                  {filteredSchools.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">لا توجد مدرسة مطابقة</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Searchable Activity Dropdown */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              نوع النشاط أو المهمة الإشرافية <span className="text-rose-500">*</span>
            </label>
            <div
              onClick={() => setIsActivityDropdownOpen(true)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white cursor-pointer flex items-center justify-between"
            >
              <span className={selectedActivityId ? 'font-bold text-emerald-800' : 'text-slate-400'}>
                {selectedActivityId
                  ? allActivities.find(a => a.id === selectedActivityId)?.name
                  : 'اختر نوع الفعالية...'}
              </span>
              <ActivityIcon className="w-4 h-4 text-slate-400" />
            </div>

            {isActivityDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-2 border-b border-slate-100">
                  <input
                    type="text"
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    placeholder="بحث في الأنشطة..."
                    autoFocus
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                  {filteredActivities.map(act => (
                    <div
                      key={act.id}
                      onClick={() => {
                        setSelectedActivityId(act.id);
                        setIsActivityDropdownOpen(false);
                      }}
                      className="p-2.5 hover:bg-emerald-50/60 cursor-pointer text-xs flex items-center justify-between"
                    >
                      <span className="font-bold text-slate-800">{act.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{act.code}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظة تفصيلية حول هذا البند (اختياري)
            </label>
            <input
              type="text"
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              placeholder="مثال: متابعة معلمي الرياضيات الجدد، تدريب الصف العاشر..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveDayForAdd(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
            >
              حفظ وإضافة البند
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. Submit Confirmation Modal (Section 10 prompt requirement) */}
      <Modal
        isOpen={showSubmitConfirmModal}
        onClose={() => setShowSubmitConfirmModal(false)}
        title="تأكيد إرسال البرنامج الأسبوعي"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed space-y-1.5">
              <p className="font-bold text-sm">
                هل أنت متأكد من إرسال {activePlanType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'}؟
              </p>
              <p>
                بعد الإرسال لن تستطيع تعديل البرنامج إلا إذا سمح لك مسؤول النظام بذلك.
              </p>
              <p className="text-[11px] text-amber-800 font-semibold">
                مرات الإرسال المتبقية بعد هذا الإرسال: {Math.max(0, maxSubmissions - (submissionCount + 1))} مرة.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowSubmitConfirmModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>تأكيد الإرسال الآن</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. Request Revision Modal (Section 12 & 19 prompt requirement) */}
      <Modal
        isOpen={showRevisionRequestModal}
        onClose={() => setShowRevisionRequestModal(false)}
        title="طلب السماح بتعديل البرنامج"
        maxWidth="md"
      >
        <form onSubmit={handleSendRevisionRequest} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            البرنامج مقفل حالياً. يمكنك إرسال طلب إلى مسؤول النظام لتوضيح سبب الحاجة لتعديل البرنامج والسماح لك بإعادة فتحه.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              سبب طلب التعديل <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="مثال: حدث تغيير في المدرسة والفعالية المقررة ليوم الثلاثاء بسبب نشاط طارئ..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowRevisionRequestModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
            >
              إرسال طلب التعديل
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Submissions History Modal (Section 30 prompt requirement) */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="سجل الإرسال والإصدارات السابقة"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {submissionsHistory.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">لم يتم تسجيل أي عمليات إرسال سابقة بعد.</p>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">رقم الإرسال</th>
                    <th className="py-2.5 px-3">تاريخ ووقت الإرسال</th>
                    <th className="py-2.5 px-3">بواسطة</th>
                    <th className="py-2.5 px-3">عدد البنود</th>
                    <th className="py-2.5 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissionsHistory.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">الإرسال #{sub.submissionNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{formatDateTime(sub.submittedAt)}</td>
                      <td className="py-2.5 px-3">{sub.submittedBy}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-800">{sub.itemCount} بند</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          تم الإرسال
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
            >
              إغلاق
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
