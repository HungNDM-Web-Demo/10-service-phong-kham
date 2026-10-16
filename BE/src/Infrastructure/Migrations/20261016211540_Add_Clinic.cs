using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_Clinic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Clinic_Medicines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ActiveIngredient = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Strength = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    DosageForm = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_Medicines", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_Messages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    Channel = table.Column<int>(type: "integer", nullable: false),
                    Phone = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Content = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    FollowUpId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_Messages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_Patients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    FullName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    BirthDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Gender = table.Column<int>(type: "integer", nullable: false),
                    Phone = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Address = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    ContactPerson = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Allergies = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MedicalHistory = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_Patients", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_UsagePhrases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_UsagePhrases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clinic_UsagePhrases_System_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "System_Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Booking_Appointments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: true),
                    GuestName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    GuestPhone = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    GuestBirthYear = table.Column<int>(type: "integer", nullable: true),
                    GuestGender = table.Column<int>(type: "integer", nullable: true),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    StartAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    Reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CancelReason = table.Column<int>(type: "integer", nullable: true),
                    CancelNote = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    FollowUpId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedByName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConfirmedByName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledByName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Booking_Appointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Booking_Appointments_Clinic_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Clinic_Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Booking_DaysOff",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Part = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Booking_DaysOff", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Booking_Doctors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    FullName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Title = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    SpecialtyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Room = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PhotoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Bio = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    SlotMinutes = table.Column<int>(type: "integer", nullable: false),
                    MaxPerSlot = table.Column<int>(type: "integer", nullable: false),
                    ShowOnline = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Booking_Doctors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Booking_Doctors_System_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "System_Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Booking_WorkingHours",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    StartMinute = table.Column<int>(type: "integer", nullable: false),
                    EndMinute = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Booking_WorkingHours", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Booking_WorkingHours_Booking_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Booking_Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_TreatmentPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlannedSessions = table.Column<int>(type: "integer", nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SubTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    QuotedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelReason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ReviewedByName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewNote = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CreatedByName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_TreatmentPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clinic_TreatmentPlans_Booking_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Booking_Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Clinic_TreatmentPlans_Clinic_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Clinic_Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_Visits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    QueueNumber = table.Column<int>(type: "integer", nullable: false),
                    CheckedInAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    InitialQueueAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    QueueAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsPriority = table.Column<bool>(type: "boolean", nullable: false),
                    PriorityReason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsReturned = table.Column<bool>(type: "boolean", nullable: false),
                    IsFollowUp = table.Column<bool>(type: "boolean", nullable: false),
                    FollowUpId = table.Column<Guid>(type: "uuid", nullable: true),
                    SkipCount = table.Column<int>(type: "integer", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CalledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CallReason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    FinishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CancelReason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CheckedInByName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Temperature = table.Column<decimal>(type: "numeric(4,1)", precision: 4, scale: 1, nullable: true),
                    Pulse = table.Column<int>(type: "integer", nullable: true),
                    BpSystolic = table.Column<int>(type: "integer", nullable: true),
                    BpDiastolic = table.Column<int>(type: "integer", nullable: true),
                    Weight = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: true),
                    Height = table.Column<int>(type: "integer", nullable: true),
                    Symptoms = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Examination = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Advice = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    FollowUpDate = table.Column<DateOnly>(type: "date", nullable: true),
                    FollowUpNote = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_Visits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clinic_Visits_Booking_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Booking_Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Clinic_Visits_Clinic_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Clinic_Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_FollowUps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Note = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    SendCount = table.Column<int>(type: "integer", nullable: false),
                    LastSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CallResult = table.Column<int>(type: "integer", nullable: true),
                    CallNote = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CalledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReturnedVisitId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_FollowUps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clinic_FollowUps_Booking_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Booking_Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Clinic_FollowUps_Clinic_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Clinic_Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Clinic_FollowUps_Clinic_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Clinic_Visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_PrescriptionLines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: false),
                    MedicineId = table.Column<Guid>(type: "uuid", nullable: false),
                    MedicineCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Strength = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActiveIngredient = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Days = table.Column<int>(type: "integer", nullable: false),
                    Usage = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    AllergyConfirmedByName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AllergyConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_PrescriptionLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clinic_PrescriptionLines_Clinic_Medicines_MedicineId",
                        column: x => x.MedicineId,
                        principalTable: "Clinic_Medicines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Clinic_PrescriptionLines_Clinic_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Clinic_Visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_VisitDiagnoses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    IcdCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_VisitDiagnoses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clinic_VisitDiagnoses_Clinic_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Clinic_Visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Finance_Invoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MedicineTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Paid = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Finance_Invoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Finance_Invoices_Clinic_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Clinic_Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Finance_Invoices_Clinic_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Clinic_Visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Finance_InvoiceLines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    ReportGroup = table.Column<int>(type: "integer", nullable: false),
                    RefId = table.Column<Guid>(type: "uuid", nullable: true),
                    Description = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Note = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Discount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsOutside = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Finance_InvoiceLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Finance_InvoiceLines_Finance_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Finance_Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Finance_Receipts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Method = table.Column<int>(type: "integer", nullable: false),
                    CashReceived = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    ChangeAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    PartialReason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CollectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CollectedByName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CancelReason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledByName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ClientRequestId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Finance_Receipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Finance_Receipts_Finance_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Finance_Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_DiagnosisTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IcdCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SpecialtyId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_DiagnosisTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_Services",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Group = table.Column<int>(type: "integer", nullable: false),
                    SpecialtyId = table.Column<Guid>(type: "uuid", nullable: true),
                    Unit = table.Column<int>(type: "integer", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    RequiresTooth = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_Services", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_Specialties",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ExamServiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    DefaultMaxPerSlot = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_Specialties", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clinic_Specialties_Clinic_Services_ExamServiceId",
                        column: x => x.ExamServiceId,
                        principalTable: "Clinic_Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_TreatmentPlanItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ServiceName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Unit = table.Column<int>(type: "integer", nullable: false),
                    Teeth = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountType = table.Column<int>(type: "integer", nullable: true),
                    DiscountValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    DoneAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_TreatmentPlanItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clinic_TreatmentPlanItems_Clinic_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Clinic_Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Clinic_TreatmentPlanItems_Clinic_TreatmentPlans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "Clinic_TreatmentPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Clinic_VisitOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ServiceName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Group = table.Column<int>(type: "integer", nullable: false),
                    Unit = table.Column<int>(type: "integer", nullable: false),
                    Teeth = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Discount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Result = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ImageUrls = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    TreatmentPlanItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clinic_VisitOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clinic_VisitOrders_Clinic_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Clinic_Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Clinic_VisitOrders_Clinic_Visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "Clinic_Visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Booking_Appointments_Code",
                table: "Booking_Appointments",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Booking_Appointments_DoctorId_Date",
                table: "Booking_Appointments",
                columns: new[] { "DoctorId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Booking_Appointments_GuestPhone",
                table: "Booking_Appointments",
                column: "GuestPhone");

            migrationBuilder.CreateIndex(
                name: "IX_Booking_Appointments_PatientId",
                table: "Booking_Appointments",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Booking_Appointments_ServiceId",
                table: "Booking_Appointments",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Booking_DaysOff_DoctorId_Date",
                table: "Booking_DaysOff",
                columns: new[] { "DoctorId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Booking_Doctors_Code",
                table: "Booking_Doctors",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Booking_Doctors_SpecialtyId",
                table: "Booking_Doctors",
                column: "SpecialtyId");

            migrationBuilder.CreateIndex(
                name: "IX_Booking_Doctors_UserId",
                table: "Booking_Doctors",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Booking_WorkingHours_DoctorId_DayOfWeek",
                table: "Booking_WorkingHours",
                columns: new[] { "DoctorId", "DayOfWeek" });

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_DiagnosisTemplates_IcdCode",
                table: "Clinic_DiagnosisTemplates",
                column: "IcdCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_DiagnosisTemplates_SpecialtyId",
                table: "Clinic_DiagnosisTemplates",
                column: "SpecialtyId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_FollowUps_DoctorId",
                table: "Clinic_FollowUps",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_FollowUps_DueDate",
                table: "Clinic_FollowUps",
                column: "DueDate");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_FollowUps_PatientId",
                table: "Clinic_FollowUps",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_FollowUps_VisitId",
                table: "Clinic_FollowUps",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Medicines_Code",
                table: "Clinic_Medicines",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Messages_AppointmentId",
                table: "Clinic_Messages",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Messages_FollowUpId",
                table: "Clinic_Messages",
                column: "FollowUpId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Patients_Code",
                table: "Clinic_Patients",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Patients_Phone",
                table: "Clinic_Patients",
                column: "Phone");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_PrescriptionLines_MedicineId",
                table: "Clinic_PrescriptionLines",
                column: "MedicineId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_PrescriptionLines_VisitId_MedicineId",
                table: "Clinic_PrescriptionLines",
                columns: new[] { "VisitId", "MedicineId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Services_Code",
                table: "Clinic_Services",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Services_SpecialtyId",
                table: "Clinic_Services",
                column: "SpecialtyId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Specialties_Code",
                table: "Clinic_Specialties",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Specialties_ExamServiceId",
                table: "Clinic_Specialties",
                column: "ExamServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_TreatmentPlanItems_PlanId",
                table: "Clinic_TreatmentPlanItems",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_TreatmentPlanItems_ServiceId",
                table: "Clinic_TreatmentPlanItems",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_TreatmentPlans_Code",
                table: "Clinic_TreatmentPlans",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_TreatmentPlans_DoctorId",
                table: "Clinic_TreatmentPlans",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_TreatmentPlans_PatientId",
                table: "Clinic_TreatmentPlans",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_UsagePhrases_UserId_Text",
                table: "Clinic_UsagePhrases",
                columns: new[] { "UserId", "Text" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_VisitDiagnoses_VisitId",
                table: "Clinic_VisitDiagnoses",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_VisitOrders_ServiceId",
                table: "Clinic_VisitOrders",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_VisitOrders_TreatmentPlanItemId",
                table: "Clinic_VisitOrders",
                column: "TreatmentPlanItemId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_VisitOrders_VisitId",
                table: "Clinic_VisitOrders",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Visits_AppointmentId",
                table: "Clinic_Visits",
                column: "AppointmentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Visits_Code",
                table: "Clinic_Visits",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Visits_DoctorId_Date",
                table: "Clinic_Visits",
                columns: new[] { "DoctorId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Clinic_Visits_PatientId",
                table: "Clinic_Visits",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Finance_InvoiceLines_InvoiceId",
                table: "Finance_InvoiceLines",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Finance_Invoices_Code",
                table: "Finance_Invoices",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Finance_Invoices_PatientId",
                table: "Finance_Invoices",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_Finance_Invoices_VisitId",
                table: "Finance_Invoices",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_Finance_Receipts_ClientRequestId",
                table: "Finance_Receipts",
                column: "ClientRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Finance_Receipts_Code",
                table: "Finance_Receipts",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Finance_Receipts_CollectedAt",
                table: "Finance_Receipts",
                column: "CollectedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Finance_Receipts_InvoiceId",
                table: "Finance_Receipts",
                column: "InvoiceId");

            migrationBuilder.AddForeignKey(
                name: "FK_Booking_Appointments_Booking_Doctors_DoctorId",
                table: "Booking_Appointments",
                column: "DoctorId",
                principalTable: "Booking_Doctors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Booking_Appointments_Clinic_Services_ServiceId",
                table: "Booking_Appointments",
                column: "ServiceId",
                principalTable: "Clinic_Services",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Booking_DaysOff_Booking_Doctors_DoctorId",
                table: "Booking_DaysOff",
                column: "DoctorId",
                principalTable: "Booking_Doctors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Booking_Doctors_Clinic_Specialties_SpecialtyId",
                table: "Booking_Doctors",
                column: "SpecialtyId",
                principalTable: "Clinic_Specialties",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Clinic_DiagnosisTemplates_Clinic_Specialties_SpecialtyId",
                table: "Clinic_DiagnosisTemplates",
                column: "SpecialtyId",
                principalTable: "Clinic_Specialties",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Clinic_Services_Clinic_Specialties_SpecialtyId",
                table: "Clinic_Services",
                column: "SpecialtyId",
                principalTable: "Clinic_Specialties",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clinic_Specialties_Clinic_Services_ExamServiceId",
                table: "Clinic_Specialties");

            migrationBuilder.DropTable(
                name: "Booking_Appointments");

            migrationBuilder.DropTable(
                name: "Booking_DaysOff");

            migrationBuilder.DropTable(
                name: "Booking_WorkingHours");

            migrationBuilder.DropTable(
                name: "Clinic_DiagnosisTemplates");

            migrationBuilder.DropTable(
                name: "Clinic_FollowUps");

            migrationBuilder.DropTable(
                name: "Clinic_Messages");

            migrationBuilder.DropTable(
                name: "Clinic_PrescriptionLines");

            migrationBuilder.DropTable(
                name: "Clinic_TreatmentPlanItems");

            migrationBuilder.DropTable(
                name: "Clinic_UsagePhrases");

            migrationBuilder.DropTable(
                name: "Clinic_VisitDiagnoses");

            migrationBuilder.DropTable(
                name: "Clinic_VisitOrders");

            migrationBuilder.DropTable(
                name: "Finance_InvoiceLines");

            migrationBuilder.DropTable(
                name: "Finance_Receipts");

            migrationBuilder.DropTable(
                name: "Clinic_Medicines");

            migrationBuilder.DropTable(
                name: "Clinic_TreatmentPlans");

            migrationBuilder.DropTable(
                name: "Finance_Invoices");

            migrationBuilder.DropTable(
                name: "Clinic_Visits");

            migrationBuilder.DropTable(
                name: "Booking_Doctors");

            migrationBuilder.DropTable(
                name: "Clinic_Patients");

            migrationBuilder.DropTable(
                name: "Clinic_Services");

            migrationBuilder.DropTable(
                name: "Clinic_Specialties");
        }
    }
}
