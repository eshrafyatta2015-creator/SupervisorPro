import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Send,
  Trash2,
  Calendar,
  School as SchoolIcon,
  Activity as ActivityIcon,
  CheckCircle2,
  AlertTriangle,
  Unlock,
  Printer,
  FileSpreadsheet,
  Check,
  History,
  X,
  Clock,
  Sparkles,
  Info,
  HelpCircle,
  Save,
  LayoutGrid,
  List,
  AlertCircle
} from 'lucide-react';
import {
  User,
  WeeklyProgram,
  ProgramItem,
  Week,
  Supervisor,
  PlanType,
  ProgramStatus,
  ProgramSubmissionHistory
} from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { SearchableSelect, SelectOption } from '../components/SearchableSelect';
import { CountdownTimer } from '../components/CountdownTimer';
import { formatDate, formatDateTime } from '../utils/date';
import { exportToExcel, triggerPrint } from '../utils/export';
import { YATTA_LOGO } from '../assets/logo';

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [showRevisionRequestModal, setShowRevisionRequestModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [submissionsHistory, setSubmissionsHistory] = useState<ProgramSubmissionHistory[]>([]);

  const weeks = storage.getWeeks();
  const currentAcademicYear = storage.getCurrentAcademicYear();
  const allSchools = storage.getActiveSchools();
  const allActivities = storage.getActiveActivities();

  // Supervisor identification
  const supervisor: Supervisor | undefined = currentUser.supervisorId
    ? storage.getSupervisorById(currentUser.supervisorId)
    : storage.getSupervisors()[0];

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

  // Prepare searchable select options
  const schoolOptions: SelectOption[] = useMemo(() => {
    return allSchools.map(s => ({
      id: s.id,
      label: s.name,
      subLabel: s.region,
      badge: s.type || s.stage
    }));
  }, [allSchools]);

  const activityOptions: SelectOption[] = useMemo(() => {
    return allActivities.map(a => ({
      id: a.id,
      label: a.name,
      subLabel: a.description,
      badge: a.code
    }));
  }, [allActivities]);

  // Load program data
  const loadProgramData = () => {
    if (!supervisor || !selectedWeekId) return;

    if (activePlanType === 'Planning') {
      let p = storage.getProgramBySupervisorAndWeek(supervisor.id, selectedWeekId, 'Planning');
      if (!p) {
        const maxSubs = selectedWeek ? storage.getSupervisorMaxSubmissions(selectedWeek, supervisor.id, 'Planning') : 2;
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
      const { program: actProg, items: actItems } = storage.getOrCreateActualProgram(supervisor.id, selectedWeekId);
      setProgram(actProg);
      setItems(actItems);
      setDayNotes(actProg.dayNotes || {});
      setSubmissionsHistory(storage.getProgramSubmissions(actProg.id));
    }
    setHasUnsavedChanges(false);
  };

  useEffect(() => {
    loadProgramData();
  }, [selectedWeekId, supervisor?.id, activePlanType]);

  // Window status & permissions
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

  const canEdit = (isDraft || isEditingAllowed || program?.status === 'NeedsRevision') && !isRevisionRequested;

  // Required Days for selected week
  const requiredDays = useMemo(() => {
    if (!selectedWeek) return ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    return (selectedWeek.requiredDays && selectedWeek.requiredDays.length > 0)
      ? selectedWeek.requiredDays
      : ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  }, [selectedWeek]);

  // Fixed dates for each required day based on week startDate
  const weekDayDates = useMemo(() => {
    const list: { dayName: string; date: string; dateFormatted: string; fullArabicDate: string }[] = [];
    if (!selectedWeek?.startDate) return list;
    const start = new Date(selectedWeek.startDate);

    requiredDays.forEach((dayName, idx) => {
      const cur = new Date(start);
      cur.setDate(start.getDate() + idx);
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const dd = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dateFormatted = `${dd} / ${mm} / ${yyyy}`;

      const fullArabicDate = cur.toLocaleDateString('ar-PS', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      list.push({
        dayName,
        date: dateStr,
        dateFormatted,
        fullArabicDate
      });
    });
    return list;
  }, [selectedWeek, requiredDays]);

  // Check completion per day (at least one activity with school + activity chosen)
  const daysCompletionStatus = useMemo(() => {
    const statusMap: Record<string, boolean> = {};
    requiredDays.forEach(day => {
      const hasValidItem = items.some(item =>
        (item.dayOfWeek === day || item.dayName === day) && item.schoolId && item.activityId
      );
      statusMap[day] = hasValidItem;
    });
    return statusMap;
  }, [items, requiredDays]);

  const completedDaysCount = useMemo(() => {
    return requiredDays.filter(d => daysCompletionStatus[d]).length;
  }, [requiredDays, daysCompletionStatus]);

  const missingDays = useMemo(() => {
    return requiredDays.filter(d => !daysCompletionStatus[d]);
  }, [requiredDays, daysCompletionStatus]);

  const completionPercentage = useMemo(() => {
    if (requiredDays.length === 0) return 0;
    return Math.round((completedDaysCount / requiredDays.length) * 100);
  }, [completedDaysCount, requiredDays.length]);

  const isAllDaysCompleted = missingDays.length === 0 && requiredDays.length > 0;

  // Closing target date for Countdown timer
  const closingTargetDate = useMemo(() => {
    if (!selectedWeek) return null;
    return activePlanType === 'Planning'
      ? selectedWeek.planningCloseAt || selectedWeek.closeSubmissionAt || null
      : selectedWeek.actualCloseAt || null;
  }, [selectedWeek, activePlanType]);

  // Status Badge styling
  const getStatusBadge = (status: ProgramStatus = 'Draft') => {
    switch (status) {
      case 'Approved':
        return { label: 'معتمد رسمياً', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', dot: 'bg-emerald-600', indicator: '🟢' };
      case 'Submitted':
        return { label: 'تم الإرسال – بانتظار الاعتماد', bg: 'bg-blue-100 text-blue-900 border-blue-300', dot: 'bg-blue-600', indicator: '🔵' };
      case 'UnderReview':
        return { label: 'قيد المراجعة والتدقيق', bg: 'bg-sky-100 text-sky-900 border-sky-300', dot: 'bg-sky-600', indicator: '🔵' };
      case 'NeedsRevision':
        return { label: 'مطلوب تعديل من المسؤول', bg: 'bg-amber-100 text-amber-900 border-amber-300', dot: 'bg-amber-600', indicator: '🟡' };
      case 'EditingAllowed':
        return { label: 'مسموح بالتعديل – مفتوح', bg: 'bg-purple-100 text-purple-900 border-purple-300', dot: 'bg-purple-600', indicator: '🟣' };
      case 'RevisionRequested':
        return { label: 'بانتظار موافقة المسؤول على طلب التعديل', bg: 'bg-orange-100 text-orange-900 border-orange-300', dot: 'bg-orange-600', indicator: '🟠' };
      case 'Closed':
        return { label: 'مغلق', bg: 'bg-rose-100 text-rose-900 border-rose-300', dot: 'bg-rose-600', indicator: '🔴' };
      default:
        return { label: 'مسودة قيد الإعداد', bg: 'bg-amber-50 text-amber-900 border-amber-300', dot: 'bg-amber-500', indicator: '🟡' };
    }
  };

  const statusBadge = getStatusBadge(program?.status);

  // ==================== CARD & INLINE ACTIONS ====================

  /**
   * Add a new activity block to a specific day
   */
  const handleAddInlineActivity = (dayName: string, date: string, presetSchoolId?: string) => {
    if (!program || !canEdit) return;

    const newItem: ProgramItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      weeklyProgramId: program.id,
      dayOfWeek: dayName,
      dayDate: date,
      dayName: dayName,
      schoolId: presetSchoolId || '',
      activityId: '',
      notes: '',
      sortOrder: items.length + 1,
      createdAt: new Date().toISOString()
    };

    const updated = [...items, newItem];
    setItems(updated);
    storage.saveProgramItem(newItem);
    setHasUnsavedChanges(true);
  };

  /**
   * Update an activity field (school, activity, notes)
   */
  const handleUpdateItemField = (
    itemId: string,
    field: 'schoolId' | 'activityId' | 'notes',
    value: string,
    fallbackDayName?: string,
    fallbackDate?: string
  ) => {
    if (!canEdit) return;

    const existing = items.find(i => i.id === itemId);
    if (existing) {
      const updated = items.map(item => {
        if (item.id === itemId) {
          const mod = { ...item, [field]: value, updatedAt: new Date().toISOString() };
          storage.saveProgramItem(mod);
          return mod;
        }
        return item;
      });
      setItems(updated);
    } else if (program && fallbackDayName && fallbackDate) {
      // First item created directly by picking in the blank card
      const newItem: ProgramItem = {
        id: itemId,
        weeklyProgramId: program.id,
        dayOfWeek: fallbackDayName,
        dayDate: fallbackDate,
        dayName: fallbackDayName,
        schoolId: field === 'schoolId' ? value : '',
        activityId: field === 'activityId' ? value : '',
        notes: field === 'notes' ? value : '',
        sortOrder: items.length + 1,
        createdAt: new Date().toISOString()
      };
      setItems([...items, newItem]);
      storage.saveProgramItem(newItem);
    }

    setHasUnsavedChanges(true);
  };

  /**
   * Delete an activity row
   */
  const handleDeleteItem = (itemId: string) => {
    if (!canEdit) return;
    storage.deleteProgramItem(itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
    setHasUnsavedChanges(true);
    onShowToast('تم حذف النشاط من اليوم.', 'info');
  };

  /**
   * Update general day note
   */
  const handleDayNoteChange = (dayName: string, note: string) => {
    if (!canEdit) return;
    const updated = { ...dayNotes, [dayName]: note };
    setDayNotes(updated);
    if (program) {
      program.dayNotes = updated;
      storage.saveProgram(program);
    }
    setHasUnsavedChanges(true);
  };

  /**
   * Save draft manually
   */
  const handleSaveDraft = () => {
    if (!program || !canEdit) return;
    setIsSavingDraft(true);
    program.dayNotes = dayNotes;
    program.status = program.status === 'NeedsRevision' ? 'NeedsRevision' : 'Draft';
    program.lastModifiedAt = new Date().toISOString();
    storage.saveProgram(program);

    setTimeout(() => {
      setIsSavingDraft(false);
      setHasUnsavedChanges(false);
      onShowToast('تم حفظ مسودة البرنامج بنجاح. يمكنك استكمالها في أي وقت.', 'success');
    }, 250);
  };

  /**
   * Submit program
   */
  const handleConfirmSubmit = () => {
    if (!program) return;
    const res = storage.submitWeeklyProgram(program.id, currentUser);
    setShowSubmitConfirmModal(false);

    if (res.success) {
      loadProgramData();
      onShowToast(
        activePlanType === 'Planning'
          ? 'تم إرسال برنامج التخطيط الأسبوعي بنجاح إلى رئيس قسم الإشراف.'
          : 'تم إرسال البرنامج الفعلي بنجاح إلى رئيس قسم الإشراف.',
        'success'
      );
    } else {
      onShowToast(res.error || 'تعذر إرسال البرنامج.', 'error');
    }
  };

  /**
   * Send Revision Request
   */
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

  /**
   * Export to Excel
   */
  const handleExportExcelProgram = () => {
    if (!program || !selectedWeek) return;
    const headers = ['اليوم', 'التاريخ', 'المدرسة', 'الفعالية / النشاط', 'ملاحظات النشاط', 'ملاحظات اليوم العامة'];
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

  return (
    <div className="space-y-6 text-right font-sans pb-32" dir="rtl">
      {/* ===================== TOP HEADER & DIRECTORATE IDENTITY ===================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Logo & Main Title */}
          <div className="flex items-center gap-4">
            <img
              src={YATTA_LOGO}
              alt="شعار مديرية التربية والتعليم يطا"
              className="w-14 h-14 rounded-2xl object-cover border border-emerald-600/30 shadow-xs shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-slate-900 tracking-tight">مديرية التربية والتعليم يطا</span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  قسم الإشراف والتأهيل التربوي
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-emerald-600 shrink-0" />
                <span>برنامج المشرف الأسبوعي</span>
              </h1>
            </div>
          </div>

          {/* Phase 1 & Phase 2 Switcher + Week Selector */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto">
            {/* Phase Selector Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-full sm:w-auto shadow-inner">
              <button
                type="button"
                onClick={() => setActivePlanType('Planning')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activePlanType === 'Planning'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📋</span>
                <span>1. برنامج التخطيط</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlanType('Actual')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activePlanType === 'Actual'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>✅</span>
                <span>2. البرنامج الفعلي</span>
              </button>
            </div>

            {/* Week Selector Dropdown */}
            <div className="w-full sm:w-auto shrink-0">
              <select
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="w-full sm:w-auto text-xs font-bold py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
              >
                {weeks.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatDate(w.startDate)} - {formatDate(w.endDate)}) {w.isActive ? '★ الحالي' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== PART 1: SUPERVISOR & WEEK DATA METRICS CARD ===================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
        {/* Top Header Row of the Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border ${statusBadge.bg}`}>
                <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                <span>{statusBadge.indicator}</span>
                <span>{statusBadge.label}</span>
              </span>

              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                {activePlanType === 'Planning' ? 'مرحلة التخطيط المسبق' : 'مرحلة التوثيق الميداني الفعلي'}
              </span>

              {hasUnsavedChanges && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1 animate-pulse">
                  <span>●</span>
                  <span>تغييرات غير محفوظة</span>
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              برنامج الأسبوع: {selectedWeek?.name || 'الأسبوع الأول'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              من {weekDayDates[0]?.dayName || 'الأحد'} ({formatDate(selectedWeek?.startDate)}) إلى {weekDayDates[weekDayDates.length - 1]?.dayName || 'الخميس'} ({formatDate(selectedWeek?.endDate)})
            </p>
          </div>

          {/* Quick Buttons */}
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
            >
              <History className="w-4 h-4 text-slate-600" />
              <span>سجل الإرسال ({submissionsHistory.length})</span>
            </button>
          </div>
        </div>

        {/* The 9 Required Data Points in a Clean Dashboard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 text-xs">
          {/* 1. اسم المشرف */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              {supervisor?.name?.charAt(0) || 'م'}
            </div>
            <div className="truncate">
              <span className="text-[11px] text-slate-400 block font-medium">اسم المشرف:</span>
              <span className="font-bold text-slate-900 text-xs truncate block">{supervisor?.name || currentUser.fullName}</span>
              <span className="text-[10px] text-slate-500 truncate block">{supervisor?.specialization || 'إشراف تربوي'}</span>
            </div>
          </div>

          {/* 2. الأسبوع والسنة الدراسية */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">الأسبوع والسنة:</span>
              <span className="font-bold text-slate-900 text-xs block">{selectedWeek?.name || 'الأسبوع الأول'}</span>
              <span className="text-[11px] text-slate-500 block">السنة: {currentAcademicYear?.name || '2026-2027'}</span>
            </div>
          </div>

          {/* 3. تواريخ البداية والنهاية */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">فترة الأسبوع:</span>
              <span className="font-bold text-slate-800 text-xs block font-mono">
                {formatDate(selectedWeek?.startDate)} ➔ {formatDate(selectedWeek?.endDate)}
              </span>
              <span className="text-[10px] text-slate-400">من الأحد إلى الخميس</span>
            </div>
          </div>

          {/* 4. الفترة المتاحة للإرسال ومؤقت الإغلاق */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-slate-400 block font-medium">الفترة المتاحة للإرسال:</span>
              {closingTargetDate && windowStatus.isOpen ? (
                <div className="mt-1">
                  <CountdownTimer targetDate={closingTargetDate} variant="compact" />
                </div>
              ) : (
                <span className={`font-bold text-xs ${windowStatus.isOpen ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {windowStatus.isOpen ? 'مفتوح للإرسال' : (windowStatus.reason || 'مغلق')}
                </span>
              )}
            </div>
          </div>

          {/* 5. مرات الإرسال المسموحة والمستخدمة */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex items-center gap-3 sm:col-span-2 lg:col-span-1 xl:col-span-4">
            <Send className="w-5 h-5 text-slate-600 shrink-0" />
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">مرات الإرسال:</span>
                <span className="font-bold text-slate-900 text-xs">
                  تم استخدام {submissionCount} من أصل {maxSubmissions} مرات مسموحة
                </span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                maxSubmissions - submissionCount > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {maxSubmissions - submissionCount > 0
                  ? `متبقي لك ${maxSubmissions - submissionCount} فرصة إرسال`
                  : 'استنفدت مرات الإرسال'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-800 text-sm">
                اكتمال البرنامج: {completionPercentage}%
              </span>
              <span className="text-slate-400">|</span>
              <span className="font-bold text-slate-600">
                {completedDaysCount} من {requiredDays.length} أيام مكتملة
              </span>
            </div>

            {isAllDaysCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Check className="w-3.5 h-3.5" />
                <span>✓ اكتمل البرنامج وجاهز للإرسال</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-700">
                ⚠️ متبقي {missingDays.length} أيام ({missingDays.join('، ')})
              </span>
            )}
          </div>

          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner flex">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                completionPercentage === 100
                  ? 'bg-emerald-600'
                  : completionPercentage >= 60
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Alert when Revision is requested by Admin */}
        {program?.status === 'NeedsRevision' && program.reviewNotes && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">ملاحظات رئيس قسم الإشراف لإجراء التعديل:</p>
              <p className="mt-1 leading-relaxed bg-white/80 p-3 rounded-xl border border-amber-200 font-medium">
                «{program.reviewNotes}»
              </p>
            </div>
          </div>
        )}

        {/* Actual phase info banner */}
        {activePlanType === 'Actual' && (
          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>التوثيق الفعلي للدوام والمهمات المنفذة:</strong> تم توليد هذا البرنامج بناءً على خطتك المعتمدة.
              يمكنك تعديل المدرسة الفعلية، الفعالية المنفذة، أو إضافة مهمات ومدارس أخرى لما قمت به فعلياً في الميدان.
            </div>
          </div>
        )}
      </div>

      {/* ===================== PART 2: DAY CARDS (NOT A TRADITIONAL DATAGRID) ===================== */}
      <div className="space-y-4">
        {/* Day Cards Section Header & Layout Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>بطاقات أيام الأسبوع</span>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                {requiredDays.length} أيام محددة
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              إدخال مباشر لكل يوم على حدة مع ربط المدرسة بالفعالية والملاحظات بكل وضوح وسرعة.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                layoutMode === 'grid' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض كبطاقات شبكية متجاورة"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>شبكة بطاقات</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                layoutMode === 'list' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض كبطاقات عمودية كاملة"
            >
              <List className="w-3.5 h-3.5" />
              <span>بطاقات ممتدة</span>
            </button>
          </div>
        </div>

        {/* ===================== THE DAY CARDS GRID ===================== */}
        <div className={`grid gap-6 ${layoutMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {weekDayDates.map(({ dayName, date, dateFormatted, fullArabicDate }) => {
            const dayItems = items.filter(i => (i.dayOfWeek === dayName || i.dayName === dayName));
            const isDayComplete = dayItems.length > 0 && dayItems.some(i => i.schoolId && i.activityId);
            const currentDayNote = dayNotes[dayName] || '';

            // If day has 0 items, provide an initial active item representation ready for input
            const displayItems = dayItems.length > 0
              ? dayItems
              : [{
                  id: `temp_${dayName}_${date}`,
                  weeklyProgramId: program?.id || '',
                  dayOfWeek: dayName,
                  dayDate: date,
                  dayName: dayName,
                  schoolId: '',
                  activityId: '',
                  notes: '',
                  sortOrder: 1,
                  createdAt: new Date().toISOString()
                }];

            return (
              <div
                key={dayName}
                className={`bg-white rounded-3xl border transition-all shadow-xs hover:shadow-md flex flex-col justify-between ${
                  isDayComplete
                    ? 'border-slate-200/90'
                    : 'border-amber-300 ring-1 ring-amber-300/50'
                }`}
              >
                {/* 1. Day Card Header: Day Name & Date */}
                <div
                  className={`p-4 sm:p-5 border-b rounded-t-3xl flex items-center justify-between gap-3 ${
                    isDayComplete
                      ? 'bg-slate-50/80 border-slate-200'
                      : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                        isDayComplete
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {dayName.slice(0, 3)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">{dayName}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold font-mono">
                        <span>{dateFormatted}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-normal font-sans text-slate-400">{fullArabicDate}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isDayComplete ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
                        <Check className="w-3.5 h-3.5" />
                        <span>مكتمل ({dayItems.length} أنشطة)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 shadow-2xs">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>بانتظار الإدخال</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Day Card Body: Activity Rows */}
                <div className="p-4 sm:p-5 space-y-4 flex-1">
                  <div className="space-y-3.5">
                    {displayItems.map((item, idx) => {
                      const isTemp = item.id.startsWith('temp_');
                      const plannedSchool = item.plannedSchoolId ? allSchools.find(s => s.id === item.plannedSchoolId) : undefined;
                      const plannedActivity = item.plannedActivityId ? allActivities.find(a => a.id === item.plannedActivityId) : undefined;
                      const isChangedInActual = activePlanType === 'Actual' && (
                        (item.plannedSchoolId && item.plannedSchoolId !== item.schoolId) ||
                        (item.plannedActivityId && item.plannedActivityId !== item.activityId)
                      );

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-3 shadow-2xs"
                        >
                          {/* Activity Header with Number & Delete */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-800 text-xs px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                                النشاط {idx + 1}
                              </span>

                              {/* Planned baseline for Actual view */}
                              {activePlanType === 'Actual' && (plannedSchool || plannedActivity) && (
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                                  <span>المخطط:</span>
                                  <span className="text-slate-600 font-bold">{plannedSchool?.name || '-'}</span>
                                  <span>•</span>
                                  <span className="text-slate-600 font-bold">{plannedActivity?.name || '-'}</span>
                                  {isChangedInActual && (
                                    <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                                      تعديل فعلي
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Delete button (available if more than 1 item, or if item is already saved) */}
                            {canEdit && !isTemp && (
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="حذف هذا النشاط"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Activity Fields: School, Activity, Notes */}
                          <div className="space-y-2.5 text-xs">
                            {/* Field 1: المدرسة */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <SchoolIcon className="w-3.5 h-3.5 text-blue-600" />
                                  <span>المدرسة <span className="text-rose-500">*</span></span>
                                </span>
                              </label>
                              <SearchableSelect
                                value={item.schoolId}
                                options={schoolOptions}
                                onChange={(val) => handleUpdateItemField(item.id, 'schoolId', val, dayName, date)}
                                placeholder="🔍 اختر المدرسة من القائمة..."
                                disabled={!canEdit}
                                emptyMessage="لم يتم العثور على مدرسة مطابقة"
                              />
                            </div>

                            {/* Field 2: الفعالية */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <ActivityIcon className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>الفعالية <span className="text-rose-500">*</span></span>
                                </span>
                              </label>
                              <SearchableSelect
                                value={item.activityId}
                                options={activityOptions}
                                onChange={(val) => handleUpdateItemField(item.id, 'activityId', val, dayName, date)}
                                placeholder="🔍 اختر الفعالية من القائمة..."
                                disabled={!canEdit}
                                emptyMessage="لم يتم العثور على فعالية مطابقة"
                              />
                            </div>

                            {/* Field 3: الملاحظات */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                الملاحظات
                              </label>
                              <input
                                type="text"
                                disabled={!canEdit}
                                value={item.notes || ''}
                                onChange={(e) => handleUpdateItemField(item.id, 'notes', e.target.value, dayName, date)}
                                placeholder="اكتب ملاحظات حول هذا النشاط..."
                                className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Another Activity Button inside the Card */}
                  {canEdit && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddInlineActivity(dayName, date)}
                        className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-300/80 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-700" />
                        <span>[ + إضافة نشاط آخر لهذا اليوم ]</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Day Card Footer: General Day Notes */}
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ملاحظات عامة حول يوم {dayName}:
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={currentDayNote}
                    onChange={(e) => handleDayNoteChange(dayName, e.target.value)}
                    placeholder={`اكتب هنا أي ملاحظات عامة حول يوم ${dayName}...`}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400 font-medium"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================== STICKY BOTTOM ACTIONS BAR ===================== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-2xl z-30 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Readiness Summary */}
          <div className="flex items-center gap-3">
            {isAllDaysCompleted ? (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>اكتملت جميع أيام الأسبوع ({requiredDays.length}/{requiredDays.length}). جاهز للإرسال.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  متبقي {missingDays.length} أيام ({missingDays.join('، ')}) للإكمال قبل التمكن من الإرسال.
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Save Draft */}
            {canEdit && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingDraft ? 'جارٍ الحفظ...' : 'حفظ كمسودة'}</span>
              </button>
            )}

            {/* Submit Program */}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  if (!isAllDaysCompleted) {
                    onShowToast(
                      `لا يمكن إرسال البرنامج، يرجى استكمال بيانات الأيام المتبقية: (${missingDays.join('، ')})`,
                      'error'
                    );
                    return;
                  }
                  setShowSubmitConfirmModal(true);
                }}
                disabled={!isAllDaysCompleted || isSubmissionLimitReached}
                className={`px-5 py-2.5 text-xs font-black text-white rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer ${
                  isAllDaysCompleted && !isSubmissionLimitReached
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                    : 'bg-slate-300 cursor-not-allowed opacity-60'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>إرسال البرنامج للمسؤول</span>
              </button>
            )}

            {/* Request Revision if submitted */}
            {!canEdit && (isSubmitted || isSubmissionLimitReached) && (
              <button
                type="button"
                onClick={() => setShowRevisionRequestModal(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>طلب تعديل البرنامج من المسؤول</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===================== MODALS ===================== */}

      {/* 1. Submit Confirmation Modal */}
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
                بعد الإرسال سيتم قفل البرنامج ولن تتمكن من تعديله إلا إذا وافق مسؤول النظام على طلب التعديل.
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

      {/* 2. Request Revision Modal */}
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
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs cursor-pointer"
            >
              إرسال طلب التعديل
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Submissions History Modal */}
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
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
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
              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
