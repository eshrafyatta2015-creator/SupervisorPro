import {
  User,
  Supervisor,
  AcademicYear,
  Week,
  School,
  Activity,
  WeeklyProgram,
  ProgramItem,
  ProgramReview,
  Notification,
  SystemSettings,
  AuditLog,
  Permission,
  ProgramStatus,
  PlanType
} from '../types';
import { hashPassword } from '../utils/crypto';

const STORAGE_KEYS = {
  USERS: 'wsp_users',
  SUPERVISORS: 'wsp_supervisors',
  ACADEMIC_YEARS: 'wsp_academic_years',
  WEEKS: 'wsp_weeks',
  SCHOOLS: 'wsp_schools',
  ACTIVITIES: 'wsp_activities',
  WEEKLY_PROGRAMS: 'wsp_weekly_programs',
  PROGRAM_ITEMS: 'wsp_program_items',
  PROGRAM_REVIEWS: 'wsp_program_reviews',
  NOTIFICATIONS: 'wsp_notifications',
  SYSTEM_SETTINGS: 'wsp_system_settings',
  AUDIT_LOGS: 'wsp_audit_logs',
  SESSION: 'wsp_session',
  PASSWORD_HASHES: 'wsp_password_hashes'
};

const ALL_PERMISSIONS: Permission[] = [
  'ViewDashboard',
  'ManageUsers',
  'ManageSupervisors',
  'ManageSchools',
  'ManageActivities',
  'ManageAcademicYears',
  'ManageWeeks',
  'ViewPrograms',
  'ReviewPrograms',
  'ApprovePrograms',
  'ExportReports',
  'ManageSettings',
  'ViewAuditLogs',
  'BackupDatabase'
];

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to save to localStorage for key: ${key}`, e);
    }
  }

  // --- Initialization & Seeding ---
  public async initializeDatabase(): Promise<void> {
    const initializedVersion = localStorage.getItem('wsp_version_empty_sups_v1');
    if (initializedVersion === '1') return;

    console.log('Seeding clean database for WeeklySupervisorProgram (empty supervisors)...');

    // Clean any prior supervisor data from local storage
    this.set(STORAGE_KEYS.SUPERVISORS, []);
    this.set(STORAGE_KEYS.WEEKLY_PROGRAMS, []);
    this.set(STORAGE_KEYS.PROGRAM_ITEMS, []);
    this.set(STORAGE_KEYS.PROGRAM_REVIEWS, []);
    this.set(STORAGE_KEYS.NOTIFICATIONS, []);

    // 1. Password Hashes store
    const passwordHashes: Record<string, string> = {};
    const defaultAdminPassword = 'admin123';
    const adminHash = await hashPassword(defaultAdminPassword);

    passwordHashes['admin'] = adminHash;

    // 2. System Settings
    const defaultSettings: SystemSettings = {
      id: 'settings_1',
      directorateName: 'مديرية التربية والتعليم يطا',
      departmentName: 'قسم الإشراف والتأهيل التربوي',
      systemTitle: 'نظام إدارة البرامج الأسبوعية للمشرفين',
      logoUrl: './logo.jpg',
      currentAcademicYearId: 'year_2026_2027',
      weekDaysCount: 5,
      alertThresholdHours: 24,
      sessionTimeoutMinutes: 60,
      notificationEmail: 'eshrafyatta2015@gmail.com',
      autoBackupEnabled: true,
      forceChangePasswordOnFirstLogin: true,
      updatedAt: new Date().toISOString()
    };
    this.set(STORAGE_KEYS.SYSTEM_SETTINGS, defaultSettings);

    // 3. Academic Years
    const academicYears: AcademicYear[] = [
      {
        id: 'year_2026_2027',
        name: '2026-2027',
        startDate: '2026-09-01',
        endDate: '2027-06-15',
        isCurrent: true,
        status: 'Active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'year_2025_2026',
        name: '2025-2026',
        startDate: '2025-09-01',
        endDate: '2026-06-15',
        isCurrent: false,
        status: 'Archived',
        createdAt: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()
      }
    ];
    this.set(STORAGE_KEYS.ACADEMIC_YEARS, academicYears);

    // 4. Weeks (Current week open with countdown in ~3 days)
    const now = new Date();
    const openDate = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const closeDate = new Date(now.getTime() + 3 * 24 * 3600 * 1000).toISOString();

    const weeks: Week[] = [
      {
        id: 'week_1',
        academicYearId: 'year_2026_2027',
        weekNumber: 1,
        name: 'الأسبوع الأول',
        startDate: '2026-09-27',
        endDate: '2026-10-01',
        openSubmissionAt: openDate,
        closeSubmissionAt: closeDate,
        allowEditAfterSubmit: false,
        status: 'Open',
        planningOpen: true,
        actualOpen: false,
        isActive: true,
        notes: 'الأسبوع التدريبي والإشرافي الأول للفصل الدراسي الأول',
        createdAt: new Date().toISOString()
      },
      {
        id: 'week_2',
        academicYearId: 'year_2026_2027',
        weekNumber: 2,
        name: 'الأسبوع الثاني',
        startDate: '2026-10-04',
        endDate: '2026-10-08',
        openSubmissionAt: new Date(now.getTime() + 5 * 24 * 3600 * 1000).toISOString(),
        closeSubmissionAt: new Date(now.getTime() + 10 * 24 * 3600 * 1000).toISOString(),
        allowEditAfterSubmit: false,
        status: 'NotStarted',
        planningOpen: false,
        actualOpen: false,
        isActive: false,
        notes: 'متابعة الخطط الإشرافية الميدانية في مدارس يطا',
        createdAt: new Date().toISOString()
      }
    ];
    this.set(STORAGE_KEYS.WEEKS, weeks);

    // 5. Activities (Standard Palestinian Ministry activities)
    const activities: Activity[] = [
      { id: 'act_1', name: 'زيارة إشرافية', code: 'SUP_VISIT', description: 'زيارة إشرافية شاملة للمعلمين والصفوف', isActive: true, color: 'blue', createdAt: now.toISOString() },
      { id: 'act_2', name: 'متابعة معلم', code: 'TCH_FOLLOW', description: 'متابعة أداء المعلم داخل الحصة الصفية', isActive: true, color: 'emerald', createdAt: now.toISOString() },
      { id: 'act_3', name: 'اجتماع', code: 'MEETING', description: 'اجتماع إداري أو تخصصي', isActive: true, color: 'amber', createdAt: now.toISOString() },
      { id: 'act_4', name: 'ورشة عمل', code: 'WORKSHOP', description: 'ورشة عمل تدريبية للمعلمين', isActive: true, color: 'purple', createdAt: now.toISOString() },
      { id: 'act_5', name: 'تدريب تربوي', code: 'TRAINING', description: 'دورة تدريبية متخصصة', isActive: true, color: 'indigo', createdAt: now.toISOString() },
      { id: 'act_6', name: 'متابعة خطة', code: 'PLAN_FOLLOW', description: 'متابعة الخطط المدرسية وسجلات الإشراف', isActive: true, color: 'cyan', createdAt: now.toISOString() },
      { id: 'act_7', name: 'نشاط علاجي', code: 'REMEDIAL', description: 'متابعة برامج الفاقد والخطط العلاجية', isActive: true, color: 'rose', createdAt: now.toISOString() },
      { id: 'act_8', name: 'نشاط إثرائي', code: 'ENRICH', description: 'أنشطة إثرائية ومسابقات تربوية', isActive: true, color: 'teal', createdAt: now.toISOString() },
      { id: 'act_9', name: 'عمل إداري', code: 'ADMIN_WORK', description: 'أعمال مكتبية وإعداد تقارير في المديرية', isActive: true, color: 'slate', createdAt: now.toISOString() },
      { id: 'act_10', name: 'اجتماع إدارة المدرسة', code: 'SCH_ADMIN_MEET', description: 'اجتماع مع مدير المدرسة والهيئة الإدارية', isActive: true, color: 'orange', createdAt: now.toISOString() },
      { id: 'act_11', name: 'أخرى', code: 'OTHER', description: 'مهام وأنشطة تربوية متنوعة', isActive: true, color: 'gray', createdAt: now.toISOString() }
    ];
    this.set(STORAGE_KEYS.ACTIVITIES, activities);

    // 6. Schools in Yatta
    const schools: School[] = [
      { id: 'sch_1', name: 'مدرسة ذكور يطا الثانوية', region: 'يطا - وسط البلد', stage: 'ثانوي', type: 'ذكور', isActive: true, notes: 'مدرسة مركزية عريقة', createdAt: now.toISOString() },
      { id: 'sch_2', name: 'مدرسة بنات يطا الثانوية', region: 'يطا - الجبل', stage: 'ثانوي', type: 'إناث', isActive: true, notes: 'متميزة أكاديمياً', createdAt: now.toISOString() },
      { id: 'sch_3', name: 'مدرسة الشهيد خليل الوزير الأساسية', region: 'يطا - الحيلة', stage: 'أساسي', type: 'ذكور', isActive: true, notes: '', createdAt: now.toISOString() },
      { id: 'sch_4', name: 'مدرسة بنات حواء الأساسية', region: 'يطا - رقعة', stage: 'أساسي', type: 'إناث', isActive: true, notes: '', createdAt: now.toISOString() },
      { id: 'sch_5', name: 'مدرسة ذكور رقعة الثانوية', region: 'يطا - رقعة', stage: 'ثانوي', type: 'ذكور', isActive: true, notes: '', createdAt: now.toISOString() },
      { id: 'sch_6', name: 'مدرسة الكرمل الأساسية المختلطة', region: 'يطا - الكرمل', stage: 'أساسي', type: 'مختلط', isActive: true, notes: 'منطقة الكرمل', createdAt: now.toISOString() },
      { id: 'sch_7', name: 'مدرسة الديرات الأساسية المختلطة', region: 'يطا - الديرات', stage: 'أساسي', type: 'مختلط', isActive: true, notes: '', createdAt: now.toISOString() },
      { id: 'sch_8', name: 'مدرسة بنات زيف الثانوية', region: 'يطا - زيف', stage: 'ثانوي', type: 'إناث', isActive: true, notes: '', createdAt: now.toISOString() },
      { id: 'sch_9', name: 'مدرسة التوانة الأساسية المختلطة', region: 'مسافر يطا - التوانة', stage: 'أساسي', type: 'مختلط', isActive: true, notes: 'منطقة صمود التحدي', createdAt: now.toISOString() },
      { id: 'sch_10', name: 'مدرسة المسافر الثانوية المختلطة', region: 'مسافر يطا - الفخيت', stage: 'ثانوي', type: 'مختلط', isActive: true, notes: 'مسافر يطا', createdAt: now.toISOString() }
    ];
    this.set(STORAGE_KEYS.SCHOOLS, schools);

    // 7. Supervisors & Linked Users (Empty database - ready for real supervisor entries)
    // Administrator user (SupervisorId is strictly undefined / NULL)
    const users: User[] = [
      {
        id: 'usr_admin',
        username: 'admin',
        fullName: 'مسؤول النظام',
        email: 'admin.eshraf@moe.edu.ps',
        role: 'Administrator',
        supervisorId: undefined,
        isActive: true,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        createdAt: now.toISOString(),
        permissions: ALL_PERMISSIONS
      }
    ];

    const supervisors: Supervisor[] = [];

    this.set(STORAGE_KEYS.PASSWORD_HASHES, passwordHashes);
    this.set(STORAGE_KEYS.USERS, users);
    this.set(STORAGE_KEYS.SUPERVISORS, supervisors);

    // 8. Weekly Programs (Empty database)
    const weeklyPrograms: WeeklyProgram[] = [];
    const programItems: ProgramItem[] = [];
    const programReviews: ProgramReview[] = [];

    this.set(STORAGE_KEYS.WEEKLY_PROGRAMS, weeklyPrograms);
    this.set(STORAGE_KEYS.PROGRAM_ITEMS, programItems);
    this.set(STORAGE_KEYS.PROGRAM_REVIEWS, programReviews);

    // 9. Initial Notifications (Empty)
    const notifications: Notification[] = [];
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifications);

    // 10. Audit Logs
    const auditLogs: AuditLog[] = [
      {
        id: 'log_1',
        userId: 'usr_admin',
        username: 'admin',
        userFullName: 'مدير قسم الإشراف - يطا',
        action: 'تهيئة النظام',
        entity: 'System',
        dateTime: new Date(now.getTime() - 72 * 3600 * 1000).toISOString(),
        ip: '127.0.0.1',
        details: 'تمت تهيئة قاعدة بيانات نظام إدارة البرامج الأسبوعية للمشرفين بنجاح.'
      },
      {
        id: 'log_2',
        userId: 'usr_admin',
        username: 'admin',
        userFullName: 'مدير قسم الإشراف - يطا',
        action: 'فتح الأسبوع',
        entity: 'Week',
        entityId: 'week_1',
        dateTime: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
        ip: '192.168.1.15',
        details: 'تم فتح فترة إرسال البرامج للأسبوع الأول حتى ' + closeDate
      }
    ];
    this.set(STORAGE_KEYS.AUDIT_LOGS, auditLogs);

    localStorage.setItem('wsp_initialized', 'true');
    localStorage.setItem('wsp_version_empty_sups_v1', '1');
  }

  /**
   * إفراغ قاعدة البيانات من جميع المشرفين والبرامج المرتبطة بهم
   */
  public clearAllSupervisorsData(): void {
    // Keep only Administrator in users
    const users = this.getUsers().filter(u => u.role === 'Administrator');
    this.set(STORAGE_KEYS.USERS, users);
    this.set(STORAGE_KEYS.SUPERVISORS, []);
    this.set(STORAGE_KEYS.WEEKLY_PROGRAMS, []);
    this.set(STORAGE_KEYS.PROGRAM_ITEMS, []);
    this.set(STORAGE_KEYS.PROGRAM_REVIEWS, []);
    this.set(STORAGE_KEYS.NOTIFICATIONS, []);

    // Clean password hashes keeping only admin
    const hashes = this.get<Record<string, string>>(STORAGE_KEYS.PASSWORD_HASHES, {});
    const adminHash = hashes['admin'];
    this.set(STORAGE_KEYS.PASSWORD_HASHES, adminHash ? { admin: adminHash } : {});

    this.addAuditLog('ADMIN', 'usr_admin', 'إفراغ المشرفين', 'Supervisors', 'all', 'تم إفراغ قاعدة البيانات من جميع المشرفين وبرامجهم');
  }

  // --- Auth & Session ---
  public getCurrentUser(): User | null {
    return this.get<User | null>(STORAGE_KEYS.SESSION, null);
  }

  public getActiveSupervisorsForLogin(): { user: User; supervisor: Supervisor }[] {
    const supervisors = this.getSupervisors().filter(s => s.status === 'Active');
    const users = this.getUsers().filter(u => u.isActive && u.role === 'Supervisor');
    const result: { user: User; supervisor: Supervisor }[] = [];

    for (const sup of supervisors) {
      const u = users.find(user => user.supervisorId === sup.id || user.id === sup.userId);
      if (u) {
        result.push({ user: u, supervisor: sup });
      }
    }
    return result.sort((a, b) => a.supervisor.name.localeCompare(b.supervisor.name, 'ar'));
  }

  public async login(
    identifier: string,
    passwordPlain: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const users = this.get<User[]>(STORAGE_KEYS.USERS, []);
    const hashes = this.get<Record<string, string>>(STORAGE_KEYS.PASSWORD_HASHES, {});

    const cleanId = identifier.trim().toLowerCase();
    const user = users.find(u =>
      u.id === identifier ||
      u.username.toLowerCase() === cleanId ||
      u.fullName.toLowerCase() === identifier.trim().toLowerCase()
    );

    const clientIp = '192.168.1.' + Math.floor(Math.random() * 40 + 10);
    const nowStr = new Date().toLocaleString('ar-PS', { dateStyle: 'short', timeStyle: 'short' });

    if (!user) {
      this.addAuditLog('SYSTEM', cleanId || 'GUEST', 'محاولة تسجيل دخول فاشلة', 'Auth', undefined, `${cleanId || identifier} | ${nowStr} | IP: ${clientIp} | Failure: اسم المستخدم أو المشرف غير مسجل بالنظام`);
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }

    // Role strict check: Admin is never linked to a supervisor
    if (user.role === 'Administrator' && user.supervisorId) {
      user.supervisorId = undefined;
      this.saveUser(user);
    }

    // Check account active
    if (!user.isActive) {
      this.addAuditLog(user.id, user.username, 'محاولة دخول لحساب معطل', 'Auth', user.id, `${user.username} | ${nowStr} | IP: ${clientIp} | Failure: الحساب معطل إدارياً`);
      return { success: false, error: 'تم تعطيل هذا الحساب. يرجى مراجعة مسؤول النظام في المديرية.' };
    }

    // Check lockout
    if (user.lockoutEnd && new Date(user.lockoutEnd).getTime() > Date.now()) {
      const remainingMinutes = Math.ceil((new Date(user.lockoutEnd).getTime() - Date.now()) / (60 * 1000));
      return { success: false, error: `الحساب مقفل مؤقتاً بسبب تكرار المحاولات الفاشلة. حاول بعد ${remainingMinutes} دقيقة.` };
    }

    // Hash check
    const storedHash = hashes[user.username];
    const computedHash = await hashPassword(passwordPlain);

    if (!storedHash || storedHash !== computedHash) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockoutEnd = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins lock
        this.saveUser(user);
        this.addAuditLog(user.id, user.username, 'إقفال حساب', 'Auth', user.id, `${user.username} | ${nowStr} | IP: ${clientIp} | Failure: تجاوز 5 محاولات فاشلة`);
        return { success: false, error: 'تم إقفال الحساب لمدة 15 دقيقة بسبب تكرار المحاولات الفاشلة.' };
      }
      this.saveUser(user);
      this.addAuditLog(user.id, user.username, 'فشل التحقق من كلمة المرور', 'Auth', user.id, `${user.username} | ${nowStr} | IP: ${clientIp} | Failure: كلمة المرور غير صحيحة (المحاولة ${user.failedLoginAttempts}/5)`);
      return { success: false, error: `كلمة المرور غير صحيحة. محاولات متبقية: ${5 - user.failedLoginAttempts}` };
    }

    // Reset failed attempts & set last login
    user.failedLoginAttempts = 0;
    user.lockoutEnd = undefined;
    user.lastLoginAt = new Date().toISOString();
    this.saveUser(user);
    this.set(STORAGE_KEYS.SESSION, user);

    // Audit log matching the exact user specification: UserId, LoginDate, IP, Success
    this.addAuditLog(user.id, user.username, 'تسجيل دخول ناجح', 'Auth', user.id, `${user.username} | ${nowStr} | IP: ${clientIp} | Success | Role: ${user.role}`);
    return { success: true, user };
  }

  public async completeFirstLoginPasswordChange(userId: string, newPasswordPlain: string): Promise<{ success: boolean; error?: string }> {
    const user = this.getUserById(userId);
    if (!user) return { success: false, error: 'المستخدم غير موجود.' };

    if (newPasswordPlain.length < 6) {
      return { success: false, error: 'يجب ألا تقل كلمة المرور الجديدة عن 6 خانات.' };
    }

    const hashes = this.get<Record<string, string>>(STORAGE_KEYS.PASSWORD_HASHES, {});
    hashes[user.username] = await hashPassword(newPasswordPlain);
    this.set(STORAGE_KEYS.PASSWORD_HASHES, hashes);

    user.mustChangePassword = false;
    this.saveUser(user);

    this.addAuditLog(user.id, user.username, 'تغيير كلمة المرور الأولية', 'User', user.id, `قام ${user.fullName} بتغيير كلمة المرور الابتدائية عند أول تسجيل دخول.`);
    return { success: true };
  }

  public logout(): void {
    const user = this.getCurrentUser();
    if (user) {
      this.addAuditLog(user.id, user.username, 'تسجيل خروج', 'Auth', user.id, 'قام المستخدم بتسجيل الخروج من النظام.');
    }
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  public async changePassword(userId: string, oldPlain: string, newPlain: string): Promise<{ success: boolean; error?: string }> {
    const user = this.getUserById(userId);
    if (!user) return { success: false, error: 'المستخدم غير موجود.' };

    const hashes = this.get<Record<string, string>>(STORAGE_KEYS.PASSWORD_HASHES, {});
    const oldHash = await hashPassword(oldPlain);

    if (hashes[user.username] !== oldHash) {
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة.' };
    }

    if (newPlain.length < 6) {
      return { success: false, error: 'يجب ألا تقل كلمة المرور الجديدة عن 6 خانات.' };
    }

    hashes[user.username] = await hashPassword(newPlain);
    this.set(STORAGE_KEYS.PASSWORD_HASHES, hashes);

    this.addAuditLog(user.id, user.username, 'تغيير كلمة المرور', 'User', user.id, 'قام المستخدم بتغيير كلمة المرور بنجاح.');
    return { success: true };
  }

  public async adminResetPassword(userId: string, newPlain: string): Promise<{ success: boolean; error?: string }> {
    const user = this.getUserById(userId);
    if (!user) return { success: false, error: 'المستخدم غير موجود.' };

    const hashes = this.get<Record<string, string>>(STORAGE_KEYS.PASSWORD_HASHES, {});
    hashes[user.username] = await hashPassword(newPlain);
    this.set(STORAGE_KEYS.PASSWORD_HASHES, hashes);

    this.addAuditLog('ADMIN', 'admin', 'إعادة تعيين كلمة مرور لمستخدم', 'User', user.id, `تم تعيين كلمة مرور جديدة للمستخدم ${user.username}`);
    return { success: true };
  }

  // --- Users & Supervisors ---
  public getUsers(): User[] {
    return this.get<User[]>(STORAGE_KEYS.USERS, []);
  }

  public getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  public saveUser(user: User): void {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    this.set(STORAGE_KEYS.USERS, users);

    // If current session is this user, update session as well
    const session = this.getCurrentUser();
    if (session && session.id === user.id) {
      this.set(STORAGE_KEYS.SESSION, user);
    }
  }

  public getSupervisors(): Supervisor[] {
    return this.get<Supervisor[]>(STORAGE_KEYS.SUPERVISORS, []);
  }

  public getSupervisorById(id: string): Supervisor | undefined {
    return this.getSupervisors().find(s => s.id === id);
  }

  public getSupervisorByUserId(userId: string): Supervisor | undefined {
    return this.getSupervisors().find(s => s.userId === userId);
  }

  public async saveSupervisor(supervisor: Supervisor, username?: string, passwordPlain?: string): Promise<void> {
    const supervisors = this.getSupervisors();
    const idx = supervisors.findIndex(s => s.id === supervisor.id);

    if (idx >= 0) {
      supervisors[idx] = supervisor;
      // also update user fullName & email if linked
      const user = this.getUserById(supervisor.userId);
      if (user) {
        user.fullName = supervisor.name;
        user.email = supervisor.email;
        user.isActive = supervisor.status === 'Active';
        this.saveUser(user);
      }
      this.addAuditLog('ADMIN', 'admin', 'تعديل بيانات مشرف', 'Supervisor', supervisor.id, `تعديل المشرف: ${supervisor.name}`);
    } else {
      // New supervisor: create linked user
      const users = this.getUsers();
      const loginUsername = username?.trim().toLowerCase() || `sup_${Date.now()}`;
      const defaultPassword = passwordPlain || 'User@123456';
      const userId = `usr_${supervisor.id}`;

      supervisor.userId = userId;
      supervisors.push(supervisor);

      const newUser: User = {
        id: userId,
        username: loginUsername,
        fullName: supervisor.name,
        email: supervisor.email,
        role: 'Supervisor',
        supervisorId: supervisor.id,
        isActive: supervisor.status === 'Active',
        failedLoginAttempts: 0,
        createdAt: new Date().toISOString(),
        permissions: ['ViewDashboard', 'ViewPrograms']
      };
      users.push(newUser);
      this.set(STORAGE_KEYS.USERS, users);

      const hashes = this.get<Record<string, string>>(STORAGE_KEYS.PASSWORD_HASHES, {});
      hashes[loginUsername] = await hashPassword(defaultPassword);
      this.set(STORAGE_KEYS.PASSWORD_HASHES, hashes);

      this.addAuditLog('ADMIN', 'admin', 'إضافة مشرف جديد', 'Supervisor', supervisor.id, `إضافة المشرف: ${supervisor.name} باسم مستخدم: ${loginUsername}`);
    }

    this.set(STORAGE_KEYS.SUPERVISORS, supervisors);
  }

  public async importSupervisorsBatch(
    items: Array<{
      name: string;
      nationalId: string;
      specialization: string;
      department?: string;
      phone?: string;
      email?: string;
      username?: string;
      password?: string;
    }>,
    mode: 'append' | 'replace' = 'append'
  ): Promise<{ importedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let currentSupervisors = mode === 'replace' ? [] : this.getSupervisors();
    let currentUsers = mode === 'replace' 
      ? this.getUsers().filter(u => u.role === 'Administrator') 
      : this.getUsers();
    const hashes = this.get<Record<string, string>>(STORAGE_KEYS.PASSWORD_HASHES, {});

    if (mode === 'replace') {
      // Keep only admin password hash
      const adminHash = hashes['admin'];
      this.set(STORAGE_KEYS.PASSWORD_HASHES, adminHash ? { admin: adminHash } : {});
      this.set(STORAGE_KEYS.WEEKLY_PROGRAMS, []);
      this.set(STORAGE_KEYS.PROGRAM_ITEMS, []);
      this.set(STORAGE_KEYS.PROGRAM_REVIEWS, []);
    }

    let successCount = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowNum = i + 1;

      if (!item.name || !item.name.trim()) {
        errors.push(`السطر ${rowNum}: اسم المشرف مطلوب وتم تجاوزه.`);
        continue;
      }

      const cleanName = item.name.trim();
      const cleanNationalId = (item.nationalId || '').toString().trim() || `${Date.now()}${i}`;
      const cleanSpec = (item.specialization || '').trim() || 'عام';
      const cleanDept = (item.department || '').trim() || 'الإشراف والتأهيل التربوي';
      const cleanPhone = (item.phone || '').toString().trim();
      const cleanEmail = (item.email || '').toString().trim();
      
      // Determine username:
      let baseUsername = (item.username || '').toString().trim().toLowerCase();
      if (!baseUsername) {
        // Fallback username: sup_ + nationalId (last 6 digits) or index
        const cleanNat = cleanNationalId.replace(/[^0-9a-zA-Z]/g, '');
        baseUsername = cleanNat ? `sup_${cleanNat.slice(-6)}` : `sup_${Date.now()}_${i}`;
      }
      baseUsername = baseUsername.replace(/[\s\t\n]+/g, '_');

      // Ensure unique username
      let finalUsername = baseUsername;
      let counter = 1;
      while (currentUsers.some(u => u.username.toLowerCase() === finalUsername.toLowerCase())) {
        finalUsername = `${baseUsername}_${counter}`;
        counter++;
      }

      // Check if supervisor with same nationalId or name already exists in current list
      const existingSupIndex = currentSupervisors.findIndex(
        s => (s.nationalId && s.nationalId === cleanNationalId) || s.name === cleanName
      );

      const plainPassword = item.password?.trim() || '123456';
      const hashedPassword = await hashPassword(plainPassword);

      if (existingSupIndex >= 0) {
        // Update existing supervisor
        const existingSup = currentSupervisors[existingSupIndex];
        existingSup.name = cleanName;
        existingSup.nationalId = cleanNationalId;
        existingSup.specialization = cleanSpec;
        existingSup.department = cleanDept;
        if (cleanPhone) existingSup.phone = cleanPhone;
        if (cleanEmail) existingSup.email = cleanEmail;

        // Update linked user
        const linkedUser = currentUsers.find(u => u.id === existingSup.userId);
        if (linkedUser) {
          linkedUser.fullName = cleanName;
          linkedUser.email = cleanEmail;
          hashes[linkedUser.username] = hashedPassword;
        }
        successCount++;
      } else {
        // Create new supervisor & linked user
        const supId = `sup_${Date.now()}_${i}`;
        const userId = `usr_${supId}`;

        const newSup: Supervisor = {
          id: supId,
          name: cleanName,
          nationalId: cleanNationalId,
          specialization: cleanSpec,
          department: cleanDept,
          phone: cleanPhone,
          email: cleanEmail,
          userId,
          status: 'Active',
          createdAt: now
        };

        const newUser: User = {
          id: userId,
          username: finalUsername,
          fullName: cleanName,
          email: cleanEmail,
          role: 'Supervisor',
          supervisorId: supId,
          isActive: true,
          mustChangePassword: true,
          failedLoginAttempts: 0,
          createdAt: now,
          permissions: ['ViewDashboard', 'ViewPrograms']
        };

        currentSupervisors.push(newSup);
        currentUsers.push(newUser);
        hashes[finalUsername] = hashedPassword;
        successCount++;
      }
    }

    this.set(STORAGE_KEYS.SUPERVISORS, currentSupervisors);
    this.set(STORAGE_KEYS.USERS, currentUsers);
    this.set(STORAGE_KEYS.PASSWORD_HASHES, hashes);

    this.addAuditLog(
      'ADMIN',
      'admin',
      'استيراد مشرفين',
      'Supervisors',
      'batch',
      `تم استيراد ${successCount} مشرف بنجاح (الوضع: ${mode === 'replace' ? 'استبدال' : 'إضافة'}).`
    );

    return { importedCount: successCount, errors };
  }

  // --- Academic Years ---
  public getAcademicYears(): AcademicYear[] {
    return this.get<AcademicYear[]>(STORAGE_KEYS.ACADEMIC_YEARS, []);
  }

  public getCurrentAcademicYear(): AcademicYear | undefined {
    const years = this.getAcademicYears();
    return years.find(y => y.isCurrent) || years[0];
  }

  public saveAcademicYear(year: AcademicYear): void {
    const years = this.getAcademicYears();
    if (year.isCurrent) {
      years.forEach(y => { y.isCurrent = false; });
    }
    const idx = years.findIndex(y => y.id === year.id);
    if (idx >= 0) {
      years[idx] = year;
    } else {
      years.push(year);
    }
    this.set(STORAGE_KEYS.ACADEMIC_YEARS, years);

    if (year.isCurrent) {
      const settings = this.getSystemSettings();
      settings.currentAcademicYearId = year.id;
      this.saveSystemSettings(settings);
    }
    this.addAuditLog('ADMIN', 'admin', 'حفظ سنة دراسية', 'AcademicYear', year.id, `السنة: ${year.name} (حالية: ${year.isCurrent})`);
  }

  // --- Weeks ---
  public getWeeks(): Week[] {
    return this.get<Week[]>(STORAGE_KEYS.WEEKS, []);
  }

  public getWeekById(id: string): Week | undefined {
    return this.getWeeks().find(w => w.id === id);
  }

  public getCurrentWeek(): Week | undefined {
    const weeks = this.getWeeks();
    // Return open week or the latest active week
    const openWeek = weeks.find(w => w.status === 'Open');
    if (openWeek) return openWeek;
    return weeks[0];
  }

  public saveWeek(week: Week): void {
    const weeks = this.getWeeks();
    const idx = weeks.findIndex(w => w.id === week.id);
    if (idx >= 0) {
      weeks[idx] = week;
    } else {
      weeks.push(week);
    }
    this.set(STORAGE_KEYS.WEEKS, weeks);
    this.addAuditLog('ADMIN', 'admin', 'حفظ أسبوع', 'Week', week.id, `الأسبوع: ${week.name} - الحالة: ${week.status}`);
  }

  public deleteWeek(id: string): boolean {
    const programs = this.getWeeklyPrograms().filter(p => p.weekId === id);
    if (programs.length > 0) {
      return false; // cannot delete week that has programs
    }
    let weeks = this.getWeeks();
    weeks = weeks.filter(w => w.id !== id);
    this.set(STORAGE_KEYS.WEEKS, weeks);
    this.addAuditLog('ADMIN', 'admin', 'حذف أسبوع', 'Week', id, `تم حذف الأسبوع ${id}`);
    return true;
  }

  // --- Schools ---
  public getSchools(): School[] {
    return this.get<School[]>(STORAGE_KEYS.SCHOOLS, []);
  }

  public getActiveSchools(): School[] {
    return this.getSchools().filter(s => s.isActive);
  }

  public saveSchool(school: School): void {
    const schools = this.getSchools();
    const idx = schools.findIndex(s => s.id === school.id);
    if (idx >= 0) {
      schools[idx] = school;
    } else {
      schools.push(school);
    }
    this.set(STORAGE_KEYS.SCHOOLS, schools);
    this.addAuditLog('ADMIN', 'admin', 'حفظ مدرسة', 'School', school.id, `المدرسة: ${school.name}`);
  }

  public importSchoolsBatch(
    items: Array<{
      name: string;
      region?: string;
      stage?: string;
      type?: string;
      notes?: string;
    }>,
    mode: 'append' | 'replace' = 'append'
  ): { importedCount: number; errors: string[] } {
    const errors: string[] = [];
    let currentSchools = mode === 'replace' ? [] : this.getSchools();
    let successCount = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowNum = i + 1;

      if (!item.name || !item.name.trim()) {
        errors.push(`السطر ${rowNum}: اسم المدرسة مطلوب وتم تجاوزه.`);
        continue;
      }

      const cleanName = item.name.trim();
      const cleanRegion = (item.region || '').trim() || 'يطا';
      
      // Normalize stage: 'أساسي' | 'ثانوي' | 'مختلط'
      let cleanStage: 'أساسي' | 'ثانوي' | 'مختلط' = 'أساسي';
      const stageStr = (item.stage || '').trim();
      if (stageStr.includes('ثانوي')) cleanStage = 'ثانوي';
      else if (stageStr.includes('مختلط')) cleanStage = 'مختلط';
      else if (stageStr.includes('أساس')) cleanStage = 'أساسي';

      // Normalize type: 'ذكور' | 'إناث' | 'مختلط'
      let cleanType: 'ذكور' | 'إناث' | 'مختلط' = 'ذكور';
      const typeStr = (item.type || '').trim();
      if (typeStr.includes('إناث') || typeStr.includes('بنات')) cleanType = 'إناث';
      else if (typeStr.includes('مختلط')) cleanType = 'مختلط';
      else if (typeStr.includes('ذكور') || typeStr.includes('بنين')) cleanType = 'ذكور';

      const cleanNotes = (item.notes || '').trim();

      const existingIndex = currentSchools.findIndex(
        s => s.name.toLowerCase().trim() === cleanName.toLowerCase()
      );

      if (existingIndex >= 0) {
        currentSchools[existingIndex].region = cleanRegion;
        currentSchools[existingIndex].stage = cleanStage;
        currentSchools[existingIndex].type = cleanType;
        if (cleanNotes) currentSchools[existingIndex].notes = cleanNotes;
        successCount++;
      } else {
        const newSchool: School = {
          id: `sch_${Date.now()}_${i}`,
          name: cleanName,
          region: cleanRegion,
          stage: cleanStage,
          type: cleanType,
          isActive: true,
          notes: cleanNotes,
          createdAt: now
        };
        currentSchools.push(newSchool);
        successCount++;
      }
    }

    this.set(STORAGE_KEYS.SCHOOLS, currentSchools);
    this.addAuditLog(
      'ADMIN',
      'admin',
      'استيراد مدارس',
      'School',
      'batch',
      `تم استيراد ${successCount} مدرسة بنجاح (الوضع: ${mode === 'replace' ? 'استبدال' : 'إضافة'}).`
    );

    return { importedCount: successCount, errors };
  }

  // --- Activities ---
  public getActivities(): Activity[] {
    return this.get<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
  }

  public getActiveActivities(): Activity[] {
    return this.getActivities().filter(a => a.isActive);
  }

  public saveActivity(activity: Activity): void {
    const activities = this.getActivities();
    const idx = activities.findIndex(a => a.id === activity.id);
    if (idx >= 0) {
      activities[idx] = activity;
    } else {
      activities.push(activity);
    }
    this.set(STORAGE_KEYS.ACTIVITIES, activities);
    this.addAuditLog('ADMIN', 'admin', 'حفظ نشاط', 'Activity', activity.id, `النشاط: ${activity.name}`);
  }

  public importActivitiesBatch(
    items: Array<{
      name: string;
      code?: string;
      description?: string;
      color?: string;
    }>,
    mode: 'append' | 'replace' = 'append'
  ): { importedCount: number; errors: string[] } {
    const errors: string[] = [];
    let currentActivities = mode === 'replace' ? [] : this.getActivities();
    let successCount = 0;
    const now = new Date().toISOString();

    const allowedColors = ['emerald', 'blue', 'amber', 'purple', 'rose', 'sky', 'indigo', 'teal', 'slate'];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowNum = i + 1;

      if (!item.name || !item.name.trim()) {
        errors.push(`السطر ${rowNum}: اسم الفعالية/النشاط مطلوب وتم تجاوزه.`);
        continue;
      }

      const cleanName = item.name.trim();
      const cleanCode = (item.code || '').trim().toUpperCase() || `ACT_${(i + 1).toString().padStart(3, '0')}`;
      const cleanDesc = (item.description || '').trim();
      
      let cleanColor = (item.color || '').trim().toLowerCase();
      if (!allowedColors.includes(cleanColor)) {
        cleanColor = allowedColors[i % allowedColors.length];
      }

      const existingIndex = currentActivities.findIndex(
        a => a.name.toLowerCase().trim() === cleanName.toLowerCase() || (a.code && a.code === cleanCode)
      );

      if (existingIndex >= 0) {
        currentActivities[existingIndex].name = cleanName;
        currentActivities[existingIndex].code = cleanCode;
        if (cleanDesc) currentActivities[existingIndex].description = cleanDesc;
        if (cleanColor) currentActivities[existingIndex].color = cleanColor;
        successCount++;
      } else {
        const newAct: Activity = {
          id: `act_${Date.now()}_${i}`,
          name: cleanName,
          code: cleanCode,
          description: cleanDesc,
          isActive: true,
          color: cleanColor,
          createdAt: now
        };
        currentActivities.push(newAct);
        successCount++;
      }
    }

    this.set(STORAGE_KEYS.ACTIVITIES, currentActivities);
    this.addAuditLog(
      'ADMIN',
      'admin',
      'استيراد فعاليات وأنشطة',
      'Activity',
      'batch',
      `تم استيراد ${successCount} نشاط بنجاح (الوضع: ${mode === 'replace' ? 'استبدال' : 'إضافة'}).`
    );

    return { importedCount: successCount, errors };
  }

  // --- Weekly Programs & Items ---
  public getWeeklyPrograms(): WeeklyProgram[] {
    return this.get<WeeklyProgram[]>(STORAGE_KEYS.WEEKLY_PROGRAMS, []);
  }

  public getProgramsForUser(currentUser: User): WeeklyProgram[] {
    const all = this.getWeeklyPrograms();
    if (currentUser.role === 'Supervisor') {
      return all.filter(p => p.supervisorId === currentUser.supervisorId);
    }
    return all;
  }

  public getProgramById(id: string): WeeklyProgram | undefined {
    return this.getWeeklyPrograms().find(p => p.id === id);
  }

  public getProgramByIdForUser(id: string, currentUser: User): WeeklyProgram | null {
    const prog = this.getProgramById(id);
    if (!prog) return null;
    if (currentUser.role === 'Supervisor' && prog.supervisorId !== currentUser.supervisorId) {
      // 403 Forbidden: Supervisor cannot access other supervisors' programs
      return null;
    }
    return prog;
  }

  public getIncomingPrograms(): {
    id: string;
    supervisorId: string;
    supervisorName: string;
    academicYearName: string;
    weekId: string;
    weekNumber: number;
    weekName: string;
    submittedAt?: string;
    status: ProgramStatus;
    itemsCount: number;
    reviewNotes?: string;
    program: WeeklyProgram;
  }[] {
    const programs = this.getWeeklyPrograms();
    const supervisors = this.getSupervisors();
    const weeks = this.getWeeks();
    const years = this.getAcademicYears();
    const items = this.get<ProgramItem[]>(STORAGE_KEYS.PROGRAM_ITEMS, []);

    // Filter incoming programs: submitted, under review, needs revision, approved, closed
    return programs
      .filter(p => p.status === 'Submitted' || p.status === 'UnderReview' || p.status === 'NeedsRevision' || p.status === 'Approved' || p.status === 'Closed')
      .map(p => {
        const sup = supervisors.find(s => s.id === p.supervisorId);
        const week = weeks.find(w => w.id === p.weekId);
        const year = years.find(y => y.id === p.academicYearId);
        const pItems = items.filter(i => i.weeklyProgramId === p.id);

        return {
          id: p.id,
          supervisorId: p.supervisorId,
          supervisorName: sup?.name || 'مشرف غير معروف',
          academicYearName: year?.name || '2026-2027',
          weekId: p.weekId,
          weekNumber: week?.weekNumber || 1,
          weekName: week?.name || `الأسبوع ${week?.weekNumber || 1}`,
          submittedAt: p.submittedAt,
          status: p.status,
          itemsCount: pItems.length,
          reviewNotes: p.reviewNotes,
          program: p
        };
      })
      .sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  public submitWeeklyProgram(programId: string, currentUser: User): { success: boolean; error?: string } {
    const program = this.getProgramById(programId);
    if (!program) return { success: false, error: 'البرنامج غير موجود.' };

    if (currentUser.role === 'Supervisor' && program.supervisorId !== currentUser.supervisorId) {
      return { success: false, error: 'غير مصرح لك بإرسال برنامج مشرف آخر.' };
    }

    const items = this.getProgramItems(program.id);
    if (items.length === 0) {
      return { success: false, error: 'لا يمكن إرسال برنامج أسبوعي فارغ بدون أنشطة.' };
    }

    const now = new Date().toISOString();
    program.status = 'Submitted';
    program.submittedAt = now;
    program.updatedAt = now;
    this.saveProgram(program);

    const sup = this.getSupervisorById(program.supervisorId);
    const supName = sup?.name || currentUser.fullName;

    // Dispatches notification to admin according to exact prompt requirement:
    // "تم استلام برنامج أسبوعي جديد من المشرف أحمد محمد."
    this.addNotification({
      id: `notif_${Date.now()}`,
      userId: 'usr_admin',
      title: 'برنامج أسبوعي جديد وارد',
      message: `تم استلام برنامج أسبوعي جديد من المشرف ${supName}.`,
      type: 'info',
      isRead: false,
      createdAt: now
    });

    this.addAuditLog(
      currentUser.id,
      currentUser.username,
      'إرسال برنامج أسبوعي',
      'WeeklyProgram',
      program.id,
      `تم إرسال البرنامج الأسبوعي من المشرف ${supName} بنجاح (${items.length} نشاط)`
    );

    return { success: true };
  }

  public getProgramBySupervisorAndWeek(supervisorId: string, weekId: string, planType: PlanType = 'Planning'): WeeklyProgram | undefined {
    return this.getWeeklyPrograms().find(p => p.supervisorId === supervisorId && p.weekId === weekId && (p.planType || 'Planning') === planType);
  }

  public getProgramItems(programId: string): ProgramItem[] {
    const all = this.get<ProgramItem[]>(STORAGE_KEYS.PROGRAM_ITEMS, []);
    return all
      .filter(i => i.weeklyProgramId === programId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  // --- Dual-Lifecycle Week Controls (Planning vs Actual) ---
  public togglePlanningOpen(weekId: string, open: boolean): void {
    const week = this.getWeekById(weekId);
    if (!week) return;
    week.planningOpen = open;
    this.saveWeek(week);
    this.addAuditLog(
      'ADMIN',
      'admin',
      open ? 'فتح إرسال برنامج التخطيط' : 'إغلاق إرسال برنامج التخطيط',
      'Week',
      week.id,
      `${open ? 'تم فتح' : 'تم إغلاق'} فترة إرسال برنامج التخطيط للأسبوع: ${week.name}`
    );
  }

  public toggleActualOpen(weekId: string, open: boolean): void {
    const week = this.getWeekById(weekId);
    if (!week) return;
    week.actualOpen = open;
    this.saveWeek(week);
    this.addAuditLog(
      'ADMIN',
      'admin',
      open ? 'فتح إرسال البرنامج الفعلي' : 'إغلاق إرسال البرنامج الفعلي',
      'Week',
      week.id,
      `${open ? 'تم فتح' : 'تم إغلاق'} فترة إرسال البرنامج الفعلي للأسبوع: ${week.name}`
    );
  }

  public reopenProgram(programId: string, adminUser: User): { success: boolean; error?: string } {
    const program = this.getProgramById(programId);
    if (!program) return { success: false, error: 'البرنامج غير موجود.' };

    program.status = 'Draft';
    program.submittedAt = undefined;
    program.reviewedAt = undefined;
    this.saveProgram(program);

    const sup = this.getSupervisorById(program.supervisorId);
    const week = this.getWeekById(program.weekId);

    if (sup) {
      this.addNotification({
        id: `notif_${Date.now()}`,
        userId: sup.userId,
        title: 'إعادة فتح البرنامج للتعديل',
        message: `قام مسؤول النظام بإعادة فتح ${program.planType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'} لـ (${week?.name || 'الأسبوع'}) لتتمكن من التعديل وإعادة الإرسال.`,
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    this.addAuditLog(
      adminUser.id,
      adminUser.username,
      'إعادة فتح برنامج لمشرف',
      'WeeklyProgram',
      program.id,
      `تمت إعادة فتح ${program.planType === 'Planning' ? 'برنامج التخطيط' : 'البرنامج الفعلي'} للمشرف ${sup?.name || ''} للأسبوع ${week?.name || ''}`
    );

    return { success: true };
  }

  public getComplianceReport(targetWeekId?: string): {
    week: Week | undefined;
    totalSupervisors: number;
    planningSubmittedCount: number;
    planningUnsubmittedCount: number;
    actualSubmittedCount: number;
    actualUnsubmittedCount: number;
    planningRate: number;
    actualRate: number;
    rows: {
      supervisorId: string;
      supervisorName: string;
      username: string;
      specialization: string;
      planningSubmitted: boolean;
      planningStatus: ProgramStatus;
      planningSubmittedAt?: string;
      actualSubmitted: boolean;
      actualStatus: ProgramStatus;
      actualSubmittedAt?: string;
      planningItemsCount: number;
      actualItemsCount: number;
    }[];
  } {
    const activeWeek = targetWeekId ? this.getWeekById(targetWeekId) : this.getCurrentWeek();
    const supervisors = this.getSupervisors().filter(s => s.status === 'Active');
    const allPrograms = this.getWeeklyPrograms();
    const allItems = this.get<ProgramItem[]>(STORAGE_KEYS.PROGRAM_ITEMS, []);
    const users = this.getUsers();

    if (!activeWeek) {
      return {
        week: undefined,
        totalSupervisors: supervisors.length,
        planningSubmittedCount: 0,
        planningUnsubmittedCount: supervisors.length,
        actualSubmittedCount: 0,
        actualUnsubmittedCount: supervisors.length,
        planningRate: 0,
        actualRate: 0,
        rows: []
      };
    }

    const weekPrograms = allPrograms.filter(p => p.weekId === activeWeek.id);

    const rows = supervisors.map(sup => {
      const u = users.find(x => x.id === sup.userId);
      const planProg = weekPrograms.find(p => p.supervisorId === sup.id && (p.planType || 'Planning') === 'Planning');
      const actProg = weekPrograms.find(p => p.supervisorId === sup.id && p.planType === 'Actual');

      const planItems = planProg ? allItems.filter(i => i.weeklyProgramId === planProg.id) : [];
      const actItems = actProg ? allItems.filter(i => i.weeklyProgramId === actProg.id) : [];

      const isPlanSubmitted = planProg ? (planProg.status === 'Submitted' || planProg.status === 'Approved' || planProg.status === 'UnderReview' || planProg.status === 'NeedsRevision') : false;
      const isActSubmitted = actProg ? (actProg.status === 'Submitted' || actProg.status === 'Approved' || actProg.status === 'UnderReview') : false;

      return {
        supervisorId: sup.id,
        supervisorName: sup.name,
        username: u?.username || '',
        specialization: sup.specialization,
        planningSubmitted: isPlanSubmitted,
        planningStatus: planProg?.status || 'Draft',
        planningSubmittedAt: planProg?.submittedAt,
        actualSubmitted: isActSubmitted,
        actualStatus: actProg?.status || 'Draft',
        actualSubmittedAt: actProg?.submittedAt,
        planningItemsCount: planItems.length,
        actualItemsCount: actItems.length
      };
    });

    const planningSubmittedCount = rows.filter(r => r.planningSubmitted).length;
    const actualSubmittedCount = rows.filter(r => r.actualSubmitted).length;

    return {
      week: activeWeek,
      totalSupervisors: supervisors.length,
      planningSubmittedCount,
      planningUnsubmittedCount: Math.max(0, supervisors.length - planningSubmittedCount),
      actualSubmittedCount,
      actualUnsubmittedCount: Math.max(0, supervisors.length - actualSubmittedCount),
      planningRate: supervisors.length > 0 ? Math.round((planningSubmittedCount / supervisors.length) * 100) : 0,
      actualRate: supervisors.length > 0 ? Math.round((actualSubmittedCount / supervisors.length) * 100) : 0,
      rows
    };
  }

  public getSupervisorDetailedComparison(supervisorId: string, weekId: string) {
    const supervisor = this.getSupervisorById(supervisorId);
    const week = this.getWeekById(weekId);
    const schools = this.getSchools();
    const activities = this.getActivities();

    const planProg = this.getProgramBySupervisorAndWeek(supervisorId, weekId, 'Planning');
    const actProg = this.getProgramBySupervisorAndWeek(supervisorId, weekId, 'Actual');

    const planItems = planProg ? this.getProgramItems(planProg.id) : [];
    const actItems = actProg ? this.getProgramItems(actProg.id) : [];

    const formatItems = (items: ProgramItem[]) =>
      items.map(i => ({
        id: i.id,
        schoolName: schools.find(s => s.id === i.schoolId)?.name || 'مدرسة غير محددة',
        activityName: activities.find(a => a.id === i.activityId)?.name || 'فعالية غير محددة',
        dayName: i.dayName,
        notes: i.notes
      }));

    return {
      supervisor,
      week,
      planningProgram: planProg,
      planningItems: formatItems(planItems),
      actualProgram: actProg,
      actualItems: formatItems(actItems)
    };
  }

  public validateWeekDates(startDate: string, endDate: string, excludeWeekId?: string): { valid: boolean; error?: string } {
    if (!startDate || !endDate) {
      return { valid: false, error: 'يرجى تحديد تاريخ البداية وتاريخ النهاية للأسبوع.' };
    }

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    if (end < start) {
      return { valid: false, error: 'تاريخ نهاية الأسبوع لا يمكن أن يكون قبل تاريخ البداية.' };
    }

    const weeks = this.getWeeks().filter(w => w.id !== excludeWeekId);
    for (const w of weeks) {
      const wStart = new Date(w.startDate).getTime();
      const wEnd = new Date(w.endDate).getTime();

      // Check overlap
      if ((start >= wStart && start <= wEnd) || (end >= wStart && end <= wEnd) || (start <= wStart && end >= wEnd)) {
        return { valid: false, error: `تاريخ الأسبوع الجديد يتداخل مع أسبوع موجود مسبقاً (${w.name}: من ${w.startDate} إلى ${w.endDate}).` };
      }
    }

    return { valid: true };
  }

  public saveProgram(program: WeeklyProgram): void {
    const programs = this.getWeeklyPrograms();
    const idx = programs.findIndex(p => p.id === program.id);
    program.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      programs[idx] = program;
    } else {
      programs.push(program);
    }
    this.set(STORAGE_KEYS.WEEKLY_PROGRAMS, programs);
  }

  public saveProgramItem(item: ProgramItem): void {
    const items = this.get<ProgramItem[]>(STORAGE_KEYS.PROGRAM_ITEMS, []);
    const idx = items.findIndex(i => i.id === item.id);
    item.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.push(item);
    }
    this.set(STORAGE_KEYS.PROGRAM_ITEMS, items);
  }

  public deleteProgramItem(id: string): void {
    let items = this.get<ProgramItem[]>(STORAGE_KEYS.PROGRAM_ITEMS, []);
    items = items.filter(i => i.id !== id);
    this.set(STORAGE_KEYS.PROGRAM_ITEMS, items);
  }

  public reviewProgram(programId: string, reviewer: User, action: 'Approve' | 'RequestRevision' | 'Reopen', notes: string): WeeklyProgram | null {
    const program = this.getProgramById(programId);
    if (!program) return null;

    const now = new Date().toISOString();
    const reviews = this.get<ProgramReview[]>(STORAGE_KEYS.PROGRAM_REVIEWS, []);

    const newReview: ProgramReview = {
      id: `rev_${Date.now()}`,
      weeklyProgramId: programId,
      reviewerUserId: reviewer.id,
      reviewerName: reviewer.fullName,
      action,
      notes,
      createdAt: now
    };
    reviews.push(newReview);
    this.set(STORAGE_KEYS.PROGRAM_REVIEWS, reviews);

    const supervisor = this.getSupervisorById(program.supervisorId);
    const week = this.getWeekById(program.weekId);

    if (action === 'Approve') {
      program.status = 'Approved';
      program.reviewedAt = now;
      program.reviewedBy = reviewer.fullName;
      program.reviewNotes = notes;

      if (supervisor) {
        this.addNotification({
          id: `notif_${Date.now()}`,
          userId: supervisor.userId,
          title: 'تم اعتماد البرنامج الأسبوعي',
          message: `تم اعتماد برنامجك الأسبوعي لـ (${week?.name || 'الأسبوع'}) بنجاح.`,
          type: 'success',
          isRead: false,
          createdAt: now
        });
      }
    } else if (action === 'RequestRevision') {
      program.status = 'NeedsRevision';
      program.reviewedAt = now;
      program.reviewedBy = reviewer.fullName;
      program.reviewNotes = notes;

      if (supervisor) {
        this.addNotification({
          id: `notif_${Date.now()}`,
          userId: supervisor.userId,
          title: 'مطلوب تعديل البرنامج الأسبوعي',
          message: `ملاحظات المراجع: ${notes}`,
          type: 'warning',
          isRead: false,
          createdAt: now
        });
      }
    } else if (action === 'Reopen') {
      program.status = 'Draft';
      program.reviewedAt = undefined;
      program.reviewedBy = undefined;
      program.reviewNotes = notes;

      if (supervisor) {
        this.addNotification({
          id: `notif_${Date.now()}`,
          userId: supervisor.userId,
          title: 'تمت إعادة فتح البرنامج للتعديل',
          message: `تمت إعادة فتح برنامجك الأسبوعي لـ (${week?.name || 'الأسبوع'}) كمسودة للتعديل.`,
          type: 'info',
          isRead: false,
          createdAt: now
        });
      }
    }

    this.saveProgram(program);
    this.addAuditLog(reviewer.id, reviewer.username, `مراجعة برنامج (${action})`, 'WeeklyProgram', programId, `الإجراء: ${action} للمشرف: ${supervisor?.name || program.supervisorId}. ملاحظات: ${notes}`);
    return program;
  }

  // --- Copy Previous Week Program ---
  public copyPreviousWeekProgram(supervisorId: string, currentWeekId: string, previousWeekId: string): WeeklyProgram | null {
    const prevProg = this.getProgramBySupervisorAndWeek(supervisorId, previousWeekId);
    if (!prevProg) return null;

    const prevItems = this.getProgramItems(prevProg.id);
    const currentWeek = this.getWeekById(currentWeekId);
    if (!currentWeek) return null;

    let targetProg = this.getProgramBySupervisorAndWeek(supervisorId, currentWeekId);
    const now = new Date().toISOString();

    if (!targetProg) {
      targetProg = {
        id: `prog_${Date.now()}`,
        supervisorId,
        academicYearId: currentWeek.academicYearId,
        weekId: currentWeekId,
        planType: 'Planning',
        status: 'Draft',
        createdAt: now
      };
      this.saveProgram(targetProg);
    } else {
      targetProg.status = 'Draft';
      this.saveProgram(targetProg);
    }

    const createdProg: WeeklyProgram = targetProg;

    // Map items to new week dates
    const currentWeekStart = new Date(currentWeek.startDate);
    const prevWeek = this.getWeekById(previousWeekId);
    const prevWeekStart = prevWeek ? new Date(prevWeek.startDate) : currentWeekStart;

    prevItems.forEach(oldItem => {
      if (!oldItem.dayDate) return;
      const oldItemDate = new Date(oldItem.dayDate);
      const dayDiff = Math.round((oldItemDate.getTime() - prevWeekStart.getTime()) / (24 * 3600 * 1000));
      const newItemDate = new Date(currentWeekStart.getTime() + dayDiff * 24 * 3600 * 1000);

      const yyyy = newItemDate.getFullYear();
      const mm = String(newItemDate.getMonth() + 1).padStart(2, '0');
      const dd = String(newItemDate.getDate()).padStart(2, '0');
      const newDateFormatted = `${yyyy}-${mm}-${dd}`;

      const newItem: ProgramItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        weeklyProgramId: createdProg.id,
        dayDate: newDateFormatted,
        dayName: oldItem.dayName,
        schoolId: oldItem.schoolId,
        activityId: oldItem.activityId,
        startTime: oldItem.startTime,
        endTime: oldItem.endTime,
        location: oldItem.location,
        objective: oldItem.objective,
        notes: oldItem.notes,
        sortOrder: oldItem.sortOrder,
        createdAt: now
      };
      this.saveProgramItem(newItem);
    });

    this.addAuditLog('SUPERVISOR', supervisorId, 'نسخ برنامج الأسبوع السابق', 'WeeklyProgram', createdProg.id, `نسخ من ${previousWeekId} إلى ${currentWeekId} كمسودة`);
    return createdProg;
  }

  // --- Notifications ---
  public getNotifications(userId: string): Notification[] {
    const all = this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return all.filter(n => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getUnreadNotificationsCount(userId: string): number {
    return this.getNotifications(userId).filter(n => !n.isRead).length;
  }

  public markNotificationAsRead(id: string): void {
    const all = this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const notif = all.find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.set(STORAGE_KEYS.NOTIFICATIONS, all);
    }
  }

  public markAllNotificationsAsRead(userId: string): void {
    const all = this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    all.forEach(n => {
      if (n.userId === userId) n.isRead = true;
    });
    this.set(STORAGE_KEYS.NOTIFICATIONS, all);
  }

  public addNotification(notification: Notification): void {
    const all = this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    all.push(notification);
    this.set(STORAGE_KEYS.NOTIFICATIONS, all);
  }

  // --- System Settings ---
  public getSystemSettings(): SystemSettings {
    return this.get<SystemSettings>(STORAGE_KEYS.SYSTEM_SETTINGS, {
      id: 'settings_1',
      directorateName: 'مديرية التربية والتعليم يطا',
      departmentName: 'قسم الإشراف والتأهيل التربوي',
      systemTitle: 'نظام إدارة البرامج الأسبوعية للمشرفين',
      currentAcademicYearId: 'year_2026_2027',
      weekDaysCount: 5,
      alertThresholdHours: 24,
      sessionTimeoutMinutes: 60,
      autoBackupEnabled: true,
      updatedAt: new Date().toISOString()
    });
  }

  public saveSystemSettings(settings: SystemSettings): void {
    settings.updatedAt = new Date().toISOString();
    this.set(STORAGE_KEYS.SYSTEM_SETTINGS, settings);
    this.addAuditLog('ADMIN', 'admin', 'تحديث إعدادات النظام', 'SystemSettings', settings.id, 'تم تحديث الإعدادات العامة للنظام.');
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    const logs = this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    return logs.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }

  public addAuditLog(userId: string, username: string, action: string, entity: string, entityId?: string, details: string = ''): void {
    const logs = this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const user = this.getUserById(userId);
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      username,
      userFullName: user?.fullName || username,
      action,
      entity,
      entityId,
      dateTime: new Date().toISOString(),
      ip: '192.168.1.100',
      details
    };
    logs.unshift(newLog);
    // Keep last 1000 logs
    if (logs.length > 1000) logs.length = 1000;
    this.set(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- Backup & Restore ---
  public exportFullBackup(): string {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      systemSettings: this.getSystemSettings(),
      academicYears: this.getAcademicYears(),
      weeks: this.getWeeks(),
      schools: this.getSchools(),
      activities: this.getActivities(),
      supervisors: this.getSupervisors(),
      users: this.getUsers(),
      weeklyPrograms: this.getWeeklyPrograms(),
      programItems: this.get<ProgramItem[]>(STORAGE_KEYS.PROGRAM_ITEMS, []),
      programReviews: this.get<ProgramReview[]>(STORAGE_KEYS.PROGRAM_REVIEWS, []),
      notifications: this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []),
      auditLogs: this.getAuditLogs()
    };
    return JSON.stringify(backupData, null, 2);
  }

  public importFullBackup(jsonContent: string): boolean {
    try {
      const data = JSON.parse(jsonContent);
      if (!data.users || !data.supervisors || !data.schools) {
        throw new Error('Invalid backup schema');
      }
      if (data.systemSettings) this.set(STORAGE_KEYS.SYSTEM_SETTINGS, data.systemSettings);
      if (data.academicYears) this.set(STORAGE_KEYS.ACADEMIC_YEARS, data.academicYears);
      if (data.weeks) this.set(STORAGE_KEYS.WEEKS, data.weeks);
      if (data.schools) this.set(STORAGE_KEYS.SCHOOLS, data.schools);
      if (data.activities) this.set(STORAGE_KEYS.ACTIVITIES, data.activities);
      if (data.supervisors) this.set(STORAGE_KEYS.SUPERVISORS, data.supervisors);
      if (data.users) this.set(STORAGE_KEYS.USERS, data.users);
      if (data.weeklyPrograms) this.set(STORAGE_KEYS.WEEKLY_PROGRAMS, data.weeklyPrograms);
      if (data.programItems) this.set(STORAGE_KEYS.PROGRAM_ITEMS, data.programItems);
      if (data.programReviews) this.set(STORAGE_KEYS.PROGRAM_REVIEWS, data.programReviews);
      if (data.notifications) this.set(STORAGE_KEYS.NOTIFICATIONS, data.notifications);
      if (data.auditLogs) this.set(STORAGE_KEYS.AUDIT_LOGS, data.auditLogs);

      this.addAuditLog('ADMIN', 'admin', 'استعادة قاعدة البيانات', 'Backup', undefined, `تمت استعادة نسخة احتياطية بتاريخ ${data.timestamp || 'غير محدد'}`);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  public resetToFactoryDefaults(): void {
    localStorage.clear();
    this.initializeDatabase();
  }
}

export const storage = new StorageService();
