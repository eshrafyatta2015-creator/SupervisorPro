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
  Permission
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
    const initialized = localStorage.getItem('wsp_initialized');
    if (initialized) return;

    console.log('Seeding initial database for WeeklySupervisorProgram...');

    // 1. Password Hashes store
    const passwordHashes: Record<string, string> = {};
    const defaultPassword = 'Admin@123456';
    const supervisorPassword = 'User@123456';
    const adminHash = await hashPassword(defaultPassword);
    const supHash = await hashPassword(supervisorPassword);

    passwordHashes['admin'] = adminHash;

    // 2. System Settings
    const defaultSettings: SystemSettings = {
      id: 'settings_1',
      directorateName: 'مديرية التربية والتعليم يطا',
      departmentName: 'قسم الإشراف والتأهيل التربوي',
      systemTitle: 'نظام إدارة البرامج الأسبوعية للمشرفين',
      logoUrl: '/src/assets/images/yatta_education_logo_1790448667179.jpg',
      currentAcademicYearId: 'year_2026_2027',
      weekDaysCount: 5,
      alertThresholdHours: 24,
      sessionTimeoutMinutes: 60,
      notificationEmail: 'eshrafyatta2015@gmail.com',
      autoBackupEnabled: true,
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

    // 7. Supervisors & Linked Users (10 Real Supervisors for Yatta Directorate)
    const rawSupervisors = [
      { name: 'د. أحمد خليل النجار', username: 'ahmad.najjar', nationalId: '984512301', spec: 'الرياضيات', dept: 'الإشراف التربوي - العلوم والرياضيات', phone: '0599123451', email: 'a.najjar@moe.edu.ps' },
      { name: 'أ. فاطمة إبراهيم خليل', username: 'fatima.khalil', nationalId: '984512302', spec: 'اللغة العربية', dept: 'الإشراف التربوي - الإنسانيات', phone: '0599123452', email: 'f.khalil@moe.edu.ps' },
      { name: 'أ. محمود عبد الرحمن الهريني', username: 'mahmoud.horeini', nationalId: '984512303', spec: 'اللغة الإنجليزية', dept: 'الإشراف التربوي - اللغات', phone: '0599123453', email: 'm.horeini@moe.edu.ps' },
      { name: 'أ. مريم يوسف أبو عرام', username: 'maryam.aram', nationalId: '984512304', spec: 'العلوم العامة والفيزياء', dept: 'الإشراف التربوي - العلوم', phone: '0599123454', email: 'm.aram@moe.edu.ps' },
      { name: 'أ. يوسف إسماعيل الشواهين', username: 'yousef.shawahin', nationalId: '984512305', spec: 'الاجتماعيات والتاريخ', dept: 'الإشراف التربوي - الإنسانيات', phone: '0599123455', email: 'y.shawahin@moe.edu.ps' },
      { name: 'أ. خديجة عيسى بحيص', username: 'khadija.bheis', nationalId: '984512306', spec: 'التربية الإسلامية', dept: 'الإشراف التربوي - الإنسانيات', phone: '0599123456', email: 'k.bheis@moe.edu.ps' },
      { name: 'أ. إبراهيم محمد الجبارين', username: 'ibrahim.jabareen', nationalId: '984512307', spec: 'تكنولوجيا المعلومات والحاسوب', dept: 'الإشراف التربوي - التكنولوجيا', phone: '0599123457', email: 'i.jabareen@moe.edu.ps' },
      { name: 'أ. سناء صالح مخامرة', username: 'sanaa.makhamreh', nationalId: '984512308', spec: 'التربية الخاصة وصعوبات التعلم', dept: 'الإشراف التربوي - الإرشاد والتأهيل', phone: '0599123458', email: 's.makhamreh@moe.edu.ps' },
      { name: 'أ. عمر موسى الهدار', username: 'omar.haddar', nationalId: '984512309', spec: 'المرحلة الأساسية الدنيا', dept: 'الإشراف التربوي - المرحلة الأساسية', phone: '0599123459', email: 'o.haddar@moe.edu.ps' },
      { name: 'أ. رانية داود العمور', username: 'rania.ammour', nationalId: '984512310', spec: 'الصحة المدرسية والأنشطة', dept: 'الإشراف والتأهيل التربوي', phone: '0599123460', email: 'r.ammour@moe.edu.ps' }
    ];

    const users: User[] = [
      {
        id: 'usr_admin',
        username: 'admin',
        fullName: 'مدير قسم الإشراف - يطا',
        email: 'admin.eshraf@moe.edu.ps',
        role: 'Administrator',
        isActive: true,
        failedLoginAttempts: 0,
        createdAt: now.toISOString(),
        permissions: ALL_PERMISSIONS
      }
    ];

    const supervisors: Supervisor[] = [];

    rawSupervisors.forEach((s, idx) => {
      const supId = `sup_${idx + 1}`;
      const userId = `usr_sup_${idx + 1}`;
      passwordHashes[s.username] = supHash;

      users.push({
        id: userId,
        username: s.username,
        fullName: s.name,
        email: s.email,
        role: 'Supervisor',
        supervisorId: supId,
        isActive: true,
        failedLoginAttempts: 0,
        createdAt: now.toISOString(),
        permissions: ['ViewDashboard', 'ViewPrograms']
      });

      supervisors.push({
        id: supId,
        name: s.name,
        nationalId: s.nationalId,
        specialization: s.spec,
        department: s.dept,
        phone: s.phone,
        email: s.email,
        userId: userId,
        status: 'Active',
        createdAt: now.toISOString()
      });
    });

    this.set(STORAGE_KEYS.PASSWORD_HASHES, passwordHashes);
    this.set(STORAGE_KEYS.USERS, users);
    this.set(STORAGE_KEYS.SUPERVISORS, supervisors);

    // 8. Seed Sample Weekly Programs (Approved, Submitted, UnderReview, NeedsRevision, Draft)
    const weeklyPrograms: WeeklyProgram[] = [];
    const programItems: ProgramItem[] = [];
    const programReviews: ProgramReview[] = [];

    // Ahmad Najjar (Approved)
    weeklyPrograms.push({
      id: 'prog_1',
      supervisorId: 'sup_1',
      academicYearId: 'year_2026_2027',
      weekId: 'week_1',
      status: 'Approved',
      submittedAt: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
      reviewedAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
      reviewedBy: 'مدير قسم الإشراف - يطا',
      reviewNotes: 'برنامج متكامل وموزع بشكل ممتاز على مدارس الثانوية والأساسية.',
      createdAt: new Date(now.getTime() - 60 * 3600 * 1000).toISOString()
    });

    programReviews.push({
      id: 'rev_1',
      weeklyProgramId: 'prog_1',
      reviewerUserId: 'usr_admin',
      reviewerName: 'مدير قسم الإشراف - يطا',
      action: 'Approve',
      notes: 'تم اعتماد البرنامج بنجاح.',
      createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString()
    });

    // Activities for Ahmad Najjar
    programItems.push(
      {
        id: 'item_1_1',
        weeklyProgramId: 'prog_1',
        dayDate: '2026-09-27',
        dayName: 'الأحد',
        schoolId: 'sch_1',
        activityId: 'act_1',
        startTime: '08:00',
        endTime: '11:00',
        location: 'غرفة المعلمين ومختبر الرياضيات',
        objective: 'متابعة تحضير دروس الرياضيات للصفوف 10 و11 وتطبيق الاختبار التشخيصي',
        notes: 'التركيز على مهارات التفكير العليا',
        sortOrder: 1,
        createdAt: now.toISOString()
      },
      {
        id: 'item_1_2',
        weeklyProgramId: 'prog_1',
        dayDate: '2026-09-28',
        dayName: 'الإثنين',
        schoolId: 'sch_3',
        activityId: 'act_2',
        startTime: '08:30',
        endTime: '11:30',
        location: 'الصفوف الأساسية',
        objective: 'متابعة المعلمين الجدد في استراتيجيات التعلم النشط',
        notes: '',
        sortOrder: 2,
        createdAt: now.toISOString()
      },
      {
        id: 'item_1_3',
        weeklyProgramId: 'prog_1',
        dayDate: '2026-09-29',
        dayName: 'الثلاثاء',
        schoolId: 'sch_5',
        activityId: 'act_4',
        startTime: '09:00',
        endTime: '12:00',
        location: 'مكتبة المدرسة',
        objective: 'ورشة عمل حول توظيف التطبيقات الرقمية في تدريس الرياضيات',
        notes: 'حضور معلمي المبحث في المنطقة',
        sortOrder: 3,
        createdAt: now.toISOString()
      }
    );

    // Fatima Khalil (Submitted - Waiting Review)
    weeklyPrograms.push({
      id: 'prog_2',
      supervisorId: 'sup_2',
      academicYearId: 'year_2026_2027',
      weekId: 'week_1',
      status: 'Submitted',
      submittedAt: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 30 * 3600 * 1000).toISOString()
    });

    programItems.push(
      {
        id: 'item_2_1',
        weeklyProgramId: 'prog_2',
        dayDate: '2026-09-27',
        dayName: 'الأحد',
        schoolId: 'sch_2',
        activityId: 'act_1',
        startTime: '08:00',
        endTime: '10:30',
        location: 'مدرسة بنات يطا الثانوية',
        objective: 'متابعة المنهاج الجديد للغة العربية للصف العاشر',
        notes: '',
        sortOrder: 1,
        createdAt: now.toISOString()
      },
      {
        id: 'item_2_2',
        weeklyProgramId: 'prog_2',
        dayDate: '2026-09-29',
        dayName: 'الثلاثاء',
        schoolId: 'sch_4',
        activityId: 'act_7',
        startTime: '08:30',
        endTime: '11:00',
        location: 'غرفة مصادر التعلم',
        objective: 'تقييم نتائج الاختبار التشخيصي للقرائية والكتابة',
        notes: 'تنفيذ حصص علاجية للضعاف',
        sortOrder: 2,
        createdAt: now.toISOString()
      }
    );

    // Mahmoud Horeini (NeedsRevision)
    weeklyPrograms.push({
      id: 'prog_3',
      supervisorId: 'sup_3',
      academicYearId: 'year_2026_2027',
      weekId: 'week_1',
      status: 'NeedsRevision',
      submittedAt: new Date(now.getTime() - 18 * 3600 * 1000).toISOString(),
      reviewedAt: new Date(now.getTime() - 6 * 3600 * 1000).toISOString(),
      reviewedBy: 'مدير قسم الإشراف - يطا',
      reviewNotes: 'يرجى تعديل برنامج يوم الثلاثاء وإضافة النشاط الإشرافي لمتابعة المعلمين الجدد في مسافر يطا.',
      createdAt: new Date(now.getTime() - 28 * 3600 * 1000).toISOString()
    });

    programReviews.push({
      id: 'rev_2',
      weeklyProgramId: 'prog_3',
      reviewerUserId: 'usr_admin',
      reviewerName: 'مدير قسم الإشراف - يطا',
      action: 'RequestRevision',
      notes: 'يرجى تعديل برنامج يوم الثلاثاء وإضافة النشاط الإشرافي لمتابعة المعلمين الجدد في مسافر يطا.',
      createdAt: new Date(now.getTime() - 6 * 3600 * 1000).toISOString()
    });

    programItems.push({
      id: 'item_3_1',
      weeklyProgramId: 'prog_3',
      dayDate: '2026-09-28',
      dayName: 'الإثنين',
      schoolId: 'sch_1',
      activityId: 'act_1',
      startTime: '08:00',
      endTime: '10:00',
      location: 'مختبر اللغات',
      objective: 'متابعة مهارات المحادثة باللغة الإنجليزية',
      notes: '',
      sortOrder: 1,
      createdAt: now.toISOString()
    });

    // Maryam Abu Aram (Draft)
    weeklyPrograms.push({
      id: 'prog_4',
      supervisorId: 'sup_4',
      academicYearId: 'year_2026_2027',
      weekId: 'week_1',
      status: 'Draft',
      createdAt: new Date(now.getTime() - 10 * 3600 * 1000).toISOString()
    });

    programItems.push({
      id: 'item_4_1',
      weeklyProgramId: 'prog_4',
      dayDate: '2026-09-27',
      dayName: 'الأحد',
      schoolId: 'sch_6',
      activityId: 'act_1',
      startTime: '08:30',
      endTime: '11:00',
      location: 'مختبر العلوم',
      objective: 'تفقد إجراءات السلامة في مختبر العلوم والمواد الكيميائية',
      notes: 'مسودة قيد الاستكمال',
      sortOrder: 1,
      createdAt: now.toISOString()
    });

    this.set(STORAGE_KEYS.WEEKLY_PROGRAMS, weeklyPrograms);
    this.set(STORAGE_KEYS.PROGRAM_ITEMS, programItems);
    this.set(STORAGE_KEYS.PROGRAM_REVIEWS, programReviews);

    // 9. Initial Notifications
    const notifications: Notification[] = [
      {
        id: 'notif_1',
        userId: 'usr_sup_1',
        title: 'تم اعتماد البرنامج الأسبوعي',
        message: 'تم اعتماد برنامجك الأسبوعي للأسبوع الأول بنجاح من قبل مدير القسم.',
        type: 'success',
        isRead: false,
        createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'notif_2',
        userId: 'usr_sup_3',
        title: 'مطلوب تعديل البرنامج الأسبوعي',
        message: 'يرجى مراجعة وتعديل برنامج الأسبوع الأول: يرجى تعديل برنامج يوم الثلاثاء وإضافة النشاط الإشرافي لمتابعة المعلمين الجدد.',
        type: 'warning',
        isRead: false,
        createdAt: new Date(now.getTime() - 6 * 3600 * 1000).toISOString()
      },
      {
        id: 'notif_3',
        userId: 'usr_sup_5',
        title: 'تنبيه موعد إرسال البرنامج',
        message: 'يرجى العلم بأن فترة إرسال البرنامج الأسبوعي للأسبوع الأول مفتوحة حالياً، نرجو المبادرة بالإرسال قبل انتهاء الموعد.',
        type: 'info',
        isRead: false,
        createdAt: new Date(now.getTime() - 10 * 3600 * 1000).toISOString()
      }
    ];
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
      },
      {
        id: 'log_3',
        userId: 'usr_sup_1',
        username: 'ahmad.najjar',
        userFullName: 'د. أحمد خليل النجار',
        action: 'إرسال برنامج',
        entity: 'WeeklyProgram',
        entityId: 'prog_1',
        dateTime: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
        ip: '192.168.1.34',
        details: 'تم إرسال البرنامج الأسبوعي للأسبوع الأول بنجاح (3 أنشطة).'
      },
      {
        id: 'log_4',
        userId: 'usr_admin',
        username: 'admin',
        userFullName: 'مدير قسم الإشراف - يطا',
        action: 'اعتماد برنامج',
        entity: 'WeeklyProgram',
        entityId: 'prog_1',
        dateTime: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
        ip: '192.168.1.15',
        details: 'تم اعتماد برنامج المشرف د. أحمد خليل النجار للأسبوع الأول.'
      }
    ];
    this.set(STORAGE_KEYS.AUDIT_LOGS, auditLogs);

    localStorage.setItem('wsp_initialized', 'true');
  }

  // --- Auth & Session ---
  public getCurrentUser(): User | null {
    return this.get<User | null>(STORAGE_KEYS.SESSION, null);
  }

  public async login(username: string, passwordPlain: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const users = this.get<User[]>(STORAGE_KEYS.USERS, []);
    const hashes = this.get<Record<string, string>>(STORAGE_KEYS.PASSWORD_HASHES, {});

    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) {
      this.addAuditLog('SYSTEM', 'GUEST', 'محاولة تسجيل دخول فاشلة', 'Auth', undefined, `اسم مستخدم غير موجود: ${username}`);
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }

    // Check account active
    if (!user.isActive) {
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

    if (storedHash !== computedHash) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockoutEnd = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins lock
        this.saveUser(user);
        this.addAuditLog(user.id, user.username, 'إقفال حساب', 'Auth', user.id, 'تم إقفال الحساب لتجاوز 5 محاولات فاشلة.');
        return { success: false, error: 'تم إقفال الحساب لمدة 15 دقيقة بسبب تكرار المحاولات الفاشلة.' };
      }
      this.saveUser(user);
      return { success: false, error: `كلمة المرور غير صحيحة. محاولات متبقية: ${5 - user.failedLoginAttempts}` };
    }

    // Reset failed attempts & set last login
    user.failedLoginAttempts = 0;
    user.lockoutEnd = undefined;
    user.lastLoginAt = new Date().toISOString();
    this.saveUser(user);
    this.set(STORAGE_KEYS.SESSION, user);

    this.addAuditLog(user.id, user.username, 'تسجيل دخول ناجح', 'Auth', user.id, `تسجيل دخول للدور: ${user.role}`);
    return { success: true, user };
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

  // --- Weekly Programs & Items ---
  public getWeeklyPrograms(): WeeklyProgram[] {
    return this.get<WeeklyProgram[]>(STORAGE_KEYS.WEEKLY_PROGRAMS, []);
  }

  public getProgramById(id: string): WeeklyProgram | undefined {
    return this.getWeeklyPrograms().find(p => p.id === id);
  }

  public getProgramBySupervisorAndWeek(supervisorId: string, weekId: string): WeeklyProgram | undefined {
    return this.getWeeklyPrograms().find(p => p.supervisorId === supervisorId && p.weekId === weekId);
  }

  public getProgramItems(programId: string): ProgramItem[] {
    const all = this.get<ProgramItem[]>(STORAGE_KEYS.PROGRAM_ITEMS, []);
    return all.filter(i => i.weeklyProgramId === programId).sort((a, b) => a.dayDate.localeCompare(b.dayDate) || a.startTime.localeCompare(b.startTime));
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
        status: 'Draft',
        createdAt: now
      };
      this.saveProgram(targetProg);
    } else {
      targetProg.status = 'Draft';
      this.saveProgram(targetProg);
    }

    // Map items to new week dates
    const currentWeekStart = new Date(currentWeek.startDate);
    const prevWeek = this.getWeekById(previousWeekId);
    const prevWeekStart = prevWeek ? new Date(prevWeek.startDate) : currentWeekStart;

    prevItems.forEach(oldItem => {
      const oldItemDate = new Date(oldItem.dayDate);
      const dayDiff = Math.round((oldItemDate.getTime() - prevWeekStart.getTime()) / (24 * 3600 * 1000));
      const newItemDate = new Date(currentWeekStart.getTime() + dayDiff * 24 * 3600 * 1000);

      const yyyy = newItemDate.getFullYear();
      const mm = String(newItemDate.getMonth() + 1).padStart(2, '0');
      const dd = String(newItemDate.getDate()).padStart(2, '0');
      const newDateFormatted = `${yyyy}-${mm}-${dd}`;

      const newItem: ProgramItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        weeklyProgramId: targetProg!.id,
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

    this.addAuditLog('SUPERVISOR', supervisorId, 'نسخ برنامج الأسبوع السابق', 'WeeklyProgram', targetProg.id, `نسخ من ${previousWeekId} إلى ${currentWeekId} كمسودة`);
    return targetProg;
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
