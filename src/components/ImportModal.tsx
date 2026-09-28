import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
  Info
} from 'lucide-react';
import { Modal } from './Modal';
import { storage } from '../services/storage';

export type ImportType = 'supervisors' | 'schools' | 'activities';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ImportType;
  onSuccess: (count: number) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  type,
  onSuccess,
  onShowToast
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const getMeta = () => {
    switch (type) {
      case 'supervisors':
        return {
          title: 'استيراد المشرفين التربويين',
          entityName: 'مشرف تربوي',
          iconColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          filename: 'نموذج_استيراد_المشرفين',
          templateHeaders: [
            'الاسم الكامل',
            'رقم الهوية',
            'التخصص',
            'القسم',
            'رقم الجوال',
            'البريد الإلكتروني',
            'اسم المستخدم للدخول',
            'كلمة المرور'
          ],
          sampleData: [
            {
              'الاسم الكامل': 'أحمد خليل النجار',
              'رقم الهوية': '901234567',
              'التخصص': 'اللغة العربية',
              'القسم': 'الإشراف والتأهيل التربوي',
              'رقم الجوال': '0599123456',
              'البريد الإلكتروني': 'ahmad@example.com',
              'اسم المستخدم للدخول': 'ahmad.najjar',
              'كلمة المرور': '123456'
            },
            {
              'الاسم الكامل': 'مريم عبد الله حسن',
              'رقم الهوية': '902345678',
              'التخصص': 'الرياضيات',
              'القسم': 'الإشراف والتأهيل التربوي',
              'رقم الجوال': '0599654321',
              'البريد الإلكتروني': 'mariam@example.com',
              'اسم المستخدم للدخول': 'mariam.math',
              'كلمة المرور': '123456'
            }
          ]
        };
      case 'schools':
        return {
          title: 'استيراد المدارس والمؤسسات التعليمية',
          entityName: 'مدرسة',
          iconColor: 'text-blue-700 bg-blue-50 border-blue-200',
          filename: 'نموذج_استيراد_المدارس',
          templateHeaders: ['اسم المدرسة', 'المنطقة', 'المرحلة', 'الجنس', 'ملاحظات'],
          sampleData: [
            {
              'اسم المدرسة': 'مدرسة ذكور يطا الثانوية',
              'المنطقة': 'يطا',
              'المرحلة': 'ثانوي',
              'الجنس': 'ذكور',
              'ملاحظات': 'مدرسة مركزية'
            },
            {
              'اسم المدرسة': 'مدرسة بنات يطا الأساسية الأولى',
              'المنطقة': 'يطا',
              'المرحلة': 'أساسي',
              'الجنس': 'إناث',
              'ملاحظات': ''
            },
            {
              'اسم المدرسة': 'مدرسة الكرمل الأساسية المختلطة',
              'المنطقة': 'الكرمل',
              'المرحلة': 'أساسي',
              'الجنس': 'مختلط',
              'ملاحظات': ''
            }
          ]
        };
      case 'activities':
        return {
          title: 'استيراد الفعاليات والأنشطة الإشرافية',
          entityName: 'نشاط / فعالية',
          iconColor: 'text-purple-700 bg-purple-50 border-purple-200',
          filename: 'نموذج_استيراد_الأنشطة_والفعاليات',
          templateHeaders: ['اسم النشاط أو الفعالية', 'رمز النشاط', 'الوصف', 'اللون'],
          sampleData: [
            {
              'اسم النشاط أو الفعالية': 'زيارة إشرافية استطلاعية',
              'رمز النشاط': 'VISIT_EXP',
              'الوصف': 'زيارة ميدانية لمتابعة المعلمين والبيئة المدرسية',
              'اللون': 'emerald'
            },
            {
              'اسم النشاط أو الفعالية': 'ورشة تدريبية تخصصية',
              'رمز النشاط': 'WRK_SPEC',
              'الوصف': 'ورشة تدريبية لتطوير المهارات التخصصية',
              'اللون': 'blue'
            },
            {
              'اسم النشاط أو الفعالية': 'متابعة وتقويم أداء',
              'رمز النشاط': 'EVAL_PERF',
              'الوصف': 'تقويم تحصيل الطلبة وأداء الهيئة التدريسية',
              'اللون': 'purple'
            }
          ]
        };
    }
  };

  const meta = getMeta();

  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(meta.sampleData, { header: meta.templateHeaders });

      // Auto col width
      ws['!cols'] = meta.templateHeaders.map(h => ({ wch: Math.max(h.length * 2, 20) }));

      XLSX.utils.book_append_sheet(wb, ws, 'النموذج');
      XLSX.writeFile(wb, `${meta.filename}.xlsx`);
      onShowToast('تم تحميل النموذج الاسترشادي بنجاح.', 'info');
    } catch (err: any) {
      onShowToast('تعذر تحميل النموذج، يرجى المحاولة لاحقاً.', 'error');
    }
  };

  const parseFile = async (selectedFile: File) => {
    setErrorMsg('');
    setFile(selectedFile);
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setErrorMsg('الملف فارغ أو لا يحتوي على أي أوراق عمل.');
        setParsedRows([]);
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        setErrorMsg('لم يتم العثور على أي صفوف بيانات في الملف.');
        setParsedRows([]);
        return;
      }

      // Map rows based on type
      const normalized = rawRows.map((row) => {
        const keys = Object.keys(row);
        const findVal = (terms: string[]) => {
          for (const key of keys) {
            const cleanKey = key.trim().toLowerCase();
            if (terms.some(t => cleanKey.includes(t.toLowerCase()))) {
              return row[key];
            }
          }
          return '';
        };

        if (type === 'supervisors') {
          return {
            name: findVal(['الاسم', 'اسم المشرف', 'name', 'fullname']) || '',
            nationalId: findVal(['هوية', 'الهوية', 'رقم الهوية', 'national', 'id']) || '',
            specialization: findVal(['تخصص', 'التخصص', 'specialization']) || '',
            department: findVal(['قسم', 'القسم', 'department']) || 'الإشراف والتأهيل التربوي',
            phone: findVal(['جوال', 'هاتف', 'تلفون', 'phone', 'mobile']) || '',
            email: findVal(['بريد', 'ايميل', 'email']) || '',
            username: findVal(['مستخدم', 'اسم المستخدم', 'username']) || '',
            password: findVal(['مرور', 'كلمة المرور', 'password']) || '123456'
          };
        } else if (type === 'schools') {
          return {
            name: findVal(['اسم المدرسة', 'المدرسة', 'اسم', 'school', 'name']) || '',
            region: findVal(['منطقة', 'المنطقة', 'الموقع', 'region', 'area']) || 'يطا',
            stage: findVal(['مرحلة', 'المرحلة', 'stage']) || 'أساسي',
            type: findVal(['جنس', 'نوع', 'الجنس', 'gender', 'type']) || 'ذكور',
            notes: findVal(['ملاحظات', 'ملاحظة', 'notes']) || ''
          };
        } else {
          return {
            name: findVal(['اسم النشاط', 'النشاط', 'الفعالية', 'اسم', 'activity', 'name']) || '',
            code: findVal(['رمز', 'كود', 'code']) || '',
            description: findVal(['وصف', 'الوصف', 'تفاصيل', 'desc', 'description']) || '',
            color: findVal(['لون', 'اللون', 'color']) || 'emerald'
          };
        }
      });

      // Filter out rows where name is empty
      const validRows = normalized.filter(r => r.name && String(r.name).trim() !== '');

      if (validRows.length === 0) {
        setErrorMsg('لم يتم التعرف على عمود الاسم أو أن جميع الصفوف فارغة.');
        setParsedRows([]);
        return;
      }

      setParsedRows(validRows);
    } catch (err: any) {
      setErrorMsg('حدث خطأ أثناء قراءة الملف، تأكد من صحة التنسيق (.xlsx, .xls, .csv).');
      setParsedRows([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    try {
      if (type === 'supervisors') {
        const res = await storage.importSupervisorsBatch(parsedRows, mode);
        onSuccess(res.importedCount);
        onShowToast(`تم استيراد وتجهيز ${res.importedCount} مشرف بنجاح مع حسابات الدخول.`, 'success');
      } else if (type === 'schools') {
        const res = storage.importSchoolsBatch(parsedRows, mode);
        onSuccess(res.importedCount);
        onShowToast(`تم استيراد ${res.importedCount} مدرسة بنجاح.`, 'success');
      } else {
        const res = storage.importActivitiesBatch(parsedRows, mode);
        onSuccess(res.importedCount);
        onShowToast(`تم استيراد ${res.importedCount} نشاط/فعالية بنجاح.`, 'success');
      }
      handleClose();
    } catch (err: any) {
      onShowToast('حدث خطأ أثناء حفظ السجلات المستوردة: ' + (err.message || ''), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setErrorMsg('');
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={meta.title}
      maxWidth="xl"
    >
      <div className="space-y-5 text-right font-sans" dir="rtl">
        {/* Banner with Template Download */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border ${meta.iconColor} shrink-0`}>
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                استيراد جماعي ذكي من ملفات Excel و CSV
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                يمكنك تحميل النموذج الاسترشادي المعتمد وتعبئته، أو رفع ملف إكسل خاص بك وسيتعرف النظام تلقائياً على الأعمدة.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/80 rounded-xl transition-colors border border-emerald-300 shrink-0 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            تحميل نموذج Excel جاهز
          </button>
        </div>

        {/* Drag & Drop File Zone */}
        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/60 scale-[0.99]'
                : 'border-slate-300 hover:border-emerald-500 bg-slate-50/40 hover:bg-emerald-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Upload className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="font-bold text-slate-800 text-sm mb-1">
              اسحب وأفلت ملف Excel أو CSV هنا، أو اضغط للاختيار
            </p>
            <p className="text-xs text-slate-400">
              يدعم تنسيقات Microsoft Excel (.xlsx, .xls) والملفات المفصولة بفاصلة (.csv)
            </p>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-950 font-mono" dir="ltr">
                  {file.name}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  الحجم: {(file.size / 1024).toFixed(1)} KB — تم العثور على {parsedRows.length} سجل صالح
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setParsedRows([]);
                setErrorMsg('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="إزالة الملف واختيار آخر"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Preview and Import Mode Options */}
        {parsedRows.length > 0 && (
          <div className="space-y-4">
            {/* Mode selection */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-700">طريقة الاستيراد:</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={mode === 'append'}
                    onChange={() => setMode('append')}
                    className="accent-emerald-600"
                  />
                  <span className="text-slate-700 font-medium">
                    إضافة وتحديث السجلات (Append / Update)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                    className="accent-rose-600"
                  />
                  <span className="text-rose-700 font-bold">
                    استبدال السجلات بالكامل (Replace)
                  </span>
                </label>
              </div>
            </div>

            {/* Preview table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="p-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  معاينة البيانات المراد استيرادها ({parsedRows.length} {meta.entityName})
                </span>
                <span className="text-[11px] text-slate-400">
                  عرض أول {Math.min(5, parsedRows.length)} سجلات
                </span>
              </div>
              <div className="max-h-56 overflow-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">الاسم</th>
                      {type === 'supervisors' && (
                        <>
                          <th className="py-2 px-3">الهوية</th>
                          <th className="py-2 px-3">التخصص</th>
                          <th className="py-2 px-3">اسم الدخول</th>
                        </>
                      )}
                      {type === 'schools' && (
                        <>
                          <th className="py-2 px-3">المنطقة</th>
                          <th className="py-2 px-3">المرحلة</th>
                          <th className="py-2 px-3">الجنس</th>
                        </>
                      )}
                      {type === 'activities' && (
                        <>
                          <th className="py-2 px-3">الرمز</th>
                          <th className="py-2 px-3">الوصف</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{row.name}</td>
                        {type === 'supervisors' && (
                          <>
                            <td className="py-2 px-3 font-mono text-[11px]">{row.nationalId || '-'}</td>
                            <td className="py-2 px-3">{row.specialization || 'عام'}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-emerald-700">
                              {row.username || 'تلقائي'}
                            </td>
                          </>
                        )}
                        {type === 'schools' && (
                          <>
                            <td className="py-2 px-3">{row.region}</td>
                            <td className="py-2 px-3">{row.stage}</td>
                            <td className="py-2 px-3">{row.type}</td>
                          </>
                        )}
                        {type === 'activities' && (
                          <>
                            <td className="py-2 px-3 font-mono text-[11px] text-purple-700">{row.code}</td>
                            <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{row.description || '-'}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {type === 'supervisors' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="leading-relaxed">
                  سيتم إنشاء حساب مستخدم لكل مشرف مع كلمة المرور الافتراضية <code className="font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300">123456</code> (أو المحددة في الملف)، وسيطلب النظام من المشرف تغييرها عند تسجيل الدخول الأول لأمان الحساب.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={parsedRows.length === 0 || isProcessing}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-xs cursor-pointer ${
              parsedRows.length === 0 || isProcessing
                ? 'bg-slate-300 cursor-not-allowed opacity-60'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-600/20'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                جاري الاستيراد والمعالجة...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                تأكيد استيراد ({parsedRows.length}) سجل
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
