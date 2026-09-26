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

export type WeekStatus = 'NotStarted' | 'Open' | 'Closed';

export interface Week {
  id: string;
  academicYearId: string;
  weekNumber: number;
  name: string; // e.g. 'الأسبوع الأول'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  openSubmissionAt: string; // ISO timestamp
  closeSubmissionAt: string; // ISO timestamp
  allowEditAfterSubmit: boolean;
  status: WeekStatus;
  notes?: string;
  createdAt: string;
}

export interface School {
  id: string;
  name: string;
  region: string;
  stage: 'أساسي' | 'ثانوي' | 'مختلط';
  type: 'ذكور' | 'إناث' | 'مختلط';
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  color?: string;
  createdAt: string;
}

export type ProgramStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'NeedsRevision';

export interface ProgramItem {
  id: string;
  weeklyProgramId: string;
  dayDate: string; // YYYY-MM-DD
  dayName: string; // 'الأحد', 'الإثنين', etc.
  schoolId: string;
  activityId: string;
  startTime: string; // '08:00'
  endTime: string; // '10:00'
  location: string;
  objective: string;
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
