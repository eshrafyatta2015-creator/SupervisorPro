import React, { useState } from 'react';
import { Plus, Search, Edit2, School as SchoolIcon, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react';
import { School, User } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';
import { arabicSearchMatch } from '../utils/arabic';
import { exportToExcel } from '../utils/export';

interface SchoolsViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const SchoolsView: React.FC<SchoolsViewProps> = ({ currentUser, onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [stage, setStage] = useState<'أساسي' | 'ثانوي' | 'مختلط'>('أساسي');
  const [type, setType] = useState<'ذكور' | 'إناث' | 'مختلط'>('ذكور');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const schools = storage.getSchools();

  const handleOpenAdd = () => {
    setEditingSchool(null);
    setName('');
    setRegion('يطا');
    setStage('أساسي');
    setType('ذكور');
    setIsActive(true);
    setNotes('');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (school: School) => {
    setEditingSchool(school);
    setName(school.name);
    setRegion(school.region);
    setStage(school.stage);
    setType(school.type);
    setIsActive(school.isActive);
    setNotes(school.notes || '');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !region.trim()) {
      setFormError('اسم المدرسة والمنطقة حقول مطلوبة.');
      return;
    }

    const schoolData: School = {
      id: editingSchool ? editingSchool.id : `sch_${Date.now()}`,
      name: name.trim(),
      region: region.trim(),
      stage,
      type,
      isActive,
      notes: notes.trim(),
      createdAt: editingSchool ? editingSchool.createdAt : new Date().toISOString()
    };

    storage.saveSchool(schoolData);
    setShowAddEditModal(false);
    onShowToast(editingSchool ? 'تم تعديل بيانات المدرسة بنجاح.' : 'تمت إضافة المدرسة بنجاح.', 'success');
  };

  const handleToggleActive = (school: School) => {
    school.isActive = !school.isActive;
    storage.saveSchool(school);
    onShowToast(`تم ${school.isActive ? 'تفعيل' : 'تعطيل'} مدرسة (${school.name}).`, 'info');
  };

  const filteredSchools = schools.filter(s => {
    if (filterStage !== 'all' && s.stage !== filterStage) return false;
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (searchQuery) {
      return arabicSearchMatch(s.name, searchQuery) || arabicSearchMatch(s.region, searchQuery);
    }
    return true;
  });

  const handleExportExcel = () => {
    const headers = ['اسم المدرسة', 'المنطقة', 'المرحلة الدراسية', 'نوع المدرسة', 'الحالة', 'ملاحظات', 'تاريخ الإضافة'];
    const rows = filteredSchools.map(s => [
      s.name,
      s.region,
      s.stage,
      s.type,
      s.isActive ? 'مفعلة' : 'معطلة',
      s.notes || '-',
      formatDate(s.createdAt)
    ]);
    exportToExcel('مدارس_مديرية_تربية_يطا', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">إدارة مدارس مديرية التربية والتعليم يطا</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            سجل المدارس التابعة للمديرية وتوزيعها الجغرافي ومراحلها لتظهر في القوائم المنسدلة للبرامج الأسبوعية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>تصدير Excel</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مدرسة جديدة</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث سريع باسم المدرسة أو المنطقة..."
            className="w-full text-xs py-2 pl-3 pr-9 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">المرحلة:</span>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl"
          >
            <option value="all">الكل</option>
            <option value="أساسي">أساسي</option>
            <option value="ثانوي">ثانوي</option>
            <option value="مختلط">مختلط</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">النوع:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl"
          >
            <option value="all">الكل</option>
            <option value="ذكور">ذكور</option>
            <option value="إناث">إناث</option>
            <option value="مختلط">مختلط</option>
          </select>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3.5 px-4">اسم المدرسة</th>
                <th className="py-3.5 px-4">المنطقة الجغرافية</th>
                <th className="py-3.5 px-4">المرحلة الدراسية</th>
                <th className="py-3.5 px-4">نوع المدرسة</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4">ملاحظات</th>
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchools.map(sch => (
                <tr key={sch.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{sch.name}</td>
                  <td className="py-3 px-4 text-slate-600">{sch.region}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{sch.stage}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{sch.type}</td>
                  <td className="py-3 px-4">
                    {sch.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3" />
                        <span>مفعلة</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                        <XCircle className="w-3 h-3" />
                        <span>معطلة</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{sch.notes || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(sch)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="تعديل المدرسة"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(sch)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          sch.isActive ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={sch.isActive ? 'تعطيل المدرسة' : 'تفعيل المدرسة'}
                      >
                        {sch.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingSchool ? 'تعديل مدرسة' : 'إضافة مدرسة جديدة'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveSchool} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم المدرسة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="مثال: مدرسة ذكور يطا الثانوية"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المنطقة الجغرافية <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
              placeholder="مثال: يطا - وسط البلد، الكرمل، مسافر يطا..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المرحلة الدراسية</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as 'أساسي' | 'ثانوي' | 'مختلط')}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="أساسي">أساسي</option>
                <option value="ثانوي">ثانوي</option>
                <option value="مختلط">مختلط</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع المدرسة</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'ذكور' | 'إناث' | 'مختلط')}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ذكور">ذكور</option>
                <option value="إناث">إناث</option>
                <option value="مختلط">مختلط</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">حالة المدرسة</label>
            <select
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) => setIsActive(e.target.value === 'active')}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="active">مفعلة وتظهر في البرامج</option>
              <option value="inactive">معطلة مؤقتاً</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="أي ملاحظات حول المدرسة..."
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
              {editingSchool ? 'حفظ التعديلات' : 'إضافة المدرسة'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
