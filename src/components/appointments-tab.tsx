"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, ClipboardList, Search } from "lucide-react";
import { api } from "@/lib/api";
import { fa, faTime, relativeDayLabel, todayISO } from "@/lib/format";
import { hapticSelect } from "@/lib/twa";
import type { AppointmentDTO } from "@/lib/types";
import { useApp } from "@/components/providers";
import { Avatar, Button, cn, EmptyState, Skeleton, StatusBadge } from "@/components/ui";

type Filter = "upcoming" | "today" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "upcoming", label: "آینده" },
  { key: "today", label: "امروز" },
  { key: "all", label: "همه" },
];

export function AppointmentsTab() {
  const { dataVersion, openSheet } = useApp();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [items, setItems] = useState<AppointmentDTO[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async (f: Filter) => {
    const today = todayISO();
    const url =
      f === "upcoming"
        ? "/api/appointments/upcoming"
        : f === "today"
          ? `/api/appointments?from=${today}&to=${today}`
          : "/api/appointments";
    try {
      const res = await api<{ appointments: AppointmentDTO[] }>(url);
      setItems(res.appointments);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      setItems(null);
      setError(false);
      void load(filter);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [filter, dataVersion, load]);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (!query.trim()) return items;
    const q = query.trim();
    return items.filter((a) => a.patientName.includes(q) || a.patientMobile.includes(q));
  }, [items, query]);

  const groups = useMemo(() => {
    if (!filtered) return null;
    const map = new Map<string, AppointmentDTO[]>();
    for (const a of filtered) {
      const arr = map.get(a.date) ?? [];
      arr.push(a);
      map.set(a.date, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="px-4 pt-2">
      <div className="mb-4 flex items-center justify-between pt-2">
        <h1 className="text-[22px] font-black text-slate-900 dark:text-white">نوبت‌ها</h1>
        <Button size="sm" onClick={() => openSheet({ type: "appointmentForm", preset: {} })}>
          <CalendarPlus className="size-4" />
          نوبت جدید
        </Button>
      </div>

      {/* search */}
      <div className="relative mb-3">
        <Search className="absolute right-4 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی نام بیمار…"
          className="h-12 w-full rounded-2xl border border-transparent bg-white pr-11 pl-4 text-sm font-semibold text-slate-900 shadow-sm outline-none ring-1 ring-slate-100 transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20 dark:bg-slate-900 dark:text-white dark:ring-slate-800"
        />
      </div>

      {/* filter chips */}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              hapticSelect();
              setFilter(f.key);
            }}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-[12.5px] font-extrabold transition-all active:scale-95",
              filter === f.key
                ? "bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900"
                : "bg-white text-slate-500 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* list */}
      {error ? (
        <EmptyState
          icon={<ClipboardList className="size-7" />}
          title="خطا در دریافت نوبت‌ها"
          action={<Button onClick={() => load(filter)}>تلاش مجدد</Button>}
        />
      ) : filtered === null ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px] w-full rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-7" />}
          title="نوبتی یافت نشد"
          message={filter === "upcoming" ? "هیچ نوبت آینده‌ای ثبت نشده است." : "با فیلتر انتخابی نوبتی وجود ندارد."}
          action={
            <Button onClick={() => openSheet({ type: "appointmentForm", preset: {} })}>
              <CalendarPlus className="size-4" /> ثبت نوبت جدید
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {groups!.map(([date, list]) => (
            <section key={date}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-[13px] font-extrabold text-slate-700 dark:text-slate-300">{relativeDayLabel(date)}</h2>
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10.5px] font-extrabold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {fa(list.length)} نوبت
                </span>
              </div>
              <div className="space-y-2">
                {list.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => openSheet({ type: "appointmentDetail", appointmentId: a.id })}
                    className="flex w-full items-center gap-3 rounded-3xl bg-white p-3 text-right shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
                  >
                    <div className="grid w-14 shrink-0 place-items-center rounded-2xl bg-slate-50 py-2 dark:bg-slate-800/70">
                      <span className="text-[14px] font-black text-slate-800 dark:text-slate-100">{faTime(a.startTime)}</span>
                      <span className="text-[9.5px] font-bold text-slate-400">تا {faTime(a.endTime)}</span>
                    </div>
                    <Avatar name={a.patientName} className="size-10 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-extrabold text-slate-800 dark:text-slate-100">{a.patientName}</p>
                      <p className="truncate text-[11px] font-semibold text-slate-500" dir="ltr" style={{ textAlign: "right" }}>
                        {fa(a.patientMobile)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <div className="h-6" />
    </div>
  );
}
