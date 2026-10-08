"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, CalendarPlus, CalendarX2, ChevronLeft, ChevronRight, Clock3, Sparkles, Users } from "lucide-react";
import { api } from "@/lib/api";
import {
  addDaysISO,
  fa,
  faTime,
  formatDateLong,
  relativeDayLabel,
  toHHMM,
  toMin,
  todayISO,
  WEEKDAYS_FA,
} from "@/lib/format";
import { hapticSelect } from "@/lib/twa";
import type { AppointmentDTO, DaySchedule } from "@/lib/types";
import { useApp } from "@/components/providers";
import { Button, cn, EmptyState, Skeleton } from "@/components/ui";

const PX_PER_MIN = 1.6;
const LABEL_W = 58;

const STATUS_BLOCK: Record<string, string> = {
  scheduled: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100",
  completed: "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function HomeTab() {
  const { dataVersion, openSheet, openDatePicker, clinic } = useApp();
  const [date, setDate] = useState(todayISO());
  const [day, setDay] = useState<DaySchedule | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (iso: string) => {
    setLoading(true);
    try {
      const res = await api<DaySchedule>(`/api/appointments/date/${iso}`);
      setDay(res);
    } catch {
      setDay(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, dataVersion, load]);

  const nav = (dd: number) => {
    hapticSelect();
    setDate((d) => addDaysISO(d, dd));
  };

  const wh = day?.workingHour ?? null;
  const isToday = date === todayISO();
  const dayOff = wh !== null && !wh.enabled;

  const range = useMemo(() => {
    if (wh && wh.enabled) return { start: toMin(wh.openTime), end: toMin(wh.closeTime) };
    return { start: 8 * 60, end: 20 * 60 };
  }, [wh]);

  const fullDayBlock = day?.unavailable.find((u) => u.isFullDay);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNowLine = isToday && !dayOff && nowMin >= range.start && nowMin <= range.end;

  const activeCount = day?.appointments.filter((a) => a.status !== "cancelled").length ?? 0;
  const cancelledCount = day?.appointments.filter((a) => a.status === "cancelled").length ?? 0;

  return (
    <div className="px-4 pt-2">
      {/* greeting */}
      <div className="mb-4 pt-2">
        <p className="text-[12px] font-bold text-teal-600 dark:text-teal-400">{formatDateLong(todayISO())}</p>
        <h1 className="mt-1 text-[22px] font-black leading-8 text-slate-900 dark:text-white">
          {clinic?.clinicName ?? "کلینیک من"}
        </h1>
      </div>

      {/* date switcher */}
      <div className="mb-3 flex items-center gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <button
          onClick={() => nav(-1)}
          aria-label="روز قبل"
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-300"
        >
          <ChevronRight className="size-5" />
        </button>
        <button
          onClick={() => openDatePicker(date, (iso) => setDate(iso))}
          className="h-11 min-w-0 flex-1 rounded-2xl bg-slate-50 px-3 text-[14px] font-extrabold text-slate-800 transition-all hover:bg-slate-100 active:scale-[0.98] dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <span className="flex items-center justify-center gap-2">
            <span className="truncate">{relativeDayLabel(date)}</span>
            {!isToday && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setDate(todayISO());
                }}
                className="shrink-0 rounded-full bg-teal-600 px-2.5 py-1 text-[10px] font-extrabold text-white dark:bg-teal-500 dark:text-teal-950"
              >
                برگشت به امروز
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => nav(1)}
          aria-label="روز بعد"
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-300"
        >
          <ChevronLeft className="size-5" />
        </button>
      </div>

      {/* day meta + quick actions */}
      <div className="mb-4 flex items-center gap-2">
        <div
          className={cn(
            "flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl px-3.5 text-[12px] font-bold",
            dayOff || fullDayBlock
              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
              : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800",
          )}
        >
          <Clock3 className="size-4 shrink-0" />
          <span className="truncate">
            {fullDayBlock
              ? `کل روز مسدود: ${fullDayBlock.reason}`
              : dayOff
                ? `مطب ${WEEKDAYS_FA[wh!.dayIndex]}ها تعطیل است`
                : wh
                  ? `ساعت کاری: ${faTime(wh.openTime)} تا ${faTime(wh.closeTime)}`
                  : "ساعت کاری تعریف نشده"}
          </span>
        </div>
        <Button size="md" className="shrink-0 rounded-2xl" onClick={() => openSheet({ type: "appointmentForm", preset: { date } })}>
          <CalendarPlus className="size-4.5" />
          نوبت
        </Button>
        <Button size="md" variant="outline" className="shrink-0 rounded-2xl px-4" onClick={() => openSheet({ type: "blockTime", presetDate: date })}>
          <Ban className="size-4.5" />
          مسدودی
        </Button>
      </div>

      {/* summary chips */}
      {day && !loading && (activeCount > 0 || cancelledCount > 0) && (
        <div className="mb-3 flex gap-2 text-[11px] font-extrabold">
          <span className="rounded-full bg-teal-50 px-3 py-1.5 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">{fa(activeCount)} نوبت فعال</span>
          {cancelledCount > 0 && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{fa(cancelledCount)} زمان آزاد شده</span>
          )}
        </div>
      )}

      {/* timeline */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !day ? (
        <EmptyState icon={<CalendarX2 className="size-7" />} title="خطا در دریافت برنامه روز" message="اتصال را بررسی کرده و دوباره تلاش کنید." action={<Button onClick={() => load(date)}>تلاش مجدد</Button>} />
      ) : dayOff || fullDayBlock ? (
        <EmptyState
          icon={<Ban className="size-7" />}
          title={fullDayBlock ? `مسدود: ${fullDayBlock.reason}` : "روز غیرکاری"}
          message={fullDayBlock ? "این روز به‌طور کامل برای نوبت‌دهی بسته است." : "برای این روز می‌توانید از پروفایل، ساعت کاری تعریف کنید."}
        />
      ) : (
        <Timeline day={day} range={range} showNowLine={showNowLine} nowMin={nowMin} date={date} />
      )}

      <div className="h-6" />
    </div>
  );
}

function Timeline({
  day,
  range,
  showNowLine,
  nowMin,
  date,
}: {
  day: DaySchedule;
  range: { start: number; end: number };
  showNowLine: boolean;
  nowMin: number;
  date: string;
}) {
  const { openSheet } = useApp();
  const height = (range.end - range.start) * PX_PER_MIN;
  const hours: number[] = [];
  for (let m = range.start; m < range.end; m += 60) hours.push(m);

  const blocks = day.appointments;
  const unavailable = day.unavailable.filter((u) => !u.isFullDay);

  return (
    <div className="relative rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800" style={{ height: height + 24 }}>
      <div className="absolute inset-x-3 top-3 bottom-3">
        {/* hour lines + labels */}
        {hours.map((m) => (
          <div key={m}>
            <div
              className="absolute border-t border-slate-100 dark:border-slate-800/70"
              style={{ top: (m - range.start) * PX_PER_MIN, right: LABEL_W, left: 0 }}
            />
            <span
              className="absolute -translate-y-1/2 text-center text-[10.5px] font-bold text-slate-400 dark:text-slate-500"
              style={{ top: (m - range.start) * PX_PER_MIN, right: 0, width: LABEL_W }}
            >
              {fa(toHHMM(m))}
            </span>
          </div>
        ))}

        {/* now line */}
        {showNowLine && (
          <div className="animate-nowline pointer-events-none absolute z-10" style={{ top: (nowMin - range.start) * PX_PER_MIN, right: LABEL_W, left: 0 }}>
            <div className="relative h-0.5 bg-rose-500">
              <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-rose-500" />
              <span className="absolute -top-2.5 left-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white">{faTime(toHHMM(nowMin))}</span>
            </div>
          </div>
        )}

        {/* unavailable */}
        {unavailable.map((u) => {
          const top = (toMin(u.startTime) - range.start) * PX_PER_MIN;
          const h = (toMin(u.endTime) - toMin(u.startTime)) * PX_PER_MIN;
          const v = Math.max(top, 0);
          const vH = Math.min(h - Math.max(0, -top), height - v);
          return (
            <button
              key={u.id}
              onClick={() => openSheet({ type: "blockTime", presetDate: date })}
              className="hatch absolute z-[5] overflow-hidden rounded-xl border border-slate-200 bg-slate-50/90 px-2 dark:border-slate-700 dark:bg-slate-800/60"
              style={{ top: v, height: Math.max(vH, 18), right: LABEL_W + 6, left: 2 }}
            >
              {vH > 34 && (
                <span className="flex h-full items-center justify-center text-center text-[10.5px] font-bold leading-4 text-slate-400 dark:text-slate-500">
                  مسدود — {u.reason}
                </span>
              )}
            </button>
          );
        })}

        {/* free day marker */}
        {blocks.length === 0 && unavailable.length === 0 && (
          <button
            onClick={() => openSheet({ type: "appointmentForm", preset: { date } })}
            className="absolute z-[4] flex items-center justify-center rounded-xl border-2 border-dashed border-teal-200 text-[12px] font-extrabold text-teal-500 transition-colors hover:bg-teal-50/50 dark:border-teal-500/30 dark:hover:bg-teal-500/5"
            style={{ top: 8, height: 88, right: LABEL_W + 6, left: 2 }}
          >
            <Users className="ml-1.5 size-4" /> کل روز آزاد است — برای ثبت نوبت لمس کنید
          </button>
        )}

        {/* appointments */}
        {blocks.map((a) => (
          <AppointmentBlock key={a.id} a={a} rangeStart={range.start} />
        ))}
      </div>
    </div>
  );
}

function AppointmentBlock({ a, rangeStart }: { a: AppointmentDTO; rangeStart: number }) {
  const { openSheet } = useApp();
  const top = (toMin(a.startTime) - rangeStart) * PX_PER_MIN;
  const h = Math.max(a.durationMinutes * PX_PER_MIN, 26);

  if (a.status === "cancelled") {
    return (
      <button
        onClick={() => openSheet({ type: "appointmentDetail", appointmentId: a.id })}
        className="group absolute z-[6] overflow-hidden rounded-xl border-2 border-dashed border-teal-300/80 bg-teal-50/70 text-right transition-all hover:bg-teal-100/70 dark:border-teal-500/35 dark:bg-teal-500/10 dark:hover:bg-teal-500/15"
        style={{ top, height: Math.max(h, 40), right: LABEL_W + 6, left: 2 }}
      >
        <span className="flex h-full flex-col justify-center gap-0.5 px-3">
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-700 dark:text-teal-300">
            <Sparkles className="size-3.5 shrink-0" />
            زمان آزاد — {faTime(a.startTime)} تا {faTime(a.endTime)}
          </span>
          <span className="truncate text-[10px] font-semibold text-teal-600/70 dark:text-teal-400/60">نوبت {a.patientName} لغو شد</span>
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => openSheet({ type: "appointmentDetail", appointmentId: a.id })}
      className={cn(
        "absolute z-[6] overflow-hidden rounded-xl border text-right shadow-sm transition-all hover:brightness-95 active:scale-[0.99] dark:hover:brightness-110",
        STATUS_BLOCK[a.status] ?? STATUS_BLOCK.scheduled,
      )}
      style={{ top, height: h, right: LABEL_W + 6, left: 2 }}
    >
      <span
        className={cn(
          "absolute inset-y-1.5 right-1.5 w-1 rounded-full",
          a.status === "scheduled" ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600",
        )}
      />
      <span className="flex h-full flex-col justify-center gap-0.5 px-3 pr-4">
        <span className="truncate text-[12.5px] font-extrabold leading-4">{a.patientName}</span>
        <span className="truncate text-[10.5px] font-bold opacity-70" dir="ltr">
          {faTime(a.startTime)}–{faTime(a.endTime)}
        </span>
      </span>
    </button>
  );
}
