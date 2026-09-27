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
  Lock,
  Unlock,
  Printer,
  FileSpreadsheet,
  Copy,
  Search,
  Check
} from 'lucide-react';
import { User, WeeklyProgram, ProgramItem, Week, School, Activity, Supervisor, PlanType } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';
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
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Reference planning items when viewing/editing Actual program
  const [referencePlanningItems, setReferencePlanningItems] = useState<ProgramItem[]>([]);

  // Searchable School & Activity states
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [schoolSearchQuery, setSchoolSearchQuery] = useState<string>('');
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState<boolean>(false);

  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [activitySearchQuery, setActivitySearchQuery] = useState<string>('');
  const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState<boolean>(false);

  const [itemError, setItemError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const weeks = storage.getWeeks();
  const currentAcademicYear = storage.getCurrentAcademicYear();
  const allSchools = storage.getActiveSchools();
  const allActivities = storage.getActiveActivities();

  // Supervisor identification (strictly bounded to logged-in supervisor)
  const supervisor: Supervisor | undefined = currentUser.supervisorId
    ? storage.getSupervisorById(currentUser.supervisorId)
    : storage.getSupervisors()[0]; // Fallback for admin preview

  // Default to active/current week
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

    let p = storage.getProgramBySupervisorAndWeek(supervisor.id, selectedWeekId, activePlanType);
    if (!p) {
      p = {
        id: `prog_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        supervisorId: supervisor.id,
        academicYearId: selectedWeek?.academicYearId || currentAcademicYear?.id || 'year_2026_2027',
        weekId: selectedWeekId,
        planType: activePlanType,
        status: 'Draft',
        createdAt: new Date().toISOString()
      };
      storage.saveProgram(p);
    }
    setProgram(p);
    setItems(storage.getProgramItems(p.id));

    // If active plan is Actual, load reference planning items
    if (activePlanType === 'Actual') {
      const planProg = storage.getProgramBySupervisorAndWeek(supervisor.id, selectedWeekId, 'Planning');
      if (planProg) {
        setReferencePlanningItems(storage.getProgramItems(planProg.id));
      } else {
        setReferencePlanningItems([]);
      }
    }
  };

  useEffect(() => {
    loadProgramData();
  }, [selectedWeekId, supervisor?.id, activePlanType]);

  // Submission permissions & conditions
  const isSubmissionOpen = activePlanType === 'Planning'
    ? (selectedWeek?.planningOpen ?? false)
    : (selectedWeek?.actualOpen ?? false);

  const isSubmitted = program?.status === 'Submitted' || program?.status === 'Approved';
  const isNeedsRevision = program?.status === 'NeedsRevision';
  const canEditAndAdd = isSubmissionOpen && (!isSubmitted || isNeedsRevision);

  // Filtered schools for Searchable Select
  const filteredSchools = useMemo(() => {
    if (!schoolSearchQuery.trim()) return allSchools;
    const query = schoolSearchQuery.trim().toLowerCase();
    return allSchools.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.region && s.region.toLowerCase().includes(query))
    );
  }, [allSchools, schoolSearchQuery]);

  // Filtered activities for Searchable Select
  const filteredActivities = useMemo(() => {
    if (!activitySearchQuery.trim()) return allActivities;
    const query = activitySearchQuery.trim().toLowerCase();
    return allActivities.filter(a =>
      a.name.toLowerCase().includes(query) ||
      (a.code && a.code.toLowerCase().includes(query))
    );
  }, [allActivities, activitySearchQuery]);

  const handleSelectSchool = (school: School) => {
    setSelectedSchoolId(school.id);
    setSchoolSearchQuery(school.name);
    setIsSchoolDropdownOpen(false);
    setItemError('');
  };

  const handleSelectActivity = (activity: Activity) => {
    setSelectedActivityId(activity.id);
    setActivitySearchQuery(activity.name);
    setIsActivityDropdownOpen(false);
    setItemError('');
  };

  // Add Item to Program
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !canEditAndAdd) return;

    if (!selectedSchoolId) {
      setItemError('يرجى اختيار المدرسة من القائمة المنسدلة.');
      return;
    }
    if (!selectedActivityId) {
      setItemError('يرجى اختيار الفعالية من القائمة المنسدلة.');
      return;
    }

    const newItem: ProgramItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      weeklyProgramId: program.id,
      schoolId: selectedSchoolId,
      activityId: selectedActivityId,
      sortOrder: items.length + 1,
      createdAt: new Date().toISOString()
    };

    storage.saveProgramItem(newItem);
    setItems(storage.getProgramItems(program.id));

    // Reset selection fields for rapid next entry
    setSelectedSchoolId('');
    setSchoolSearchQuery('');
    setSelectedActivityId('');
    setActivitySearchQuery('');
    setItemError('');

    onShowToast('تمت إضافة البند بنجاح إلى البرنامج.', 'success');
  };

  const handleDeleteItem = (itemId: string) => {
    if (!canEditAndAdd) return;
    storage.deleteProgramItem(itemId);
    if (program) {
      setItems(storage.getProgramItems(program.id));
    }
    onShowToast('تم حذف البند من البرنامج.', 'info');
  };

  // Copy Planning items to Actual program
  const handleCopyPlanningToActual = () => {
    if (!program || !canEditAndAdd || referencePlanningItems.length === 0) return;

    referencePlanningItems.forEach((planItem, idx) => {
      const newItem: ProgramItem = {
        id: `item_copied_${Date.now()}_${idx}`,
        weeklyProgramId: program.id,
        schoolId: planItem.schoolId,
        activityId: planItem.activityId,
        sortOrder: items.length + idx + 1,
        createdAt: new Date().toISOString()
      };
      storage.saveProgramItem(newItem);
    });

    setItems(storage.getProgramItems(program.id));
    onShowToast(`تم نسخ ${referencePlanningItems.length} بنود من خطة التخطيط إلى البرنامج الفعلي.`, 'success');
  };

  // Submit Program with strict Anti-Duplicate Check
  const handleConfirmSubmit = () => {
    if (!program || !supervisor) return;
    if (items.length === 0) {
      onShowToast('لا يمكن إرسال برنامج فارغ بدون إضافة بنود.', 'error');
      setShowSubmitModal(false);
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    program.status = 'Submitted';
    program.submittedAt = now;
    program.updatedAt = now;
    storage.saveProgram(program);

    // Dispatches official notification to Admin
    storage.addNotification({
      id: `notif_${Date.now()}`,
      userId: 'usr_admin',
      title: activePlanType === 'Planning' ? 'برنامج تخطيط جديد وارد' : 'برنامج فعلي جديد وارد',
      message: `تم استلام ${activePlanType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'} من المشرف ${supervisor.name} للأسبوع (${selectedWeek?.name}).`,
      type: 'info',
      isRead: false,
      createdAt: now
    });

    storage.addAuditLog(
      currentUser.id,
      currentUser.username,
      activePlanType === 'Planning' ? 'إرسال برنامج التخطيط' : 'إرسال البرنامج الفعلي',
      'WeeklyProgram',
      program.id,
      `أرسل المشرف ${supervisor.name} ${activePlanType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'} لـ ${selectedWeek?.name} (${items.length} بنود)`
    );

    setIsSaving(false);
    setShowSubmitModal(false);
    loadProgramData();
    onShowToast(`تم إرسال ${activePlanType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'} بنجاح وتم قفل التعديل.`, 'success');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Week and Plan Type Selector Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="text-xs text-slate-500 font-semibold mb-1">
              المشرف التربوي: <span className="font-bold text-slate-800">{supervisor?.name}</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {activePlanType === 'Planning' ? 'برنامج التخطيط الأسبوعي' : 'البرنامج الفعلي (توثيق الدوام)'}
            </h1>
          </div>

          {/* Week Selector Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">الأسبوع:</label>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="text-xs font-bold py-2 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {weeks.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.startDate} إلى {w.endDate}) {w.id === storage.getCurrentWeek()?.id ? '★ الحالي' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dual Tab Switcher: Planning vs Actual */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActivePlanType('Planning')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activePlanType === 'Planning'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📋</span>
              <span>برنامج التخطيط الأسبوعي</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlanType('Actual')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activePlanType === 'Actual'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>✅</span>
              <span>البرنامج الفعلي</span>
            </button>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">حالة الإرسال:</span>
            {isSubmitted ? (
              <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                <span>تم الإرسال (مغلق للتعديل)</span>
              </span>
            ) : isSubmissionOpen ? (
              <span className="inline-flex items-center gap-1 text-blue-800 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                <Unlock className="w-3.5 h-3.5" />
                <span>مفتوح للإرسال حالياً</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-800 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                <Lock className="w-3.5 h-3.5" />
                <span>مغلق من قبل مسؤول النظام</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notice if submission is closed */}
      {!isSubmissionOpen && !isSubmitted && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-3">
          <Lock className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-bold">فترة إرسال {activePlanType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'} مغلقة حالياً من قبل مسؤول النظام.</p>
            <p className="text-[11px] text-rose-700 mt-0.5">لا يمكن إرسال أو تعديل البرنامج حتى يقوم مسؤول النظام بفتح فترة الإرسال.</p>
          </div>
        </div>
      )}

      {/* Reference Planning Program (Only shown when on Actual Program tab) */}
      {activePlanType === 'Actual' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">برنامج التخطيط المعتمد لهذا الأسبوع (مرجع للمشرف):</span>
              <span className="text-[10px] text-slate-400">({referencePlanningItems.length} بنود مخططة)</span>
            </div>
            {canEditAndAdd && referencePlanningItems.length > 0 && items.length === 0 && (
              <button
                type="button"
                onClick={handleCopyPlanningToActual}
                className="text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1 rounded-lg border border-sky-200 transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ بنود التخطيط إلى البرنامج الفعلي</span>
              </button>
            )}
          </div>

          {referencePlanningItems.length === 0 ? (
            <p className="text-xs text-slate-400">لم يتم إرسال برنامج تخطيط لهذا الأسبوع.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {referencePlanningItems.map((item, idx) => {
                const sch = allSchools.find(s => s.id === item.schoolId);
                const act = allActivities.find(a => a.id === item.activityId);
                return (
                  <div key={item.id} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-slate-800">#{idx + 1} {sch?.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{act?.name}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Streamlined Fast Input Form (Requirement 9, 10, 24, 32: School + Activity + Add ONLY!) */}
      {canEditAndAdd && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
            <Plus className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              إضافة بند جديد إلى {activePlanType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'}
            </h3>
          </div>

          {itemError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {itemError}
            </div>
          )}

          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Searchable Select 1: المدرسة */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المدرسة: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={schoolSearchQuery}
                    onChange={(e) => {
                      setSchoolSearchQuery(e.target.value);
                      setIsSchoolDropdownOpen(true);
                      setSelectedSchoolId('');
                    }}
                    onFocus={() => setIsSchoolDropdownOpen(true)}
                    className="w-full pl-8 pr-9 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    placeholder="ابحث واكتب اسم المدرسة (مثال: يطا، رقعة)..."
                    required
                  />
                  <SchoolIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>

                {/* Dropdown Options */}
                {isSchoolDropdownOpen && (
                  <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto py-1">
                    {filteredSchools.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">لا توجد مدارس مطابقة للبحث</div>
                    ) : (
                      filteredSchools.map(sch => (
                        <button
                          key={sch.id}
                          type="button"
                          onClick={() => handleSelectSchool(sch)}
                          className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{sch.name}</span>
                            <span className="text-[10px] text-slate-400 mr-2">({sch.region})</span>
                          </div>
                          {selectedSchoolId === sch.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Searchable Select 2: الفعالية */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الفعالية: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={activitySearchQuery}
                    onChange={(e) => {
                      setActivitySearchQuery(e.target.value);
                      setIsActivityDropdownOpen(true);
                      setSelectedActivityId('');
                    }}
                    onFocus={() => setIsActivityDropdownOpen(true)}
                    className="w-full pl-8 pr-9 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    placeholder="ابحث واكتب اسم الفعالية (مثال: زيارة، ورشة)..."
                    required
                  />
                  <ActivityIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>

                {/* Dropdown Options */}
                {isActivityDropdownOpen && (
                  <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto py-1">
                    {filteredActivities.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">لا توجد فعاليات مطابقة للبحث</div>
                    ) : (
                      filteredActivities.map(act => (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => handleSelectActivity(act)}
                          className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{act.name}</span>
                            {act.description && <span className="text-[10px] text-slate-400 mr-2">({act.description})</span>}
                          </div>
                          {selectedActivityId === act.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة بند للبرنامج</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Program Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              بنود {activePlanType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'}
            </h3>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full tabular-nums">
              {items.length} بنود
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => triggerPrint()}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="طباعة البرنامج"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            لا توجد بنود مدخلة بعد. استخدم النموذج أعلاه لاختيار المدرسة والفعالية والضغط على إضافة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">المدرسة</th>
                  <th className="py-3 px-4">الفعالية</th>
                  {canEditAndAdd && <th className="py-3 px-4 text-center w-20">حذف</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const sch = allSchools.find(s => s.id === item.schoolId);
                  const act = allActivities.find(a => a.id === item.activityId);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 tabular-nums">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {sch?.name || 'مدرسة غير محددة'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 font-bold border border-blue-200">
                          {act?.name || 'فعالية غير محددة'}
                        </span>
                      </td>
                      {canEditAndAdd && (
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف البند"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Submit Action Zone */}
        {canEditAndAdd && items.length > 0 && (
          <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              بعد الإرسال لن تتمكن من تعديل البرنامج إلا بطلب إعادة فتح من مسؤول النظام.
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>إرسال {activePlanType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal before Submit (Requirement 9: Anti-duplicate & Lock confirmation) */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title={`تأكيد إرسال ${activePlanType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'}`}
        subtitle={`الأسبوع: ${selectedWeek?.name} (${items.length} بنود)`}
      >
        <div className="space-y-4 text-xs leading-relaxed text-slate-700">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">هل أنت متأكد من إرسال {activePlanType === 'Planning' ? 'برنامج التخطيط الأسبوعي' : 'البرنامج الفعلي'}؟</p>
              <p className="mt-1">
                بعد الإرسال، سيتم قفل البرنامج واعتماده في قاعدة البيانات، ولن تتمكن من تعديله أو إعادة إرساله مرة أخرى لهذا الأسبوع.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors"
            >
              {isSaving ? 'جارٍ الإرسال...' : 'تأكيد الإرسال'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
