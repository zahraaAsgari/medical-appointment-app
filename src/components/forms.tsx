"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Phone,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  fa,
  faDuration,
  faTime,
  formatDate,
  formatDateLong,
  isValidTime,
  REASON_LABEL,
  relativeDayLabel,
  statusLabel,
  toMin,
  todayISO,
  WEEKDAYS_FA,
} from "@/lib/format";
import { hapticNotify, twa } from "@/lib/twa";
import type { AppointmentDTO, PatientDTO, UnavailableDTO, WorkingHourDTO } from "@/lib/types";
import { useApp, useMainButton } from "@/components/providers";
import {
  Avatar,
  Button,
  ChipSelect,
  cn,
  Field,
  NativeSelect,
  Sheet,
  Skeleton,
  StatusBadge,
  Switch,
  TextArea,
  TextInput,
  TimeSelect,
} from "@/components/ui";
import { JalaliDatePicker } from "@/components/date-picker";

/* ------------------------------- shared bits -------------------------------- */

function FormError({ message, detail }: { message: string | null; detail?: string }) {
  if (!message) return null;
  return (
    <div className="animate-scale-in rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold leading-6 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
      {message}
      {detail && <span className="mt-0.5 block text-[12px] font-normal opacity-80">{detail}</span>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[12px] font-bold text-slate-400">{children}</p>;
}

function useWorkingHours() {
  const [wh, setWh] = useState<WorkingHourDTO[]>([]);
  useEffect(() => {
    api<{ workingHours: WorkingHourDTO[] }>("/api/working-hours")
      .then((r) => setWh(r.workingHours))
      .catch(() => undefined);
  }, []);
  return wh;
}

function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-2xl border bg-white px-4 text-sm font-semibold transition-all dark:bg-slate-900",
          open ? "border-teal-500 ring-4 ring-teal-500/15" : "border-slate-200 dark:border-slate-700",
        )}
      >
        <span className="text-slate-900 dark:text-slate-100">{formatDateLong(value)}</span>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform duration-300", open && "rotate-180")} />
      </button>
      {open && (
        <div className="animate-scale-in mt-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <JalaliDatePicker value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

function dayWh(wh: WorkingHourDTO[], iso: string): WorkingHourDTO | null {
  const jsDay = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).getDay();
  const idx = (jsDay + 1) % 7;
  return wh.find((w) => w.dayIndex === idx) ?? null;
}

function hourOptionsFor(wh: WorkingHourDTO | null): number[] {
  if (!wh || !wh.enabled) return Array.from({ length: 16 }, (_, i) => i + 7);
  const openH = Math.floor(toMin(wh.openTime) / 60);
  const closeH = Math.ceil(toMin(wh.closeTime) / 60);
  const out: number[] = [];
  for (let h = openH; h < Math.min(closeH, 24); h++) out.push(h);
  return out.length ? out : Array.from({ length: 16 }, (_, i) => i + 7);
}

const DURATIONS = [15, 30, 45, 60, 90, 120];

/* ---------------------------- appointment form ------------------------------ */

export function AppointmentFormSheet({
  preset,
  onClose,
}: {
  preset?: { date?: string; startTime?: string; patientId?: number };
  onClose: () => void;
}) {
  const { bump, toast } = useApp();
  const [patients, setPatients] = useState<PatientDTO[] | null>(null);
  const [patientId, setPatientId] = useState<number | null>(preset?.patientId ?? null);
  const [date, setDate] = useState(preset?.date ?? todayISO());
  const [startTime, setStartTime] = useState(preset?.startTime ?? "10:00");
  const [duration, setDuration] = useState(30);
  const [customDur, setCustomDur] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; detail?: string } | null>(null);
  const wh = useWorkingHours();
  const todayWh = dayWh(wh, date);

  useEffect(() => {
    api<{ patients: PatientDTO[] }>("/api/patients").then((r) => {
      setPatients(r.patients);
      if (!preset?.patientId && r.patients.length > 0) setPatientId((p) => p ?? r.patients[0].id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = !!patientId && !!date && isValidTime(startTime) && duration >= 5 && (todayWh ? todayWh.enabled : true) && !busy;

  const submit = useCallback(async () => {
    if (!patientId || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          date,
          startTime,
          durationMinutes: duration,
          notes,
        }),
      });
      bump();
      toast("نوبت با موفقیت ثبت شد");
      onClose();
    } catch (e) {
      if (e instanceof ApiError) setErr({ message: e.message, detail: e.detail });
      else setErr({ message: "خطا در ثبت نوبت" });
      hapticNotify("error");
    } finally {
      setBusy(false);
    }
  }, [patientId, date, startTime, duration, notes, busy, bump, toast, onClose]);

  useMainButton("ثبت نوبت", submit, true);

  return (
    <Sheet open onClose={onClose} title="نوبت جدید">
      <div className="space-y-4">
        <FormError message={err?.message ?? null} detail={err?.detail} />

        <Field label="بیمار">
          {patients === null ? (
            <Skeleton className="h-12 w-full" />
          ) : patients.length === 0 ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              ابتدا از بخش «بیماران» یک بیمار ثبت کنید.
            </p>
          ) : (
            <NativeSelect value={patientId ?? ""} onChange={(e) => setPatientId(Number(e.target.value))}>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} — {fa(p.mobile)}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>

        <Field label="تاریخ نوبت">
          <DateField value={date} onChange={setDate} />
        </Field>

        {todayWh && !todayWh.enabled && (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            مطب روز {WEEKDAYS_FA[todayWh.dayIndex]}ها تعطیل است.
          </p>
        )}
        {todayWh?.enabled && (
          <p className="-mb-1 text-[12px] font-semibold text-teal-700 dark:text-teal-400">
            ساعت کاری این روز: {faTime(todayWh.openTime)} تا {faTime(todayWh.closeTime)}
          </p>
        )}

        <Field label="ساعت شروع">
          <TimeSelect value={startTime} onChange={setStartTime} hourOptions={hourOptionsFor(todayWh)} />
        </Field>

        <Field label="مدت زمان">
          <ChipSelect
            options={[
              ...DURATIONS.map((d) => ({ value: String(d), label: faDuration(d) })),
              { value: "custom", label: "دلخواه" },
            ]}
            value={DURATIONS.includes(duration) && !customDur ? String(duration) : "custom"}
            onChange={(v) => {
              if (v === "custom") {
                setCustomDur("30");
                setDuration(30);
              } else {
                setCustomDur("");
                setDuration(Number(v));
              }
            }}
          />
        </Field>
        {customDur !== "" && (
          <Field label="مدت دلخواه (دقیقه)">
            <TextInput
              inputMode="numeric"
              value={customDur}
              onChange={(e) => {
                const v = Array.from(e.target.value)
                  .map((c) => ("۰۱۲۳۴۵۶۷۸۹".includes(c) ? String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)) : c))
                  .join("")
                  .replace(/[^0-9]/g, "")
                  .slice(0, 3);
                setCustomDur(v);
                const n = Number(v);
                if (n >= 5 && n <= 480) setDuration(n);
              }}
              placeholder="مثلاً ۴۰"
            />
          </Field>
        )}

        <Field label="یادداشت" optional>
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="یادداشت برای پذیرش یا پزشک…" maxLength={1000} />
        </Field>

        <Button size="lg" className="w-full" loading={busy} disabled={!canSubmit} onClick={submit}>
          <CalendarPlus className="size-5" />
          ثبت نوبت — {formatDate(date)} ساعت {faTime(startTime)}
        </Button>
      </div>
    </Sheet>
  );
}

/* --------------------------- appointment detail ----------------------------- */

interface CancelFlow {
  stage: "idle" | "confirm";
  reason: string;
}

export function AppointmentDetailSheet({ appointmentId, onClose }: { appointmentId: number; onClose: () => void }) {
  const { bump, toast, openSheet } = useApp();
  const [appt, setAppt] = useState<AppointmentDTO | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cancelFlow, setCancelFlow] = useState<CancelFlow>({ stage: "idle", reason: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ appointment: AppointmentDTO }>(`/api/appointments/${appointmentId}`);
      setAppt(res.appointment);
    } catch {
      setNotFound(true);
    }
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const markCompleted = async () => {
    if (!appt || busy) return;
    setBusy("completed");
    try {
      await api(`/api/appointments/${appt.id}`, { method: "PUT", body: JSON.stringify({ status: "completed" }) });
      toast("نوبت انجام شد");
      bump();
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "خطا", "error");
    } finally {
      setBusy(null);
    }
  };

  const doCancel = async () => {
    if (!appt || busy) return;
    setBusy("cancel");
    try {
      await api(`/api/appointments/${appt.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelFlow.reason }),
      });
      toast("نوبت لغو شد و زمان آزاد گردید");
      bump();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "خطا در لغو نوبت", "error");
      setBusy(null);
    }
  };

  const doDelete = async () => {
    if (!appt || busy) return;
    setBusy("delete");
    try {
      await api(`/api/appointments/${appt.id}`, { method: "DELETE" });
      toast("نوبت به‌طور کامل حذف شد");
      bump();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "خطا", "error");
    } finally {
      setBusy(null);
    }
  };

  const callPatient = () => {
    if (!appt) return;
    const tg = twa();
    const url = `tel:${appt.patientMobile}`;
    try {
      tg?.openLink(url);
    } catch {
      window.location.href = url;
    }
  };

  const isScheduled = appt?.status === "scheduled";
  const future = appt && appt.date >= todayISO();

  return (
    <Sheet open onClose={onClose} title="جزئیات نوبت">
      {notFound ? (
        <p className="py-10 text-center text-sm font-semibold text-slate-500">نوبت یافت نشد — شاید حذف شده است.</p>
      ) : !appt ? (
        <div className="space-y-3 py-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* patient card */}
          <div className="flex items-center gap-3 rounded-3xl bg-gradient-to-l from-teal-600 to-cyan-600 p-4 text-white shadow-[0_16px_32px_-16px_rgb(13,148,136,0.8)]">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20 text-xl font-extrabold backdrop-blur">
              {appt.patientName.trim().charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-extrabold">{appt.patientName}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-teal-50/90">{fa(appt.patientMobile)}</p>
            </div>
            <button onClick={callPatient} aria-label="تماس" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur transition-all active:scale-95">
              <Phone className="size-5" />
            </button>
          </div>

          {/* info rows */}
          <div className="grid grid-cols-2 gap-2.5">
            <InfoTile icon={<CalendarClock className="size-4.5" />} label="تاریخ" value={relativeDayLabel(appt.date)} />
            <InfoTile icon={<Clock className="size-4.5" />} label="ساعت" value={`${faTime(appt.startTime)} تا ${faTime(appt.endTime)}`} />
          </div>
          <InfoTile icon={<FileText className="size-4.5" />} label="مدت نوبت" value={faDuration(appt.durationMinutes)} />

          <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">وضعیت</span>
            <StatusBadge status={appt.status} />
          </div>

          {appt.notes && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <FileText className="size-3.5" /> یادداشت
              </p>
              <p className="text-[13px] leading-6 text-slate-700 dark:text-slate-300">{appt.notes}</p>
            </div>
          )}

          {/* actions */}
          {isScheduled && future && cancelFlow.stage === "idle" && (
            <div className="space-y-2.5 pt-1">
              <Button size="lg" className="w-full" loading={busy === "completed"} onClick={markCompleted}>
                <Check className="size-5" /> انجام شد
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => openSheet({ type: "appointmentForm", preset: { date: appt.date, patientId: appt.patientId } })}>
                  <CalendarPlus className="size-4" /> نوبت مشابه
                </Button>
                <Button variant="dangerSoft" onClick={() => setCancelFlow((f) => ({ ...f, stage: "confirm" }))}>
                  <XCircle className="size-4" /> لغو نوبت
                </Button>
              </div>
            </div>
          )}

          {cancelFlow.stage === "confirm" && (
            <div className="animate-scale-in space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
              <p className="text-[14px] font-extrabold text-rose-700 dark:text-rose-300">لغو این نوبت؟</p>
              <p className="text-[12px] leading-5 text-rose-600/80 dark:text-rose-300/70">زمان نوبت آزاد می‌شود و دوباره قابل نوبت‌دهی است.</p>
              <TextInput
                value={cancelFlow.reason}
                onChange={(e) => setCancelFlow((f) => ({ ...f, reason: e.target.value }))}
                placeholder="دلیل لغو (اختیاری)"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setCancelFlow((f) => ({ ...f, stage: "idle" }))}>
                  انصراف
                </Button>
                <Button variant="danger" loading={busy === "cancel"} onClick={doCancel}>
                  تأیید لغو
                </Button>
              </div>
            </div>
          )}

          {/* reschedule */}
          {isScheduled && future && cancelFlow.stage === "idle" && (
            <RescheduleBlock
              appt={appt}
              onDone={async () => {
                bump();
                await load();
                toast("زمان نوبت تغییر کرد");
              }}
            />
          )}

          {appt.status === "completed" && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-[12px] font-semibold text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              این نوبت انجام شده است.
            </div>
          )}
          {appt.status === "cancelled" && (
            <div className="rounded-2xl border border-dashed border-teal-300 bg-teal-50 px-4 py-3 text-center text-[12px] font-bold text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
              این زمان آزاد شده است و می‌تواند دوباره نوبت‌دهی شود.
            </div>
          )}
          {appt.status !== "scheduled" && appt.status !== "completed" && appt.status !== "cancelled" && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-[12px] font-semibold text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              سابقه ({statusLabel(appt.status)})
            </div>
          )}

          {!deleting ? (
            <button onClick={() => setDeleting(true)} className="mx-auto flex items-center gap-1.5 py-1 text-[12px] font-bold text-slate-400 transition-colors hover:text-rose-500">
              <Trash2 className="size-3.5" /> حذف کامل نوبت از سوابق
            </button>
          ) : (
            <div className="animate-scale-in flex items-center justify-between gap-2 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">حذف دائمی شود؟</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setDeleting(false)}>خیر</Button>
                <Button size="sm" variant="danger" loading={busy === "delete"} onClick={doDelete}>بله، حذف</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 px-3.5 py-3 dark:border-slate-800">
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <span className="text-teal-600 dark:text-teal-400">{icon}</span> {label}
      </p>
      <p className="mt-1.5 text-[13px] font-extrabold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function RescheduleBlock({ appt, onDone }: { appt: AppointmentDTO; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(appt.date);
  const [startTime, setStartTime] = useState(appt.startTime);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; detail?: string } | null>(null);
  const wh = useWorkingHours();
  const todayWh = dayWh(wh, date);

  const apply = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/appointments/${appt.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({ date, startTime }),
      });
      await onDone();
      setOpen(false);
    } catch (e) {
      if (e instanceof ApiError) setErr({ message: e.message, detail: e.detail });
      else setErr({ message: "خطا" });
      hapticNotify("error");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button variant="ghost" className="w-full text-teal-700 dark:text-teal-300" onClick={() => setOpen(true)}>
        <CalendarClock className="size-4" /> تغییر زمان نوبت
      </Button>
    );
  }

  return (
    <div className="animate-scale-in space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-200">تغییر زمان نوبت</p>
      <FormError message={err?.message ?? null} detail={err?.detail} />
      <DateField value={date} onChange={setDate} />
      <TimeSelect value={startTime} onChange={setStartTime} hourOptions={hourOptionsFor(todayWh)} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
        <Button loading={busy} onClick={apply}>اعمال تغییر</Button>
      </div>
    </div>
  );
}

/* ---------------------------- block time sheet ------------------------------ */

export function BlockTimeSheet({
  presetDate,
  slot,
  onClose,
}: {
  presetDate?: string;
  slot?: UnavailableDTO;
  onClose: () => void;
}) {
  const { bump, toast, dataVersion } = useApp();
  const [date, setDate] = useState(presetDate ?? todayISO());
  const [fullDay, setFullDay] = useState(false);
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("14:00");
  const [category, setCategory] = useState("leave");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; detail?: string } | null>(null);

  // Existing blocks (today onward), so the user can review and remove them.
  const [slots, setSlots] = useState<UnavailableDTO[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadSlots = useCallback(async () => {
    // Supersede any in-flight request so a stale response can never win.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSlotsError(null);
    try {
      const res = await api<{ unavailable: UnavailableDTO[] }>(`/api/unavailable?from=${todayISO()}`, {
        signal: controller.signal,
      });
      setSlots(res.unavailable);
    } catch {
      // Aborted (unmounted or superseded): keep the current state silently.
      if (controller.signal.aborted) return;
      setSlotsError("دریافت فهرست مسدودی‌ها ناموفق بود.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadSlots();
    }, 0);
    return () => {
      clearTimeout(t);
      // Unmount or a dataVersion change: cancel whatever is still in flight.
      abortRef.current?.abort();
    };
  }, [loadSlots, dataVersion]);

  const doDelete = async (id: number) => {
    if (deletingId !== null) return;
    setDeletingId(id);
    try {
      await api(`/api/unavailable/${id}`, { method: "DELETE" });
      toast("مسدودی حذف شد و زمان آزاد گردید");
      setPendingDelete(null);
      // bump() refreshes the Home timeline and reloads this list via dataVersion.
      bump();
    } catch (e) {
      toast(e instanceof Error ? e.message : "حذف مسدودی ناموفق بود", "error");
      hapticNotify("error");
    } finally {
      setDeletingId(null);
    }
  };

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api<{ unavailable: UnavailableDTO }>("/api/unavailable", {
        method: "POST",
        body: JSON.stringify({
          date,
          isFullDay: fullDay,
          startTime: start,
          endTime: end,
          reason: reason || REASON_LABEL[category],
          reasonCategory: category,
        }),
      });
      toast("زمان عدم حضور ثبت شد");
      bump();
      onClose();
    } catch (e) {
      if (e instanceof ApiError) setErr({ message: e.message, detail: e.detail });
      else setErr({ message: "خطا" });
      hapticNotify("error");
    } finally {
      setBusy(false);
    }
  };

  const valid = fullDay || toMin(start) < toMin(end);

  return (
    <Sheet open onClose={onClose} title="ثبت عدم حضور / مسدودی">
      <div className="space-y-4">
        <FormError message={err?.message ?? null} detail={err?.detail} />
        <Field label="تاریخ">
          <DateField value={date} onChange={setDate} />
        </Field>
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 dark:border-slate-800">
          <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">کل روز</p>
          <Switch checked={fullDay} onChange={setFullDay} />
        </div>
        {!fullDay && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="از ساعت">
              <TimeSelect value={start} onChange={setStart} />
            </Field>
            <Field label="تا ساعت">
              <TimeSelect value={end} onChange={setEnd} />
            </Field>
          </div>
        )}
        <Field label="دسته‌بندی">
          <ChipSelect
            options={["surgery", "emergency", "conference", "leave", "vacation"].map((c) => ({ value: c, label: REASON_LABEL[c] }))}
            value={category}
            onChange={setCategory}
          />
        </Field>
        <Field label="توضیح" optional>
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder={REASON_LABEL[category]} maxLength={200} />
        </Field>
        <Button size="lg" className="w-full" variant="dangerSoft" disabled={!valid || busy} loading={busy} onClick={submit}>
          مسدود کردن {fullDay ? "کل روز" : `${faTime(start)} تا ${faTime(end)}`}
        </Button>

        {/* Existing blocks: today onward, with delete */}
        <div className="pt-2">
          <SectionLabel>مسدودی‌های فعال ({slots === null ? "…" : fa(slots.length)})</SectionLabel>

          {slotsError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {slotsError}
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => void loadSlots()}>
                <RefreshCw className="size-4" /> تلاش مجدد
              </Button>
            </div>
          ) : slots === null ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : slots.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-3.5 text-center text-[12px] font-semibold text-slate-400 dark:border-slate-800">
              مسدودی فعالی ثبت نشده است
            </p>
          ) : (
            <div className="space-y-2">
              {slots.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-2xl border p-3 dark:border-slate-800",
                    slot?.id === s.id
                      ? "border-teal-400 bg-teal-50/60 dark:border-teal-500/40 dark:bg-teal-500/10"
                      : "border-slate-100 bg-white dark:bg-slate-900",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
                        {relativeDayLabel(s.date)}
                      </p>
                      <p className="mt-0.5 text-[11.5px] font-bold text-teal-700 dark:text-teal-300">
                        {s.isFullDay ? "کل روز" : `${faTime(s.startTime)} تا ${faTime(s.endTime)}`}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                        {s.reason}
                        {s.reasonCategory && REASON_LABEL[s.reasonCategory] ? ` — ${REASON_LABEL[s.reasonCategory]}` : ""}
                      </p>
                    </div>
                    {pendingDelete === s.id ? (
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setPendingDelete(null)} disabled={deletingId !== null}>
                          خیر
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={deletingId === s.id}
                          disabled={deletingId !== null}
                          onClick={() => void doDelete(s.id)}
                        >
                          حذف
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPendingDelete(s.id)}
                        aria-label={`حذف مسدودی ${s.reason}`}
                        className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500 transition-all hover:bg-rose-100 active:scale-95 dark:bg-rose-500/10 dark:text-rose-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------ patient form -------------------------------- */

export function PatientFormSheet({ patient, onClose }: { patient?: PatientDTO; onClose: () => void }) {
  const { bump, toast } = useApp();
  const editing = !!patient;
  const [fullName, setFullName] = useState(patient?.fullName ?? "");
  const [mobile, setMobile] = useState(patient?.mobile ?? "");
  const [notes, setNotes] = useState(patient?.medicalNotes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const body = { fullName, mobile, medicalNotes: notes || null };
      if (editing) {
        await api(`/api/patients/${patient.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast("اطلاعات بیمار به‌روزرسانی شد");
      } else {
        await api("/api/patients", { method: "POST", body: JSON.stringify(body) });
        toast("بیمار جدید ثبت شد");
      }
      bump();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا");
      hapticNotify("error");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = fullName.trim().length > 0 && mobile.trim().length >= 8 && !busy;

  return (
    <Sheet open onClose={onClose} title={editing ? "ویرایش بیمار" : "بیمار جدید"}>
      <div className="space-y-4">
        <FormError message={err} />
        <Field label="نام و نام خانوادگی">
          <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثلاً مریم احمدی" maxLength={100} />
        </Field>
        <Field label="شماره موبایل">
          <TextInput
            dir="ltr"
            className="text-left"
            inputMode="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="0912 345 6789"
            maxLength={20}
          />
        </Field>
        <Field label="یادداشت کوتاه" optional>
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثلاً حساسیت دارویی یا نکته مهم برای پذیرش…" maxLength={2000} />
        </Field>
        <Button size="lg" className="w-full" disabled={!canSubmit} loading={busy} onClick={submit}>
          {editing ? "ذخیره تغییرات" : "ثبت بیمار"}
        </Button>
      </div>
    </Sheet>
  );
}

/* ----------------------------- patient detail ------------------------------- */

export function PatientDetailSheet({ patientId, onClose }: { patientId: number; onClose: () => void }) {
  const { bump, toast, openSheet } = useApp();
  const [data, setData] = useState<{ patient: PatientDTO; upcoming: AppointmentDTO[]; history: AppointmentDTO[] } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ patient: PatientDTO; upcoming: AppointmentDTO[]; history: AppointmentDTO[] }>(`/api/patients/${patientId}`);
      setData(res);
    } catch {
      setNotFound(true);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveNotes = async () => {
    if (notesDraft === null || !data) return;
    setBusy(true);
    try {
      await api(`/api/patients/${data.patient.id}`, { method: "PUT", body: JSON.stringify({ medicalNotes: notesDraft }) });
      toast("یادداشت ذخیره شد");
      setNotesDraft(null);
      bump();
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "خطا", "error");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await api(`/api/patients/${data.patient.id}`, { method: "DELETE" });
      toast("بیمار حذف شد");
      bump();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "خطا", "error");
    } finally {
      setBusy(false);
    }
  };

  const callMobile = (mobile: string) => {
    const url = `tel:${mobile}`;
    try {
      twa()?.openLink(url);
    } catch {
      window.location.href = url;
    }
  };

  return (
    <Sheet open onClose={onClose} title="پرونده بیمار">
      {notFound ? (
        <p className="py-10 text-center text-sm font-semibold text-slate-500">بیمار یافت نشد — شاید حذف شده است.</p>
      ) : !data ? (
        <div className="space-y-3 py-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* header */}
          <div className="flex items-center gap-3">
            <Avatar name={data.patient.fullName} className="size-14 rounded-3xl text-2xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-extrabold text-slate-900 dark:text-white">{data.patient.fullName}</p>
              <button onClick={() => callMobile(data.patient.mobile)} className="mt-0.5 flex items-center gap-1 text-[13px] font-bold text-teal-600 dark:text-teal-400" dir="ltr">
                <Phone className="size-3.5" /> {fa(data.patient.mobile)}
              </button>
            </div>
          </div>

          {/* notes */}
          <div>
            <SectionLabel>یادداشت</SectionLabel>
            {notesDraft === null ? (
              <button
                onClick={() => setNotesDraft(data.patient.medicalNotes ?? "")}
                className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-right text-[13px] leading-6 text-slate-600 transition-colors hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {data.patient.medicalNotes || "یادداشتی ثبت نشده — برای افزودن لمس کنید."}
              </button>
            ) : (
              <div className="animate-scale-in space-y-2">
                <TextArea autoFocus value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} maxLength={2000} className="min-h-28" />
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setNotesDraft(null)}>انصراف</Button>
                  <Button size="sm" loading={busy} onClick={saveNotes}>ذخیره یادداشت</Button>
                </div>
              </div>
            )}
          </div>

          {/* upcoming */}
          <div>
            <SectionLabel>نوبت‌های آینده ({fa(data.upcoming.length)})</SectionLabel>
            {data.upcoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-3.5 text-center text-[12px] font-semibold text-slate-400 dark:border-slate-800">
                نوبت آینده‌ای ثبت نشده است
              </p>
            ) : (
              <div className="space-y-2">
                {data.upcoming.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => openSheet({ type: "appointmentDetail", appointmentId: a.id })}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-right transition-colors hover:bg-slate-50 active:scale-[0.99] dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-[13px] font-extrabold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                      {faTime(a.startTime)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{relativeDayLabel(a.date)}</p>
                      <p className="text-[11px] text-slate-500">{faDuration(a.durationMinutes)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* history */}
          <div>
            <SectionLabel>سوابق ({fa(data.history.length)})</SectionLabel>
            {data.history.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-3.5 text-center text-[12px] font-semibold text-slate-400 dark:border-slate-800">
                سابقه‌ای وجود ندارد
              </p>
            ) : (
              <div className="space-y-2">
                {data.history.slice(0, 10).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => openSheet({ type: "appointmentDetail", appointmentId: a.id })}
                    className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-right transition-colors hover:bg-slate-100 active:scale-[0.99] dark:bg-slate-800/50 dark:hover:bg-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold text-slate-700 dark:text-slate-200">{formatDateLong(a.date)}</p>
                      <p className="text-[11px] text-slate-500">ساعت {faTime(a.startTime)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => openSheet({ type: "appointmentForm", preset: { patientId } })}>
              <CalendarPlus className="size-4" /> نوبت جدید
            </Button>
            <Button variant="outline" onClick={() => openSheet({ type: "patientForm", patient: data.patient })}>
              ویرایش اطلاعات
            </Button>
          </div>

          {!deleting ? (
            <button onClick={() => setDeleting(true)} className="mx-auto flex items-center gap-1.5 py-1 text-[12px] font-bold text-slate-400 transition-colors hover:text-rose-500">
              <Trash2 className="size-3.5" /> حذف بیمار و سوابق او
            </button>
          ) : (
            <div className="animate-scale-in space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
              <p className="text-[13px] font-extrabold text-rose-700 dark:text-rose-300">حذف دائمی بیمار؟</p>
              <p className="text-[12px] text-rose-600/80 dark:text-rose-300/70">تمام نوبت‌ها و سوابق این بیمار نیز حذف می‌شود.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setDeleting(false)}>انصراف</Button>
                <Button variant="danger" loading={busy} onClick={doDelete}>حذف دائمی</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
