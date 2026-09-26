import React, { useState } from 'react';
import { Plus, Edit2, Activity as ActivityIcon, CheckCircle, XCircle } from 'lucide-react';
import { Activity, User } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';

interface ActivitiesViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({ currentUser, onShowToast }) => {
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [color, setColor] = useState('emerald');
  const [formError, setFormError] = useState('');

  const activities = storage.getActivities();

  const handleOpenAdd = () => {
    setEditingActivity(null);
    setName('');
    setCode(`ACT_${Date.now().toString().slice(-4)}`);
    setDescription('');
    setIsActive(true);
    setColor('emerald');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (act: Activity) => {
    setEditingActivity(act);
    setName(act.name);
    setCode(act.code);
    setDescription(act.description || '');
    setIsActive(act.isActive);
    setColor(act.color || 'emerald');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('اسم النشاط مطلوب.');
      return;
    }

    const actData: Activity = {
      id: editingActivity ? editingActivity.id : `act_${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      isActive,
      color,
      createdAt: editingActivity ? editingActivity.createdAt : new Date().toISOString()
    };

    storage.saveActivity(actData);
    setShowAddEditModal(false);
    onShowToast(editingActivity ? 'تم تعديل النشاط بنجاح.' : 'تمت إضافة نوع النشاط بنجاح.', 'success');
  };

  const handleToggleActive = (act: Activity) => {
    act.isActive = !act.isActive;
    storage.saveActivity(act);
    onShowToast(`تم ${act.isActive ? 'تفعيل' : 'تعطيل'} نوع النشاط (${act.name}).`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">إدارة أنواع الأنشطة والمهام الإشرافية</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تصنيف الأنشطة الرسمية المتاحة للمشرفين التربويين في برامجهم الأسبوعية.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة نوع نشاط جديد</span>
        </button>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activities.map(act => (
          <div
            key={act.id}
            className={`p-4 rounded-2xl border transition-all ${
              act.isActive
                ? 'bg-white border-slate-200 shadow-xs'
                : 'bg-slate-50 border-slate-200/60 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{act.name}</h3>
                <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">{act.code}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(act)}
                  className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                  title="تعديل"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(act)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    act.isActive ? 'text-rose-400 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                  title={act.isActive ? 'تعطيل النشاط' : 'تفعيل النشاط'}
                >
                  {act.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-2 min-h-[32px] leading-relaxed">
              {act.description || 'لا يوجد وصف تفصيلي لهذا النشاط.'}
            </p>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">الحالة:</span>
              <span className={`font-bold ${act.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                {act.isActive ? 'مفعل في القوائم' : 'معطل مؤقتاً'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingActivity ? 'تعديل نوع النشاط' : 'إضافة نوع نشاط جديد'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveActivity} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم النشاط <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="مثال: زيارة إشرافية، ورشة عمل، متابعة خطة..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رمز النشاط (Code) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="SUP_VISIT"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الوصف والهدف العام</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="وصف تفصيلي لطبيعة هذا النشاط التربوي..."
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
              {editingActivity ? 'حفظ التعديلات' : 'إضافة النشاط'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
