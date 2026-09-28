import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Calendar,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Check,
  X,
  Users,
  Settings2,
  CalendarDays
} from 'lucide-react';
import { Week, User, AcademicYear, Supervisor } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate, formatDateTime } from '../utils/date';

interface WeeksManagementViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const WeeksManagementView: React.FC<WeeksManagementViewProps> = ({ currentUser, onShowToast }) => {
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);

  // Form states
  const [academicYearId, setAcademicYearId] = useState('');
  const [weekNumber, setWeekNumber] = useState(1);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [requiredDays, setRequiredDays] = useState<string[]>(['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']);

  // Planning phase settings
  const [planningOpen, setPlanningOpen] = useState(true);
  const [planningOpenAt, setPlanningOpenAt] = useState('');
  const [planningCloseAt, setPlanningCloseAt] = useState('');
  const [defaultMaxPlanningSubmissions, setDefaultMaxPlanningSubmissions] = useState(1);

  // Actual phase settings
  const [actualOpen, setActualOpen] = useState(false);
  const [actualOpenAt, setActualOpenAt] = useState('');
  const [actualCloseAt, setActualCloseAt] = useState('');
  const [defaultMaxActualSubmissions, setDefaultMaxActualSubmissions] = useState(1);

  // Supervisor overrides
  const [supervisorOverrides, setSupervisorOverrides] = useState<Record<string, { maxPlanning?: number; maxActual?: number }>>({});
  const [showOverridesModal, setShowOverridesModal] = useState(false);

  const [allowRevisionRequests, setAllowRevisionRequests] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const weeks = storage.getWeeks();
  const academicYears = storage.getAcademicYears();
  const currentAcademicYear = storage.getCurrentAcademicYear();
  const currentActiveWeek = storage.getCurrentWeek();
  const activeSupervisors = storage.getSupervisors().filter(s => s.status === 'Active');

  const ALL_POSSIBLE_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'السبت'];

  const handleOpenAdd = () => {
    setEditingWeek(null);
    const nextNumber = weeks.length > 0 ? Math.max(...weeks.map(w => w.weekNumber)) + 1 : 1;
    setAcademicYearId(currentAcademicYear?.id || (academicYears[0]?.id || ''));
    setWeekNumber(nextNumber);
    setName(`الأسبوع ${nextNumber}`);

    // Default dates
    const now = new Date();
    const start = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 4 * 24 * 3600 * 1000);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setRequiredDays(['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']);

    setPlanningOpen(true);
    setPlanningOpenAt('');
    setPlanningCloseAt('');
    setDefaultMaxPlanningSubmissions(1);

    setActualOpen(false);
    setActualOpenAt('');
    setActualCloseAt('');
    setDefaultMaxActualSubmissions(1);

    setSupervisorOverrides({});
    setAllowRevisionRequests(true);
    setIsActive(false);
    setNotes('');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (w: Week) => {
    setEditingWeek(w);
    setAcademicYearId(w.academicYearId);
    setWeekNumber(w.weekNumber);
    setName(w.name);
    setStartDate(w.startDate);
    setEndDate(w.endDate);
    setRequiredDays(w.requiredDays && w.requiredDays.length > 0 ? w.requiredDays : ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']);

    setPlanningOpen(w.planningOpen ?? false);
    setPlanningOpenAt(w.planningOpenAt ? w.planningOpenAt.slice(0, 16) : '');
    setPlanningCloseAt(w.planningCloseAt ? w.planningCloseAt.slice(0, 16) : '');
    setDefaultMaxPlanningSubmissions(w.defaultMaxPlanningSubmissions || 1);

    setActualOpen(w.actualOpen ?? false);
    setActualOpenAt(w.actualOpenAt ? w.actualOpenAt.slice(0, 16) : '');
    setActualCloseAt(w.actualCloseAt ? w.actualCloseAt.slice(0, 16) : '');
    setDefaultMaxActualSubmissions(w.defaultMaxActualSubmissions || 1);

    setSupervisorOverrides(w.supervisorOverrides || {});
    setAllowRevisionRequests(w.allowRevisionRequests ?? true);
    setIsActive(w.isActive ?? (w.status === 'Open'));
    setNotes(w.notes || '');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleToggleDay = (day: string) => {
    if (requiredDays.includes(day)) {
      if (requiredDays.length === 1) {
        setFormError('يجب اختيار يوم عمل واحد على الأقل للأسبوع.');
        return;
      }
      setRequiredDays(requiredDays.filter(d => d !== day));
    } else {
      setRequiredDays([...requiredDays, day]);
    }
  };

  const handleSaveWeek = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !startDate || !endDate) {
      setFormError('اسم الأسبوع وتاريخ البداية والنهاية حقول مطلوبة.');
      return;
    }

    if (requiredDays.length === 0) {
      setFormError('يرجى تحديد الأيام المطلوبة لهذا الأسبوع.');
      return;
    }

    // Validation against dates overlap and end < start
    const validation = storage.validateWeekDates(startDate, endDate, editingWeek?.id);
    if (!validation.valid) {
      setFormError(validation.error || 'خطأ في التواريخ المدخلة.');
      return;
    }

    const weekToSave: Week = {
      id: editingWeek ? editingWeek.id : `week_${Date.now()}`,
      academicYearId: academicYearId || currentAcademicYear?.id || 'year_2026_2027',
      weekNumber: Number(weekNumber),
      name: name.trim(),
      startDate,
      endDate,
      requiredDays,
      status: isActive ? 'Open' : 'Closed',
      isActive,

      planningOpen,
      planningOpenAt: planningOpenAt ? new Date(planningOpenAt).toISOString() : undefined,
      planningCloseAt: planningCloseAt ? new Date(planningCloseAt).toISOString() : undefined,
      defaultMaxPlanningSubmissions: Number(defaultMaxPlanningSubmissions) || 1,

      actualOpen,
      actualOpenAt: actualOpenAt ? new Date(actualOpenAt).toISOString() : undefined,
      actualCloseAt: actualCloseAt ? new Date(actualCloseAt).toISOString() : undefined,
      defaultMaxActualSubmissions: Number(defaultMaxActualSubmissions) || 1,

      supervisorOverrides,
      allowRevisionRequests,
      notes: notes.trim(),
      createdAt: editingWeek ? editingWeek.createdAt : new Date().toISOString()
    };

    // If making this active, deactivate others
    if (isActive) {
      weeks.forEach(w => {
        if (w.id !== weekToSave.id) {
          w.isActive = false;
          w.status = 'Closed';
        }
      });
    }

    storage.saveWeek(weekToSave);
    setShowAddEditModal(false);
    onShowToast(editingWeek ? 'تم تعديل إعدادات الأسبوع بنجاح.' : 'تم إنشاء الأسبوع الجديد بنجاح.', 'success');
  };

  // Quick toggles
  const handleTogglePlanning = (w: Week) => {
    storage.togglePlanningOpen(w.id, !w.planningOpen);
    onShowToast(`تم ${!w.planningOpen ? 'فتح' : 'إغلاق'} إرسال برنامج التخطيط لـ (${w.name}).`, 'info');
  };

  const handleToggleActual = (w: Week) => {
    storage.toggleActualOpen(w.id, !w.actualOpen);
    onShowToast(`تم ${!w.actualOpen ? 'فتح' : 'إغلاق'} إرسال البرنامج الفعلي لـ (${w.name}).`, 'info');
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">إدارة الأسابيع وفترات الإرسال</h1>
          <p className="text-xs text-slate-500 mt-1">
            التحكم في فترات فتح وإغلاق إرسال برنامج التخطيط الأسبوعي والبرنامج الفعلي وتحديد الأيام المطلوبة والحدود لكل مشرف.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء أسبوع جديد</span>
        </button>
      </div>

      {/* Active Week Interactive Control Panel */}
      {currentActiveWeek && (
        <div className="bg-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-emerald-800/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-400">الأسبوع الفعّال حالياً للنظام:</span>
              </div>
              <h2 className="text-lg font-black">{currentActiveWeek.name}</h2>
              <div className="text-xs text-slate-300 mt-0.5 tabular-nums">
                الفترة: من {currentActiveWeek.startDate} إلى {currentActiveWeek.endDate} | الأيام المطلوبة: ({currentActiveWeek.requiredDays?.join('، ')})
              </div>
            </div>

            {/* Quick Action Buttons for the Active Week */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleTogglePlanning(currentActiveWeek)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                  currentActiveWeek.planningOpen
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {currentActiveWeek.planningOpen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span>{currentActiveWeek.planningOpen ? 'إغلاق إرسال التخطيط' : 'فتح إرسال التخطيط'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleActual(currentActiveWeek)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                  currentActiveWeek.actualOpen
                    ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                    : 'bg-sky-500 hover:bg-sky-600 text-white'
                }`}
              >
                {currentActiveWeek.actualOpen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span>{currentActiveWeek.actualOpen ? 'إغلاق إرسال الفعلي' : 'فتح إرسال الفعلي'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weeks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">قائمة أسابيع الفصل الدراسي</h3>
          </div>
          <span className="text-xs text-slate-400">إجمالي: {weeks.length} أسابيع</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الأسبوع</th>
                <th className="py-3 px-4">اسم الأسبوع</th>
                <th className="py-3 px-4">الفترة الزمنية</th>
                <th className="py-3 px-4">الأيام المطلوبة</th>
                <th className="py-3 px-4 text-center">إرسال التخطيط</th>
                <th className="py-3 px-4 text-center">إرسال الفعلي</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {weeks.map(w => (
                <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-500">#{w.weekNumber}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{w.name}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600" dir="ltr">
                    {formatDate(w.startDate)} - {formatDate(w.endDate)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <span className="font-medium">{w.requiredDays?.join('، ') || 'الأحد إلى الخميس'}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleTogglePlanning(w)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                        w.planningOpen
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {w.planningOpen ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{w.planningOpen ? 'مفتوح' : 'مغلق'}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActual(w)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                        w.actualOpen
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {w.actualOpen ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{w.actualOpen ? 'مفتوح' : 'مغلق'}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {w.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        نشط حالياً
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">مؤرشف</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(w)}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="تعديل الأسبوع"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Week Modal */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingWeek ? 'تعديل إعدادات الأسبوع وفترات الإرسال' : 'إنشاء أسبوع جديد'}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveWeek} className="space-y-5 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم الأسبوع</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500/20"
                placeholder="مثال: الأسبوع الأول"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">السنة الدراسية</label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name} {y.isCurrent ? '(الحالية)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ بداية الأسبوع</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ نهاية الأسبوع</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                required
              />
            </div>
          </div>

          {/* Required Days Checkboxes (Section 23 in prompt) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block font-bold text-slate-800">
              الأيام المطلوبة لهذا الأسبوع (التي يجب على المشرف تعبئتها قبل الإرسال):
            </label>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {ALL_POSSIBLE_DAYS.map(day => {
                const isSelected = requiredDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleToggleDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{day}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual Phase Window Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Planning Window Settings */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <span>📋</span>
                  <span>فترة برنامج التخطيط</span>
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planningOpen}
                    onChange={(e) => setPlanningOpen(e.target.checked)}
                    className="accent-emerald-600"
                  />
                  <span className="font-bold text-emerald-800 text-[11px]">مفتوح للإرسال</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">موعد بدء فتح التخطيط:</label>
                <input
                  type="datetime-local"
                  value={planningOpenAt}
                  onChange={(e) => setPlanningOpenAt(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">موعد إغلاق التخطيط:</label>
                <input
                  type="datetime-local"
                  value={planningCloseAt}
                  onChange={(e) => setPlanningCloseAt(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">مرات الإرسال الافتراضية:</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={defaultMaxPlanningSubmissions}
                  onChange={(e) => setDefaultMaxPlanningSubmissions(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>

            {/* Actual Window Settings */}
            <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-sky-200/60">
                <span className="font-bold text-sky-950 text-xs flex items-center gap-1.5">
                  <span>✅</span>
                  <span>فترة البرنامج الفعلي</span>
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={actualOpen}
                    onChange={(e) => setActualOpen(e.target.checked)}
                    className="accent-sky-600"
                  />
                  <span className="font-bold text-sky-800 text-[11px]">مفتوح للإرسال</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">موعد بدء فتح الفعلي:</label>
                <input
                  type="datetime-local"
                  value={actualOpenAt}
                  onChange={(e) => setActualOpenAt(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">موعد إغلاق الفعلي:</label>
                <input
                  type="datetime-local"
                  value={actualCloseAt}
                  onChange={(e) => setActualCloseAt(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">مرات الإرسال الافتراضية:</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={defaultMaxActualSubmissions}
                  onChange={(e) => setDefaultMaxActualSubmissions(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Supervisor Overrides Button (Section 26 in prompt) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 block text-xs">إعدادات الإرسال المخصصة للمشرفين:</span>
              <span className="text-[11px] text-slate-500">
                يمكنك تخصيص عدد مرات الإرسال لمشرفين محددين (مستقلة عن القيمة الافتراضية).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowOverridesModal(true)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>تخصيص المشرفين ({Object.keys(supervisorOverrides).length})</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-emerald-600"
              />
              <span className="font-bold text-slate-800">تعيين كأسبوع نشط حالياً للنظام</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowRevisionRequests}
                onChange={(e) => setAllowRevisionRequests(e.target.checked)}
                className="accent-emerald-600"
              />
              <span className="text-slate-700">السماح للمشرفين بتقديم طلبات تعديل البرامج</span>
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات وتوجيهات للأسبوع</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
              placeholder="أي توجيهات خاصة بالزيارات..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddEditModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              حفظ إعدادات الأسبوع
            </button>
          </div>
        </form>
      </Modal>

      {/* Supervisor Overrides Modal (Section 26) */}
      <Modal
        isOpen={showOverridesModal}
        onClose={() => setShowOverridesModal(false)}
        title="تحديد عدد مرات الإرسال لكل مشرف بشكل مستقل"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500 leading-relaxed">
            حدد عدد مرات الإرسال المسموحة للمشرف لبرنامج التخطيط والبرنامج الفعلي. إذا تُركت فارغة، سيتم تطبيق القيمة الافتراضية المحددة للأسبوع.
          </p>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">اسم المشرف</th>
                  <th className="py-2.5 px-3">التخصص</th>
                  <th className="py-2.5 px-3 text-center">مرات إرسال التخطيط</th>
                  <th className="py-2.5 px-3 text-center">مرات إرسال الفعلي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeSupervisors.map(sup => {
                  const ov = supervisorOverrides[sup.id] || {};
                  return (
                    <tr key={sup.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{sup.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{sup.specialization}</td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          placeholder={String(defaultMaxPlanningSubmissions)}
                          value={ov.maxPlanning ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined;
                            setSupervisorOverrides(prev => ({
                              ...prev,
                              [sup.id]: { ...prev[sup.id], maxPlanning: val }
                            }));
                          }}
                          className="w-16 p-1 text-center rounded border border-slate-300 font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          placeholder={String(defaultMaxActualSubmissions)}
                          value={ov.maxActual ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined;
                            setSupervisorOverrides(prev => ({
                              ...prev,
                              [sup.id]: { ...prev[sup.id], maxActual: val }
                            }));
                          }}
                          className="w-16 p-1 text-center rounded border border-slate-300 font-bold"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowOverridesModal(false)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
            >
              تم وحفظ التخصيص
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
