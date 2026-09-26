import React, { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Bell,
  Clock,
  Calendar,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { User, WeeklyProgram, ProgramItem, Supervisor, Week } from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate, formatTime } from '../utils/date';
import { arabicSearchMatch } from '../utils/arabic';
import { exportToExcel, triggerPrint } from '../utils/export';

interface ProgramReviewViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ProgramReviewView: React.FC<ProgramReviewViewProps> = ({ currentUser, onShowToast }) => {
  const [filterWeekId, setFilterWeekId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected program for View / Review
  const [selectedProgram, setSelectedProgram] = useState<WeeklyProgram | null>(null);
  const [selectedItems, setSelectedItems] = useState<ProgramItem[]>([]);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);

  // Review action modals
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewAction, setReviewAction] = useState<'Approve' | 'RequestRevision' | 'Reopen'>('Approve');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewError, setReviewError] = useState<string>('');

  const weeks = storage.getWeeks();
  const supervisors = storage.getSupervisors();
  const schools = storage.getSchools();
  const activities = storage.getActivities();
  const allPrograms = storage.getWeeklyPrograms();

  const handleOpenView = (prog: WeeklyProgram) => {
    setSelectedProgram(prog);
    setSelectedItems(storage.getProgramItems(prog.id));
    setShowViewModal(true);
  };

  const handleOpenReviewAction = (prog: WeeklyProgram, action: 'Approve' | 'RequestRevision' | 'Reopen') => {
    setSelectedProgram(prog);
    setReviewAction(action);
    setReviewError('');
    if (action === 'Approve') {
      setReviewNotes('تم اعتماد البرنامج الأسبوعي بنجاح وهو موافق للمعايير الإشرافية.');
    } else if (action === 'RequestRevision') {
      setReviewNotes('يرجى تعديل برنامج يوم الثلاثاء وإضافة النشاط الإشرافي لمتابعة المعلمين.');
    } else {
      setReviewNotes('تمت إعادة فتح البرنامج لإجراء التعديلات المطلوبة.');
    }
    setShowReviewModal(true);
  };

  const handleConfirmReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) return;

    if (reviewAction === 'RequestRevision' && !reviewNotes.trim()) {
      setReviewError('يجب إدخال سبب طلب التعديل لمساعدة المشرف.');
      return;
    }

    storage.reviewProgram(selectedProgram.id, currentUser, reviewAction, reviewNotes);
    setShowReviewModal(false);
    setShowViewModal(false);

    if (reviewAction === 'Approve') {
      onShowToast('تم اعتماد البرنامج الأسبوعي بنجاح وإشعار المشرف.', 'success');
    } else if (reviewAction === 'RequestRevision') {
      onShowToast('تم طلب تعديل البرنامج بنجاح وإرسال الملاحظات للمشرف.', 'warning');
    } else {
      onShowToast('تمت إعادة فتح البرنامج كمسودة للمشرف بنجاح.', 'info');
    }
  };

  const handleSendAlert = (supervisorId: string) => {
    const sup = storage.getSupervisorById(supervisorId);
    if (!sup) return;

    storage.addNotification({
      id: `notif_${Date.now()}`,
      userId: sup.userId,
      title: 'تنبيه إداري عاجل من رئيس قسم الإشراف',
      message: 'نرجو المبادرة بإرسال برنامجك الأسبوعي قبل انتهاء الفترة المحددة وفق توجيهات المديرية.',
      type: 'alert',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    storage.addAuditLog(currentUser.id, currentUser.username, 'إرسال تنبيه لمشرف', 'Supervisor', supervisorId, `إرسال تنبيه للمشرف: ${sup.name}`);
    onShowToast(`تم إرسال تنبيه رسمي إلى المشرف (${sup.name}) بنجاح.`, 'success');
  };

  // Filter list
  const filteredPrograms = allPrograms.filter(prog => {
    if (filterWeekId !== 'all' && prog.weekId !== filterWeekId) return false;
    if (filterStatus !== 'all' && prog.status !== filterStatus) return false;

    const sup = supervisors.find(s => s.id === prog.supervisorId);
    if (searchQuery) {
      const matchName = arabicSearchMatch(sup?.name, searchQuery);
      const matchSpec = arabicSearchMatch(sup?.specialization, searchQuery);
      if (!matchName && !matchSpec) return false;
    }
    return true;
  });

  const handleExportExcel = () => {
    const headers = ['المشرف', 'التخصص', 'الأسبوع', 'حالة البرنامج', 'تاريخ الإرسال', 'تاريخ المراجعة', 'المراجع', 'ملاحظات المراجعة'];
    const rows = filteredPrograms.map(p => {
      const sup = supervisors.find(s => s.id === p.supervisorId);
      const week = weeks.find(w => w.id === p.weekId);
      return [
        sup?.name || '-',
        sup?.specialization || '-',
        week?.name || '-',
        p.status,
        p.submittedAt ? formatDate(p.submittedAt) : 'لم يرسل',
        p.reviewedAt ? formatDate(p.reviewedAt) : '-',
        p.reviewedBy || '-',
        p.reviewNotes || '-'
      ];
    });
    exportToExcel('متابعة_البرامج_الأسبوعية', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">متابعة وتدقيق البرامج الأسبوعية للمشرفين</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            مراجعة، اعتماد، طلب تعديل، وإعادة فتح الخطط الأسبوعية لجميع المشرفين التربويين بمديرية يطا.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>تصدير Excel</span>
          </button>
          <button
            type="button"
            onClick={triggerPrint}
            className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>طباعة</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[220px] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المشرف أو التخصص..."
            className="w-full text-xs py-2 pl-3 pr-9 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        {/* Filter Week */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">الأسبوع:</span>
          <select
            value={filterWeekId}
            onChange={(e) => setFilterWeekId(e.target.value)}
            className="text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl"
          >
            <option value="all">جميع الأسابيع</option>
            {weeks.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">الحالة:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl"
          >
            <option value="all">جميع الحالات</option>
            <option value="Submitted">تم الإرسال (قيد المراجعة)</option>
            <option value="Approved">معتمد</option>
            <option value="NeedsRevision">يحتاج تعديل</option>
            <option value="Draft">مسودة</option>
          </select>
        </div>
      </div>

      {/* Programs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3.5 px-4">اسم المشرف والتخصص</th>
                <th className="py-3.5 px-4">الأسبوع</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4">تاريخ الإرسال</th>
                <th className="py-3.5 px-4">تاريخ المراجعة</th>
                <th className="py-3.5 px-4">المراجع والملاحظات</th>
                <th className="py-3.5 px-4 text-center">إجراءات المراجعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    لا توجد برامج مطابقة لخيارات التصفية المحددة.
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((prog) => {
                  const sup = supervisors.find(s => s.id === prog.supervisorId);
                  const week = weeks.find(w => w.id === prog.weekId);

                  return (
                    <tr key={prog.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{sup?.name || 'مشرف غير معروف'}</div>
                        <div className="text-[11px] text-slate-500">{sup?.specialization}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{week?.name || '-'}</td>
                      <td className="py-3 px-4">
                        {prog.status === 'Approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>معتمد</span>
                          </span>
                        ) : prog.status === 'Submitted' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800">
                            <Clock className="w-3 h-3" />
                            <span>قيد التدقيق</span>
                          </span>
                        ) : prog.status === 'NeedsRevision' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            <span>يحتاج تعديل</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                            <span>مسودة</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-slate-600">
                        {prog.submittedAt ? `${formatDate(prog.submittedAt)} ${formatTime(prog.submittedAt)}` : 'لم يُرسل'}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-slate-600">
                        {prog.reviewedAt ? formatDate(prog.reviewedAt) : '-'}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {prog.reviewedBy && <div className="font-semibold text-slate-800">{prog.reviewedBy}</div>}
                        {prog.reviewNotes && (
                          <div className="text-[11px] text-slate-500 truncate" title={prog.reviewNotes}>
                            «{prog.reviewNotes}»
                          </div>
                        )}
                        {!prog.reviewedBy && <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Program */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(prog)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="عرض تفاصيل البرنامج"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Approve */}
                          <button
                            type="button"
                            onClick={() => handleOpenReviewAction(prog, 'Approve')}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="اعتماد البرنامج"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          {/* Quick Request Revision */}
                          <button
                            type="button"
                            onClick={() => handleOpenReviewAction(prog, 'RequestRevision')}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                            title="طلب تعديل البرنامج"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>

                          {/* Reopen */}
                          <button
                            type="button"
                            onClick={() => handleOpenReviewAction(prog, 'Reopen')}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="إعادة فتح كمسودة"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          {/* Alert */}
                          {sup && (
                            <button
                              type="button"
                              onClick={() => handleSendAlert(sup.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="إرسال تنبيه للمشرف"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Program Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="تفاصيل البرنامج الأسبوعي للمشرف"
        subtitle={
          selectedProgram
            ? `المشرف: ${supervisors.find(s => s.id === selectedProgram.supervisorId)?.name} | ${weeks.find(w => w.id === selectedProgram.weekId)?.name}`
            : ''
        }
        maxWidth="5xl"
      >
        <div className="space-y-4">
          {selectedProgram?.reviewNotes && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <span className="font-bold">ملاحظات المراجعة السابقة:</span> {selectedProgram.reviewNotes}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                <tr>
                  <th className="py-2.5 px-3">اليوم</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">المدرسة</th>
                  <th className="py-2.5 px-3">نوع النشاط</th>
                  <th className="py-2.5 px-3">الوقت</th>
                  <th className="py-2.5 px-3">المكان</th>
                  <th className="py-2.5 px-3">الهدف</th>
                  <th className="py-2.5 px-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      لا توجد أنشطة مسجلة داخل هذا البرنامج.
                    </td>
                  </tr>
                ) : (
                  selectedItems.map((item) => {
                    const sch = schools.find(s => s.id === item.schoolId);
                    const act = activities.find(a => a.id === item.activityId);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{item.dayName}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatDate(item.dayDate)}</td>
                        <td className="py-2.5 px-3 font-semibold">{sch?.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            {act?.name}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">{item.startTime} - {item.endTime}</td>
                        <td className="py-2.5 px-3">{item.location}</td>
                        <td className="py-2.5 px-3 leading-relaxed">{item.objective}</td>
                        <td className="py-2.5 px-3 text-slate-500">{item.notes || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Action buttons inside View modal */}
          {selectedProgram && (
            <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenReviewAction(selectedProgram, 'Approve');
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد البرنامج</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenReviewAction(selectedProgram, 'RequestRevision');
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>طلب تعديل</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenReviewAction(selectedProgram, 'Reopen');
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة فتح</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إغلاق
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Review Action Confirmation Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={
          reviewAction === 'Approve'
            ? 'اعتماد البرنامج الأسبوعي'
            : reviewAction === 'RequestRevision'
            ? 'طلب تعديل البرنامج الأسبوعي'
            : 'إعادة فتح البرنامج كمسودة'
        }
        subtitle={
          selectedProgram
            ? `المشرف: ${supervisors.find(s => s.id === selectedProgram.supervisorId)?.name}`
            : ''
        }
        maxWidth="md"
      >
        <form onSubmit={handleConfirmReview} className="space-y-4">
          {reviewError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{reviewError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {reviewAction === 'RequestRevision'
                ? 'سبب وملاحظات طلب التعديل (إلزامي)'
                : 'ملاحظات الاعتماد / المراجعة'}
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
              required={reviewAction === 'RequestRevision'}
              placeholder={
                reviewAction === 'RequestRevision'
                  ? 'مثال: يرجى تعديل برنامج يوم الثلاثاء وإضافة النشاط الإشرافي لمتابعة المعلمين...'
                  : 'ملاحظات المراجع...'
              }
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md ${
                reviewAction === 'Approve'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : reviewAction === 'RequestRevision'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              {reviewAction === 'Approve'
                ? 'تأكيد الاعتماد'
                : reviewAction === 'RequestRevision'
                ? 'إرسال طلب التعديل للمشرف'
                : 'تأكيد إعادة الفتح'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
