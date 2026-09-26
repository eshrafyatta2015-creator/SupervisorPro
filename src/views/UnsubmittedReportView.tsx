import React, { useState } from 'react';
import {
  AlertCircle,
  Bell,
  Clock,
  Send,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Users
} from 'lucide-react';
import { User, Supervisor } from '../types';
import { storage } from '../services/storage';
import { CountdownTimer } from '../components/CountdownTimer';
import { formatDate } from '../utils/date';
import { exportToExcel, triggerPrint } from '../utils/export';

interface UnsubmittedReportViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const UnsubmittedReportView: React.FC<UnsubmittedReportViewProps> = ({ currentUser, onShowToast }) => {
  const [selectedWeekId, setSelectedWeekId] = useState<string>(() => {
    const cw = storage.getCurrentWeek();
    return cw ? cw.id : (storage.getWeeks()[0]?.id || '');
  });

  const weeks = storage.getWeeks();
  const supervisors = storage.getSupervisors().filter(s => s.status === 'Active');
  const allPrograms = storage.getWeeklyPrograms();

  const selectedWeek = storage.getWeekById(selectedWeekId);

  // Find supervisors who have not submitted for selectedWeek
  // A program is considered submitted if status in ['Submitted', 'Approved', 'NeedsRevision', 'UnderReview']
  const submittedSupIds = new Set(
    allPrograms
      .filter(p => p.weekId === selectedWeekId && (p.status === 'Submitted' || p.status === 'Approved' || p.status === 'NeedsRevision' || p.status === 'UnderReview'))
      .map(p => p.supervisorId)
  );

  const unsubmittedSupervisors = supervisors.filter(s => !submittedSupIds.has(s.id));

  const handleSendSingleAlert = (sup: Supervisor) => {
    storage.addNotification({
      id: `notif_${Date.now()}`,
      userId: sup.userId,
      title: 'تنبيه إداري: لم تقم بإرسال برنامجك الأسبوعي بعد',
      message: `عزيزي المشرف ${sup.name}، يرجى المسارعة بإرسال برنامج الأسبوع (${selectedWeek?.name}) قبل حلول موعد الإغلاق في ${formatDate(selectedWeek?.closeSubmissionAt)}.`,
      type: 'alert',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    storage.addAuditLog(
      currentUser.id,
      currentUser.username,
      'إرسال تنبيه فردي لعدم الإرسال',
      'Supervisor',
      sup.id,
      `تم إرسال تنبيه للمشرف: ${sup.name} للأسبوع: ${selectedWeek?.name}`
    );

    onShowToast(`تم إرسال التنبيه للمشرف (${sup.name}) بنجاح.`, 'success');
  };

  const handleSendAlertToAll = () => {
    if (unsubmittedSupervisors.length === 0) return;

    unsubmittedSupervisors.forEach(sup => {
      storage.addNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        userId: sup.userId,
        title: 'تنبيه إداري عاجل لعدم إرسال البرنامج الأسبوعي',
        message: `يرجى المبادرة بإرسال برنامجك الأسبوعي لـ (${selectedWeek?.name})، حيث يشارف موعد إغلاق النظام على الانتهاء.`,
        type: 'alert',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    storage.addAuditLog(
      currentUser.id,
      currentUser.username,
      'إرسال تنبيه جماعي للمشرفين المتأخرين',
      'Week',
      selectedWeekId,
      `تم إرسال تنبيهات جماعية إلى ${unsubmittedSupervisors.length} مشرفاً لم يرسلوا برامجهم للأسبوع: ${selectedWeek?.name}`
    );

    onShowToast(`تم إرسال تنبيه رسمي جماعي لجميع المشرفين المتأخرين (${unsubmittedSupervisors.length} مشرف).`, 'success');
  };

  const handleExportExcel = () => {
    const headers = ['اسم المشرف', 'التخصص', 'القسم', 'رقم الهاتف', 'الأسبوع', 'موعد الإغلاق', 'آخر برنامج مرسل'];
    const rows = unsubmittedSupervisors.map(s => {
      const pastProgs = allPrograms
        .filter(p => p.supervisorId === s.id && (p.status === 'Submitted' || p.status === 'Approved'))
        .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
      const lastProg = pastProgs[0];
      const lastWeek = lastProg ? weeks.find(w => w.id === lastProg.weekId) : null;

      return [
        s.name,
        s.specialization,
        s.department,
        s.phone,
        selectedWeek?.name || '-',
        selectedWeek ? formatDate(selectedWeek.closeSubmissionAt) : '-',
        lastWeek ? `${lastWeek.name} (${formatDate(lastProg.submittedAt)})` : 'لا يوجد برنامج سابق'
      ];
    });

    exportToExcel(`المشرفون_الذين_لم_يرسلوا_${selectedWeek?.name || 'الأسبوع'}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Title & Control */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>تقرير المتابعة الإدارية للبرامج غير المرسلة</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1">المشرفون الذين لم يرسلوا برامجهم</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            قائمة المشرفين المتأخرين عن إرسال خططهم الأسبوعية مع إمكانية إرسال تنبيهات فردية أو جماعية فورية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">الأسبوع:</span>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl"
            >
              {weeks.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

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
            onClick={triggerPrint}
            className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>طباعة</span>
          </button>
        </div>
      </div>

      {/* Deadline Info Banner */}
      {selectedWeek && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                الأسبوع: {selectedWeek.name} | موعد الإغلاق: {formatDate(selectedWeek.closeSubmissionAt)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                عدد المشرفين الذين لم يرسلوا بعد: <span className="font-bold text-rose-700 tabular-nums">{unsubmittedSupervisors.length}</span> من أصل <span className="font-bold tabular-nums">{supervisors.length}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CountdownTimer targetDate={selectedWeek.closeSubmissionAt} variant="compact" />

            {unsubmittedSupervisors.length > 0 && (
              <button
                type="button"
                onClick={handleSendAlertToAll}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Bell className="w-4 h-4" />
                <span>إرسال تنبيه جماعي ({unsubmittedSupervisors.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unsubmitted Supervisors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {unsubmittedSupervisors.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">أحسنتم! جميع المشرفين قاموا بإرسال برامجهم لهذا الأسبوع</h3>
            <p className="text-xs text-slate-400 mt-1">نسبة الإرسال 100% للأسبوع المحدد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-3.5 px-4">اسم المشرف</th>
                  <th className="py-3.5 px-4">التخصص والفرع</th>
                  <th className="py-3.5 px-4">القسم</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">آخر برنامج تم إرساله</th>
                  <th className="py-3.5 px-4 text-center">إجراءات المتابعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unsubmittedSupervisors.map(sup => {
                  const pastProgs = allPrograms
                    .filter(p => p.supervisorId === sup.id && (p.status === 'Submitted' || p.status === 'Approved'))
                    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
                  const lastProg = pastProgs[0];
                  const lastWeek = lastProg ? weeks.find(w => w.id === lastProg.weekId) : null;

                  return (
                    <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{sup.name}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{sup.specialization}</td>
                      <td className="py-3 px-4 text-slate-500">{sup.department}</td>
                      <td className="py-3 px-4 tabular-nums text-slate-600">{sup.phone}</td>
                      <td className="py-3 px-4">
                        {lastWeek ? (
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800">{lastWeek.name}</span>
                            <span className="text-[10px] text-slate-400 block tabular-nums">
                              {formatDate(lastProg.submittedAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">لا يوجد سجل سابق</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleSendSingleAlert(sup)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] transition-colors inline-flex items-center gap-1.5"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>إرسال تنبيه</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
