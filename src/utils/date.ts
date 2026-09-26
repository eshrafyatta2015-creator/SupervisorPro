/**
 * Date and Time utilities for Palestine (Asia/Hebron)
 */

export const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

/**
 * Returns formatted date in dd/MM/yyyy
 */
export function formatDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Returns formatted time in HH:mm
 */
export function formatTime(timeInput: string | Date | undefined | null): string {
  if (!timeInput) return '-';
  if (typeof timeInput === 'string' && timeInput.includes(':') && timeInput.length <= 5) {
    return timeInput;
  }
  const d = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;
  if (isNaN(d.getTime())) return '-';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Returns formatted date and time: dd/MM/yyyy HH:mm
 */
export function formatDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  return `${formatDate(d)} ${formatTime(d)}`;
}

/**
 * Get Arabic Day Name for a YYYY-MM-DD date string
 */
export function getArabicDayName(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return ARABIC_DAYS[d.getDay()];
}

/**
 * Calculate difference in time for countdown
 */
export interface TimeRemaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
}

export function getTimeRemaining(targetDate: string | Date): TimeRemaining {
  const target = typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime();
  const now = new Date().getTime();
  const totalMs = target - now;

  if (totalMs <= 0) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formatted: 'انتهت الفترة'
    };
  }

  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / 1000 / 60) % 60);
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

  let formatted = '';
  if (days > 0) {
    formatted = `${days} يوم و ${hours} ساعة`;
  } else if (hours > 0) {
    formatted = `${hours} ساعة و ${minutes} دقيقة`;
  } else {
    formatted = `${minutes} دقيقة و ${seconds} ثانية`;
  }

  return {
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    formatted
  };
}

/**
 * Checks if a date falls strictly within [startDate, endDate] (inclusive)
 */
export function isDateWithinRange(dateStr: string, startStr: string, endStr: string): boolean {
  const d = new Date(dateStr).getTime();
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  return d >= start && d <= end;
}

/**
 * Generate dates array for a week (Sunday to Thursday or Saturday to Thursday)
 */
export function getWeekDates(startDateStr: string, daysCount: number = 5): { date: string; dayName: string }[] {
  const result: { date: string; dayName: string }[] = [];
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return result;

  for (let i = 0; i < daysCount; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    const dateFormatted = `${yyyy}-${mm}-${dd}`;
    result.push({
      date: dateFormatted,
      dayName: ARABIC_DAYS[cur.getDay()]
    });
  }
  return result;
}
