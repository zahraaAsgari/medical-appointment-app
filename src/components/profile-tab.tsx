"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  ChevronLeft,
  Clock3,
  HeartPulse,
  IdCard,
  LogOut,
  Moon,
  Pencil,
  Phone,
  ShieldCheck,
  Star,
  Sun,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { fa, faTime, WEEKDAYS_FA } from "@/lib/format";
import { hapticSelect } from "@/lib/twa";
import type { ClinicDTO, WorkingHourDTO } from "@/lib/types";
import { useApp } from "@/components/providers";
import { Button, cn, Field, NativeSelect, Sheet, Skeleton, Switch, TextInput, TimeSelect } from "@/components/ui";

export function ProfileTab() {
  const { user, clinic, theme, setTheme, openSheet } = useApp();
  const [personalOpen, setPersonalOpen] = useState(false);
  const [clinicOpen, setClinicOpen] = useState(false);
  const [whOpen, setWhOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const displayName = [user?.title, user?.firstName, user?.lastName].filter(Boolean).join(" ") || "پزشک گرامی";

  const logout = async () => {
    setLogoutBusy(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.reload();
    }
  };

  return (
    <div className="px-4 pt-2">
      <h1 className="mb-4 pt-2 text-[22px] font-black text-slate-900 dark:text-white">پروفایل</h1>

      {/* doctor card */}
      <div className="relative mb-4 overflow-hidden rounded-[1.75rem] bg-gradient-to-l from-teal-600 via-teal-600 to-cyan-600 p-5 text-white shadow-[0_20px_40px_-18px_rgb(13,148,136,0.7)]">
        <div className="pointer-events-none absolute -left-8 -top-10 size-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 -right-6 size-36 rounded-full bg-cyan-400/20" />
        <div className="relative flex items-center gap-4">
          {user?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoUrl} alt={displayName} className="size-16 rounded-3xl border-2 border-white/40 object-cover" />
          ) : (
            <div className="grid size-16 place-items-center rounded-3xl bg-white/20 text-2xl font-black backdrop-blur">
              {(user?.firstName ?? "پ").trim().charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[18px] font-black">{displayName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-bold text-teal-50/90">
              <HeartPulse className="size-3.5" />
              {user?.specialty ?? "تخصص ثبت نشده"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user?.licenseNumber && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold backdrop-blur">نظام پزشکی: {fa(user.licenseNumber)}</span>
              )}
              {user?.username && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold backdrop-blur" dir="ltr">
                  @{user.username}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* info groups */}
      <GroupCard
        icon={<UserRound className="size-4.5" />}
        title="اطلاعات فردی"
        rows={[
          { label: "نام کامل", value: displayName },
          { label: "تخصص", value: user?.specialty ?? "—" },
          { label: "شماره نظام پزشکی", value: user?.licenseNumber ? fa(user.licenseNumber) : "—" },
          { label: "موبایل", value: user?.phone ? fa(user.phone) : "—" },
        ]}
        onEdit={() => setPersonalOpen(true)}
      />

      <GroupCard
        icon={<Building2 className="size-4.5" />}
        title="اطلاعات کلینیک"
        rows={[
          { label: "نام کلینیک", value: clinic?.clinicName ?? "—" },
          { label: "تلفن", value: clinic?.phone ? fa(clinic.phone) : "—" },
          { label: "نشانی", value: clinic?.address ?? "—" },
        ]}
        onEdit={() => setClinicOpen(true)}
      />

      {/* working hours */}
      <button
        onClick={() => {
          hapticSelect();
          setWhOpen(true);
        }}
        className="mb-4 flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-right shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
      >
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
          <Clock3 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100">ساعات کاری مطب</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">تنظیم روزها و ساعات پذیرش</p>
        </div>
        <ChevronLeft className="size-5 text-slate-300 dark:text-slate-600" />
      </button>

      {/* appearance */}
      <div className="mb-4 flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10">
          {theme === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100">حالت تیره</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{theme === "dark" ? "فعال" : "غیرفعال"}</p>
        </div>
        <Switch checked={theme === "dark"} onChange={(v) => setTheme(v ? "dark" : "light")} />
      </div>

      {/* about + logout */}
      <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100">مدیریت نوبت کلینیک</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">مینی‌اپ تلگرام — نسخه ۱.۰</p>
          </div>
        </div>
        <Button variant="dangerSoft" className="mt-4 w-full" loading={logoutBusy} onClick={logout}>
          <LogOut className="size-4" />
          خروج از حساب
        </Button>
      </div>

      <PersonalEditSheet open={personalOpen} onClose={() => setPersonalOpen(false)} />
      <ClinicEditSheet open={clinicOpen} onClose={() => setClinicOpen(false)} />
      <WorkingHoursSheet open={whOpen} onClose={() => setWhOpen(false)} />
      <div className="h-6" />
    </div>
  );
}

/* --------------------------------- pieces ---------------------------------- */

function GroupCard({
  icon,
  title,
  rows,
  onEdit,
}: {
  icon: React.ReactNode;
  title: string;
  rows: { label: string; value: string }[];
  onEdit: () => void;
}) {
  return (
    <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
          <span className="text-teal-600 dark:text-teal-400">{icon}</span>
          {title}
        </p>
        <button onClick={onEdit} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-600 transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
          <Pencil className="size-3" /> ویرایش
        </button>
      </div>
      <dl className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-[11.5px] font-bold text-slate-400">{r.label}</dt>
            <dd className="min-w-0 truncate text-[12.5px] font-extrabold text-slate-700 dark:text-slate-200">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PersonalEditSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refreshUser, toast } = useApp();
  const [title, setTitle] = useState(user?.title ?? "دکتر");
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [specialty, setSpecialty] = useState(user?.specialty ?? "");
  const [license, setLicense] = useState(user?.licenseNumber ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(user?.title ?? "دکتر");
      setFirstName(user?.firstName ?? "");
      setLastName(user?.lastName ?? "");
      setSpecialty(user?.specialty ?? "");
      setLicense(user?.licenseNumber ?? "");
      setPhone(user?.phone ?? "");
    }
  }, [open, user]);

  const save = async () => {
    setBusy(true);
    try {
      await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ title: title || null, firstName, lastName, specialty, licenseNumber: license, phone }),
      });
      await refreshUser();
      toast("اطلاعات فردی ذخیره شد");
      onClose();
    } catch {
      toast("خطا در ذخیره اطلاعات", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="اطلاعات فردی">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Field label="عنوان">
            <NativeSelect value={title} onChange={(e) => setTitle(e.target.value)}>
              {["دکتر", "پروفسور", "جراح", "متخصص", ""].map((t) => (
                <option key={t} value={t}>
                  {t || "بدون عنوان"}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="نام">
            <TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} />
          </Field>
          <Field label="نام خانوادگی">
            <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} />
          </Field>
        </div>
        <Field label="تخصص">
          <TextInput value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="مثلاً متخصص داخلی" maxLength={80} />
        </Field>
        <Field label="شماره نظام پزشکی" optional>
          <TextInput inputMode="numeric" value={license} onChange={(e) => setLicense(e.target.value)} maxLength={30} />
        </Field>
        <Field label="موبایل" optional>
          <TextInput dir="ltr" className="text-left" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912…" maxLength={20} />
        </Field>
        <Button size="lg" className="w-full" loading={busy} onClick={save}>
          <IdCard className="size-5" /> ذخیره
        </Button>
      </div>
    </Sheet>
  );
}

function ClinicEditSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clinic, refreshClinic, toast } = useApp();
  const [name, setName] = useState(clinic?.clinicName ?? "");
  const [phone, setPhone] = useState(clinic?.phone ?? "");
  const [address, setAddress] = useState(clinic?.address ?? "");
  const [website, setWebsite] = useState(clinic?.website ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(clinic?.clinicName ?? "");
      setPhone(clinic?.phone ?? "");
      setAddress(clinic?.address ?? "");
      setWebsite(clinic?.website ?? "");
    }
  }, [open, clinic]);

  const save = async () => {
    setBusy(true);
    try {
      await api("/api/clinic", { method: "PUT", body: JSON.stringify({ clinicName: name, phone, address, website }) });
      await refreshClinic();
      toast("اطلاعات کلینیک ذخیره شد");
      onClose();
    } catch {
      toast("خطا در ذخیره اطلاعات", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="اطلاعات کلینیک">
      <div className="space-y-4">
        <Field label="نام کلینیک">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </Field>
        <Field label="تلفن کلینیک" optional>
          <TextInput dir="ltr" className="text-left" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="021…" maxLength={20} />
        </Field>
        <Field label="نشانی" optional>
          <TextInput value={address} onChange={(e) => setAddress(e.target.value)} maxLength={400} />
        </Field>
        <Field label="وب‌سایت" optional>
          <TextInput dir="ltr" className="text-left" inputMode="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" maxLength={200} />
        </Field>
        <Button size="lg" className="w-full" loading={busy} onClick={save} disabled={!name.trim()}>
          <Building2 className="size-5" /> ذخیره
        </Button>
      </div>
    </Sheet>
  );
}

function WorkingHoursSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { bump, toast, dataVersion } = useApp();
  const [items, setItems] = useState<WorkingHourDTO[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    try {
      const res = await api<{ workingHours: WorkingHourDTO[] }>("/api/working-hours");
      setItems([...res.workingHours].sort((a, b) => a.dayIndex - b.dayIndex));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setError(null);
      load();
    }
  }, [open, load, dataVersion]);

  const patch = (dayIndex: number, p: Partial<WorkingHourDTO>) => {
    setItems((list) => list?.map((w) => (w.dayIndex === dayIndex ? { ...w, ...p } : w)) ?? null);
  };

  const save = async () => {
    if (!items) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/working-hours", { method: "PUT", body: JSON.stringify({ items }) });
      bump();
      toast("ساعات کاری ذخیره شد");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="ساعات کاری مطب">
      {items === null ? (
        <div className="space-y-3 py-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>
          )}
          {items.map((w) => (
            <div
              key={w.dayIndex}
              className={cn(
                "rounded-2xl border p-3.5 transition-colors",
                w.enabled ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" : "border-slate-100 bg-slate-50 opacity-80 dark:border-slate-800 dark:bg-slate-800/40",
              )}
            >
              <div className="flex items-center justify-between">
                <p className={cn("text-[14px] font-extrabold", w.dayIndex === 6 ? "text-rose-500 dark:text-rose-400" : w.enabled ? "text-slate-800 dark:text-slate-100" : "text-slate-400")}>
                  {WEEKDAYS_FA[w.dayIndex]}
                  {w.dayIndex === 6 && <span className="mr-1.5 text-[10px] font-bold opacity-70">(تعطیل آخر هفته)</span>}
                </p>
                <Switch checked={w.enabled} onChange={(v) => patch(w.dayIndex, { enabled: v })} />
              </div>
              {w.enabled && (
                <div className="animate-scale-in mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-[10.5px] font-bold text-slate-400">بازگشایی {faTime(w.openTime)}</p>
                    <TimeSelect value={w.openTime} onChange={(v) => patch(w.dayIndex, { openTime: v })} minuteStep={30} />
                  </div>
                  <div>
                    <p className="mb-1 text-[10.5px] font-bold text-slate-400">تعطیلی {faTime(w.closeTime)}</p>
                    <TimeSelect value={w.closeTime} onChange={(v) => patch(w.dayIndex, { closeTime: v })} minuteStep={30} />
                  </div>
                </div>
              )}
            </div>
          ))}
          <Button size="lg" className="w-full" loading={busy} onClick={save}>
            <Clock3 className="size-5" /> ذخیره ساعات کاری
          </Button>
          <p className="flex items-center justify-center gap-1 pb-1 text-center text-[11px] font-semibold text-slate-400">
            <Star className="size-3" />
            نوبت‌دهی فقط در بازه ساعات کاری فعال مجاز است
          </p>
        </div>
      )}
    </Sheet>
  );
}
