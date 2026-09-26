import React from 'react';
import { ShieldAlert, AlertTriangle, FileQuestion, ArrowRight } from 'lucide-react';

interface ErrorViewProps {
  code: 404 | 403 | 500;
  message?: string;
  onGoBack: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ code, message, onGoBack }) => {
  const titles = {
    404: 'الصفحة غير موجودة (404)',
    403: 'تم رفض الوصول - لا تملك الصلاحية (403)',
    500: 'خطأ داخلي في الخادم (500)'
  };

  const descriptions = {
    404: 'الصفحة أو المورد الذي تحاول الوصول إليه غير موجود أو تم نقله.',
    403: 'ليس لديك الصلاحيات الإدارية الكافية للوصول إلى هذه الشاشة أو تنفيذ هذا الإجراء.',
    500: 'حدث خطأ غير متوقع أثناء معالجة الطلب. يرجى المحاولة لاحقاً.'
  };

  const icons = {
    404: <FileQuestion className="w-16 h-16 text-slate-400 mx-auto mb-4" />,
    403: <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />,
    500: <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-md max-w-md w-full">
        {icons[code]}
        <h1 className="text-xl font-black text-slate-900 mb-2">{titles[code]}</h1>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          {message || descriptions[code]}
        </p>
        <button
          type="button"
          onClick={onGoBack}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
        >
          <span>العودة إلى لوحة التحكم</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
