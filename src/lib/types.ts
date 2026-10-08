/* Shared DTO shapes between API routes and the client UI. */

export interface UserDTO {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  photoUrl: string | null;
  title: string | null;
  specialty: string | null;
  licenseNumber: string | null;
}

export interface ClinicDTO {
  clinicName: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  specialty: string | null;
  insuranceAccepted: string | null;
  website: string | null;
}

export interface WorkingHourDTO {
  dayIndex: number;
  enabled: boolean;
  openTime: string;
  closeTime: string;
}

export interface PatientDTO {
  id: number;
  fullName: string;
  mobile: string;
  medicalNotes: string | null;
  upcomingCount?: number;
  lastVisit?: string | null;
}

export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export interface AppointmentDTO {
  id: number;
  patientId: number;
  patientName: string;
  patientMobile: string;
  date: string; // ISO YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes: string | null;
}

export interface UnavailableDTO {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  reasonCategory: string | null;
  isFullDay: boolean;
}

export interface DaySchedule {
  date: string;
  workingHour: WorkingHourDTO | null;
  appointments: AppointmentDTO[];
  unavailable: UnavailableDTO[];
}
