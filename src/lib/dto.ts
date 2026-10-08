import { getTableColumns } from "drizzle-orm";
import { appointments, patients } from "@/db/schema";
import type { AppointmentDTO } from "@/lib/types";

/** Selection for join queries: appointment columns + patient name/mobile. */
export const appointmentSelect = {
  ...getTableColumns(appointments),
  patientName: patients.fullName,
  patientMobile: patients.mobile,
};

export type AppointmentJoined = typeof appointments.$inferSelect & {
  patientName: string;
  patientMobile: string;
};

export function appointmentToDTO(a: AppointmentJoined): AppointmentDTO {
  return {
    id: a.id,
    patientId: a.patientId,
    patientName: a.patientName,
    patientMobile: a.patientMobile,
    date: a.appointmentDate,
    startTime: a.startTime,
    endTime: a.endTime,
    durationMinutes: a.durationMinutes,
    status: a.status as AppointmentDTO["status"],
    notes: a.notes,
  };
}
