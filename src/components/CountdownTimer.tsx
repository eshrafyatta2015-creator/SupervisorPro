import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { getTimeRemaining, TimeRemaining } from '../utils/date';

interface CountdownTimerProps {
  targetDate: string;
  label?: string;
  onExpire?: () => void;
  variant?: 'banner' | 'compact' | 'pill';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  label = 'الوقت المتبقي لإغلاق الإرسال:',
  onExpire,
  variant = 'compact'
}) => {
  const [remaining, setRemaining] = useState<TimeRemaining>(getTimeRemaining(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      const res = getTimeRemaining(targetDate);
      setRemaining(res);
      if (res.isExpired) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  const isUrgent = remaining.days === 0 && remaining.hours < 24 && !remaining.isExpired;

  if (remaining.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
        <span>انتهت فترة إرسال البرامج لهذا الأسبوع</span>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isUrgent ? 'bg-amber-50/90 border-amber-300 text-amber-950' : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 shrink-0 ${isUrgent ? 'text-amber-600 animate-pulse' : 'text-emerald-700'}`} />
          <div>
            <div className="text-sm font-bold">{label}</div>
            <div className="text-xs opacity-80 mt-0.5">يرجى إنهاء وإرسال البرنامج الأسبوعي قبل انقضاء المهلة المحددة</div>
          </div>
        </div>
        <div className="flex items-center gap-2 tabular-nums">
          <div className="flex flex-col items-center bg-white px-3 py-1.5 rounded-lg shadow-xs border border-black/5">
            <span className="text-base font-extrabold text-slate-800">{remaining.days}</span>
            <span className="text-[10px] text-slate-500">أيام</span>
          </div>
          <span className="font-bold text-slate-400">:</span>
          <div className="flex flex-col items-center bg-white px-3 py-1.5 rounded-lg shadow-xs border border-black/5">
            <span className="text-base font-extrabold text-slate-800">{String(remaining.hours).padStart(2, '0')}</span>
            <span className="text-[10px] text-slate-500">ساعة</span>
          </div>
          <span className="font-bold text-slate-400">:</span>
          <div className="flex flex-col items-center bg-white px-3 py-1.5 rounded-lg shadow-xs border border-black/5">
            <span className="text-base font-extrabold text-slate-800">{String(remaining.minutes).padStart(2, '0')}</span>
            <span className="text-[10px] text-slate-500">دقيقة</span>
          </div>
          <span className="font-bold text-slate-400">:</span>
          <div className="flex flex-col items-center bg-white px-3 py-1.5 rounded-lg shadow-xs border border-black/5">
            <span className="text-base font-extrabold text-emerald-700">{String(remaining.seconds).padStart(2, '0')}</span>
            <span className="text-[10px] text-slate-500">ثانية</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold tabular-nums border ${
      isUrgent
        ? 'bg-amber-100/90 text-amber-900 border-amber-300 animate-pulse'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
    }`}>
      <Clock className="w-3.5 h-3.5" />
      <span>{remaining.formatted}</span>
    </div>
  );
};
