import React, { useState } from 'react';
import { Search, FileText, FileSpreadsheet, ShieldAlert, Clock, User, Globe } from 'lucide-react';
import { storage } from '../services/storage';
import { formatDate, formatTime } from '../utils/date';
import { exportToExcel } from '../utils/export';

export const AuditLogsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const logs = storage.getAuditLogs();

  const filteredLogs = logs.filter(log => {
    if (filterAction !== 'all' && !log.action.includes(filterAction)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.username.toLowerCase().includes(q) ||
        log.userFullName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportExcel = () => {
    const headers = ['التاريخ والوقت', 'اسم المستخدم', 'الاسم الكامل', 'الإجراء', 'الكيان', 'عنوان IP', 'التفاصيل'];
    const rows = filteredLogs.map(l => [
      `${formatDate(l.dateTime)} ${formatTime(l.dateTime)}`,
      l.username,
      l.userFullName,
      l.action,
      l.entity,
      l.ip,
      l.details
    ]);
    exportToExcel('سجل_العمليات_والتدقيق_يطا', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>سجل الرقابة والتدقيق الأمني والإداري (Audit Trail)</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1">سجل العمليات والأنشطة</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            توثيق جميع حركات تسجيل الدخول والإرسال والاعتماد والتعديلات مع الطوابع الزمنية وعناوين IP.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          <span>تصدير السجل إلى Excel</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في تفاصيل العملية، اسم المستخدم..."
            className="w-full text-xs py-2 pl-3 pr-9 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">نوع الإجراء:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs font-bold py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl"
          >
            <option value="all">جميع الإجراءات</option>
            <option value="دخول">تسجيل الدخول</option>
            <option value="إرسال">إرسال برنامج</option>
            <option value="اعتماد">اعتماد برنامج</option>
            <option value="تعديل">طلب تعديل</option>
            <option value="فتح">فتح أسبوع</option>
            <option value="إغلاق">إغلاق أسبوع</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-4 w-36">التاريخ والوقت</th>
                <th className="py-3 px-4 w-44">المستخدم</th>
                <th className="py-3 px-4 w-36">الإجراء</th>
                <th className="py-3 px-4 w-28">الكيان</th>
                <th className="py-3 px-4 w-28">IP</th>
                <th className="py-3 px-4">تفاصيل الحركة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    لا توجد سجلات مطابقة للبحث.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 tabular-nums text-slate-600 whitespace-nowrap">
                      <div>{formatDate(log.dateTime)}</div>
                      <div className="text-[10px] text-slate-400">{formatTime(log.dateTime)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.userFullName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{log.username}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{log.entity}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 tabular-nums">{log.ip}</td>
                    <td className="py-3 px-4 text-slate-700 leading-relaxed max-w-md">{log.details}</td>
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
