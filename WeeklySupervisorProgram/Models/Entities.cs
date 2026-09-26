using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WeeklySupervisorProgram.Models
{
    public class Role
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(256)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(256)]
        public string NormalizedName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
        public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }

    public class Permission
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }

    public class RolePermission
    {
        public string RoleId { get; set; } = string.Empty;
        public virtual Role Role { get; set; } = null!;

        public string PermissionId { get; set; } = string.Empty;
        public virtual Permission Permission { get; set; } = null!;
    }

    public class User
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(256)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [MaxLength(256)]
        public string NormalizedUsername { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(256)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(256)]
        public string? Email { get; set; }

        [MaxLength(450)]
        public string? SupervisorId { get; set; }

        public bool IsActive { get; set; } = true;

        public int FailedLoginAttempts { get; set; } = 0;

        public DateTimeOffset? LockoutEnd { get; set; }

        public DateTime? LastLoginAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
        public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    }

    public class UserRole
    {
        public string UserId { get; set; } = string.Empty;
        public virtual User User { get; set; } = null!;

        public string RoleId { get; set; } = string.Empty;
        public virtual Role Role { get; set; } = null!;
    }

    public class Supervisor
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(256)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string NationalId { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Specialization { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Department { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        [MaxLength(256)]
        public string? Email { get; set; }

        [Required]
        [MaxLength(450)]
        public string UserId { get; set; } = string.Empty;
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<WeeklyProgram> WeeklyPrograms { get; set; } = new List<WeeklyProgram>();
    }

    public class AcademicYear
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty; // e.g. "2026-2027"

        [DataType(DataType.Date)]
        public DateTime StartDate { get; set; }

        [DataType(DataType.Date)]
        public DateTime EndDate { get; set; }

        public bool IsCurrent { get; set; } = false;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<Week> Weeks { get; set; } = new List<Week>();
    }

    public class Week
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(450)]
        public string AcademicYearId { get; set; } = string.Empty;
        [ForeignKey("AcademicYearId")]
        public virtual AcademicYear AcademicYear { get; set; } = null!;

        public int WeekNumber { get; set; }

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [DataType(DataType.Date)]
        public DateTime StartDate { get; set; }

        [DataType(DataType.Date)]
        public DateTime EndDate { get; set; }

        public DateTime OpenSubmissionAt { get; set; }
        public DateTime CloseSubmissionAt { get; set; }

        public bool AllowEditAfterSubmit { get; set; } = false;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "NotStarted"; // NotStarted, Open, Closed

        [MaxLength(1000)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<WeeklyProgram> WeeklyPrograms { get; set; } = new List<WeeklyProgram>();
    }

    public class School
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(256)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Region { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Stage { get; set; } = "أساسي"; // أساسي / ثانوي / مختلط

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = "ذكور"; // ذكور / إناث / مختلط

        public bool IsActive { get; set; } = true;

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Activity
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;

        [MaxLength(50)]
        public string? Color { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class WeeklyProgram
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(450)]
        public string SupervisorId { get; set; } = string.Empty;
        [ForeignKey("SupervisorId")]
        public virtual Supervisor Supervisor { get; set; } = null!;

        [Required]
        [MaxLength(450)]
        public string AcademicYearId { get; set; } = string.Empty;
        [ForeignKey("AcademicYearId")]
        public virtual AcademicYear AcademicYear { get; set; } = null!;

        [Required]
        [MaxLength(450)]
        public string WeekId { get; set; } = string.Empty;
        [ForeignKey("WeekId")]
        public virtual Week Week { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Draft"; // Draft, Submitted, UnderReview, Approved, NeedsRevision

        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }

        [MaxLength(256)]
        public string? ReviewedBy { get; set; }

        public string? ReviewNotes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public virtual ICollection<ProgramItem> Items { get; set; } = new List<ProgramItem>();
        public virtual ICollection<ProgramReview> Reviews { get; set; } = new List<ProgramReview>();
    }

    public class ProgramItem
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(450)]
        public string WeeklyProgramId { get; set; } = string.Empty;
        [ForeignKey("WeeklyProgramId")]
        public virtual WeeklyProgram WeeklyProgram { get; set; } = null!;

        [DataType(DataType.Date)]
        public DateTime DayDate { get; set; }

        [Required]
        [MaxLength(450)]
        public string SchoolId { get; set; } = string.Empty;
        [ForeignKey("SchoolId")]
        public virtual School School { get; set; } = null!;

        [Required]
        [MaxLength(450)]
        public string ActivityId { get; set; } = string.Empty;
        [ForeignKey("ActivityId")]
        public virtual Activity Activity { get; set; } = null!;

        [Required]
        [MaxLength(10)]
        public string StartTime { get; set; } = "08:00";

        [Required]
        [MaxLength(10)]
        public string EndTime { get; set; } = "10:30";

        [Required]
        [MaxLength(200)]
        public string Location { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Objective { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Notes { get; set; }

        public int SortOrder { get; set; } = 1;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    public class ProgramReview
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(450)]
        public string WeeklyProgramId { get; set; } = string.Empty;
        [ForeignKey("WeeklyProgramId")]
        public virtual WeeklyProgram WeeklyProgram { get; set; } = null!;

        [Required]
        [MaxLength(450)]
        public string ReviewerUserId { get; set; } = string.Empty;
        [ForeignKey("ReviewerUserId")]
        public virtual User Reviewer { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string Action { get; set; } = "Approve"; // Approve, RequestRevision, Reopen

        [Required]
        public string Notes { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Notification
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(450)]
        public string UserId { get; set; } = string.Empty;
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        [Required]
        [MaxLength(256)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = "info";

        public bool IsRead { get; set; } = false;

        [MaxLength(500)]
        public string? Link { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class AuditLog
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(450)]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [MaxLength(256)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Entity { get; set; } = string.Empty;

        [MaxLength(450)]
        public string? EntityId { get; set; }

        public DateTime DateTime { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string IP { get; set; } = "127.0.0.1";

        [Required]
        public string Details { get; set; } = string.Empty;
    }

    public class SystemSettings
    {
        [Key]
        [MaxLength(450)]
        public string Id { get; set; } = "settings_default";

        [Required]
        [MaxLength(256)]
        public string DirectorateName { get; set; } = "مديرية التربية والتعليم يطا";

        [Required]
        [MaxLength(256)]
        public string DepartmentName { get; set; } = "قسم الإشراف والتأهيل التربوي";

        [Required]
        [MaxLength(256)]
        public string SystemTitle { get; set; } = "نظام إدارة البرامج الأسبوعية للمشرفين";

        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        [MaxLength(450)]
        public string? CurrentAcademicYearId { get; set; }

        public int WeekDaysCount { get; set; } = 5;
        public int AlertThresholdHours { get; set; } = 24;
        public int SessionTimeoutMinutes { get; set; } = 60;

        [MaxLength(256)]
        public string? NotificationEmail { get; set; }

        public bool AutoBackupEnabled { get; set; } = true;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
