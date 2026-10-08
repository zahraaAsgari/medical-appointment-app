"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, RefreshCcw, Send } from "lucide-react";
import { api } from "@/lib/api";
import { hapticImpact, hapticNotify, twa } from "@/lib/twa";
import type { AppointmentDTO, ClinicDTO, PatientDTO, UnavailableDTO, UserDTO } from "@/lib/types";
import { Button, cn, Spinner } from "@/components/ui";
import { Sheet } from "@/components/ui";
import {
  AppointmentDetailSheet,
  AppointmentFormSheet,
  BlockTimeSheet,
  PatientDetailSheet,
  PatientFormSheet,
} from "@/components/forms";
import { JalaliDatePicker } from "@/components/date-picker";

/* --------------------------------- Context --------------------------------- */

export type SheetState =
  | { type: "appointmentForm"; preset?: { date?: string; startTime?: string; patientId?: number } }
  | { type: "appointmentDetail"; appointmentId: number }
  | { type: "blockTime"; presetDate?: string; slot?: UnavailableDTO }
  | { type: "patientForm"; patient?: PatientDTO }
  | { type: "patientDetail"; patientId: number }
  | null;

interface Toast {
  id: number;
  message: string;
  kind: "success" | "error";
}

interface AppContextValue {
  user: UserDTO | null;
  clinic: ClinicDTO | null;
  isDemo: boolean;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  dataVersion: number;
  bump: () => void;
  toast: (message: string, kind?: Toast["kind"]) => void;
  sheet: SheetState;
  openSheet: (s: NonNullable<SheetState>) => void;
  closeSheet: () => void;
  refreshUser: () => Promise<void>;
  refreshClinic: () => Promise<void>;
  openDatePicker: (initial: string, onPick: (iso: string) => void) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

/** Network/5xx failures are worth an automatic retry; auth 4xx are not. */
function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  const status = (err as { status?: number }).status;
  if (!status) return true; // fetch/abort/socket failure
  return status >= 500;
}

/* ------------------------------- Main button -------------------------------- */

export function useMainButton(text: string, onClick: (() => void) | null, visible: boolean): void {
  const handler = useRef(onClick);
  useEffect(() => {
    handler.current = onClick;
  }, [onClick]);
  useEffect(() => {
    const tg = twa();
    if (!tg) return;
    const btn = tg.MainButton;
    const cb = () => handler.current?.();
    if (visible && onClick) {
      btn.setText(text);
      btn.onClick(cb);
      btn.show();
    }
    return () => {
      btn.offClick(cb);
      btn.hide();
    };
  }, [text, visible, onClick]);
}

/* --------------------------------- Provider --------------------------------- */

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [clinic, setClinic] = useState<ClinicDTO | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [booting, setBooting] = useState(true);
  const [bootAttempt, setBootAttempt] = useState(0);
  const retryCount = useRef(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [dataVersion, setDataVersion] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [datePicker, setDatePicker] = useState<{ initial: string; onPick: (iso: string) => void } | null>(null);

  const bump = useCallback(() => setDataVersion((v) => v + 1), []);

  const toast = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    hapticNotify(kind);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const setTheme = useCallback((t: "light" | "dark") => {
    setThemeState(t);
    try {
      localStorage.setItem("clinic_theme", t);
    } catch {
      /* noop */
    }
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t;
    try {
      twa()?.setHeaderColor(t === "dark" ? "#020617" : "#f1f5f9");
      twa()?.setBackgroundColor(t === "dark" ? "#020617" : "#f1f5f9");
    } catch {
      /* noop */
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api<{ user: UserDTO; isDemo: boolean }>("/api/auth/me");
    setUser(res.user);
    setIsDemo(res.isDemo);
  }, []);

  const refreshClinic = useCallback(async () => {
    const res = await api<{ clinic: ClinicDTO | null }>("/api/clinic");
    setClinic(res.clinic);
  }, []);

  const openSheet = useCallback((s: NonNullable<SheetState>) => {
    hapticImpact("light");
    setSheet(s);
  }, []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const openDatePicker = useCallback((initial: string, onPick: (iso: string) => void) => {
    setDatePicker({ initial, onPick });
  }, []);

  const retryBoot = useCallback(() => setBootAttempt((n) => n + 1), []);

  // Boot: init Telegram SDK context, detect theme, authenticate.
  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark");
    setThemeState(dark ? "dark" : "light");

    const tg = twa();
    try {
      tg?.ready();
      tg?.expand();
      tg?.setHeaderColor(dark ? "#020617" : "#f1f5f9");
      tg?.setBackgroundColor(dark ? "#020617" : "#f1f5f9");
    } catch {
      /* noop */
    }

    const controller = new AbortController();
    setBooting(true);
    setAuthError(null);

    // Absolute timeout: never stay on the boot spinner indefinitely.
    const timeout = setTimeout(() => controller.abort(), 12000);

    (async () => {
      try {
        const res = await api<{ user: UserDTO; isDemo: boolean }>("/api/auth/telegram", {
          method: "POST",
          body: JSON.stringify({ initData: tg?.initData ?? "" }),
          signal: controller.signal,
        });
        setUser(res.user);
        setIsDemo(res.isDemo);
        setAuthError(null);
        refreshClinic().catch(() => undefined);
        setBooting(false);
      } catch (err) {
        // Aborted via the 12s timeout counts as a transient failure.
        if (controller.signal.aborted && retryCount.current >= 3) return;
        // Transient failures (offline, waking server, timeout) retry automatically
        // a few times before showing the error screen, so boot never hangs.
        if (retryCount.current < 3) {
          retryCount.current += 1;
          setBooting(false);
          setAuthError("اتصال برقرار نشد — در حال تلاش مجدد…");
          setTimeout(() => setBootAttempt((n) => n + 1), 1200);
          return;
        }
        setAuthError(err instanceof Error ? err.message : "خطا در ورود");
        setBooting(false);
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootAttempt]);

  // Telegram BackButton closes top sheet.
  useEffect(() => {
    const tg = twa();
    if (!tg) return;
    const visible = sheet !== null || datePicker !== null;
    const cb = () => {
      setDatePicker(null);
      setSheet(null);
    };
    if (visible) {
      tg.BackButton.onClick(cb);
      tg.BackButton.show();
    }
    return () => {
      tg.BackButton.offClick(cb);
      tg.BackButton.hide();
    };
  }, [sheet, datePicker]);

  const value: AppContextValue = {
    user,
    clinic,
    isDemo,
    theme,
    setTheme,
    dataVersion,
    bump,
    toast,
    sheet,
    openSheet,
    closeSheet,
    refreshUser,
    refreshClinic,
    openDatePicker,
  };

  return (
    <AppContext.Provider value={value}>
      {booting ? (
        <BootScreen />
      ) : authError ? (
        <AuthErrorScreen message={authError} onRetry={retryBoot} />
      ) : (
        <>
          {children}
          <SheetHost />
          {/* Global date picker sheet */}
          <Sheet open={datePicker !== null} onClose={() => setDatePicker(null)} title="انتخاب تاریخ">
            {datePicker && (
              <JalaliDatePicker
                value={datePicker.initial}
                onChange={(iso) => {
                  datePicker.onPick(iso);
                  setDatePicker(null);
                }}
              />
            )}
          </Sheet>
          {/* Toasts */}
          <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] mx-auto flex w-full max-w-md flex-col items-center gap-2 px-6">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "animate-toast-in pointer-events-auto flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-[13px] font-bold shadow-xl",
                  t.kind === "success" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-rose-600 text-white",
                )}
              >
                {t.kind === "success" ? <CheckCircle2 className="size-4.5 shrink-0 text-teal-400 dark:text-teal-600" /> : <AlertTriangle className="size-4.5 shrink-0" />}
                {t.message}
              </div>
            ))}
          </div>
        </>
      )}
    </AppContext.Provider>
  );
}

/* ------------------------------- Sheet switch -------------------------------- */

function SheetHost() {
  const { sheet, closeSheet, bump, toast } = useApp();
  if (!sheet) return null;

  switch (sheet.type) {
    case "appointmentForm":
      return <AppointmentFormSheet preset={sheet.preset} onClose={closeSheet} />;
    case "appointmentDetail":
      return <AppointmentDetailSheet appointmentId={sheet.appointmentId} onClose={closeSheet} />;
    case "blockTime":
      return <BlockTimeSheet presetDate={sheet.presetDate} slot={sheet.slot} onClose={closeSheet} />;
    case "patientForm":
      return <PatientFormSheet patient={sheet.patient} onClose={closeSheet} />;
    case "patientDetail":
      return <PatientDetailSheet patientId={sheet.patientId} onClose={closeSheet} />;
    default:
      return null;
  }
}

/* ------------------------------- Boot screens -------------------------------- */

function BootScreen() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative grid size-20 place-items-center rounded-[1.6rem] bg-gradient-to-br from-teal-500 to-cyan-600 shadow-[0_24px_48px_-16px_rgb(13,148,136,0.7)]">
          <svg viewBox="0 0 24 24" className="size-10 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="absolute inset-0 animate-ping rounded-[1.6rem] bg-teal-400/40" style={{ animationDuration: "1.8s" }} />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
          <Spinner className="size-4 text-teal-600" />
          در حال آماده‌سازی کلینیک…
        </div>
      </div>
    </div>
  );
}

function AuthErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center px-8">
      <div className="animate-scale-in flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
          <AlertTriangle className="size-7" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">ورود ناموفق بود</h1>
        <p className="text-[13px] leading-6 text-slate-500 dark:text-slate-400">{message}</p>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <Send className="size-3.5" />
          این برنامه از داخل تلگرام باز می‌شود
        </p>
        <Button onClick={onRetry} className="mt-1 w-full">
          <RefreshCcw className="size-4" />
          تلاش مجدد
        </Button>
      </div>
    </div>
  );
}
