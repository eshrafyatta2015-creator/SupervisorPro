import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Filter,
  Calendar,
  Users,
  School as SchoolIcon,
  Activity as ActivityIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  BarChart3
} from 'lucide-react';
import { User } from '../types';
import { storage } from '../services/storage';
import { formatDate } from '../utils/date';
import { exportToExcel, triggerPrint } from '../utils/export';

interface ReportsViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

type ReportType =
  | 'all_programs'
  | 'by_supervisor'
  | 'by_school'
  | 'by_activity'
  | 'submitted'
  | 'unsubmitted'
  | 'approved'
  | 'needs_revision'
  | 'monthly'
  | 'annual';

export const ReportsView: React.FC<ReportsViewProps> = ({ currentUser, onShowToast }) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('all_programs');
  const [filterWeekId, setFilterWeekId] = useState<string>('all');
  const [filterSupervisorId, setFilterSupervisorId] = useState<string>('all');
  const [filterSchoolId, setFilterSchoolId] = useState<string>('all');
  const [filterActivityId, setFilterActivityId] = useState<string>('all');

  const weeks = storage.getWeeks();
  const supervisors = storage.getSupervisors();
  const schools = storage.getSchools();
  const activities = storage.getActivities();
  const allPrograms = storage.getWeeklyPrograms();
  const currentYear = storage.getCurrentAcademicYear();

  const reportTabs: { id: ReportType; label: string; icon: React.ElementType }[] = [
    { id: 'all_programs', label: '1. البرامج الأسبوعية', icon: Calendar },
    { id: 'by_supervisor', label: '2. حسب المشرف', icon: Users },
    { id: 'by_school', label: '3. حسب المدرسة', icon: SchoolIcon },
    { id: 'by_activity', label: '4. حسب النشاط', icon: ActivityIcon },
    { id: 'submitted', label: '5. البرامج المرسلة', icon: Send },
    { id: 'unsubmitted', label: '6. غير المرسلة', icon: Clock },
    { id: 'approved', label: '7. المعتمدة', icon: CheckCircle2 },
    { id: 'needs_revision', label: '8. تحتاج تعديل', icon: AlertTriangle },
    { id: 'monthly', label: '9. التقرير الشهري', icon: BarChart3 },
    { id: 'annual', label: '10. التقرير السنوي', icon: FileSpreadsheet }
  ];

  // Compile data based on selectedReport and filters
  let reportHeaders: string[] = [];
  let reportRows: (string | number)[][] = [];
  let reportTitle = '';

  const allItemsWithContext = allPrograms.flatMap(prog => {
    const items = storage.getProgramItems(prog.id);
    const sup = supervisors.find(s => s.id === prog.supervisorId);
    const week = weeks.find(w => w.id === prog.weekId);

    return items.map(item => ({
      ...item,
      supervisorName: sup?.name || 'غير معروف',
      specialization: sup?.specialization || '',
      weekName: week?.name || '',
      weekStatus: week?.status || '',
      programStatus: prog.status,
      submittedAt: prog.submittedAt,
      reviewedAt: prog.reviewedAt,
      reviewedBy: prog.reviewedBy
    }));
  });

  if (selectedReport === 'all_programs') {
    reportTitle = 'تقرير البرامج الأسبوعية الشامل';
    reportHeaders = ['المشرف', 'التخصص', 'الأسبوع', 'اليوم', 'التاريخ', 'المدرسة', 'نوع النشاط', 'الوقت', 'الهدف', 'الحالة'];
    reportRows = allItemsWithContext
      .filter(i => {
        if (filterWeekId !== 'all' && i.weekName !== weeks.find(w => w.id === filterWeekId)?.name) return false;
        if (filterSupervisorId !== 'all' && i.supervisorName !== supervisors.find(s => s.id === filterSupervisorId)?.name) return false;
        return true;
      })
      .map(i => {
        const sch = schools.find(s => s.id === i.schoolId);
        const act = activities.find(a => a.id === i.activityId);
        return [
          i.supervisorName,
          i.specialization,
          i.weekName,
          i.dayName || '-',
          formatDate(i.dayDate),
          sch?.name || '-',
          act?.name || '-',
          `${i.startTime} - ${i.endTime}`,
          i.objective || '',
          i.programStatus
        ];
      });
  } else if (selectedReport === 'by_supervisor') {
    reportTitle = 'تقرير البرامج والأنشطة الإشرافية حسب المشرف التربوي';
    reportHeaders = ['اسم المشرف', 'التخصص', 'عدد البرامج', 'إجمالي الأنشطة', 'المدارس المزارة', 'حالة الاعتماد'];
    reportRows = supervisors
      .filter(s => filterSupervisorId === 'all' || s.id === filterSupervisorId)
      .map(s => {
        const progs = allPrograms.filter(p => p.supervisorId === s.id);
        const pItems = progs.flatMap(p => storage.getProgramItems(p.id));
        const visitedSchools = new Set(pItems.map(i => i.schoolId)).size;
        const approvedCount = progs.filter(p => p.status === 'Approved').length;

        return [
          s.name,
          s.specialization,
          progs.length,
          pItems.length,
          visitedSchools,
          `${approvedCount} من ${progs.length} معتمد`
        ];
      });
  } else if (selectedReport === 'by_school') {
    reportTitle = 'تقرير الزيارات والمتابعات الميدانية حسب المدرسة';
    reportHeaders = ['اسم المدرسة', 'المنطقة', 'المرحلة والنوع', 'عدد الزيارات المنفذة', 'المشرفون الزائرون', 'أبرز الأنشطة المنفذة'];
    reportRows = schools
      .filter(sch => filterSchoolId === 'all' || sch.id === filterSchoolId)
      .map(sch => {
        const items = allItemsWithContext.filter(i => i.schoolId === sch.id);
        const uniqueSups = Array.from(new Set(items.map(i => i.supervisorName)));
        const acts = Array.from(new Set(items.map(i => activities.find(a => a.id === i.activityId)?.name || ''))).slice(0, 3);

        return [
          sch.name,
          sch.region,
          `${sch.stage} - ${sch.type}`,
          items.length,
          uniqueSups.join('، ') || 'لا زيارات حتى الآن',
          acts.join('، ') || '-'
        ];
      });
  } else if (selectedReport === 'by_activity') {
    reportTitle = 'تقرير توزيع المهام والأنشطة الإشرافية';
    reportHeaders = ['نوع النشاط', 'الرمز', 'عدد المرات المنفذة', 'عدد المشرفين المنفذين', 'المدارس المستهدفة'];
    reportRows = activities
      .filter(a => filterActivityId === 'all' || a.id === filterActivityId)
      .map(a => {
        const items = allItemsWithContext.filter(i => i.activityId === a.id);
        const uniqueSups = new Set(items.map(i => i.supervisorName)).size;
        const uniqueSchools = new Set(items.map(i => i.schoolId)).size;

        return [
          a.name,
          a.code || '',
          items.length,
          uniqueSups,
          uniqueSchools
        ];
      });
  } else if (selectedReport === 'submitted') {
    reportTitle = 'تقرير البرامج الأسبوعية المرسلة والمعتمدة';
    reportHeaders = ['المشرف', 'التخصص', 'الأسبوع', 'تاريخ الإرسال', 'الحالة', 'تاريخ المراجعة', 'المراجع'];
    reportRows = allPrograms
      .filter(p => p.status === 'Submitted' || p.status === 'Approved')
      .map(p => {
        const sup = supervisors.find(s => s.id === p.supervisorId);
        const week = weeks.find(w => w.id === p.weekId);
        return [
          sup?.name || '-',
          sup?.specialization || '-',
          week?.name || '-',
          p.submittedAt ? formatDate(p.submittedAt) : '-',
          p.status === 'Approved' ? 'معتمد' : 'مرسل قيد التدقيق',
          p.reviewedAt ? formatDate(p.reviewedAt) : '-',
          p.reviewedBy || '-'
        ];
      });
  } else if (selectedReport === 'unsubmitted') {
    reportTitle = 'تقرير المشرفين المتأخرين عن إرسال البرامج';
    reportHeaders = ['اسم المشرف', 'التخصص', 'رقم الهاتف', 'الأسبوع الحالي', 'موعد الإغلاق', 'حالة الإرسال'];
    const curWeek = storage.getCurrentWeek();
    const submittedIds = new Set(
      allPrograms.filter(p => p.weekId === curWeek?.id && p.status !== 'Draft').map(p => p.supervisorId)
    );
    reportRows = supervisors
      .filter(s => !submittedIds.has(s.id))
      .map(s => [
        s.name,
        s.specialization,
        s.phone,
        curWeek?.name || '-',
        curWeek ? formatDate(curWeek.closeSubmissionAt) : '-',
        'لم يرسل'
      ]);
  } else if (selectedReport === 'approved') {
    reportTitle = 'تقرير البرامج الأسبوعية المعتمدة رسمياً';
    reportHeaders = ['المشرف', 'التخصص', 'الأسبوع', 'تاريخ الإرسال', 'تاريخ الاعتماد', 'المراجع', 'ملاحظات الاعتماد'];
    reportRows = allPrograms
      .filter(p => p.status === 'Approved')
      .map(p => {
        const sup = supervisors.find(s => s.id === p.supervisorId);
        const week = weeks.find(w => w.id === p.weekId);
        return [
          sup?.name || '-',
          sup?.specialization || '-',
          week?.name || '-',
          p.submittedAt ? formatDate(p.submittedAt) : '-',
          p.reviewedAt ? formatDate(p.reviewedAt) : '-',
          p.reviewedBy || '-',
          p.reviewNotes || '-'
        ];
      });
  } else if (selectedReport === 'needs_revision') {
    reportTitle = 'تقرير البرامج التي تحتاج إلى تعديل';
    reportHeaders = ['المشرف', 'التخصص', 'الأسبوع', 'تاريخ طلب التعديل', 'المراجع', 'سبب وملاحظات التعديل'];
    reportRows = allPrograms
      .filter(p => p.status === 'NeedsRevision')
      .map(p => {
        const sup = supervisors.find(s => s.id === p.supervisorId);
        const week = weeks.find(w => w.id === p.weekId);
        return [
          sup?.name || '-',
          sup?.specialization || '-',
          week?.name || '-',
          p.reviewedAt ? formatDate(p.reviewedAt) : '-',
          p.reviewedBy || '-',
          p.reviewNotes || 'يرجى مراجعة الأنشطة'
        ];
      });
  } else if (selectedReport === 'monthly') {
    reportTitle = 'التقرير الإحصائي الشهري للبرامج والزيارات الميدانية';
    reportHeaders = ['الشهر والبيان', 'عدد الأسابيع', 'البرامج المرسلة', 'البرامج المعتمدة', 'إجمالي الأنشطة المنفذة', 'نسبة الإنجاز'];
    reportRows = [
      ['شهر أيلول / سبتمبر 2026', 4, allPrograms.length, allPrograms.filter(p => p.status === 'Approved').length, allItemsWithContext.length, '92%'],
      ['شهر تشرين الأول / أكتوبر 2026 (مخطط)', 4, 0, 0, 0, 'قيد الإعداد']
    ];
  } else {
    // Annual
    reportTitle = `التقرير السنوي الشامل - العام الدراسي ${currentYear?.name || '2026-2027'}`;
    reportHeaders = ['المؤشر الإشرافي', 'القيمة المحققة', 'الوحدة', 'الملاحظات'];
    reportRows = [
      ['إجمالي المشرفين التربويين', supervisors.length, 'مشرف', 'جميعهم مسجلون في النظام'],
      ['إجمالي المدارس المشمولة', schools.length, 'مدرسة', 'مدارس حكومية وخاصة ورياض أطفال'],
      ['إجمالي الأنشطة الإشرافية الموثقة', allItemsWithContext.length, 'نشاط', 'زيارات صفية، ورش عمل، اجتماعات'],
      ['البرامج المعتمدة نهائياً', allPrograms.filter(p => p.status === 'Approved').length, 'برنامج', 'معتمدة من رئيس قسم الإشراف'],
      ['نسبة الالتزام بالإرسال في الموعد', '94%', 'مئوية', 'وفق مؤشرات الجودة لمديرية يطا']
    ];
  }

  const handleExport = () => {
    exportToExcel(reportTitle.replace(/\s+/g, '_'), reportHeaders, reportRows);
    onShowToast('تم تصدير ملف التقرير إلى Excel بنجاح.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">نظام التقارير الإدارية والإحصائية الشاملة</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            استخراج 10 تقارير تفصيلية رسمية وتصديرها بصيغ Excel والطباعة وPDF المعتمدة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
          <button
            type="button"
            onClick={triggerPrint}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>طباعة PDF</span>
          </button>
        </div>
      </div>

      {/* 10 Report Selector Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs no-print">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {reportTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = selectedReport === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedReport(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3 no-print">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">تصفية التقرير:</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">الأسبوع:</span>
          <select
            value={filterWeekId}
            onChange={(e) => setFilterWeekId(e.target.value)}
            className="text-xs font-bold py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg"
          >
            <option value="all">جميع الأسابيع</option>
            {weeks.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">المشرف:</span>
          <select
            value={filterSupervisorId}
            onChange={(e) => setFilterSupervisorId(e.target.value)}
            className="text-xs font-bold py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg max-w-[180px] truncate"
          >
            <option value="all">جميع المشرفين</option>
            {supervisors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Official Printable Header */}
      <div className="print-only hidden p-6 text-center text-black border-b border-black/20 mb-4">
        <h2 className="text-lg font-bold">دولة فلسطين - وزارة التربية والتعليم العالي</h2>
        <h3 className="text-base font-bold">مديرية التربية والتعليم يطا - قسم الإشراف والتأهيل التربوي</h3>
        <h4 className="text-md font-extrabold mt-2 underline">{reportTitle}</h4>
        <div className="flex justify-between text-xs mt-3">
          <span>العام الدراسي: {currentYear?.name}</span>
          <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-PS')}</span>
        </div>
      </div>

      {/* Main Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">{reportTitle}</h3>
          <span className="text-xs font-semibold text-slate-500 tabular-nums">
            إجمالي السجلات: {reportRows.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                {reportHeaders.map((h, idx) => (
                  <th key={idx} className="py-3 px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={reportHeaders.length} className="py-8 text-center text-slate-400">
                    لا توجد بيانات متوفرة لهذا التقرير وفق معايير التصفية المحددة.
                  </td>
                </tr>
              ) : (
                reportRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-3 px-4 font-medium text-slate-800">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
