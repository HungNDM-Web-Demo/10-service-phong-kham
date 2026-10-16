namespace Application.Constants;

/// <summary>
/// Mã quyền nghiệp vụ Phòng khám (02-SRS §7, 07-DANH-SACH-API §1). Tách khỏi <see cref="Permissions"/> (quyền nền) để không
/// sửa file nền. Mỗi mã phải có trong FE/src/mock/seed/project.json và FE src/config/permissions.ts; test
/// <c>ProjectPermissionTests</c> kiểm tra việc này.
/// </summary>
public static class ProjectPermissions
{
    public static class Services
    {
        public const string View = "services.view";
        public const string Create = "services.create";
        public const string Update = "services.update";
        public const string Delete = "services.delete";
    }

    public static class Medicines
    {
        public const string View = "medicines.view";
        public const string Create = "medicines.create";
        public const string Update = "medicines.update";
        public const string Delete = "medicines.delete";
    }

    public static class Doctors
    {
        public const string View = "doctors.view";
        public const string Create = "doctors.create";
        public const string Update = "doctors.update";
        public const string Delete = "doctors.delete";
    }

    public static class Appointments
    {
        public const string View = "appointments.view";
        public const string Create = "appointments.create";
        public const string Update = "appointments.update";
        public const string Cancel = "appointments.cancel";
    }

    public static class QueueTickets
    {
        public const string View = "queue-tickets.view";
        public const string Create = "queue-tickets.create";
        public const string Update = "queue-tickets.update";
        public const string Call = "queue-tickets.call";
    }

    public static class Patients
    {
        public const string View = "patients.view";
        public const string Create = "patients.create";
        public const string Update = "patients.update";
    }

    public static class MedicalRecords
    {
        public const string View = "medical-records.view";
    }

    public static class Visits
    {
        public const string Examine = "visits.examine";
        public const string Reopen = "visits.reopen";
    }

    public static class TreatmentPlans
    {
        public const string View = "treatment-plans.view";
        public const string Create = "treatment-plans.create";
        public const string Update = "treatment-plans.update";
        public const string Approve = "treatment-plans.approve";
    }

    public static class Invoices
    {
        public const string View = "invoices.view";
        public const string Collect = "invoices.collect";
        public const string Cancel = "invoices.cancel";
    }

    public static class FollowUps
    {
        public const string View = "follow-ups.view";
        public const string Update = "follow-ups.update";
    }

    public static class Reports
    {
        public const string View = "reports.view";
    }

    /// <summary>Mọi mã quyền nghiệp vụ (đối chiếu với seed trong test).</summary>
    public static IReadOnlyList<string> All { get; } =
    [
        Services.View, Services.Create, Services.Update, Services.Delete,
        Medicines.View, Medicines.Create, Medicines.Update, Medicines.Delete,
        Doctors.View, Doctors.Create, Doctors.Update, Doctors.Delete,
        Appointments.View, Appointments.Create, Appointments.Update, Appointments.Cancel,
        QueueTickets.View, QueueTickets.Create, QueueTickets.Update, QueueTickets.Call,
        Patients.View, Patients.Create, Patients.Update,
        MedicalRecords.View,
        Visits.Examine, Visits.Reopen,
        TreatmentPlans.View, TreatmentPlans.Create, TreatmentPlans.Update, TreatmentPlans.Approve,
        Invoices.View, Invoices.Collect, Invoices.Cancel,
        FollowUps.View, FollowUps.Update,
        Reports.View
    ];
}

/// <summary>Mã vai trò riêng của dự án (02-SRS §2.2).</summary>
public static class ProjectRoleCodes
{
    public const string Receptionist = "RECEPTIONIST";
    public const string Doctor = "DOCTOR";
}
