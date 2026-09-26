import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, HelpCircle } from 'lucide-react';
import { storage } from '../services/storage';
import { User as UserModel } from '../types';
import { Modal } from '../components/Modal';

interface LoginViewProps {
  onLoginSuccess: (user: UserModel) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123456');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await storage.login(username, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'فشل تسجيل الدخول');
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء الاتصال بالنظام');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickCredentials = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative subtle background grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 sm:p-10 relative z-10 animate-fade-in">
        {/* Emblem & Official Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden p-1 bg-white shadow-md border-2 border-emerald-600/30 mb-4">
            <img
              src="/src/assets/images/yatta_education_logo_1790448667179.jpg"
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
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="username">
              اسم المستخدم
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                placeholder="أدخل اسم المستخدم"
                required
                autoComplete="username"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="password">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                placeholder="أدخل كلمة المرور"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جارٍ التحقق...</span>
              </span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>تسجيل الدخول للنظام</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Credentials Helper for Evaluation */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 text-center font-medium mb-2.5">
            حسابات تجريبية جاهزة للاختبار الفوري:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillQuickCredentials('admin', 'Admin@123456')}
              className="p-2 text-right rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition-colors"
            >
              <div className="font-bold text-slate-800">مسؤول النظام</div>
              <div className="text-[10px] text-slate-500 tabular-nums">admin / Admin@123456</div>
            </button>
            <button
              type="button"
              onClick={() => fillQuickCredentials('ahmad.najjar', 'User@123456')}
              className="p-2 text-right rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 transition-colors"
            >
              <div className="font-bold text-slate-800">مشرف تربوي</div>
              <div className="text-[10px] text-slate-500 tabular-nums">ahmad.najjar / User@123456</div>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
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
