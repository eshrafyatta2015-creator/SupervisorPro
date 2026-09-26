import React from 'react';

// Pure SVG high-performance charts compliant with strict layout & no heavy external bundle crashes

interface SubmissionGaugeProps {
  rate: number; // 0 to 100
  submittedCount: number;
  totalSupervisors: number;
}

export const SubmissionGauge: React.FC<SubmissionGaugeProps> = ({ rate, submittedCount, totalSupervisors }) => {
  const radius = 64;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-slate-100"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-emerald-600 transition-all duration-1000 ease-out"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold text-slate-800 tabular-nums">{rate}%</span>
          <span className="text-xs text-slate-400 font-medium">نسبة الإرسال</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs font-semibold text-slate-600">
        <div>
          مرسل: <span className="font-bold text-emerald-700 tabular-nums">{submittedCount}</span>
        </div>
        <div className="text-slate-300">|</div>
        <div>
          المتبقي: <span className="font-bold text-rose-600 tabular-nums">{totalSupervisors - submittedCount}</span>
        </div>
      </div>
    </div>
  );
};

interface BarChartItem {
  label: string;
  count: number;
  colorClass: string;
  bgClass?: string;
}

export const StatusDistributionBar: React.FC<{ items: BarChartItem[]; total: number }> = ({ items, total }) => {
  return (
    <div className="space-y-3 p-2">
      {items.map(item => {
        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{item.label}</span>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="font-bold text-slate-900">{item.count}</span>
                <span className="text-slate-400 text-[11px]">({percentage}%)</span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${item.colorClass}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ActivityRankChart: React.FC<{ activities: { name: string; count: number }[] }> = ({ activities }) => {
  const max = Math.max(...activities.map(a => a.count), 1);

  return (
    <div className="space-y-2.5 p-2">
      {activities.slice(0, 5).map((act, idx) => {
        const widthPct = Math.round((act.count / max) * 100);
        return (
          <div key={act.name} className="flex items-center gap-3 text-xs">
            <span className="w-5 text-slate-400 font-bold tabular-nums text-center">{idx + 1}</span>
            <span className="w-32 truncate font-medium text-slate-700">{act.name}</span>
            <div className="flex-1 h-3 bg-slate-100 rounded-md overflow-hidden flex items-center">
              <div
                className="h-full bg-emerald-500 rounded-md transition-all duration-500"
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className="w-8 text-left font-bold text-slate-800 tabular-nums">{act.count}</span>
          </div>
        );
      })}
    </div>
  );
};
