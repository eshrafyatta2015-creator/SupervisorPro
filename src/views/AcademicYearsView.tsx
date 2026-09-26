import React, { useState } from 'react';
import { Plus, Edit2, CalendarRange, CheckCircle2, Archive, Star } from 'lucide-react';
import { AcademicYear, User } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';

interface AcademicYearsViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AcademicYearsView: React.FC<AcademicYearsViewProps> = ({ currentUser, onShowToast }) => {
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [status, setStatus] = useState<'Active' | 'Archived'>('Active');
  const [formError, setFormError] = useState('');

  const academicYears = storage.getAcademicYears();

  const handleOpenAdd = () => {
    setEditingYear(null);
    setName('2027-2028');
    setStartDate('2027-09-01');
    setEndDate('2028-06-15');
    setIsCurrent(false);
    setStatus('Active');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (year: AcademicYear) => {
    setEditingYear(year);
    setName(year.name);
    setStartDate(year.startDate);
    setEndDate(year.endDate);
    setIsCurrent(year.isCurrent);
    setStatus(year.status);
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleSaveYear = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !startDate || !endDate) {
      setFormError('يرجى ملء جميع الحقول الإلزامية.');
      return;
    }

    if (startDate >= endDate) {
      setFormError('تاريخ نهاية السنة يجب أن يكون بعد تاريخ البداية.');
      return;
    }

    const yearData: AcademicYear = {
      id: editingYear ? editingYear.id : `year_${Date.now()}`,
      name: name.trim(),
      startDate,
      endDate,
      isCurrent,
      status,
      createdAt: editingYear ? editingYear.createdAt : new Date().toISOString()
    };

    storage.saveAcademicYear(yearData);
    setShowAddEditModal(false);
    onShowToast(editingYear ? 'تم تعديل بيانات السنة الدراسية بنجاح.' : 'تمت إضافة السنة الدراسية بنجاح.', 'success');
  };

  const handleSetCurrent = (year: AcademicYear) => {
    year.isCurrent = true;
    year.status = 'Active';
    storage.saveAcademicYear(year);
    onShowToast(`تم تعيين السنة (${year.name}) كسنة دراسية حالية للنظام.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">إدارة السنوات الدراسية</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تحديد السنة الدراسية الحالية وحفظ أرشيف السنوات السابقة دون أي فقدان للبيانات.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة سنة دراسية</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {academicYears.map(year => (
          <div
            key={year.id}
            className={`p-5 rounded-2xl border transition-all ${
              year.isCurrent
                ? 'bg-white border-emerald-400 shadow-sm ring-1 ring-emerald-500/20'
                : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 tabular-nums">العام الدراسي: {year.name}</h3>
                  {year.isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      <Star className="w-3 h-3 fill-current" />
                      <span>السنة الحالية</span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1 tabular-nums">
                  من {formatDate(year.startDate)} إلى {formatDate(year.endDate)}
                </div>
              </div>

              <div>
                {year.status === 'Active' ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    نشطة
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Archive className="w-3 h-3" />
                    <span>مؤرشفة</span>
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                {!year.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleSetCurrent(year)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>جعلها السنة الحالية</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleOpenEdit(year)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                title="تعديل"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingYear ? 'تعديل السنة الدراسية' : 'إضافة سنة دراسية جديدة'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveYear} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم السنة الدراسية <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="مثال: 2026-2027"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ البداية <span className="text-rose-500">*</span>
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
                تاريخ النهاية <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الحالة</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Active' | 'Archived')}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="Active">نشطة</option>
              <option value="Archived">مؤرشفة</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>تعيين كسنة دراسية حالية للنظام تلقائياً</span>
            </label>
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
              {editingYear ? 'حفظ التعديلات' : 'إضافة السنة الدراسية'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
