"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { fa } from "@/lib/format";
import type { PatientDTO } from "@/lib/types";
import { useApp } from "@/components/providers";
import { Avatar, Button, EmptyState, Skeleton } from "@/components/ui";

export function PatientsTab() {
  const { dataVersion, openSheet } = useApp();
  const [patients, setPatients] = useState<PatientDTO[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api<{ patients: PatientDTO[] }>("/api/patients");
      setPatients(res.patients);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      setError(false);
      void load();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [load, dataVersion]);

  const filtered = useMemo(() => {
    if (!patients) return null;
    const q = query.trim();
    if (!q) return patients;
    const digits = q.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)));
    return patients.filter((p) => p.fullName.includes(q) || p.mobile.includes(digits));
  }, [patients, query]);

  return (
    <div className="px-4 pt-2">
      <div className="mb-4 flex items-center justify-between pt-2">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 dark:text-white">بیماران</h1>
          {patients && <p className="mt-0.5 text-[12px] font-bold text-slate-500">{fa(patients.length)} بیمار ثبت شده</p>}
        </div>
        <Button size="sm" onClick={() => openSheet({ type: "patientForm" })}>
          <UserPlus className="size-4" />
          بیمار جدید
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-4 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو با نام یا موبایل…"
          className="h-12 w-full rounded-2xl border border-transparent bg-white pr-11 pl-4 text-sm font-semibold text-slate-900 shadow-sm outline-none ring-1 ring-slate-100 transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20 dark:bg-slate-900 dark:text-white dark:ring-slate-800"
        />
      </div>

      {error ? (
        <EmptyState icon={<Users className="size-7" />} title="خطا در دریافت بیماران" action={<Button onClick={load}>تلاش مجدد</Button>} />
      ) : filtered === null ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="size-7" />}
          title={query ? "بیماری یافت نشد" : "هنوز بیماری ثبت نشده است"}
          message={query ? "عبارت دیگری را جستجو کنید." : "اولین بیمار خود را ثبت کنید تا بتوانید برای او نوبت بگیرید."}
          action={
            <Button onClick={() => openSheet({ type: "patientForm" })}>
              <UserPlus className="size-4" /> ثبت بیمار جدید
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => openSheet({ type: "patientDetail", patientId: p.id })}
              className="flex w-full items-center gap-3 rounded-3xl bg-white p-3 text-right shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
            >
              <Avatar name={p.fullName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-extrabold text-slate-800 dark:text-slate-100">{p.fullName}</p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-500" dir="ltr" style={{ textAlign: "right" }}>
                  {fa(p.mobile)}
                </p>
              </div>
              {(p.upcomingCount ?? 0) > 0 && (
                <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-extrabold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  {fa(p.upcomingCount!)} نوبت آینده
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="h-6" />
    </div>
  );
}
