import React, { useState, useEffect } from 'react';
import {
  Plus,
  Save,
  Send,
  Copy,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  School as SchoolIcon,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { User, WeeklyProgram, ProgramItem, Week, School, Activity, Supervisor } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { CountdownTimer } from '../components/CountdownTimer';
import { formatDate, formatTime, getArabicDayName, isDateWithinRange, getWeekDates } from '../utils/date';
import { exportToExcel, triggerPrint } from '../utils/export';

interface WeeklyProgramViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const WeeklyProgramView: React.FC<WeeklyProgramViewProps> = ({ currentUser, onShowToast }) => {
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [program, setProgram] = useState<WeeklyProgram | null>(null);
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProgramItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for new/edit item
  const [formDate, setFormDate] = useState('');
  const [formSchoolId, setFormSchoolId] = useState('');
  const [formActivityId, setFormActivityId] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('10:30');
  const [formLocation, setFormLocation] = useState('');
  const [formObjective, setFormObjective] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  const weeks = storage.getWeeks();
  const currentAcademicYear = storage.getCurrentAcademicYear();
  const schools = storage.getActiveSchools();
  const activities = storage.getActiveActivities();

  // Find supervisor
  const supervisor: Supervisor | undefined = currentUser.supervisorId
    ? storage.getSupervisorById(currentUser.supervisorId)
    : storage.getSupervisors()[0]; // Fallback for admin previewing

  // Default to current open week or latest week
  useEffect(() => {
    const currentWeek = storage.getCurrentWeek();
    if (currentWeek) {
      setSelectedWeekId(currentWeek.id);
    } else if (weeks.length > 0) {
      setSelectedWeekId(weeks[0].id);
    }
  }, []);

  const loadProgramData = () => {
    if (!supervisor || !selectedWeekId) return;

    let p = storage.getProgramBySupervisorAndWeek(supervisor.id, selectedWeekId);
    if (!p) {
      // Initialize an empty draft program record
      const selectedWeek = storage.getWeekById(selectedWeekId);
      p = {
        id: `prog_${Date.now()}`,
        supervisorId: supervisor.id,
        academicYearId: selectedWeek?.academicYearId || currentAcademicYear?.id || 'year_2026_2027',
        weekId: selectedWeekId,
        status: 'Draft',
        createdAt: new Date().toISOString()
      };
      storage.saveProgram(p);
    }
    setProgram(p);
    setItems(storage.getProgramItems(p.id));
  };

  useEffect(() => {
    loadProgramData();
  }, [selectedWeekId, supervisor?.id]);

  const selectedWeek: Week | undefined = weeks.find(w => w.id === selectedWeekId);

  // Editable check: Week must be Open AND status not Approved or Submitted (unless reopen requested)
  const isSubmissionWindowOpen = selectedWeek?.status === 'Open';
  const isProgramSubmitted = program?.status === 'Submitted';
  const isProgramApproved = program?.status === 'Approved';
  const isNeedsRevision = program?.status === 'NeedsRevision';
  const canEdit = isSubmissionWindowOpen && (!isProgramSubmitted && !isProgramApproved || isNeedsRevision);

  const openAddItemModal = (presetDate?: string) => {
    setEditingItem(null);
    setFormDate(presetDate || selectedWeek?.startDate || '');
    setFormSchoolId(schools[0]?.id || '');
    setFormActivityId(activities[0]?.id || '');
    setFormStartTime('08:00');
    setFormEndTime('10:30');
    setFormLocation('');
    setFormObjective('');
    setFormNotes('');
    setFormError('');
    setShowItemModal(true);
  };

  const openEditItemModal = (item: ProgramItem) => {
    setEditingItem(item);
    setFormDate(item.dayDate);
    setFormSchoolId(item.schoolId);
    setFormActivityId(item.activityId);
    setFormStartTime(item.startTime);
    setFormEndTime(item.endTime);
    setFormLocation(item.location);
    setFormObjective(item.objective);
    setFormNotes(item.notes || '');
    setFormError('');
    setShowItemModal(true);
  };

  // Validation according to Requirement 13
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedWeek || !program) return;

    // 1. End time must be after start time
    if (formStartTime >= formEndTime) {
      setFormError('وقت نهاية النشاط يجب أن يكون بعد وقت البداية.');
      return;
    }

    // 2. Date must be within week's range
    if (!isDateWithinRange(formDate, selectedWeek.startDate, selectedWeek.endDate)) {
      setFormError(`التاريخ المحدد (${formatDate(formDate)}) يقع خارج نطاق الأسبوع الدراسي المحدد (${formatDate(selectedWeek.startDate)} إلى ${formatDate(selectedWeek.endDate)}).`);
      return;
    }

    // 3. School and Activity active
    const school = schools.find(s => s.id === formSchoolId);
    if (!school || !school.isActive) {
      setFormError('المدرسة المحددة غير مفعلة.');
      return;
    }
    const act = activities.find(a => a.id === formActivityId);
    if (!act || !act.isActive) {
      setFormError('نوع النشاط المحدد غير مفعل.');
      return;
    }

    // 4. Overlap check for same day
    const sameDayItems = items.filter(i => i.dayDate === formDate && (!editingItem || i.id !== editingItem.id));
    const hasOverlap = sameDayItems.some(i => {
      return (
        (formStartTime >= i.startTime && formStartTime < i.endTime) ||
        (formEndTime > i.startTime && formEndTime <= i.endTime) ||
        (formStartTime <= i.startTime && formEndTime >= i.endTime)
      );
    });

    if (hasOverlap) {
      setFormError('يوجد تداخل زمني مع نشاط آخر مسجل في نفس اليوم.');
      return;
    }

    // Save item
    const newItem: ProgramItem = {
      id: editingItem ? editingItem.id : `item_${Date.now()}`,
      weeklyProgramId: program.id,
      dayDate: formDate,
      dayName: getArabicDayName(formDate),
      schoolId: formSchoolId,
      activityId: formActivityId,
      startTime: formStartTime,
      endTime: formEndTime,
      location: formLocation || school.name,
      objective: formObjective,
      notes: formNotes,
      sortOrder: items.length + 1,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
    };

    storage.saveProgramItem(newItem);
    setShowItemModal(false);
    loadProgramData();
    onShowToast(editingItem ? 'تم تعديل النشاط بنجاح.' : 'تمت إضافة النشاط بنجاح إلى البرنامج.', 'success');
  };

  const handleDeleteItem = (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا النشاط من البرنامج؟')) return;
    storage.deleteProgramItem(id);
    loadProgramData();
    onShowToast('تم حذف النشاط من البرنامج.', 'info');
  };

  const handleSaveDraft = () => {
    if (!program) return;
    setIsSaving(true);
    program.status = 'Draft';
    storage.saveProgram(program);
    setTimeout(() => {
      setIsSaving(false);
      onShowToast('تم حفظ البرنامج كمسودة بنجاح.', 'success');
    }, 400);
  };

  const handleConfirmSubmit = () => {
    if (!program) return;
    if (items.length === 0) {
      onShowToast('لا يمكن إرسال برنامج أسبوعي فارغ بدون أي أنشطة.', 'error');
      setShowSubmitModal(false);
      return;
    }

    setIsSaving(true);
    program.status = 'Submitted';
    program.submittedAt = new Date().toISOString();
    storage.saveProgram(program);

    // Notify admin
    storage.addNotification({
      id: `notif_${Date.now()}`,
      userId: 'usr_admin',
      title: 'برنامج أسبوعي جديد بانتظار الاعتماد',
      message: `قام المشرف (${supervisor?.name}) بإرسال برنامجه الأسبوعي لـ (${selectedWeek?.name}) للمراجعة والاعتماد.`,
      type: 'info',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    storage.addAuditLog(
      currentUser.id,
      currentUser.username,
      'إرسال البرنامج الأسبوعي',
      'WeeklyProgram',
      program.id,
      `تم إرسال البرنامج الأسبوعي لـ ${selectedWeek?.name} (${items.length} نشاط)`
    );

    setTimeout(() => {
      setIsSaving(false);
      setShowSubmitModal(false);
      loadProgramData();
      onShowToast('تم إرسال البرنامج الأسبوعي بنجاح لرئيس القسم للمراجعة والاعتماد.', 'success');
    }, 600);
  };

  const handleCopyPreviousWeek = () => {
    if (!selectedWeek || !supervisor) return;

    // Find previous week
    const prevWeek = weeks
      .filter(w => w.weekNumber < selectedWeek.weekNumber)
      .sort((a, b) => b.weekNumber - a.weekNumber)[0];

    if (!prevWeek) {
      onShowToast('لا يوجد أسبوع سابق لنسخ الأنشطة منه.', 'warning');
      return;
    }

    const prevProg = storage.getProgramBySupervisorAndWeek(supervisor.id, prevWeek.id);
    if (!prevProg) {
      onShowToast(`لم يتم العثور على برنامج سابق لك في (${prevWeek.name}).`, 'warning');
      return;
    }

    const prevItems = storage.getProgramItems(prevProg.id);
    if (prevItems.length === 0) {
      onShowToast(`برنامج (${prevWeek.name}) لا يحتوي على أنشطة لنسخها.`, 'warning');
      return;
    }

    if (!window.confirm(`هل تريد نسخ أنشطة (${prevWeek.name}) إلى هذا الأسبوع كمسودة جديدة؟`)) {
      return;
    }

    storage.copyPreviousWeekProgram(supervisor.id, selectedWeek.id, prevWeek.id);
    loadProgramData();
    onShowToast(`تم نسخ ${prevItems.length} نشاط من (${prevWeek.name}) كمسودة جديدة قابلة للتعديل.`, 'success');
  };

  const handleExportExcel = () => {
    if (!selectedWeek || !supervisor) return;
    const headers = ['اليوم', 'التاريخ', 'المدرسة', 'نوع النشاط', 'وقت البداية', 'وقت النهاية', 'المكان', 'الهدف', 'الملاحظات'];
    const rows = items.map(i => {
      const sch = schools.find(s => s.id === i.schoolId);
      const act = activities.find(a => a.id === i.activityId);
      return [
        i.dayName,
        formatDate(i.dayDate),
        sch?.name || '-',
        act?.name || '-',
        i.startTime,
        i.endTime,
        i.location,
        i.objective,
        i.notes || '-'
      ];
    });
    exportToExcel(`برنامج_${supervisor.name}_${selectedWeek.name}`, headers, rows);
  };

  // Group items by date for clean weekly view
  const weekDays = selectedWeek ? getWeekDates(selectedWeek.startDate, 5) : [];

  return (
    <div className="space-y-6">
      {/* Official Top Control Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
            <span>المشرف: {supervisor?.name}</span>
            <span>·</span>
            <span>التخصص: {supervisor?.specialization}</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1">البرنامج الأسبوعي للمشرف التربوي</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            العام الدراسي الحالي: {currentAcademicYear?.name}
          </p>
        </div>

        {/* Week Selector & Deadline status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">اختر الأسبوع:</span>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {weeks.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatDate(w.startDate)} - {formatDate(w.endDate)})
                </option>
              ))}
            </select>
          </div>

          {selectedWeek && (
            <div>
              {selectedWeek.status === 'Open' ? (
                <CountdownTimer targetDate={selectedWeek.closeSubmissionAt} variant="compact" />
              ) : selectedWeek.status === 'Closed' ? (
                <span className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                  انتهت فترة إرسال البرامج لهذا الأسبوع.
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                  لم تبدأ فترة إرسال البرامج بعد.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Revision Alert Banner if NeedsRevision */}
      {isNeedsRevision && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-sm text-amber-950 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold">تم طلب تعديل هذا البرنامج من قبل رئيس قسم الإشراف:</h3>
              <p className="text-xs font-medium text-amber-900 mt-1 bg-white p-3 rounded-xl border border-amber-200 leading-relaxed">
                «{program?.reviewNotes || 'يرجى مراجعة الأنشطة المحددة وإعادة إرسال البرنامج'}»
              </p>
              <p className="text-[11px] text-amber-700 mt-2">
                يمكنك الآن تعديل أو حذف أو إضافة أنشطة ثم الضغط على "إعادة إرسال البرنامج".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Program Status & Action Ribbon */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600">حالة البرنامج:</span>
          {program?.status === 'Approved' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>معتمد رسمياً</span>
            </span>
          ) : program?.status === 'Submitted' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
              <Clock className="w-3.5 h-3.5" />
              <span>تم الإرسال (قيد المراجعة والتدقيق)</span>
            </span>
          ) : program?.status === 'NeedsRevision' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>يحتاج إلى تعديل</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
              <span>مسودة (لم يُرسل بعد)</span>
            </span>
          )}

          {program?.submittedAt && (
            <span className="text-xs text-slate-500 tabular-nums">
              تاريخ الإرسال: {formatDate(program.submittedAt)} {formatTime(program.submittedAt)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={handleCopyPreviousWeek}
                className="px-3 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5"
                title="نسخ أنشطة الأسبوع السابق كمسودة لتسهيل التعبئة"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>نسخ برنامج الأسبوع السابق</span>
              </button>

              <button
                type="button"
                onClick={() => openAddItemModal()}
                className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة نشاط</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-3 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>حفظ كمسودة</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                disabled={items.length === 0 || isSaving}
                className="px-4 py-2 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isNeedsRevision ? 'إعادة إرسال البرنامج' : 'إرسال البرنامج'}</span>
              </button>
            </>
          )}

          {/* Export & Print always available */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            title="تصدير إلى Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          </button>
          <button
            type="button"
            onClick={triggerPrint}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            title="طباعة البرنامج"
          >
            <Printer className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>

      {/* Main Weekly Timetable Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">لا توجد أنشطة مضافة لهذا الأسبوع حتى الآن</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              اضغط على "إضافة نشاط" لإدراج زياراتك الإشرافية وورش العمل والمهام المقررة.
            </p>
            {canEdit && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => openAddItemModal()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  إضافة أول نشاط الآن
                </button>
                <button
                  type="button"
                  onClick={handleCopyPreviousWeek}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  نسخ من الأسبوع السابق
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-3.5 px-4 w-24">اليوم</th>
                  <th className="py-3.5 px-4 w-28">التاريخ</th>
                  <th className="py-3.5 px-4">المدرسة</th>
                  <th className="py-3.5 px-4">نوع النشاط</th>
                  <th className="py-3.5 px-4 w-28">الوقت</th>
                  <th className="py-3.5 px-4">المكان</th>
                  <th className="py-3.5 px-4 min-w-[200px]">الهدف الإشرافي</th>
                  <th className="py-3.5 px-4">الملاحظات</th>
                  {canEdit && <th className="py-3.5 px-4 w-24 text-center">إجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const school = schools.find(s => s.id === item.schoolId);
                  const act = activities.find(a => a.id === item.activityId);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{item.dayName}</td>
                      <td className="py-3 px-4 tabular-nums text-slate-600">{formatDate(item.dayDate)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{school?.name || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                          {act?.name || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-slate-600">
                        {item.startTime} - {item.endTime}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.location}</td>
                      <td className="py-3 px-4 text-slate-700 leading-relaxed">{item.objective}</td>
                      <td className="py-3 px-4 text-slate-500">{item.notes || '-'}</td>
                      {canEdit && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditItemModal(item)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Print Header for Printable Page View */}
      <div className="hidden print-only p-8 text-black bg-white">
        <div className="text-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold">دولة فلسطين - وزارة التربية والتعليم العالي</h2>
          <h3 className="text-lg font-bold">مديرية التربية والتعليم يطا - قسم الإشراف والتأهيل التربوي</h3>
          <h4 className="text-md font-bold mt-2">برنامج المشرف الأسبوعي</h4>
          <div className="flex justify-between text-sm mt-4 font-semibold">
            <span>اسم المشرف: {supervisor?.name}</span>
            <span>التخصص: {supervisor?.specialization}</span>
            <span>{selectedWeek?.name} ({formatDate(selectedWeek?.startDate)} - {formatDate(selectedWeek?.endDate)})</span>
          </div>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? 'تعديل نشاط إشرافي' : 'إضافة نشاط إشرافي جديد'}
        subtitle={`الأسبوع: ${selectedWeek?.name}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ اليوم <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formDate}
                min={selectedWeek?.startDate}
                max={selectedWeek?.endDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              {formDate && (
                <span className="text-[11px] font-semibold text-emerald-700 mt-1 block">
                  اليوم: {getArabicDayName(formDate)}
                </span>
              )}
            </div>

            {/* School */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المدرسة <span className="text-rose-500">*</span>
              </label>
              <select
                value={formSchoolId}
                onChange={(e) => setFormSchoolId(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.stage} - {s.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Activity Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع النشاط الإشرافي <span className="text-rose-500">*</span>
              </label>
              <select
                value={formActivityId}
                onChange={(e) => setFormActivityId(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {activities.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المكان داخل المدرسة / المديرية</label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="مثال: الغرف الصفية، مختبر الحاسوب، مكتب المدير"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                وقت البداية <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                وقت النهاية <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
              />
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الهدف الإشرافي من النشاط <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={formObjective}
              onChange={(e) => setFormObjective(e.target.value)}
              rows={2}
              required
              placeholder="اكتب الهدف التفصيلي للزيارة أو المتابعة الصفية..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="أي ملاحظات أو احتياجات لوجستية..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowItemModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
            >
              {editingItem ? 'حفظ التعديلات' : 'إضافة النشاط'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Submission Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="تأكيد إرسال البرنامج الأسبوعي"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-sm mb-1">هل أنت متأكد من إرسال البرنامج الأسبوعي؟</p>
              <p>
                سيتم إرسال البرنامج النهائي المكوّن من ({items.length}) نشاط إلى رئيس قسم الإشراف والتأهيل التربوي للاعتماد الرسمي.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            ملاحظة: بعد الإرسال، لن تتمكن من التعديل إلا إذا تم فتح البرنامج من قبل رئيس القسم أو طُلب تعديله.
          </p>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              تراجع
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-md"
            >
              {isSaving ? 'جارٍ الإرسال...' : 'تأكيد وإرسال البرنامج'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
