import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Calendar,
  Lock,
  Unlock,
  RotateCcw,
  Copy,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Week, User, AcademicYear } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate, formatDateTime } from '../utils/date';
import { CountdownTimer } from '../components/CountdownTimer';

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
  const [openSubmissionAt, setOpenSubmissionAt] = useState('');
  const [closeSubmissionAt, setCloseSubmissionAt] = useState('');
  const [allowEditAfterSubmit, setAllowEditAfterSubmit] = useState(false);
  const [status, setStatus] = useState<'NotStarted' | 'Open' | 'Closed'>('NotStarted');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const weeks = storage.getWeeks();
  const academicYears = storage.getAcademicYears();
  const currentAcademicYear = storage.getCurrentAcademicYear();

  const handleOpenAdd = () => {
    setEditingWeek(null);
    const nextNumber = weeks.length > 0 ? Math.max(...weeks.map(w => w.weekNumber)) + 1 : 1;
    setAcademicYearId(currentAcademicYear?.id || (academicYears[0]?.id || ''));
    setWeekNumber(nextNumber);
    setName(`الأسبوع رقم ${nextNumber}`);

    // Default dates
    const now = new Date();
    const start = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 4 * 24 * 3600 * 1000);

    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];

    setStartDate(sStr);
    setEndDate(eStr);
    setOpenSubmissionAt(new Date(start.getTime() - 2 * 24 * 3600 * 1000).toISOString().slice(0, 16));
    setCloseSubmissionAt(new Date(start.getTime() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 16));
    setAllowEditAfterSubmit(false);
    setStatus('NotStarted');
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
    setOpenSubmissionAt(w.openSubmissionAt ? new Date(w.openSubmissionAt).toISOString().slice(0, 16) : '');
    setCloseSubmissionAt(w.closeSubmissionAt ? new Date(w.closeSubmissionAt).toISOString().slice(0, 16) : '');
    setAllowEditAfterSubmit(w.allowEditAfterSubmit);
    setStatus(w.status);
    setNotes(w.notes || '');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleSaveWeek = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !startDate || !endDate) {
      setFormError('اسم الأسبوع وتاريخ البداية والنهاية حقول مطلوبة.');
      return;
    }

    if (startDate >= endDate) {
      setFormError('تاريخ نهاية الأسبوع يجب أن يكون بعد تاريخ البداية.');
      return;
    }

    const weekData: Week = {
      id: editingWeek ? editingWeek.id : `week_${Date.now()}`,
      academicYearId,
      weekNumber: Number(weekNumber),
      name: name.trim(),
      startDate,
      endDate,
      openSubmissionAt: new Date(openSubmissionAt).toISOString(),
      closeSubmissionAt: new Date(closeSubmissionAt).toISOString(),
      allowEditAfterSubmit,
      status,
      notes: notes.trim(),
      createdAt: editingWeek ? editingWeek.createdAt : new Date().toISOString()
    };

    storage.saveWeek(weekData);
    setShowAddEditModal(false);
    onShowToast(editingWeek ? 'تم تعديل بيانات الأسبوع بنجاح.' : 'تمت إضافة الأسبوع بنجاح.', 'success');
  };

  const handleQuickStatusChange = (w: Week, newStatus: 'Open' | 'Closed') => {
    w.status = newStatus;
    if (newStatus === 'Open') {
      // Ensure open submission date is now and close is in 3 days if expired
      w.openSubmissionAt = new Date().toISOString();
      if (new Date(w.closeSubmissionAt).getTime() <= Date.now()) {
        w.closeSubmissionAt = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
      }
    }
    storage.saveWeek(w);
    onShowToast(
      newStatus === 'Open'
        ? `تم فتح فترة استقبال البرامج لـ (${w.name}) بنجاح.`
        : `تم إغلاق فترة استقبال البرامج لـ (${w.name}).`,
      newStatus === 'Open' ? 'success' : 'warning'
    );
  };

  const handleDeleteWeek = (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الأسبوع؟')) return;
    const ok = storage.deleteWeek(id);
    if (ok) {
      onShowToast('تم حذف الأسبوع بنجاح.', 'info');
    } else {
      onShowToast('لا يمكن حذف هذا الأسبوع لأنه يحتوي على برامج مرسلة مسجلة.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">إدارة الأسابيع وفترات إرسال البرامج</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            التحكم المركزي في تواريخ ومواعيد فتح وإغلاق إرسال البرامج الأسبوعية للمشرفين.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة أسبوع جديد</span>
        </button>
      </div>

      {/* Weeks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weeks.map(w => {
          const year = academicYears.find(y => y.id === w.academicYearId);
          const isOpen = w.status === 'Open';
          const isClosed = w.status === 'Closed';

          return (
            <div
              key={w.id}
              className={`p-5 rounded-2xl border transition-all ${
                isOpen
                  ? 'bg-white border-emerald-300 shadow-sm ring-1 ring-emerald-500/20'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">{w.name}</h3>
                    <span className="text-xs text-slate-400 font-semibold">(أسبوع #{w.weekNumber})</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    العام الدراسي: {year?.name || 'غير محدد'}
                  </span>
                </div>

                <div>
                  {isOpen ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>مفتوح للإرسال</span>
                    </span>
                  ) : isClosed ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <Lock className="w-3.5 h-3.5" />
                      <span>مغلق</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                      <span>لم يبدأ بعد</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 mt-4 p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">فترة الأسبوع:</span>
                  <span className="font-bold text-slate-700 tabular-nums">
                    {formatDate(w.startDate)} - {formatDate(w.endDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">موعد إغلاق الإرسال:</span>
                  <span className="font-bold text-rose-700 tabular-nums">
                    {formatDateTime(w.closeSubmissionAt)}
                  </span>
                </div>
              </div>

              {/* Countdown if open */}
              {isOpen && (
                <div className="mt-3">
                  <CountdownTimer targetDate={w.closeSubmissionAt} variant="compact" />
                </div>
              )}

              {/* Notes */}
              {w.notes && (
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  ملاحظات: {w.notes}
                </p>
              )}

              {/* Control Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {!isOpen ? (
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(w, 'Open')}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>فتح الإرسال</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(w, 'Closed')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>إغلاق الإرسال</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(w)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                    title="تعديل الأسبوع"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteWeek(w.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  title="حذف الأسبوع"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingWeek ? 'تعديل الأسبوع وفترة الإرسال' : 'إضافة أسبوع دراسي جديد'}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveWeek} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">السنة الدراسية</label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم الأسبوع <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={weekNumber}
                min={1}
                max={50}
                onChange={(e) => setWeekNumber(Number(e.target.value))}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم الأسبوع <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="مثال: الأسبوع الأول، الأسبوع الثاني..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ بداية الأسبوع <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ نهاية الأسبوع <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ ووقت فتح إرسال البرامج
              </label>
              <input
                type="datetime-local"
                value={openSubmissionAt}
                onChange={(e) => setOpenSubmissionAt(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ ووقت إغلاق الإرسال <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={closeSubmissionAt}
                onChange={(e) => setCloseSubmissionAt(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">حالة الأسبوع</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'NotStarted' | 'Open' | 'Closed')}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="NotStarted">لم يبدأ</option>
                <option value="Open">مفتوح للإرسال</option>
                <option value="Closed">مغلق</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">السماح بالتعديل بعد الإرسال</label>
              <select
                value={allowEditAfterSubmit ? 'yes' : 'no'}
                onChange={(e) => setAllowEditAfterSubmit(e.target.value === 'yes')}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="no">لا، يمنع التعديل إلا بإعادة فتح</option>
                <option value="yes">نعم، مسموح التعديل حتى موعد الإغلاق</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات وتوجيهات الأسبوع</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="مثال: التركيز على تطبيق خطة الفاقد التعليمي وزيارة المدارس النائية..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddEditModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
            >
              {editingWeek ? 'حفظ التعديلات' : 'إضافة الأسبوع'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
