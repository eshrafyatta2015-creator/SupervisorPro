import React, { useState, useEffect } from 'react';
import { Lock, UserCheck, Eye, EyeOff, ShieldCheck, HelpCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { storage } from '../services/storage';
import { User as UserModel, Supervisor } from '../types';
import { Modal } from '../components/Modal';
import { YATTA_LOGO } from '../assets/logo';

interface LoginViewProps {
  onLoginSuccess: (user: UserModel) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  // Dropdown list loaded dynamically from database
  const [activeSupervisors, setActiveSupervisors] = useState<{ user: UserModel; supervisor: Supervisor }[]>([]);
  
  // Selected account identifier (either 'admin' or user id of supervisor)
  const [selectedIdentifier, setSelectedIdentifier] = useState<string>('admin');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Forced password change modal on first login
  const [pendingUser, setPendingUser] = useState<UserModel | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load active supervisors from DB on mount
  useEffect(() => {
    const list = storage.getActiveSupervisorsForLogin();
    setActiveSupervisors(list);
  }, []);

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedIdentifier(val);
    setPassword('');
    setErrorMessage('');
  };

  const handleQuickFill = (targetId: string, defaultPass: string) => {
    setSelectedIdentifier(targetId);
    setPassword(defaultPass);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdentifier) {
      setErrorMessage('يرجى اختيار المستخدم من القائمة المنسدلة');
      return;
    }
    if (!password) {
      setErrorMessage('يرجى إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await storage.login(selectedIdentifier, password);
      if (res.success && res.user) {
        const user = res.user;
        const settings = storage.getSystemSettings();

        // Check if supervisor is required to change password on first login
        if (
          user.role === 'Supervisor' &&
          user.mustChangePassword &&
          settings.forceChangePasswordOnFirstLogin !== false
        ) {
          setPendingUser(user);
        } else {
          onLoginSuccess(user);
        }
      } else {
        setErrorMessage(res.error || 'فشل تسجيل الدخول. تأكد من صحة البيانات.');
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء الاتصال بالنظام.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmFirstChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');

    if (!pendingUser) return;
    if (newPassword.length < 6) {
      setPasswordChangeError('يجب ألا تقل كلمة المرور الجديدة عن 6 خانات.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (newPassword === '123456') {
      setPasswordChangeError('يرجى اختيار كلمة مرور جديدة تختلف عن كلمة المرور الافتراضية.');
      return;
    }

    setIsChangingPassword(true);
    const res = await storage.completeFirstLoginPasswordChange(pendingUser.id, newPassword);
    setIsChangingPassword(false);

    if (res.success) {
      const updatedUser = storage.getUserById(pendingUser.id);
      setPendingUser(null);
      if (updatedUser) {
        onLoginSuccess(updatedUser);
      }
    } else {
      setPasswordChangeError(res.error || 'تعذر تغيير كلمة المرور.');
    }
  };

  // Determine current selection details
  const isAdminSelected = selectedIdentifier === 'admin';
  const selectedSupervisor = !isAdminSelected
    ? activeSupervisors.find(s => s.user.id === selectedIdentifier || s.user.username === selectedIdentifier)
    : null;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative subtle background grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 sm:p-10 relative z-10 animate-fade-in">
        {/* Emblem & Official Directorate Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-20 h-20 rounded-full overflow-hidden p-1 bg-white shadow-md border-2 border-emerald-600/30 mb-3.5">
            <img
              src={YATTA_LOGO}
              alt="شعار مديرية التربية والتعليم يطا"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            مديرية التربية والتعليم يطا
          </span>
          <h1 className="text-xl font-extrabold text-slate-900 mt-2">
            نظام إدارة البرامج الأسبوعية للمشرفين
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">قسم الإشراف والتأهيل التربوي</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User / Account Selection Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="accountSelect">
              اسم المستخدم / المستخدم:
            </label>
            <div className="relative">
              <select
                id="accountSelect"
                value={selectedIdentifier}
                onChange={handleAccountChange}
                className="w-full pl-3 pr-10 py-3 text-sm rounded-xl border border-slate-300 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800 transition-colors cursor-pointer appearance-none"
                required
              >
                <optgroup label="مسؤول النظام المركزي">
                  <option value="admin">مسؤول النظام (Administrator)</option>
                </optgroup>
                <optgroup label="المشرفون التربويون المعتمدون (الفعّالون)">
                  {activeSupervisors.map(({ user, supervisor }) => (
                    <option key={user.id} value={user.id}>
                      {supervisor.name} - ({supervisor.specialization})
                    </option>
                  ))}
                </optgroup>
              </select>
              <UserCheck className="w-4 h-4 text-emerald-600 absolute right-3.5 top-4 pointer-events-none" />
              <div className="absolute left-3.5 top-4 pointer-events-none text-slate-400 text-xs">▼</div>
            </div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
              <span>
                {isAdminSelected ? 'حساب إدارة النظام والصلاحيات الكاملة' : `حساب المشرف: ${selectedSupervisor?.supervisor.name}`}
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                {isAdminSelected ? 'Username: admin' : `Username: ${selectedSupervisor?.user.username}`}
              </span>
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="password">
              كلمة المرور:
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-sans"
                placeholder={isAdminSelected ? 'أدخل كلمة مرور المسؤول (admin123)' : 'أدخل كلمة مرور المشرف (123456)'}
                required
                autoComplete="current-password"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>تذكرني على هذا الجهاز</span>
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-emerald-700 hover:text-emerald-800 font-semibold"
            >
              نسيت كلمة المرور؟
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جارٍ التحقق...</span>
              </span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>دخول</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Test Accounts Helper */}
        <div className="mt-7 pt-5 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 text-center font-medium mb-2.5">
            حسابات افتراضية للاختبار السريع:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'admin123')}
              className={`p-2.5 text-right rounded-xl border transition-colors ${
                isAdminSelected
                  ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                  : 'bg-slate-50 hover:bg-emerald-50/50 border-slate-200'
              }`}
            >
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>مسؤول النظام</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">admin123</div>
            </button>

            <button
              type="button"
              onClick={() => {
                const firstSup = activeSupervisors[0];
                if (firstSup) {
                  handleQuickFill(firstSup.user.id, '123456');
                }
              }}
              className={`p-2.5 text-right rounded-xl border transition-colors ${
                !isAdminSelected
                  ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                  : 'bg-slate-50 hover:bg-emerald-50/50 border-slate-200'
              }`}
            >
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>{activeSupervisors[0]?.supervisor.name || 'أحمد محمد'}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">123456</div>
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Password Change Modal on First Login */}
      {pendingUser && (
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="تغيير كلمة المرور عند أول تسجيل دخول"
          subtitle={`المشرف التربوي: ${pendingUser.fullName}`}
        >
          <form onSubmit={handleConfirmFirstChangePassword} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">مرحباً بك في نظام مديرية التربية والتعليم يطا</p>
                <p className="mt-0.5 text-slate-600 leading-relaxed">
                  لأسباب أمنية وإدارية، يطلب منك النظام تعيين كلمة مرور جديدة لحسابك بدلاً من كلمة المرور الابتدائية (123456).
                </p>
              </div>
            </div>

            {passwordChangeError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                {passwordChangeError}
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                placeholder="أدخل كلمة مرور جديدة (6 خانات على الأقل)"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                placeholder="أعد إدخال كلمة المرور للتأكيد"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                {isChangingPassword ? 'جارٍ الحفظ...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ وتأكيد والدخول</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Forgot Password Information Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="استعادة كلمة المرور"
        subtitle="قسم الإشراف والتأهيل التربوي - مديرية يطا"
      >
        <div className="space-y-4 text-xs leading-relaxed text-slate-600">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">تعليمات أمان الحساب للمشرفين:</p>
              <p>
                لأسباب أمنية وإدارية تتعلق بالبرامج الرسمية لمديرية التربية والتعليم يطا، يتم إعادة تعيين كلمات المرور عن طريق مسؤول النظام الإداري (رئيس قسم الإشراف أو مهندس النظام).
              </p>
            </div>
          </div>
          <p>
            يرجى التواصل مع قسم الإشراف والتأهيل التربوي عبر البريد الإلكتروني المعتمد:
            <span className="block mt-1 font-bold text-slate-800 font-mono">eshrafyatta2015@gmail.com</span>
          </p>
          <div className="pt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
