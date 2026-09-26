import React, { useState } from 'react';
import { Plus, Edit2, Shield, KeyRound, CheckCircle, XCircle, Search } from 'lucide-react';
import { User, Permission, UserRole } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';
import { arabicSearchMatch } from '../utils/arabic';
import { hashPassword } from '../utils/crypto';

interface UsersViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const ALL_PERMISSIONS: { id: Permission; label: string; group: string }[] = [
  { id: 'ViewDashboard', label: 'عرض لوحة التحكم والإحصاءات', group: 'عام' },
  { id: 'ViewPrograms', label: 'عرض البرامج الأسبوعية', group: 'البرامج' },
  { id: 'ReviewPrograms', label: 'مراجعة وتدقيق البرامج', group: 'البرامج' },
  { id: 'ApprovePrograms', label: 'اعتماد البرامج الأسبوعية', group: 'البرامج' },
  { id: 'ManageSupervisors', label: 'إدارة المشرفين التربويين', group: 'الإشراف' },
  { id: 'ManageSchools', label: 'إدارة المدارس', group: 'المدارس' },
  { id: 'ManageActivities', label: 'إدارة أنواع الأنشطة', group: 'الأنشطة' },
  { id: 'ManageWeeks', label: 'إدارة الأسابيع وفترات الإرسال', group: 'التقويم' },
  { id: 'ManageAcademicYears', label: 'إدارة السنوات الدراسية', group: 'التقويم' },
  { id: 'ExportReports', label: 'تصدير التقارير والملفات', group: 'التقارير' },
  { id: 'ManageUsers', label: 'إدارة المستخدمين والصلاحيات', group: 'الأمان' },
  { id: 'ViewAuditLogs', label: 'عرض سجل العمليات والتدقيق', group: 'الأمان' },
  { id: 'BackupDatabase', label: 'النسخ الاحتياطي واستعادة البيانات', group: 'النظام' },
  { id: 'ManageSettings', label: 'إدارة إعدادات النظام العامة', group: 'النظام' }
];

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Administrator');
  const [password, setPassword] = useState('Admin@123456');
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [formError, setFormError] = useState('');

  const users = storage.getUsers();

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setEmail('');
    setRole('Administrator');
    setPassword('Admin@123456');
    setIsActive(true);
    setSelectedPermissions(ALL_PERMISSIONS.map(p => p.id));
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setFullName(user.fullName);
    setEmail(user.email);
    setRole(user.role);
    setIsActive(user.isActive);
    setSelectedPermissions(user.permissions || (user.role === 'Administrator' ? ALL_PERMISSIONS.map(p => p.id) : ['ViewDashboard', 'ViewPrograms']));
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleTogglePermission = (perm: Permission) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!username.trim() || !fullName.trim()) {
      setFormError('اسم المستخدم والاسم الكامل حقول مطلوبة.');
      return;
    }

    if (!editingUser) {
      const exists = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
      if (exists) {
        setFormError('اسم المستخدم مستخدم مسبقاً.');
        return;
      }
    }

    const userData: User = {
      id: editingUser ? editingUser.id : `usr_${Date.now()}`,
      username: username.trim().toLowerCase(),
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      isActive,
      failedLoginAttempts: editingUser ? editingUser.failedLoginAttempts : 0,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
      permissions: selectedPermissions
    };

    storage.saveUser(userData);

    // Save password hash if new user
    if (!editingUser) {
      const hashes = JSON.parse(localStorage.getItem('wsp_password_hashes') || '{}');
      hashes[userData.username] = await hashPassword(password);
      localStorage.setItem('wsp_password_hashes', JSON.stringify(hashes));
    }

    setShowAddEditModal(false);
    onShowToast(editingUser ? 'تم تعديل بيانات المستخدم بنجاح.' : 'تمت إضافة المستخدم بنجاح.', 'success');
  };

  const handleToggleActive = (user: User) => {
    if (user.id === currentUser.id) {
      onShowToast('لا يمكنك تعطيل حسابك النشط الحالي.', 'error');
      return;
    }
    user.isActive = !user.isActive;
    storage.saveUser(user);
    onShowToast(`تم ${user.isActive ? 'تفعيل' : 'تعطيل'} حساب المستخدم (${user.username}).`, 'info');
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    return arabicSearchMatch(u.fullName, searchQuery) || arabicSearchMatch(u.username, searchQuery) || u.email.includes(searchQuery);
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">إدارة المستخدمين والصلاحيات (RBAC)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            التحكم في أدوار المشرفين ومدراء النظام وتوزيع الصلاحيات الدقيقة.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم الكامل أو اسم المستخدم..."
              className="w-full text-xs py-2 pl-3 pr-9 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-4">الاسم الكامل</th>
                <th className="py-3 px-4">اسم المستخدم</th>
                <th className="py-3 px-4">الدور الوظيفي</th>
                <th className="py-3 px-4">البريد الإلكتروني</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">آخر دخول</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{u.fullName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{u.username}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      u.role === 'Administrator' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                    }`}>
                      {u.role === 'Administrator' ? 'مسؤول النظام (Admin)' : 'مشرف تربوي'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{u.email || '-'}</td>
                  <td className="py-3 px-4">
                    {u.isActive ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>نشط</span>
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>معطل</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 tabular-nums text-slate-400">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'لم يسجل دخول'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        title="تعديل الصلاحيات والمستخدم"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        className={`p-1.5 rounded-lg ${
                          u.isActive ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={u.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                      >
                        {u.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
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
        title={editingUser ? 'تعديل المستخدم والصلاحيات' : 'إضافة مستخدم جديد'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم المستخدم للدخول <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={!!editingUser}
                placeholder="username"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الاسم الكامل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="الاسم الثلاثي أو الرباعي"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@moe.edu.ps"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الدور الأساسي</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="Administrator">مسؤول النظام (Administrator)</option>
                <option value="Supervisor">مشرف تربوي (Supervisor)</option>
              </select>
            </div>

            {!editingUser && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور الأولية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">حالة الحساب</label>
              <select
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive(e.target.value === 'active')}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="active">نشط ومفعل</option>
                <option value="inactive">معطل</option>
              </select>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              جدول الصلاحيات الدقيقة الممنوحة (Granular Permissions):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-56 overflow-y-auto">
              {ALL_PERMISSIONS.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-white transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(p.id)}
                    onChange={() => handleTogglePermission(p.id)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
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
              {editingUser ? 'حفظ الصلاحيات' : 'إنشاء المستخدم'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
