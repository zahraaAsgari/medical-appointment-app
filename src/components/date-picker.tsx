"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildMonthGrid,
  fa,
  jOf,
  monthTitle,
  todayISO,
  WEEKDAYS_FA_SHORT,
  isoOfJalali,
} from "@/lib/format";
import { cn } from "@/components/ui";
import { hapticSelect } from "@/lib/twa";

export function JalaliDatePicker({
  value,
  onChange,
  markedDates,
}: {
  value: string; // ISO gregorian
  onChange: (iso: string) => void;
  markedDates?: Set<string>;
}) {
  const [today] = useState(() => todayISO());
  const initial = value ? jOf(value) : jOf(today);
  const [{ jy, jm }, setMonth] = useState<{ jy: number; jm: number }>({ jy: initial.jy, jm: initial.jm });

  const cells = useMemo(() => buildMonthGrid(jy, jm), [jy, jm]);

  const shiftMonth = (delta: number) => {
    hapticSelect();
    let nm = jm + delta;
    let ny = jy;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    } else if (nm < 1) {
      nm = 12;
      ny -= 1;
    }
    setMonth({ jy: ny, jm: nm });
  };

  const selected = value;
  const selectedJ = selected ? jOf(selected) : null;
  const inSelectedMonth = selectedJ && selectedJ.jy === jy && selectedJ.jm === jm;
  const weekLen = cells.length / 7;
  const rows: typeof cells[] = [];
  for (let i = 0; i < weekLen; i++) rows.push(cells.slice(i * 7, (i + 1) * 7));

  return (
    <div dir="rtl" className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="ماه بعد"
          className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-300"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-bold text-slate-900 dark:text-white">{monthTitle(jy, jm)}</span>
          {(jy !== jOf(today).jy || jm !== jOf(today).jm) && (
            <button
              type="button"
              onClick={() => {
                const t = jOf(today);
                setMonth({ jy: t.jy, jm: t.jm });
                onChange(today);
                hapticSelect();
              }}
              className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-700 transition-all active:scale-95 dark:bg-teal-500/10 dark:text-teal-300"
            >
              امروز
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="ماه قبل"
          className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-300"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 text-center">
        {WEEKDAYS_FA_SHORT.map((w, i) => (
          <span key={i} className={cn("py-1 text-[11px] font-bold", i === 6 ? "text-rose-500 dark:text-rose-400" : "text-slate-400")}>
            {w}
          </span>
        ))}
      </div>

      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7">
          {row.map((cell) => {
            const isSelected = selected === cell.iso;
            const isToday = cell.iso === today;
            const isFriday = ri >= 0 && cells.indexOf(cell) % 7 === 6;
            const marked = markedDates?.has(cell.iso);
            return (
              <div key={cell.iso} className="relative p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    hapticSelect();
                    if (!inSelectedMonth || !isSelected) onChange(cell.iso);
                    const j = jOf(cell.iso);
                    if (j.jy !== jy || j.jm !== jm) setMonth({ jy: j.jy, jm: j.jm });
                  }}
                  className={cn(
                    "flex h-11 w-full items-center justify-center rounded-2xl text-[14px] font-semibold transition-all duration-150 active:scale-90",
                    isSelected
                      ? "bg-teal-600 text-white shadow-[0_8px_18px_-6px_rgb(13,148,136,0.65)] dark:bg-teal-500 dark:text-teal-950"
                      : cell.inMonth
                        ? "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        : "text-slate-300 dark:text-slate-600",
                    isToday && !isSelected && "ring-2 ring-inset ring-teal-500/60",
                    isFriday && !isSelected && cell.inMonth && "text-rose-500 dark:text-rose-400",
                  )}
                >
                  {fa(cell.jd)}
                </button>
                {marked && (
                  <span className={cn("pointer-events-none absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full", isSelected ? "bg-white" : "bg-teal-500")} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
