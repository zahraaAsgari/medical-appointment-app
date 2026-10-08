import {
  pgTable,
  serial,
  integer,
  bigint,
  text,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ---------------------------------- Users ---------------------------------- */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    photoUrl: text("photo_url"),
    title: text("title"), // Dr., Prof., ...
    specialty: text("specialty"),
    licenseNumber: text("license_number"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_telegram_id_idx").on(t.telegramId)],
);

/* --------------------------------- Sessions --------------------------------- */

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // random token
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId), index("sessions_expires_at_idx").on(t.expiresAt)],
);

/* ------------------------------ Clinic profile ------------------------------ */

export const clinicProfiles = pgTable("clinic_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  clinicName: text("clinic_name").notNull(),
  phone: text("phone"),
  address: text("address"),
  logoUrl: text("logo_url"),
  specialty: text("specialty"),
  insuranceAccepted: text("insurance_accepted"), // JSON array string
  website: text("website"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------- Working hours ------------------------------ */

export const workingHours = pgTable(
  "working_hours",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull(), // 0=Saturday (Persian week start)
    enabled: boolean("enabled").notNull().default(true),
    openTime: text("open_time").notNull().default("09:00"),
    closeTime: text("close_time").notNull().default("17:00"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("working_hours_user_day_idx").on(t.userId, t.dayIndex)],
);

/* --------------------------------- Patients --------------------------------- */

export const patients = pgTable(
  "patients",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    mobile: text("mobile").notNull(),
    dateOfBirth: date("date_of_birth"),
    gender: text("gender"), // male | female | other
    bloodType: text("blood_type"),
    emergencyContact: text("emergency_contact"),
    medicalNotes: text("medical_notes"),
    insuranceInfo: text("insurance_info"), // JSON
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("patients_user_id_idx").on(t.userId)],
);

/* ------------------------------- Appointments ------------------------------- */

export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    appointmentDate: date("appointment_date").notNull(), // YYYY-MM-DD
    startTime: text("start_time").notNull(), // HH:mm
    endTime: text("end_time").notNull(), // HH:mm
    durationMinutes: integer("duration_minutes").notNull(),
    status: text("status").notNull().default("scheduled"), // scheduled|completed|cancelled (legacy rows may hold confirmed/no_show)
    hasWaitlistRequest: boolean("has_waitlist_request").notNull().default(false),
    notes: text("notes"),
    treatmentType: text("treatment_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("appointments_user_date_idx").on(t.userId, t.appointmentDate),
    index("appointments_patient_id_idx").on(t.patientId),
  ],
);

/* ------------------------------ Unavailable slots ---------------------------- */

export const unavailableSlots = pgTable(
  "unavailable_slots",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slotDate: date("slot_date").notNull(), // YYYY-MM-DD
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    reason: text("reason").notNull(),
    isFullDay: boolean("is_full_day").notNull().default(false),
    reasonCategory: text("reason_category"), // surgery|emergency|conference|leave|vacation
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("unavailable_user_date_idx").on(t.userId, t.slotDate)],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type ClinicProfile = typeof clinicProfiles.$inferSelect;
export type WorkingHour = typeof workingHours.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type UnavailableSlot = typeof unavailableSlots.$inferSelect;
