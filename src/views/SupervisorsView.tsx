import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Lock,
  Eye,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  KeyRound,
  History,
  UserX
} from 'lucide-react';
import { Supervisor, User } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';
import { arabicSearchMatch } from '../utils/arabic';
import { exportToExcel } from '../utils/export';

interface SupervisorsViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigate: (view: string, param?: string) => void;
}

export const SupervisorsView: React.FC<SupervisorsViewProps> = ({ currentUser, onShowToast, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [department, setDepartment] = useState('الإشراف والتأهيل التربوي');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [initialPassword, setInitialPassword] = useState('123456');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formError, setFormError] = useState('');

  // Reset password modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('123456');

  // Supervisor Programs Modal
  const [showProgramsModal, setShowProgramsModal] = useState(false);
  const [targetSupervisor, setTargetSupervisor] = useState<Supervisor | null>(null);

  const supervisors = storage.getSupervisors();
  const users = storage.getUsers();
  const weeks = storage.getWeeks();
  const allPrograms = storage.getWeeklyPrograms();

  const handleOpenAdd = () => {
    setEditingSupervisor(null);
    setName('');
    setNationalId('');
    setSpecialization('');
    setDepartment('قسم الإشراف والتأهيل التربوي');
    setPhone('');
    setEmail('');
    setUsername('');
    setInitialPassword('123456');
    setStatus('Active');
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (sup: Supervisor) => {
    setEditingSupervisor(sup);
    setName(sup.name);
    setNationalId(sup.nationalId);
    setSpecialization(sup.specialization);
    setDepartment(sup.department);
    setPhone(sup.phone);
    setEmail(sup.email);
    const u = users.find(x => x.id === sup.userId);
    setUsername(u?.username || '');
    setStatus(sup.status);
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleSaveSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !nationalId.trim() || !specialization.trim()) {
      setFormError('يرجى ملء جميع الحقول الإلزامية.');
      return;
    }

    if (!editingSupervisor && !username.trim()) {
      setFormError('اسم المستخدم للدخول للنظام مطلوب.');
      return;
    }

    // Check unique username for new
    if (!editingSupervisor) {
      const existingUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
      if (existingUser) {
        setFormError('اسم المستخدم هذا مستخدم مسبقاً، يرجى اختيار اسم مستخدم آخر.');
        return;
      }
    }

    const supData: Supervisor = {
      id: editingSupervisor ? editingSupervisor.id : `sup_${Date.now()}`,
      name: name.trim(),
      nationalId: nationalId.trim(),
      specialization: specialization.trim(),
      department: department.trim(),
      phone: phone.trim(),
      email: email.trim(),
      userId: editingSupervisor ? editingSupervisor.userId : '',
      status,
      createdAt: editingSupervisor ? editingSupervisor.createdAt : new Date().toISOString()
    };

    await storage.saveSupervisor(supData, username, initialPassword);
    setShowAddEditModal(false);
    onShowToast(editingSupervisor ? 'تم تعديل بيانات المشرف بنجاح.' : 'تمت إضافة المشرف وإنشاء حسابه بنجاح.', 'success');
  };

  const handleToggleStatus = (sup: Supervisor) => {
    const newStatus = sup.status === 'Active' ? 'Inactive' : 'Active';
    sup.status = newStatus;
    storage.saveSupervisor(sup);
    onShowToast(`تم ${newStatus === 'Active' ? 'تفعيل' : 'تعطيل'} حساب المشرف (${sup.name}).`, 'info');
  };

  const handleOpenResetPassword = (sup: Supervisor) => {
    const u = users.find(x => x.id === sup.userId);
    if (!u) {
      onShowToast('لم يتم العثور على حساب مستخدم مرتبط بهذا المشرف.', 'error');
      return;
    }
    setResetTargetUser(u);
    setNewPassword('123456');
    setShowResetModal(true);
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (newPassword.length < 6) {
      onShowToast('يجب ألا تقل كلمة المرور عن 6 خانات.', 'error');
      return;
    }
    await storage.adminResetPassword(resetTargetUser.id, newPassword);
    setShowResetModal(false);
    onShowToast(`تمت إعادة تعيين كلمة المرور بنجاح للمستخدم (${resetTargetUser.username}).`, 'success');
  };

  const handleViewPrograms = (sup: Supervisor) => {
    setTargetSupervisor(sup);
    setShowProgramsModal(true);
  };

  const filteredSupervisors = supervisors.filter(s => {
    if (!searchQuery) return true;
    return (
      arabicSearchMatch(s.name, searchQuery) ||
      arabicSearchMatch(s.specialization, searchQuery) ||
      s.nationalId.includes(searchQuery) ||
      s.phone.includes(searchQuery)
    );
  });

  const handleExportExcel = () => {
    const headers = ['اسم المشرف', 'رقم الهوية', 'التخصص', 'القسم', 'الهاتف', 'البريد الإلكتروني', 'الحالة', 'تاريخ الإنشاء'];
    const rows = filteredSupervisors.map(s => [
      s.name,
      s.nationalId,
      s.specialization,
      s.department,
      s.phone,
      s.email,
      s.status === 'Active' ? 'فعال' : 'معطل',
      formatDate(s.createdAt)
    ]);
    exportToExcel('سجل_المشرفين_التربويين_يطا', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">إدارة المشرفين التربويين</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            سجل المشرفين المعتمدين في مديرية التربية والتعليم يطا، تخصصاتهم، وحسابات الدخول للنظام.
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
            <span>إضافة مشرف جديد</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، التخصص، رقم الهوية أو الهاتف..."
            className="w-full text-xs py-2.5 pl-3 pr-9 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>
      </div>

      {/* Supervisors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3.5 px-4">اسم المشرف</th>
                <th className="py-3.5 px-4">رقم الهوية</th>
                <th className="py-3.5 px-4">التخصص والفرع</th>
                <th className="py-3.5 px-4">القسم</th>
                <th className="py-3.5 px-4">رقم الهاتف</th>
                <th className="py-3.5 px-4">حالة الحساب</th>
                <th className="py-3.5 px-4">تاريخ الإنشاء</th>
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSupervisors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <UserX className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-bold text-slate-700 text-sm">قاعدة البيانات فارغة من المشرفين حالياً</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      يمكنك البدء بإضافة المشرفين التربويين وتحديد تخصصاتهم بالضغط على زر "إضافة مشرف جديد" بالأعلى.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSupervisors.map(sup => {
                const isActive = sup.status === 'Active';
                return (
                  <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{sup.name}</td>
                    <td className="py-3 px-4 tabular-nums text-slate-600">{sup.nationalId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{sup.specialization}</td>
                    <td className="py-3 px-4 text-slate-500">{sup.department}</td>
                    <td className="py-3 px-4 tabular-nums text-slate-600">{sup.phone}</td>
                    <td className="py-3 px-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" />
                          <span>فعال</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" />
                          <span>معطل</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-slate-500">{formatDate(sup.createdAt)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(sup)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="تعديل البيانات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Reset password */}
                        <button
                          type="button"
                          onClick={() => handleOpenResetPassword(sup)}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="إعادة تعيين كلمة المرور"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* View Programs */}
                        <button
                          type="button"
                          onClick={() => handleViewPrograms(sup)}
                          className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                          title="عرض برامج المشرف"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle status */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(sup)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isActive ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                        >
                          {isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingSupervisor ? 'تعديل بيانات المشرف التربوي' : 'إضافة مشرف تربوي جديد'}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveSupervisor} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم المشرف الكامل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="مثال: د. أحمد خليل النجار"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم الهوية <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                required
                placeholder="9 أرقام"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                التخصص الإشرافي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                required
                placeholder="مثال: الرياضيات، اللغة العربية، العلوم"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">القسم</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف الجوال</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0599000000"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supervisor@moe.edu.ps"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {!editingSupervisor && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المستخدم للدخول <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="example.user"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كلمة المرور الأولية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">حالة الحساب</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="Active">فعال</option>
                <option value="Inactive">معطل</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
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
              {editingSupervisor ? 'حفظ التعديلات' : 'إضافة المشرف'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="إعادة تعيين كلمة المرور"
        subtitle={`المستخدم: ${resetTargetUser?.fullName} (${resetTargetUser?.username})`}
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
            />
            <p className="text-[11px] text-slate-400 mt-1">يجب ألا تقل عن 6 أحرف أو أرقام.</p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs"
            >
              تأكيد التعيين
            </button>
          </div>
        </form>
      </Modal>

      {/* Supervisor Programs List Modal */}
      <Modal
        isOpen={showProgramsModal}
        onClose={() => setShowProgramsModal(false)}
        title="البرامج الأسبوعية للمشرف"
        subtitle={targetSupervisor?.name}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {targetSupervisor && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">الأسبوع</th>
                    <th className="py-2.5 px-3">الحالة</th>
                    <th className="py-2.5 px-3">تاريخ الإرسال</th>
                    <th className="py-2.5 px-3">تاريخ الاعتماد</th>
                    <th className="py-2.5 px-3">المراجع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPrograms
                    .filter(p => p.supervisorId === targetSupervisor.id)
                    .map(p => {
                      const w = weeks.find(x => x.id === p.weekId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold">{w?.name || '-'}</td>
                          <td className="py-2.5 px-3">{p.status}</td>
                          <td className="py-2.5 px-3 tabular-nums">{p.submittedAt ? formatDate(p.submittedAt) : 'لم يرسل'}</td>
                          <td className="py-2.5 px-3 tabular-nums">{p.reviewedAt ? formatDate(p.reviewedAt) : '-'}</td>
                          <td className="py-2.5 px-3">{p.reviewedBy || '-'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowProgramsModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              إغلاق
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
