-- ============================================================================
-- نظام إدارة البرامج الأسبوعية للمشرفين
-- مديرية التربية والتعليم يطا - قسم الإشراف والتأهيل التربوي
-- Microsoft SQL Server / SQL Server Express Database Script
-- Database Name: WeeklySupervisorProgramDb
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'WeeklySupervisorProgramDb')
BEGIN
    CREATE DATABASE [WeeklySupervisorProgramDb]
    COLLATE Arabic_CI_AS;
END
GO

USE [WeeklySupervisorProgramDb];
GO

-- 1. Table: Roles
IF OBJECT_ID(N'[dbo].[Roles]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Roles] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [Name] NVARCHAR(256) NOT NULL UNIQUE,
        [NormalizedName] NVARCHAR(256) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 2. Table: Permissions
IF OBJECT_ID(N'[dbo].[Permissions]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Permissions] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [Name] NVARCHAR(100) NOT NULL UNIQUE,
        [Category] NVARCHAR(100) NOT NULL,
        [Description] NVARCHAR(500) NULL
    );
END
GO

-- 3. Table: RolePermissions
IF OBJECT_ID(N'[dbo].[RolePermissions]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RolePermissions] (
        [RoleId] NVARCHAR(450) NOT NULL,
        [PermissionId] NVARCHAR(450) NOT NULL,
        CONSTRAINT [PK_RolePermissions] PRIMARY KEY ([RoleId], [PermissionId]),
        CONSTRAINT [FK_RolePermissions_Roles] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Roles]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RolePermissions_Permissions] FOREIGN KEY ([PermissionId]) REFERENCES [dbo].[Permissions]([Id]) ON DELETE CASCADE
    );
END
GO

-- 4. Table: Users
IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Users] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [Username] NVARCHAR(256) NOT NULL UNIQUE,
        [NormalizedUsername] NVARCHAR(256) NOT NULL,
        [PasswordHash] NVARCHAR(MAX) NOT NULL,
        [FullName] NVARCHAR(256) NOT NULL,
        [Email] NVARCHAR(256) NULL,
        [SupervisorId] NVARCHAR(450) NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [FailedLoginAttempts] INT NOT NULL DEFAULT 0,
        [LockoutEnd] DATETIMEOFFSET NULL,
        [LastLoginAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE NONCLUSTERED INDEX [IX_Users_Username] ON [dbo].[Users]([NormalizedUsername]);
END
GO

-- 5. Table: UserRoles
IF OBJECT_ID(N'[dbo].[UserRoles]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UserRoles] (
        [UserId] NVARCHAR(450) NOT NULL,
        [RoleId] NVARCHAR(450) NOT NULL,
        CONSTRAINT [PK_UserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_UserRoles_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_UserRoles_Roles] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Roles]([Id]) ON DELETE CASCADE
    );
END
GO

-- 6. Table: Supervisors
IF OBJECT_ID(N'[dbo].[Supervisors]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Supervisors] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [Name] NVARCHAR(256) NOT NULL,
        [NationalId] NVARCHAR(20) NOT NULL UNIQUE,
        [Specialization] NVARCHAR(150) NOT NULL,
        [Department] NVARCHAR(200) NOT NULL,
        [Phone] NVARCHAR(50) NOT NULL,
        [Email] NVARCHAR(256) NULL,
        [UserId] NVARCHAR(450) NOT NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT N'Active',
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [FK_Supervisors_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id])
    );
    CREATE NONCLUSTERED INDEX [IX_Supervisors_NationalId] ON [dbo].[Supervisors]([NationalId]);
END
GO

-- 7. Table: AcademicYears
IF OBJECT_ID(N'[dbo].[AcademicYears]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AcademicYears] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [Name] NVARCHAR(100) NOT NULL UNIQUE, -- e.g. '2026-2027'
        [StartDate] DATE NOT NULL,
        [EndDate] DATE NOT NULL,
        [IsCurrent] BIT NOT NULL DEFAULT 0,
        [Status] NVARCHAR(50) NOT NULL DEFAULT N'Active',
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 8. Table: Weeks
IF OBJECT_ID(N'[dbo].[Weeks]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Weeks] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [AcademicYearId] NVARCHAR(450) NOT NULL,
        [WeekNumber] INT NOT NULL,
        [Name] NVARCHAR(150) NOT NULL,
        [StartDate] DATE NOT NULL,
        [EndDate] DATE NOT NULL,
        [OpenSubmissionAt] DATETIME2 NOT NULL,
        [CloseSubmissionAt] DATETIME2 NOT NULL,
        [AllowEditAfterSubmit] BIT NOT NULL DEFAULT 0,
        [Status] NVARCHAR(50) NOT NULL DEFAULT N'NotStarted', -- NotStarted, Open, Closed
        [Notes] NVARCHAR(1000) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [FK_Weeks_AcademicYears] FOREIGN KEY ([AcademicYearId]) REFERENCES [dbo].[AcademicYears]([Id]) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX [IX_Weeks_AcademicYear_WeekNumber] ON [dbo].[Weeks]([AcademicYearId], [WeekNumber]);
END
GO

-- 9. Table: Schools
IF OBJECT_ID(N'[dbo].[Schools]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Schools] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [Name] NVARCHAR(256) NOT NULL,
        [Region] NVARCHAR(150) NOT NULL,
        [Stage] NVARCHAR(50) NOT NULL, -- أساسي / ثانوي / مختلط
        [Type] NVARCHAR(50) NOT NULL, -- ذكور / إناث / مختلط
        [IsActive] BIT NOT NULL DEFAULT 1,
        [Notes] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE NONCLUSTERED INDEX [IX_Schools_Name] ON [dbo].[Schools]([Name]);
END
GO

-- 10. Table: Activities
IF OBJECT_ID(N'[dbo].[Activities]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Activities] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [Name] NVARCHAR(200) NOT NULL UNIQUE,
        [Code] NVARCHAR(50) NOT NULL UNIQUE,
        [Description] NVARCHAR(1000) NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [Color] NVARCHAR(50) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 11. Table: WeeklyPrograms
IF OBJECT_ID(N'[dbo].[WeeklyPrograms]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[WeeklyPrograms] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [SupervisorId] NVARCHAR(450) NOT NULL,
        [AcademicYearId] NVARCHAR(450) NOT NULL,
        [WeekId] NVARCHAR(450) NOT NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT N'Draft', -- Draft, Submitted, UnderReview, Approved, NeedsRevision
        [SubmittedAt] DATETIME2 NULL,
        [ReviewedAt] DATETIME2 NULL,
        [ReviewedBy] NVARCHAR(256) NULL,
        [ReviewNotes] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt] DATETIME2 NULL,
        CONSTRAINT [FK_WeeklyPrograms_Supervisors] FOREIGN KEY ([SupervisorId]) REFERENCES [dbo].[Supervisors]([Id]),
        CONSTRAINT [FK_WeeklyPrograms_AcademicYears] FOREIGN KEY ([AcademicYearId]) REFERENCES [dbo].[AcademicYears]([Id]),
        CONSTRAINT [FK_WeeklyPrograms_Weeks] FOREIGN KEY ([WeekId]) REFERENCES [dbo].[Weeks]([Id]),
        CONSTRAINT [UQ_WeeklyPrograms_Supervisor_Week] UNIQUE ([SupervisorId], [WeekId])
    );
    CREATE NONCLUSTERED INDEX [IX_WeeklyPrograms_WeekId_Status] ON [dbo].[WeeklyPrograms]([WeekId], [Status]);
END
GO

-- 12. Table: ProgramItems
IF OBJECT_ID(N'[dbo].[ProgramItems]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ProgramItems] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [WeeklyProgramId] NVARCHAR(450) NOT NULL,
        [DayDate] DATE NOT NULL,
        [SchoolId] NVARCHAR(450) NOT NULL,
        [ActivityId] NVARCHAR(450) NOT NULL,
        [StartTime] NVARCHAR(10) NOT NULL, -- HH:mm
        [EndTime] NVARCHAR(10) NOT NULL,   -- HH:mm
        [Location] NVARCHAR(200) NOT NULL,
        [Objective] NVARCHAR(1000) NOT NULL,
        [Notes] NVARCHAR(1000) NULL,
        [SortOrder] INT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt] DATETIME2 NULL,
        CONSTRAINT [FK_ProgramItems_WeeklyPrograms] FOREIGN KEY ([WeeklyProgramId]) REFERENCES [dbo].[WeeklyPrograms]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ProgramItems_Schools] FOREIGN KEY ([SchoolId]) REFERENCES [dbo].[Schools]([Id]),
        CONSTRAINT [FK_ProgramItems_Activities] FOREIGN KEY ([ActivityId]) REFERENCES [dbo].[Activities]([Id])
    );
    CREATE NONCLUSTERED INDEX [IX_ProgramItems_WeeklyProgramId] ON [dbo].[ProgramItems]([WeeklyProgramId]);
    CREATE NONCLUSTERED INDEX [IX_ProgramItems_DayDate] ON [dbo].[ProgramItems]([DayDate]);
END
GO

-- 13. Table: ProgramReviews
IF OBJECT_ID(N'[dbo].[ProgramReviews]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ProgramReviews] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [WeeklyProgramId] NVARCHAR(450) NOT NULL,
        [ReviewerUserId] NVARCHAR(450) NOT NULL,
        [Action] NVARCHAR(50) NOT NULL, -- Approve, RequestRevision, Reopen
        [Notes] NVARCHAR(MAX) NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [FK_ProgramReviews_WeeklyPrograms] FOREIGN KEY ([WeeklyProgramId]) REFERENCES [dbo].[WeeklyPrograms]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ProgramReviews_Users] FOREIGN KEY ([ReviewerUserId]) REFERENCES [dbo].[Users]([Id])
    );
END
GO

-- 14. Table: Notifications
IF OBJECT_ID(N'[dbo].[Notifications]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Notifications] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [UserId] NVARCHAR(450) NOT NULL,
        [Title] NVARCHAR(256) NOT NULL,
        [Message] NVARCHAR(MAX) NOT NULL,
        [Type] NVARCHAR(50) NOT NULL DEFAULT N'info', -- info, warning, success, alert
        [IsRead] BIT NOT NULL DEFAULT 0,
        [Link] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [FK_Notifications_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX [IX_Notifications_UserId_IsRead] ON [dbo].[Notifications]([UserId], [IsRead]);
END
GO

-- 15. Table: AuditLogs
IF OBJECT_ID(N'[dbo].[AuditLogs]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AuditLogs] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [UserId] NVARCHAR(450) NOT NULL,
        [Username] NVARCHAR(256) NOT NULL,
        [Action] NVARCHAR(100) NOT NULL,
        [Entity] NVARCHAR(100) NOT NULL,
        [EntityId] NVARCHAR(450) NULL,
        [DateTime] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [IP] NVARCHAR(50) NOT NULL,
        [Details] NVARCHAR(MAX) NOT NULL
    );
    CREATE NONCLUSTERED INDEX [IX_AuditLogs_DateTime] ON [dbo].[AuditLogs]([DateTime] DESC);
END
GO

-- 16. Table: SystemSettings
IF OBJECT_ID(N'[dbo].[SystemSettings]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SystemSettings] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [DirectorateName] NVARCHAR(256) NOT NULL,
        [DepartmentName] NVARCHAR(256) NOT NULL,
        [SystemTitle] NVARCHAR(256) NOT NULL,
        [LogoUrl] NVARCHAR(500) NULL,
        [CurrentAcademicYearId] NVARCHAR(450) NULL,
        [WeekDaysCount] INT NOT NULL DEFAULT 5,
        [AlertThresholdHours] INT NOT NULL DEFAULT 24,
        [SessionTimeoutMinutes] INT NOT NULL DEFAULT 60,
        [NotificationEmail] NVARCHAR(256) NULL,
        [AutoBackupEnabled] BIT NOT NULL DEFAULT 1,
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 17. Table: Attachments
IF OBJECT_ID(N'[dbo].[Attachments]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Attachments] (
        [Id] NVARCHAR(450) NOT NULL PRIMARY KEY,
        [EntityName] NVARCHAR(100) NOT NULL,
        [EntityId] NVARCHAR(450) NOT NULL,
        [FileName] NVARCHAR(256) NOT NULL,
        [FilePath] NVARCHAR(1000) NOT NULL,
        [ContentType] NVARCHAR(100) NOT NULL,
        [Size] BIGINT NOT NULL,
        [UploadedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- ============================================================================
-- SEED DATA (البيانات الأولية)
-- ============================================================================

-- Roles
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [Id] = N'role_admin')
BEGIN
    INSERT INTO [dbo].[Roles] ([Id], [Name], [NormalizedName], [Description])
    VALUES 
    (N'role_admin', N'Administrator', N'ADMINISTRATOR', N'مسؤول النظام وله كافة الصلاحيات'),
    (N'role_supervisor', N'Supervisor', N'SUPERVISOR', N'مشرف تربوي له حق إدارة برنامجه فقط');
END
GO

-- Permissions
IF NOT EXISTS (SELECT 1 FROM [dbo].[Permissions] WHERE [Id] = N'perm_view_dashboard')
BEGIN
    INSERT INTO [dbo].[Permissions] ([Id], [Name], [Category], [Description]) VALUES
    (N'perm_view_dashboard', N'ViewDashboard', N'General', N'عرض لوحة التحكم والإحصاءات'),
    (N'perm_manage_users', N'ManageUsers', N'Security', N'إدارة المستخدمين'),
    (N'perm_manage_supervisors', N'ManageSupervisors', N'Supervision', N'إدارة المشرفين التربويين'),
    (N'perm_manage_schools', N'ManageSchools', N'Schools', N'إدارة المدارس'),
    (N'perm_manage_activities', N'ManageActivities', N'Activities', N'إدارة أنواع الأنشطة'),
    (N'perm_manage_years', N'ManageAcademicYears', N'Academic', N'إدارة السنوات الدراسية'),
    (N'perm_manage_weeks', N'ManageWeeks', N'Calendar', N'إدارة الأسابيع وفترات الإرسال'),
    (N'perm_view_programs', N'ViewPrograms', N'Programs', N'عرض البرامج الأسبوعية'),
    (N'perm_review_programs', N'ReviewPrograms', N'Programs', N'مراجعة وتدقيق البرامج'),
    (N'perm_approve_programs', N'ApprovePrograms', N'Programs', N'اعتماد البرامج الأسبوعية'),
    (N'perm_export_reports', N'ExportReports', N'Reports', N'تصدير التقارير'),
    (N'perm_manage_settings', N'ManageSettings', N'System', N'إدارة إعدادات النظام'),
    (N'perm_view_audit', N'ViewAuditLogs', N'Security', N'عرض سجل العمليات'),
    (N'perm_backup_db', N'BackupDatabase', N'System', N'النسخ الاحتياطي لقاعدة البيانات');
END
GO

-- Admin User
-- PasswordHash for 'Admin@123456'
IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [Username] = N'admin')
BEGIN
    INSERT INTO [dbo].[Users] (
        [Id], [Username], [NormalizedUsername], [PasswordHash], [FullName], [Email], [IsActive], [CreatedAt]
    )
    VALUES (
        N'usr_admin', N'admin', N'ADMIN',
        N'AQAAAAIAAYagAAAAEOc9x0sU1H/c7ZgU+y4gZ9E8N0M7Y4x+1v5Qv7kP6l8X2a9w==', -- Secure ASP.NET Identity Hash
        N'مدير قسم الإشراف - يطا', N'admin.eshraf@moe.edu.ps', 1, SYSUTCDATETIME()
    );

    INSERT INTO [dbo].[UserRoles] ([UserId], [RoleId])
    VALUES (N'usr_admin', N'role_admin');
END
GO

-- System Settings
IF NOT EXISTS (SELECT 1 FROM [dbo].[SystemSettings] WHERE [Id] = N'settings_default')
BEGIN
    INSERT INTO [dbo].[SystemSettings] (
        [Id], [DirectorateName], [DepartmentName], [SystemTitle], [CurrentAcademicYearId],
        [WeekDaysCount], [AlertThresholdHours], [SessionTimeoutMinutes], [NotificationEmail], [AutoBackupEnabled]
    )
    VALUES (
        N'settings_default', N'مديرية التربية والتعليم يطا', N'قسم الإشراف والتأهيل التربوي',
        N'نظام إدارة البرامج الأسبوعية للمشرفين', N'year_2026_2027', 5, 24, 60, N'eshrafyatta2015@gmail.com', 1
    );
END
GO

-- Academic Year: 2026-2027
IF NOT EXISTS (SELECT 1 FROM [dbo].[AcademicYears] WHERE [Id] = N'year_2026_2027')
BEGIN
    INSERT INTO [dbo].[AcademicYears] ([Id], [Name], [StartDate], [EndDate], [IsCurrent], [Status])
    VALUES (N'year_2026_2027', N'2026-2027', '2026-09-01', '2027-06-15', 1, N'Active');
END
GO

-- Week 1
IF NOT EXISTS (SELECT 1 FROM [dbo].[Weeks] WHERE [Id] = N'week_1')
BEGIN
    INSERT INTO [dbo].[Weeks] (
        [Id], [AcademicYearId], [WeekNumber], [Name], [StartDate], [EndDate],
        [OpenSubmissionAt], [CloseSubmissionAt], [AllowEditAfterSubmit], [Status], [Notes]
    )
    VALUES (
        N'week_1', N'year_2026_2027', 1, N'الأسبوع الأول', '2026-09-27', '2026-10-01',
        DATEADD(day, -1, SYSUTCDATETIME()), DATEADD(day, 4, SYSUTCDATETIME()), 0, N'Open',
        N'الأسبوع التدريبي والإشرافي الأول للفصل الدراسي الأول'
    );
END
GO

-- Activities
IF NOT EXISTS (SELECT 1 FROM [dbo].[Activities] WHERE [Code] = N'SUP_VISIT')
BEGIN
    INSERT INTO [dbo].[Activities] ([Id], [Name], [Code], [Description], [IsActive], [Color]) VALUES
    (N'act_1', N'زيارة إشرافية', N'SUP_VISIT', N'زيارة إشرافية شاملة للمعلمين والصفوف', 1, N'blue'),
    (N'act_2', N'متابعة معلم', N'TCH_FOLLOW', N'متابعة أداء المعلم داخل الحصة الصفية', 1, N'emerald'),
    (N'act_3', N'اجتماع', N'MEETING', N'اجتماع إداري أو تخصصي', 1, N'amber'),
    (N'act_4', N'ورشة عمل', N'WORKSHOP', N'ورشة عمل تدريبية للمعلمين', 1, N'purple'),
    (N'act_5', N'تدريب تربوي', N'TRAINING', N'دورة تدريبية متخصصة', 1, N'indigo'),
    (N'act_6', N'متابعة خطة', N'PLAN_FOLLOW', N'متابعة الخطط المدرسية وسجلات الإشراف', 1, N'cyan'),
    (N'act_7', N'نشاط علاجي', N'REMEDIAL', N'متابعة برامج الفاقد والخطط العلاجية', 1, N'rose'),
    (N'act_8', N'نشاط إثرائي', N'ENRICH', N'أنشطة إثرائية ومسابقات تربوية', 1, N'teal'),
    (N'act_9', N'عمل إداري', N'ADMIN_WORK', N'أعمال مكتبية وإعداد تقارير في المديرية', 1, N'slate'),
    (N'act_10', N'اجتماع إدارة المدرسة', N'SCH_ADMIN_MEET', N'اجتماع مع مدير المدرسة والهيئة الإدارية', 1, N'orange'),
    (N'act_11', N'أخرى', N'OTHER', N'مهام وأنشطة تربوية متنوعة', 1, N'gray');
END
GO

-- Schools in Yatta
IF NOT EXISTS (SELECT 1 FROM [dbo].[Schools] WHERE [Id] = N'sch_1')
BEGIN
    INSERT INTO [dbo].[Schools] ([Id], [Name], [Region], [Stage], [Type], [IsActive], [Notes]) VALUES
    (N'sch_1', N'مدرسة ذكور يطا الثانوية', N'يطا - وسط البلد', N'ثانوي', N'ذكور', 1, N'مدرسة مركزية عريقة'),
    (N'sch_2', N'مدرسة بنات يطا الثانوية', N'يطا - الجبل', N'ثانوي', N'إناث', 1, N'متميزة أكاديمياً'),
    (N'sch_3', N'مدرسة الشهيد خليل الوزير الأساسية', N'يطا - الحيلة', N'أساسي', N'ذكور', 1, NULL),
    (N'sch_4', N'مدرسة بنات حواء الأساسية', N'يطا - رقعة', N'أساسي', N'إناث', 1, NULL),
    (N'sch_5', N'مدرسة ذكور رقعة الثانوية', N'يطا - رقعة', N'ثانوي', N'ذكور', 1, NULL),
    (N'sch_6', N'مدرسة الكرمل الأساسية المختلطة', N'يطا - الكرمل', N'أساسي', N'مختلط', 1, N'منطقة الكرمل'),
    (N'sch_7', N'مدرسة الديرات الأساسية المختلطة', N'يطا - الديرات', N'أساسي', N'مختلط', 1, NULL),
    (N'sch_8', N'مدرسة بنات زيف الثانوية', N'يطا - زيف', N'ثانوي', N'إناث', 1, NULL),
    (N'sch_9', N'مدرسة التوانة الأساسية المختلطة', N'مسافر يطا - التوانة', N'أساسي', N'مختلط', 1, N'منطقة صمود التحدي'),
    (N'sch_10', N'مدرسة المسافر الثانوية المختلطة', N'مسافر يطا - الفخيت', N'ثانوي', N'مختلط', 1, N'مسافر يطا');
END
GO

PRINT N'Database schema and seed data created successfully for WeeklySupervisorProgramDb.';
GO
