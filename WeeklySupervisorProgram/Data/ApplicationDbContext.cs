using Microsoft.EntityFrameworkCore;
using WeeklySupervisorProgram.Models;

namespace WeeklySupervisorProgram.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Role> Roles => Set<Role>();
        public DbSet<Permission> Permissions => Set<Permission>();
        public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
        public DbSet<User> Users => Set<User>();
        public DbSet<UserRole> UserRoles => Set<UserRole>();
        public DbSet<Supervisor> Supervisors => Set<Supervisor>();
        public DbSet<AcademicYear> AcademicYears => Set<AcademicYear>();
        public DbSet<Week> Weeks => Set<Week>();
        public DbSet<School> Schools => Set<School>();
        public DbSet<Activity> Activities => Set<Activity>();
        public DbSet<WeeklyProgram> WeeklyPrograms => Set<WeeklyProgram>();
        public DbSet<ProgramItem> ProgramItems => Set<ProgramItem>();
        public DbSet<ProgramReview> ProgramReviews => Set<ProgramReview>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
        public DbSet<SystemSettings> SystemSettings => Set<SystemSettings>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Composite Key: UserRole
            modelBuilder.Entity<UserRole>()
                .HasKey(ur => new { ur.UserId, ur.RoleId });

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            // Composite Key: RolePermission
            modelBuilder.Entity<RolePermission>()
                .HasKey(rp => new { rp.RoleId, rp.PermissionId });

            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(rp => rp.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);

            // Unique Constraints & Indexes
            modelBuilder.Entity<User>()
                .HasIndex(u => u.NormalizedUsername)
                .IsUnique();

            modelBuilder.Entity<Supervisor>()
                .HasIndex(s => s.NationalId)
                .IsUnique();

            modelBuilder.Entity<AcademicYear>()
                .HasIndex(y => y.Name)
                .IsUnique();

            modelBuilder.Entity<WeeklyProgram>()
                .HasIndex(wp => new { wp.SupervisorId, wp.WeekId })
                .IsUnique();

            modelBuilder.Entity<ProgramItem>()
                .HasIndex(pi => pi.DayDate);

            modelBuilder.Entity<AuditLog>()
                .HasIndex(al => al.DateTime);

            // Delete Behaviors
            modelBuilder.Entity<WeeklyProgram>()
                .HasMany(wp => wp.Items)
                .WithOne(pi => pi.WeeklyProgram)
                .HasForeignKey(pi => pi.WeeklyProgramId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WeeklyProgram>()
                .HasMany(wp => wp.Reviews)
                .WithOne(pr => pr.WeeklyProgram)
                .HasForeignKey(pr => pr.WeeklyProgramId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
