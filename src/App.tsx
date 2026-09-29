import React, { useState, useEffect } from 'react';
import { User, ToastMessage } from './types';
import { storage } from './services/storage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { WeeklyProgramView } from './views/WeeklyProgramView';
import { ProgramReviewView } from './views/ProgramReviewView';
import { UnsubmittedReportView } from './views/UnsubmittedReportView';
import { SupervisorsView } from './views/SupervisorsView';
import { SchoolsView } from './views/SchoolsView';
import { ActivitiesView } from './views/ActivitiesView';
import { WeeksManagementView } from './views/WeeksManagementView';
import { AcademicYearsView } from './views/AcademicYearsView';
import { ReportsView } from './views/ReportsView';
import { UsersView } from './views/UsersView';
import { AuditLogsView } from './views/AuditLogsView';
import { SettingsView } from './views/SettingsView';
import { ProfileView } from './views/ProfileView';
import { ErrorView } from './views/ErrorView';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Initialize DB on startup
  useEffect(() => {
    const init = async () => {
      await storage.initializeDatabase();
      const sessionUser = storage.getCurrentUser();
      if (sessionUser) {
        setCurrentUser(sessionUser);
        setActiveView(sessionUser.role === 'Supervisor' ? 'my-program' : 'dashboard');
      }
      setIsReady(true);
    };
    init();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      message,
      type
    };
    setToasts(prev => [...prev, newToast]);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveView(user.role === 'Supervisor' ? 'my-program' : 'dashboard');
    showToast(`مرحباً بك، ${user.fullName}`, 'success');
  };

  const handleLogout = () => {
    storage.logout();
    setCurrentUser(null);
    setActiveView('dashboard');
    showToast('تم تسجيل الخروج بنجاح.', 'info');
  };

  const handleUserSwitched = (user: User) => {
    setCurrentUser(user);
    setActiveView(user.role === 'Supervisor' ? 'my-program' : 'dashboard');
    showToast(`تم التبديل إلى المستخدم: ${user.fullName}`, 'success');
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-300">جارٍ تهيئة نظام البرامج الأسبوعية...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> show login screen
  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  const isAdmin = currentUser.role === 'Administrator';

  // Calculate unsubmitted count for current week for sidebar badge
  const currentWeek = storage.getCurrentWeek();
  const allProgs = storage.getWeeklyPrograms();
  const sups = storage.getSupervisors().filter(s => s.status === 'Active');
  const submittedIds = new Set(
    allProgs
      .filter(p => p.weekId === currentWeek?.id && (p.status === 'Submitted' || p.status === 'Approved' || p.status === 'NeedsRevision' || p.status === 'UnderReview'))
      .map(p => p.supervisorId)
  );
  const unsubmittedCount = Math.max(0, sups.length - submittedIds.size);

  // Check role access
  const adminOnlyViews = [
    'program-review',
    'unsubmitted-report',
    'supervisors',
    'schools',
    'activities',
    'weeks',
    'academic-years',
    'users',
    'audit-logs',
    'settings'
  ];

  const isUnauthorized = !isAdmin && adminOnlyViews.includes(activeView);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-800">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={(view) => setActiveView(view)}
        onUserSwitched={handleUserSwitched}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* RTL Sidebar */}
        <Sidebar
          currentUser={currentUser}
          activeView={activeView}
          onNavigate={(view) => setActiveView(view)}
          unsubmittedCount={unsubmittedCount}
        />

        {/* Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <ErrorBoundary
            key={activeView}
            onReset={() => setActiveView('dashboard')}
            fallback={
              <div className="bg-white rounded-3xl p-8 max-w-lg mx-auto text-center border border-slate-200 shadow-sm mt-8">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">تعذر تحميل محتوى هذه الشاشة</h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  حدث خطأ غير متوقع أثناء عرض هذا القسم. يمكنك العودة إلى لوحة التحكم أو إعادة المحاولة.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveView('dashboard')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    العودة للوحة التحكم
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                  >
                    تحديث الصفحة
                  </button>
                </div>
              </div>
            }
          >
            {isUnauthorized ? (
              <ErrorView
                code={403}
                message="عذراً، هذه الشاشة مخصصة لرئيس قسم الإشراف ومسؤول النظام فقط."
                onGoBack={() => setActiveView('dashboard')}
              />
            ) : (
              <>
                {activeView === 'dashboard' && (
                  <DashboardView
                    currentUser={currentUser}
                    onNavigate={(view) => setActiveView(view)}
                  />
                )}

                {(activeView === 'my-program' || activeView === 'previous-programs' || activeView === 'planning-program' || activeView === 'actual-program') && (
                  <WeeklyProgramView
                    currentUser={currentUser}
                    initialPlanType={activeView === 'actual-program' ? 'Actual' : 'Planning'}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'program-review' && (
                  <ProgramReviewView
                    currentUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'unsubmitted-report' && (
                  <UnsubmittedReportView
                    currentUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'supervisors' && (
                  <SupervisorsView
                    currentUser={currentUser}
                    onShowToast={showToast}
                    onNavigate={(view) => setActiveView(view)}
                  />
                )}

                {activeView === 'schools' && (
                  <SchoolsView
                    currentUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'activities' && (
                  <ActivitiesView
                    currentUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'weeks' && (
                  <WeeksManagementView
                    currentUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'academic-years' && (
                  <AcademicYearsView
                    currentUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'reports' && (
                  <ReportsView
                    currentUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'users' && (
                  <UsersView
                    currentUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'audit-logs' && (
                  <AuditLogsView />
                )}

                {activeView === 'settings' && (
                  <SettingsView
                    currentUser={currentUser}
                    onShowToast={showToast}
                    onRefreshData={() => {
                      // re-trigger render
                      setCurrentUser(storage.getCurrentUser());
                    }}
                  />
                )}

                {activeView === 'profile' && (
                  <ProfileView
                    currentUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeView === 'notifications' && (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <h1 className="text-xl font-black text-slate-900">سجل الإشعارات والتنبيهات</h1>
                      <p className="text-xs text-slate-500 mt-0.5">
                        جميع التنبيهات الإدارية المتعلقة بفتح وإغلاق البرامج واعتمادها وطلبات التعديل.
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 p-2">
                      {storage.getNotifications(currentUser.id).map(notif => (
                        <div key={notif.id} className="p-4 hover:bg-slate-50 rounded-xl transition-colors">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                            <span className="text-[10px] text-slate-400">
                              {new Date(notif.createdAt).toLocaleDateString('ar-PS')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
