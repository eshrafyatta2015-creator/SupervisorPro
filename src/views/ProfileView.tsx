import React, { useState } from 'react';
import { User, Lock, ShieldCheck, Mail, Phone, Building } from 'lucide-react';
import { User as UserModel } from '../types';
import { storage } from '../services/storage';
import { formatDate, formatDateTime } from '../utils/date';

interface ProfileViewProps {
  currentUser: UserModel;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onShowToast }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const supervisor = currentUser.supervisorId ? storage.getSupervisorById(currentUser.supervisorId) : undefined;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('كلمة المرور الجديدة يجب ألا تقل عن 6 خانات.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    setIsChanging(true);
    const res = await storage.changePassword(currentUser.id, currentPassword, newPassword);
    setIsChanging(false);

    if (res.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onShowToast('تم تغيير كلمة المرور بنجاح.', 'success');
    } else {
      setErrorMsg(res.error || 'فشل تغيير كلمة المرور.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h1 className="text-xl font-black text-slate-900">الملف الشخصي وأمان الحساب</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          بيانات الحساب الشخصي وتعديل كلمة المرور وسجل الدخول.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-500/20">
              {currentUser.fullName.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{currentUser.fullName}</h3>
              <span className="text-xs text-slate-500 font-mono">@{currentUser.username}</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500">الدور الإداري:</span>
              <span className="font-bold text-slate-800">
                {currentUser.role === 'Administrator' ? 'مسؤول النظام (Administrator)' : 'مشرف تربوي (Supervisor)'}
              </span>
            </div>

            {supervisor && (
              <>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-500">التخصص:</span>
                  <span className="font-bold text-slate-800">{supervisor.specialization}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-500">القسم:</span>
                  <span className="font-bold text-slate-800">{supervisor.department}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-500">رقم الهاتف:</span>
                  <span className="font-bold text-slate-800 tabular-nums">{supervisor.phone}</span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500">البريد الإلكتروني:</span>
              <span className="font-bold text-slate-800">{currentUser.email || 'غير مسجل'}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500">آخر تسجيل دخول:</span>
              <span className="font-bold text-emerald-800 tabular-nums">
                {currentUser.lastLoginAt ? formatDateTime(currentUser.lastLoginAt) : 'أول جلسة'}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>تغيير كلمة المرور</span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl mb-4">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الحالية</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="6 أحرف أو أرقام على الأقل"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChanging}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isChanging ? 'جارٍ الحفظ...' : 'تحديث كلمة المرور'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
