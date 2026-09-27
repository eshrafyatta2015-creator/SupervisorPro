import React, { Component, ErrorInfo, ReactNode } from 'react';
import { YATTA_LOGO } from '../assets/logo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    showDetails: false,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('🚨 [ErrorBoundary] تم التقاط خطأ أثناء العرض (Rendering Error):', error, errorInfo);

    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (e) {
        console.error('Error in ErrorBoundary onError callback:', e);
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = window.location.pathname;
  };

  private handleResetStorage = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إعادة تهيئة الذاكرة المؤقتة؟ سيتم حذف الجلسة وإعادة تحميل النظام.')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('Failed to clear storage:', e);
      }
      window.location.reload();
    }
  };

  private handleCopyError = () => {
    const errorText = `خطأ في نظام إدارة البرامج الأسبوعية:
الرسالة: ${this.state.error?.message || 'غير محددة'}
الاسم: ${this.state.error?.name || ''}
مسار المكونات:
${this.state.errorInfo?.componentStack || 'لا يوجد مسار'}
المكدس:
${this.state.error?.stack || ''}`;

    navigator.clipboard.writeText(errorText).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3000);
    });
  };

  public render() {
    if (this.state.hasError) {
      // If a custom fallback is provided for modular components
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div dir="rtl" className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-emerald-600 selection:text-white">
          <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-xl w-full text-center shadow-2xl border border-slate-100 animate-fade-in">
            {/* Directorate Logo */}
            <div className="flex justify-center mb-4">
              <img
                src={YATTA_LOGO}
                alt="شعار مديرية التربية والتعليم يطا"
                className="w-16 h-16 rounded-full object-cover shadow-sm border-2 border-emerald-600/30"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Warning Emblem */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mb-3 border border-amber-200">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-2">
              مديرية التربية والتعليم يطا - قسم الإشراف والتأهيل التربوي
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
              حدث خطأ أثناء عرض واجهة النظام
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              تم التقاط خطأ غير متوقع أثناء معالجة عناصر الصفحة. لا تقلق، لم يتم فقدان بياناتك؛ يمكنك تجربة الخيارات التالية للاستعادة الفورية:
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>إعادة المحاولة</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors"
              >
                تحديث الصفحة
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                شاشة البداية
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors"
                title="إعادة ضبط الذاكرة المؤقتة في حال وجود بيانات غير متوافقة"
              >
                إعادة ضبط الذاكرة
              </button>
            </div>

            {/* Technical details toggle */}
            <div className="border-t border-slate-100 pt-4 text-right">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <span>{this.state.showDetails ? '▼ إخفاء التفاصيل الفنية' : '◀ عرض التفاصيل الفنية للخطأ (للدعم الفني)'}</span>
                </button>

                {this.state.showDetails && (
                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                  >
                    {this.state.copied ? '✓ تم النسخ' : 'نسخ تقرير الخطأ'}
                  </button>
                )}
              </div>

              {this.state.showDetails && (
                <div className="space-y-2 mt-2">
                  {this.state.error && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-rose-700 text-left overflow-x-auto leading-relaxed" dir="ltr">
                      <strong>Error:</strong> {this.state.error.toString()}
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div className="p-3 bg-slate-900 text-slate-300 rounded-xl text-[10px] font-mono text-left max-h-44 overflow-y-auto leading-relaxed" dir="ltr">
                      <div className="text-slate-500 mb-1">// Component Stack:</div>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
