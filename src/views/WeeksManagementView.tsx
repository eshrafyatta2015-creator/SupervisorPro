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
  X
} from 'lucide-react';
import { Week, User, AcademicYear } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';

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
  const [isActive, setIsActive] = useState(true);
  const [planningOpen, setPlanningOpen] = useState(true);
  const [actualOpen, setActualOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const weeks = storage.getWeeks();
  const academicYears = storage.getAcademicYears();
  const currentAcademicYear = storage.getCurrentAcademicYear();
  const currentActiveWeek = storage.getCurrentWeek();

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
    setIsActive(false);
    setPlanningOpen(true);
    setActualOpen(false);
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
    setIsActive(w.isActive ?? (w.status === 'Open'));
    setPlanningOpen(w.planningOpen ?? false);
    setActualOpen(w.actualOpen ?? false);
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
      status: isActive ? 'Open' : 'Closed',
      isActive,
      planningOpen,
      actualOpen,
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

  const handleSetActive = (w: Week) => {
    weeks.forEach(item => {
      item.isActive = item.id === w.id;
      item.status = item.id === w.id ? 'Open' : 'Closed';
      storage.saveWeek(item);
    });
    onShowToast(`تم تعيين (${w.name}) كأسبوع نشط حالياً.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">إدارة الأسابيع وفترات الإرسال</h1>
          <p className="text-xs text-slate-500 mt-1">
            التحكم في فترات فتح وإغلاق إرسال برنامج التخطيط الأسبوعي والبرنامج الفعلي للمشرفين.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
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
                الفترة الرسمية: من {currentActiveWeek.startDate} إلى {currentActiveWeek.endDate}
              </div>
            </div>

            {/* Quick Action Buttons for the Active Week */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleTogglePlanning(currentActiveWeek)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 ${
                  currentActiveWeek.planningOpen
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {currentActiveWeek.planningOpen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span>{currentActiveWeek.planningOpen ? 'إغلاق إرسال برنامج التخطيط' : 'فتح إرسال برنامج التخطيط'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleActual(currentActiveWeek)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 ${
                  currentActiveWeek.actualOpen
                    ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                    : 'bg-sky-500 hover:bg-sky-600 text-white'
                }`}
              >
                {currentActiveWeek.actualOpen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span>{currentActiveWeek.actualOpen ? 'إغلاق إرسال البرنامج الفعلي' : 'فتح إرسال البرنامج الفعلي'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weeks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">سجل الأسابيع المعتمدة</h3>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full tabular-nums">
              {weeks.length} أسبوع
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">اسم الأسبوع</th>
                <th className="py-3 px-4">تاريخ البداية</th>
                <th className="py-3 px-4">تاريخ النهاية</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">إرسال التخطيط</th>
                <th className="py-3 px-4 text-center">إرسال الفعلي</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {weeks.map(w => {
                const isCurrent = w.id === currentActiveWeek?.id;
                return (
                  <tr key={w.id} className={`hover:bg-slate-50/60 transition-colors ${isCurrent ? 'bg-emerald-50/30' : ''}`}>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{w.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white">
                            النشط
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 tabular-nums">
                      {w.startDate}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 tabular-nums">
                      {w.endDate}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {w.isActive ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                          نشط
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetActive(w)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                        >
                          تفعيل كنشط
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePlanning(w)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors inline-flex items-center gap-1 ${
                          w.planningOpen
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
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
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors inline-flex items-center gap-1 ${
                          w.actualOpen
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {w.actualOpen ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span>{w.actualOpen ? 'مفتوح' : 'مغلق'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(w)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="تعديل إعدادات الأسبوع"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Week Modal */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingWeek ? 'تعديل إعدادات الأسبوع' : 'إنشاء أسبوع جديد'}
        subtitle="قسم الإشراف والتأهيل التربوي - مديرية يطا"
      >
        <form onSubmit={handleSaveWeek} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">اسم الأسبوع</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              placeholder="مثال: الأسبوع الأول"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ بداية الأسبوع</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">تاريخ نهاية الأسبوع</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-800 mb-1">إعدادات الإرسال والنشاط للأسبوع:</h4>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-bold text-slate-800">تعيين كأسبوع نشط حالياً في النظام</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={planningOpen}
                onChange={(e) => setPlanningOpen(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-slate-700">برنامج التخطيط الأسبوعي: <strong className="text-emerald-700">مفتوح للإرسال</strong></span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={actualOpen}
                onChange={(e) => setActualOpen(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-slate-700">البرنامج الفعلي: <strong className="text-sky-700">مفتوح للإرسال</strong></span>
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات توجيهية للأسبوع (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="أي توجيهات خاصة بالزيارات أو البرامج..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddEditModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors"
            >
              حفظ إعدادات الأسبوع
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
