"use client";

import { useState } from "react";
import { CalendarDays, CalendarRange, UserRound, Users } from "lucide-react";
import { AppProvider } from "@/components/providers";
import { HomeTab } from "@/components/home-tab";
import { AppointmentsTab } from "@/components/appointments-tab";
import { PatientsTab } from "@/components/patients-tab";
import { ProfileTab } from "@/components/profile-tab";
import { cn } from "@/components/ui";
import { hapticSelect } from "@/lib/twa";

type TabKey = "home" | "appointments" | "patients" | "profile";

const TABS: { key: TabKey; label: string; icon: typeof CalendarDays }[] = [
  { key: "home", label: "خانه", icon: CalendarDays },
  { key: "appointments", label: "نوبت‌ها", icon: CalendarRange },
  { key: "patients", label: "بیماران", icon: Users },
  { key: "profile", label: "پروفایل", icon: UserRound },
];

export default function Page() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabKey>("home");

  return (
    <div dir="rtl" className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 pb-28">
        <div key={tab} className="animate-fade-in">
          {tab === "home" && <HomeTab />}
          {tab === "appointments" && <AppointmentsTab />}
          {tab === "patients" && <PatientsTab />}
          {tab === "profile" && <ProfileTab />}
        </div>
      </main>

      {/* bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md">
        <div className="pb-safe border-t border-slate-200/60 bg-white/85 px-4 pt-2 shadow-[0_-8px_30px_-12px_rgb(15,23,42,0.15)] backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/85">
          <div className="grid grid-cols-4">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (!active) hapticSelect();
                    setTab(key);
                  }}
                  aria-label={label}
                  className="group flex flex-col items-center gap-1 py-1.5"
                >
                  <span
                    className={cn(
                      "grid h-9 w-16 place-items-center rounded-full transition-all duration-300",
                      active ? "bg-teal-600/15 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
                    )}
                  >
                    <Icon className={cn("size-[22px] transition-transform duration-300", active && "scale-110")} strokeWidth={active ? 2.4 : 2} />
                  </span>
                  <span className={cn("text-[10.5px] font-extrabold transition-colors", active ? "text-teal-700 dark:text-teal-300" : "text-slate-400")}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
