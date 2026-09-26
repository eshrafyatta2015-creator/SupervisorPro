import React, { useState, useRef } from 'react';
import {
  Save,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  Database,
  Building,
  Shield,
  FileCode,
  CheckCircle2
} from 'lucide-react';
import { SystemSettings, User } from '../types';
import { storage } from '../services/storage';

interface SettingsViewProps {
  currentUser: User;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRefreshData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onShowToast, onRefreshData }) => {
  const [settings, setSettings] = useState<SystemSettings>(storage.getSystemSettings());
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const academicYears = storage.getAcademicYears();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    storage.saveSystemSettings(settings);

    setTimeout(() => {
      setIsSaving(false);
      onShowToast('تم حفظ إعدادات النظام بنجاح.', 'success');
      if (onRefreshData) onRefreshData();
    }, 400);
  };

  const handleDownloadBackup = () => {
    const backupJson = storage.exportFullBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WeeklySupervisorProgram_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('تم تنزيل النسخة الاحتياطية بنجاح.', 'success');
  };

  const handleDownloadSqlScript = () => {
    // Fetches the generated Database.sql
    const link = document.createElement('a');
    link.href = '/Database.sql';
    link.download = 'Database.sql';
    link.click();
    onShowToast('جارٍ تحميل ملف سكربت SQL Server لقاعدة البيانات.', 'info');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('تحذير: استعادة النسخة الاحتياطية ستستبدل البيانات الحالية بالكامل. هل تريد المتابعة؟')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = storage.importFullBackup(content);
      if (ok) {
        onShowToast('تمت استعادة قاعدة البيانات بنجاح.', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        onShowToast('فشلت عملية الاستعادة: صيغة الملف غير صالحة.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    if (!window.confirm('تحذير نهائي: هل أنت متأكد من إعادة ضبط المصنع؟ سيتم مسح التغييرات وإعادة تهيئة البيانات الافتراضية.')) {
      return;
    }
    storage.resetToFactoryDefaults();
    onShowToast('تمت إعادة ضبط النظام إلى الإعدادات والبيانات الأولية.', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h1 className="text-xl font-black text-slate-900">إعدادات النظام والنسخ الاحتياطي</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          البيانات المؤسسية لمديرية يطا، إعدادات مواعيد الإشعارات، والنسخ الاحتياطي لقاعدة البيانات.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>البيانات المؤسسية والإعدادات العامة</span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المديرية الرسمي</label>
                <input
                  type="text"
                  value={settings.directorateName}
                  onChange={(e) => setSettings({ ...settings, directorateName: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم القسم</label>
                <input
                  type="text"
                  value={settings.departmentName}
                  onChange={(e) => setSettings({ ...settings, departmentName: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان النظام الرسمي</label>
                <input
                  type="text"
                  value={settings.systemTitle}
                  onChange={(e) => setSettings({ ...settings, systemTitle: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">السنة الدراسية الحالية</label>
                <select
                  value={settings.currentAcademicYearId}
                  onChange={(e) => setSettings({ ...settings, currentAcademicYearId: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عدد أيام عمل الأسبوع</label>
                <select
                  value={settings.weekDaysCount}
                  onChange={(e) => setSettings({ ...settings, weekDaysCount: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value={5}>5 أيام (من الأحد إلى الخميس)</option>
                  <option value={6}>6 أيام (من السبت إلى الخميس)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  موعد إرسال التنبيه التلقائي قبل الإغلاق (بالساعات)
                </label>
                <input
                  type="number"
                  value={settings.alertThresholdHours}
                  onChange={(e) => setSettings({ ...settings, alertThresholdHours: Number(e.target.value) })}
                  min={1}
                  max={72}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مدة انتهاء جلسة المستخدم (بالدقائق)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })}
                  min={15}
                  max={480}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني للإشعارات والدعم</label>
                <input
                  type="email"
                  value={settings.notificationEmail || ''}
                  onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
                  placeholder="eshrafyatta2015@gmail.com"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Backup & Restore Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>النسخ الاحتياطي والاستعادة</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              يمكنك تصدير نسخة احتياطية كاملة لبيانات المشرفين والمدارس والبرامج الأسبوعية واستعادتها في أي وقت.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل نسخة احتياطية (JSON)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSqlScript}
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <FileCode className="w-4 h-4 text-emerald-700" />
                <span>تنزيل سكربت SQL Server (Database.sql)</span>
              </button>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                  id="backup-file-input"
                />
                <label
                  htmlFor="backup-file-input"
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>استعادة نسخة احتياطية</span>
                </label>
              </div>
            </div>
          </div>

          {/* Reset To Seed Data */}
          <div className="bg-rose-50/60 rounded-2xl border border-rose-200 p-5 shadow-xs">
            <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>إعادة ضبط المصنع</span>
            </h4>
            <p className="text-[11px] text-rose-700 leading-relaxed mb-3">
              إعادة تهيئة النظام وحذف التعديلات واسترجاع بيانات المشرفين العشرة والمدارس والأنشطة الافتراضية.
            </p>
            <button
              type="button"
              onClick={handleFactoryReset}
              className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة تهيئة النظام الافتراضية</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
