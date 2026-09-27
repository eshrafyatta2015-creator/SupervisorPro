export type UserRole = 'Administrator' | 'Supervisor';

export type Permission =
  | 'ViewDashboard'
  | 'ManageUsers'
  | 'ManageSupervisors'
  | 'ManageSchools'
  | 'ManageActivities'
  | 'ManageAcademicYears'
  | 'ManageWeeks'
  | 'ViewPrograms'
  | 'ReviewPrograms'
  | 'ApprovePrograms'
  | 'ExportReports'
  | 'ManageSettings'
  | 'ViewAuditLogs'
  | 'BackupDatabase';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  supervisorId?: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  failedLoginAttempts: number;
  lockoutEnd?: string; // ISO date
  lastLoginAt?: string;
  createdAt: string;
  permissions?: Permission[];
}

export interface Supervisor {
  id: string;
  name: string;
  nationalId: string;
  specialization: string;
  department: string;
  phone: string;
  email: string;
  userId: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface AcademicYear {
  id: string;
  name: string; // e.g., '2026-2027'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isCurrent: boolean;
  status: 'Active' | 'Archived';
  createdAt: string;
}

export type PlanType = 'Planning' | 'Actual';

export type WeekStatus = 'NotStarted' | 'Open' | 'Closed';

export interface Week {
  id: string;
  academicYearId: string;
  weekNumber: number;
  name: string; // e.g. 'الأسبوع الأول'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  openSubmissionAt?: string; // ISO timestamp
  closeSubmissionAt?: string; // ISO timestamp
  allowEditAfterSubmit?: boolean;
  status: WeekStatus;
  planningOpen: boolean; // مفتوح للإرسال للتخطيط
  actualOpen: boolean; // مفتوح للإرسال للبرنامج الفعلي
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface School {
  id: string;
  name: string;
  schoolCode?: string;
  region: string;
  stage?: 'أساسي' | 'ثانوي' | 'مختلط';
  type?: 'ذكور' | 'إناث' | 'مختلط';
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  color?: string;
  createdAt: string;
}

export type ProgramStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'NeedsRevision' | 'Closed';

export interface ProgramItem {
  id: string;
  weeklyProgramId: string;
  schoolId: string;
  activityId: string;
  dayDate?: string; // YYYY-MM-DD (optional)
  dayName?: string; // 'الأحد', 'الإثنين', etc. (optional)
  startTime?: string; // optional
  endTime?: string; // optional
  location?: string;
  objective?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface WeeklyProgram {
  id: string;
  supervisorId: string;
  academicYearId: string;
  weekId: string;
  planType: PlanType; // 'Planning' | 'Actual'
  status: ProgramStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string; // Reviewer user id or name
  reviewNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProgramReview {
  id: string;
  weeklyProgramId: string;
  reviewerUserId: string;
  reviewerName: string;
  action: 'Approve' | 'RequestRevision' | 'Reopen';
  notes: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface SystemSettings {
  id: string;
  directorateName: string;
  departmentName: string;
  systemTitle: string;
  logoUrl?: string;
  currentAcademicYearId: string;
  weekDaysCount: number; // usually 5 (Sun-Thu) or 6 (Sat-Thu)
  alertThresholdHours: number; // hours before closing to send alert
  sessionTimeoutMinutes: number;
  notificationEmail?: string;
  autoBackupEnabled: boolean;
  forceChangePasswordOnFirstLogin?: boolean;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  userFullName: string;
  action: string;
  entity: string;
  entityId?: string;
  dateTime: string;
  ip: string;
  details: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}
