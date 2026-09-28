import React, { useState, useMemo } from 'react';
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
  Printer,
  Unlock,
  Check,
  X,
  ArrowLeftRight,
  Sparkles,
  Inbox,
  Send,
  HelpCircle,
  FileText
} from 'lucide-react';
import {
  User,
  WeeklyProgram,
  ProgramItem,
  Supervisor,
  Week,
  ProgramStatus,
  ProgramRevisionRequest,
  School,
  Activity
} from '../types';
import { storage } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate, formatDateTime } from '../utils/date';
import { arabicSearchMatch } from '../utils/arabic';
import { exportToExcel, triggerPrint } from '../utils/export';

interface ProgramReviewViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ProgramReviewView: React.FC<ProgramReviewViewProps> = ({ currentUser, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'incoming' | 'revisions' | 'comparison'>('incoming');
  const [filterWeekId, setFilterWeekId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Selected program for View / Review
  const [selectedProgram, setSelectedProgram] = useState<WeeklyProgram | null>(null);
  const [selectedItems, setSelectedItems] = useState<ProgramItem[]>([]);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);

  // Review action modals
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewAction, setReviewAction] = useState<'Approve' | 'RequestRevision' | 'Reopen'>('Approve');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewError, setReviewError] = useState<string>('');

  // Revision Request Response Modal
  const [selectedRequest, setSelectedRequest] = useState<ProgramRevisionRequest | null>(null);
  const [showRequestResponseModal, setShowRequestResponseModal] = useState(false);
  const [requestAction, setRequestAction] = useState<'Approve' | 'Reject'>('Approve');
  const [requestResponseNotes, setRequestResponseNotes] = useState('');

  // Comparison Tab Selector
  const [compareSupervisorId, setCompareSupervisorId] = useState<string>('');
  const [compareWeekId, setCompareWeekId] = useState<string>('');

  const weeks = storage.getWeeks();
  const supervisors = storage.getSupervisors();
  const schools = storage.getSchools();
  const activities = storage.getActivities();
  const allPrograms = storage.getWeeklyPrograms();
  const revisionRequests = storage.getRevisionRequests();
  const pendingRequestsCount = revisionRequests.filter(r => r.status === 'Pending').length;

  // Initialize comparison selection
  React.useEffect(() => {
    if (supervisors.length > 0 && !compareSupervisorId) {
      setCompareSupervisorId(supervisors[0].id);
    }
    const curWeek = storage.getCurrentWeek();
    if (curWeek && !compareWeekId) {
      setCompareWeekId(curWeek.id);
    } else if (weeks.length > 0 && !compareWeekId) {
      setCompareWeekId(weeks[0].id);
    }
  }, [supervisors, weeks]);

  // Incoming programs rows (Section 22 in prompt)
  const incomingRows = useMemo(() => {
    const list: Array<{
      supervisor: Supervisor;
      week: Week;
      planningProgram?: WeeklyProgram;
      actualProgram?: WeeklyProgram;
      planningStatus: ProgramStatus;
      actualStatus: ProgramStatus;
      planningItemsCount: number;
      actualItemsCount: number;
      lastSubmittedAt?: string;
    }> = [];

    const activeSups = supervisors.filter(s => s.status === 'Active');
    const targetWeeks = filterWeekId === 'all'
      ? (storage.getCurrentWeek() ? [storage.getCurrentWeek()!] : weeks)
      : weeks.filter(w => w.id === filterWeekId);

    activeSups.forEach(sup => {
      targetWeeks.forEach(w => {
        const planProg = allPrograms.find(p => p.supervisorId === sup.id && p.weekId === w.id && (p.planType || 'Planning') === 'Planning');
        const actProg = allPrograms.find(p => p.supervisorId === sup.id && p.weekId === w.id && p.planType === 'Actual');

        const planItems = planProg ? storage.getProgramItems(planProg.id) : [];
        const actItems = actProg ? storage.getProgramItems(actProg.id) : [];

        // Dates for sorting
        const dates = [planProg?.submittedAt, actProg?.submittedAt].filter(Boolean) as string[];
        dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        list.push({
          supervisor: sup,
          week: w,
          planningProgram: planProg,
          actualProgram: actProg,
          planningStatus: planProg?.status || 'Draft',
          actualStatus: actProg?.status || 'Draft',
          planningItemsCount: planItems.length,
          actualItemsCount: actItems.length,
          lastSubmittedAt: dates[0]
        });
      });
    });

    // Apply search filter
    return list.filter(row => {
      if (searchQuery.trim()) {
        const matchName = arabicSearchMatch(row.supervisor.name, searchQuery);
        const matchSpec = arabicSearchMatch(row.supervisor.specialization, searchQuery);
        if (!matchName && !matchSpec) return false;
      }

      if (filterStatus !== 'all') {
        const planMatch = row.planningStatus === filterStatus;
        const actMatch = row.actualStatus === filterStatus;
        if (!planMatch && !actMatch) return false;
      }

      return true;
    });
  }, [allPrograms, supervisors, weeks, filterWeekId, filterStatus, searchQuery, refreshTrigger]);

  // Comparison data for selected supervisor & week
  const comparisonData = useMemo(() => {
    if (!compareSupervisorId || !compareWeekId) return null;
    return storage.getSupervisorDetailedComparison(compareSupervisorId, compareWeekId);
  }, [compareSupervisorId, compareWeekId, refreshTrigger]);

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
      setReviewNotes('تم مراجعة واعتماد البرنامج الأسبوعي وهو متوافق مع معايير قسم الإشراف.');
    } else if (action === 'RequestRevision') {
      setReviewNotes('يرجى تعديل البرنامج وإضافة النشاط الإشرافي لمتابعة المعلمين.');
    } else {
      setReviewNotes('تم السماح بالتعديل وإعادة فتح البرنامج للتعديل.');
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
    setRefreshTrigger(t => t + 1);

    if (reviewAction === 'Approve') {
      onShowToast('تم اعتماد البرنامج الأسبوعي بنجاح وإشعار المشرف.', 'success');
    } else if (reviewAction === 'RequestRevision') {
      onShowToast('تم إرسال طلب التعديل بنجاح للمشرف.', 'warning');
    } else {
      onShowToast('تمت إعادة فتح البرنامج كمسودة للمشرف بنجاح.', 'info');
    }
  };

  // Allow direct unlock / edit permission from table
  const handleAllowEditDirect = (prog: WeeklyProgram) => {
    prog.status = 'EditingAllowed';
    prog.editingAllowed = true;
    prog.revisionRequested = false;
    storage.saveProgram(prog);

    const sup = storage.getSupervisorById(prog.supervisorId);
    if (sup) {
      storage.addNotification({
        id: `notif_${Date.now()}`,
        userId: sup.userId,
        title: 'تم السماح لك بتعديل البرنامج',
        message: `سمح لك مسؤول النظام بتعديل ${prog.planType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'} للأسبوع الحالي. يمكنك الآن التعديل وإعادة الإرسال.`,
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    setRefreshTrigger(t => t + 1);
    onShowToast(`تم السماح للمشرف ${sup?.name} بتعديل البرنامج بنجاح.`, 'success');
  };

  // Handle responding to Revision Requests
  const handleOpenRequestResponse = (req: ProgramRevisionRequest, action: 'Approve' | 'Reject') => {
    setSelectedRequest(req);
    setRequestAction(action);
    setRequestResponseNotes(action === 'Approve' ? 'تمت الموافقة على طلب التعديل، تم فتح البرنامج للتعديل.' : 'عذراً، تم رفض الطلب لانتهاء الفترة المحددة.');
    setShowRequestResponseModal(true);
  };

  const handleConfirmRequestResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    storage.respondToRevisionRequest(selectedRequest.id, currentUser, requestAction, requestResponseNotes);
    setShowRequestResponseModal(false);
    setSelectedRequest(null);
    setRefreshTrigger(t => t + 1);

    if (requestAction === 'Approve') {
      onShowToast('تمت الموافقة على طلب التعديل وفتح البرنامج للمشرف.', 'success');
    } else {
      onShowToast('تم رفض طلب التعديل وإشعار المشرف.', 'info');
    }
  };

  const handleExportIncomingExcel = () => {
    const headers = ['اسم المشرف', 'التخصص', 'الأسبوع', 'حالة التخطيط', 'بنود التخطيط', 'حالة الفعلي', 'بنود الفعلي', 'آخر إرسال'];
    const rows = incomingRows.map(r => [
      r.supervisor.name,
      r.supervisor.specialization,
      r.week.name,
      r.planningStatus,
      r.planningItemsCount,
      r.actualStatus,
      r.actualItemsCount,
      r.lastSubmittedAt ? formatDateTime(r.lastSubmittedAt) : 'لم يرسل'
    ]);
    exportToExcel('البرامج_الأسبوعية_الواردة_للمشرفين', headers, rows);
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (status: ProgramStatus, count: number) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>معتمد ({count})</span>
          </span>
        );
      case 'Submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Send className="w-3 h-3 text-blue-600" />
            <span>مرسل ({count})</span>
          </span>
        );
      case 'NeedsRevision':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>مطلوب تعديل</span>
          </span>
        );
      case 'EditingAllowed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
            <Unlock className="w-3 h-3 text-purple-600" />
            <span>مسموح بالتعديل</span>
          </span>
        );
      case 'RevisionRequested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-900 border border-orange-300 animate-pulse">
            <Clock className="w-3 h-3 text-orange-600" />
            <span>طلب تعديل</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
            <span>لم يرسل ({count})</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Main Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'incoming'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>1. البرامج الأسبوعية الواردة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('revisions')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'revisions'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Unlock className="w-4 h-4" />
            <span>2. طلبات تعديل البرامج</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-sky-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>3. مقارنة التخطيط بالفعلي</span>
          </button>
        </div>

        {activeTab === 'incoming' && (
          <button
            type="button"
            onClick={handleExportIncomingExcel}
            className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>تصدير Excel</span>
          </button>
        )}
      </div>

      {/* ===================== TAB 1: INCOMING PROGRAMS ===================== */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم المشرف أو التخصص..."
                className="w-full text-xs py-2 pl-3 pr-9 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">الأسبوع:</span>
              <select
                value={filterWeekId}
                onChange={(e) => setFilterWeekId(e.target.value)}
                className="text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="all">الأسبوع الحالي</option>
                {weeks.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatDate(w.startDate)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">الحالة:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="all">جميع الحالات</option>
                <option value="Submitted">تم الإرسال</option>
                <option value="Approved">معتمد</option>
                <option value="NeedsRevision">مطلوب تعديل</option>
                <option value="RevisionRequested">طلب تعديل</option>
                <option value="EditingAllowed">مسموح بالتعديل</option>
                <option value="Draft">مسودة / لم يرسل</option>
              </select>
            </div>
          </div>

          {/* Incoming Programs Table (Section 22) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-3 px-4">المشرف</th>
                    <th className="py-3 px-4">التخصص</th>
                    <th className="py-3 px-4">الأسبوع</th>
                    <th className="py-3 px-4 text-center">برنامج التخطيط</th>
                    <th className="py-3 px-4 text-center">البرنامج الفعلي</th>
                    <th className="py-3 px-4 text-center">آخر إرسال</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incomingRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        لا توجد برامج مطابقة لخيارات البحث المحددة.
                      </td>
                    </tr>
                  ) : (
                    incomingRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.supervisor.name}</td>
                        <td className="py-3 px-4 text-slate-600">{row.supervisor.specialization}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{row.week.name}</td>

                        {/* Planning status */}
                        <td className="py-3 px-4 text-center">
                          {renderStatusBadge(row.planningStatus, row.planningItemsCount)}
                        </td>

                        {/* Actual status */}
                        <td className="py-3 px-4 text-center">
                          {renderStatusBadge(row.actualStatus, row.actualItemsCount)}
                        </td>

                        {/* Last submit */}
                        <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                          {row.lastSubmittedAt ? formatDateTime(row.lastSubmittedAt) : '-'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {row.planningProgram && (
                              <button
                                type="button"
                                onClick={() => handleOpenView(row.planningProgram!)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                                title="عرض ومراجعة التخطيط"
                              >
                                عرض التخطيط
                              </button>
                            )}

                            {row.actualProgram && (
                              <button
                                type="button"
                                onClick={() => handleOpenView(row.actualProgram!)}
                                className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                                title="عرض ومراجعة الفعلي"
                              >
                                عرض الفعلي
                              </button>
                            )}

                            {/* Direct comparison button */}
                            <button
                              type="button"
                              onClick={() => {
                                setCompareSupervisorId(row.supervisor.id);
                                setCompareWeekId(row.week.id);
                                setActiveTab('comparison');
                              }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                              title="مقارنة المخطط بالفعلي"
                            >
                              مقارنة
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: REVISION REQUESTS ===================== */}
      {activeTab === 'revisions' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">طلبات تعديل البرامج الأسبوعية للمشرفين</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تتيح للمسؤول مراجعة أسباب طلبات التعديل المقدمة من المشرفين والموافقة عليها لفتح البرنامج أو رفضها.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-3 px-4">المشرف</th>
                    <th className="py-3 px-4">الأسبوع</th>
                    <th className="py-3 px-4">نوع البرنامج</th>
                    <th className="py-3 px-4">سبب طلب التعديل</th>
                    <th className="py-3 px-4">تاريخ الطلب</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revisionRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        لا توجد أي طلبات تعديل برامج حالياً.
                      </td>
                    </tr>
                  ) : (
                    revisionRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{req.supervisorName}</td>
                        <td className="py-3 px-4">{req.weekName}</td>
                        <td className="py-3 px-4 font-bold text-emerald-800">
                          {req.programType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs">{req.requestReason}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{formatDateTime(req.requestedAt)}</td>
                        <td className="py-3 px-4 text-center">
                          {req.status === 'Pending' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-200">
                              بانتظار الموافقة
                            </span>
                          ) : req.status === 'Approved' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              تم السماح بالتعديل
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              مرفوض
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {req.status === 'Pending' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenRequestResponse(req, 'Approve')}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                              >
                                السماح بالتعديل
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRequestResponse(req, 'Reject')}
                                className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                              >
                                رفض الطلب
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              بواسطة {req.respondedBy || 'المسؤول'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: PLANNED VS ACTUAL COMPARISON ===================== */}
      {activeTab === 'comparison' && (
        <div className="space-y-5">
          {/* Comparison Selector Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">المشرف:</span>
                <select
                  value={compareSupervisorId}
                  onChange={(e) => setCompareSupervisorId(e.target.value)}
                  className="text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">الأسبوع:</span>
                <select
                  value={compareWeekId}
                  onChange={(e) => setCompareWeekId(e.target.value)}
                  className="text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {weeks.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatDate(w.startDate)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => triggerPrint()}
                className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                <span>طباعة المقارنة</span>
              </button>
            </div>
          </div>

          {/* Comparison Results Card */}
          {comparisonData && (
            <div className="space-y-4">
              {/* Comparison Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-400 block">إجمالي أيام الأسبوع المحددة:</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">
                    {comparisonData.totalDaysCount} أيام
                  </span>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-xs">
                  <span className="text-xs font-semibold text-emerald-800 block">أيام نُفذت كما خُطط لها تماماً:</span>
                  <span className="text-2xl font-black text-emerald-800 mt-1 block">
                    {comparisonData.matchedDaysCount} أيام
                  </span>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-xs">
                  <span className="text-xs font-semibold text-amber-800 block">أيام طرأ عليها تعديل في التنفيذ:</span>
                  <span className="text-2xl font-black text-amber-800 mt-1 block">
                    {comparisonData.modifiedDaysCount} أيام
                  </span>
                </div>
              </div>

              {/* Side-by-side Table (Section 31 in prompt) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print-area">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">
                    تقرير المقارنة التفصيلي بين التخطيط والتنفيذ الفعلي – {comparisonData.supervisor?.name}
                  </h3>
                  <span className="text-xs text-slate-400">
                    الأسبوع: {comparisonData.week?.name}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="py-3 px-4">اليوم والتاريخ</th>
                        <th className="py-3 px-4">المخطط (المدرسة والفعالية)</th>
                        <th className="py-3 px-4">الفعلي المنفذ</th>
                        <th className="py-3 px-4 text-center">الفرق والتحليل</th>
                        <th className="py-3 px-4">الملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparisonData.comparisonRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{row.dayName}</span>
                            <span className="text-[11px] text-slate-400 font-mono" dir="ltr">{row.date}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-800 block">{row.plannedSchools}</span>
                              <span className="text-[11px] text-slate-500 block">{row.plannedActivities}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-800 block">{row.actualSchools}</span>
                              <span className="text-[11px] text-slate-500 block">{row.actualActivities}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {row.matchStatus === 'matched' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>{row.differenceLabel}</span>
                              </span>
                            ) : row.matchStatus === 'modified' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>{row.differenceLabel}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                                <span>{row.differenceLabel}</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {row.actualNotes !== '-' ? row.actualNotes : row.planningNotes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* 1. View Program Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={`استعراض ${selectedProgram?.planType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'}`}
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
            <span className="font-bold text-slate-800">الحالة الحالية:</span>
            <span className="font-bold text-emerald-700">{selectedProgram?.status}</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-2.5 px-3">اليوم</th>
                  <th className="py-2.5 px-3">المدرسة</th>
                  <th className="py-2.5 px-3">الفعالية</th>
                  <th className="py-2.5 px-3">ملاحظات البند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.dayOfWeek || item.dayName || '-'}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {schools.find(s => s.id === item.schoolId)?.name || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {activities.find(a => a.id === item.activityId)?.name || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{item.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedProgram) handleOpenReviewAction(selectedProgram, 'Approve');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                اعتماد البرنامج
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedProgram) handleOpenReviewAction(selectedProgram, 'RequestRevision');
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                طلب تعديل
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedProgram) handleAllowEditDirect(selectedProgram);
                  setShowViewModal(false);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                السماح بالتعديل
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowViewModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
            >
              إغلاق
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. Review Action Modal (Approve / Request Revision) */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={reviewAction === 'Approve' ? 'اعتماد البرنامج الأسبوعي' : 'طلب تعديل البرنامج'}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmReview} className="space-y-4">
          {reviewError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {reviewError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات المراجعة والاعتماد:
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs ${
                reviewAction === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              تأكيد الإجراء
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Respond to Revision Request Modal */}
      <Modal
        isOpen={showRequestResponseModal}
        onClose={() => setShowRequestResponseModal(false)}
        title={requestAction === 'Approve' ? 'الموافقة على طلب التعديل وفتح البرنامج' : 'رفض طلب التعديل'}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmRequestResponse} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {requestAction === 'Approve'
              ? `سيتم فتح ${selectedRequest?.programType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'} للمشرف ${selectedRequest?.supervisorName} ليتمكن من تعديل البيانات وإعادة الإرسال.`
              : `سيتم إشعار المشرف ${selectedRequest?.supervisorName} برفض طلب التعديل مع توضيح السبب.`}
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات المسؤول للمشرف:
            </label>
            <textarea
              rows={3}
              value={requestResponseNotes}
              onChange={(e) => setRequestResponseNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowRequestResponseModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs ${
                requestAction === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              تأكيد الرد
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
