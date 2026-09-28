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

  // Required Days for this week (e.g. ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'])
  requiredDays?: string[];

  // Planning phase settings
  planningOpen: boolean; // مفتوح للإرسال للتخطيط
  planningOpenAt?: string; // ISO timestamp
  planningCloseAt?: string; // ISO timestamp
  defaultMaxPlanningSubmissions?: number; // e.g. 1

  // Actual phase settings
  actualOpen: boolean; // مفتوح للإرسال للبرنامج الفعلي
  actualOpenAt?: string; // ISO timestamp
  actualCloseAt?: string; // ISO timestamp
  defaultMaxActualSubmissions?: number; // e.g. 1

  // Per-supervisor overrides: supervisorId -> { maxPlanning?: number; maxActual?: number }
  supervisorOverrides?: Record<string, { maxPlanning?: number; maxActual?: number }>;

  openSubmissionAt?: string; // Legacy fallback
  closeSubmissionAt?: string; // Legacy fallback
  allowEditAfterSubmit?: boolean;
  allowRevisionRequests?: boolean;
  status: WeekStatus;
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

export type ProgramStatus =
  | 'Draft'               // مسودة
  | 'Submitted'           // تم الإرسال
  | 'UnderReview'         // قيد المراجعة
  | 'NeedsRevision'       // مطلوب تعديل
  | 'EditingAllowed'      // مسموح بالتعديل
  | 'RevisionRequested'   // بانتظار موافقة المسؤول على طلب التعديل
  | 'Approved'            // معتمد
  | 'Closed';             // مغلق

export interface ProgramItem {
  id: string;
  weeklyProgramId: string;
  schoolId: string;
  activityId: string;
  dayOfWeek?: string; // 'الأحد', 'الاثنين', etc.
  dayDate?: string; // YYYY-MM-DD
  dayName?: string; // Fallback alias
  
  // Planned tracking for Actual Program
  plannedSchoolId?: string;
  plannedActivityId?: string;
  
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

  // Submissions tracking
  submissionCount?: number;
  maxSubmissions?: number;
  submittedAt?: string;
  lastModifiedAt?: string;

  // Revision request workflow
  revisionRequested?: boolean;
  revisionReason?: string;
  revisionRequestedAt?: string;
  editingAllowed?: boolean;

  // Review
  reviewedAt?: string;
  reviewedBy?: string; // Reviewer user id or name
  reviewNotes?: string;

  // Day specific notes: dayOfWeek or date -> note string
  dayNotes?: Record<string, string>;

  createdAt: string;
  updatedAt?: string;
}

export interface ProgramSubmissionHistory {
  id: string;
  programId: string;
  programType: PlanType;
  supervisorId: string;
  weekId: string;
  submissionNumber: number;
  submittedAt: string;
  submittedBy: string;
  status: ProgramStatus;
  notes?: string;
  itemCount: number;
}

export interface ProgramRevisionRequest {
  id: string;
  programId: string;
  programType: PlanType;
  supervisorId: string;
  supervisorName: string;
  weekId: string;
  weekName: string;
  requestReason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  respondedAt?: string;
  respondedBy?: string;
  responseNotes?: string;
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
