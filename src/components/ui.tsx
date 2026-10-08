"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";
import { fa, statusLabel } from "@/lib/format";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* --------------------------------- Spinner --------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin", className)} />;
}

/* --------------------------------- Buttons --------------------------------- */

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "dangerSoft";

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 select-none";
  const sizes = {
    sm: "h-10 px-4 text-[13px]",
    md: "h-12 px-5 text-sm",
    lg: "h-[52px] px-6 text-[15px]",
  } as const;
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-teal-600 text-white shadow-[0_10px_24px_-8px_rgb(13,148,136,0.55)] hover:bg-teal-500 dark:bg-teal-500 dark:text-teal-950 dark:hover:bg-teal-400",
    secondary:
      "bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20",
    outline:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    danger: "bg-rose-600 text-white hover:bg-rose-500 shadow-[0_10px_24px_-8px_rgb(225,29,72,0.5)]",
    dangerSoft: "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20",
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

/* ---------------------------------- Field ---------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
  optional,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-slate-700 dark:text-slate-300">
        {label}
        {optional && <span className="text-[11px] font-normal text-slate-400">(اختیاری)</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-rose-600 dark:text-rose-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

const inputBase =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

export function TextInput({ className, invalid, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(inputBase, invalid && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15", className)} {...rest} />;
}

export function TextArea({ className, invalid, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(inputBase, "h-auto min-h-24 py-3 leading-6", invalid && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15", className)}
      {...rest}
    />
  );
}

export function NativeSelect({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(inputBase, "pl-10", className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

/* --------------------------------- Switch ---------------------------------- */

export function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40",
        checked ? "bg-teal-600 dark:bg-teal-500" : "bg-slate-300 dark:bg-slate-700",
      )}
    >
      <span
        className={cn(
          "absolute top-1 size-5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "-translate-x-6" : "-translate-x-1",
        )}
      />
    </button>
  );
}

/* -------------------------------- Chip select ------------------------------- */

export function ChipSelect({
  options,
  value,
  onChange,
  wrap = true,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  wrap?: boolean;
}) {
  return (
    <div className={cn("flex gap-2", wrap ? "flex-wrap" : "no-scrollbar overflow-x-auto")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "h-10 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition-all duration-200 active:scale-95",
            value === o.value
              ? "border-teal-600 bg-teal-600 text-white shadow-[0_6px_16px_-6px_rgb(13,148,136,0.6)] dark:border-teal-500 dark:bg-teal-500 dark:text-teal-950"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------- Time select ------------------------------- */

export function TimeSelect({
  value,
  onChange,
  minuteStep = 15,
  hourOptions,
}: {
  value: string; // HH:mm
  onChange: (v: string) => void;
  minuteStep?: number;
  hourOptions?: number[];
}) {
  const [h, m] = (value || "09:00").split(":").map(Number);
  const hours = hourOptions ?? Array.from({ length: 16 }, (_, i) => i + 7); // 07..22
  const minutes: number[] = [];
  for (let i = 0; i < 60; i += minuteStep) minutes.push(i);

  return (
    <div className="grid grid-cols-2 gap-2" dir="rtl">
      <NativeSelect value={String(h)} onChange={(e) => onChange(`${e.target.value.padStart(2, "0")}:${String(m).padStart(2, "0")}`)}>
        {hours.map((hh) => (
          <option key={hh} value={hh}>
            ساعت {fa(String(hh).padStart(2, "0"))}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect value={String(minutes.includes(m) ? m : 0)} onChange={(e) => onChange(`${String(h).padStart(2, "0")}:${e.target.value.padStart(2, "0")}`)}>
        {minutes.map((mm) => (
          <option key={mm} value={mm}>
            دقیقه {fa(String(mm).padStart(2, "0"))}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

/* ---------------------------------- Sheet ---------------------------------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setMounted(true), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setMounted(false);
      setDragY(0);
    }, 260);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  if (!mounted) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setDragY(delta);
  };
  const onTouchEnd = () => {
    if (dragY > 110) onClose();
    setDragY(0);
    setDragging(false);
    startY.current = null;
  };

  return (
    <div className={cn("fixed inset-0 z-50 flex items-end justify-center", !open && "pointer-events-none")}>
      <div
        className={cn("absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{ transform: `translateY(${dragY}px)`, transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.32,0.72,0,1)" }}
        className={cn(
          "relative flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[1.75rem] bg-white shadow-2xl dark:bg-slate-900",
          open ? "animate-sheet-up" : "translate-y-full",
        )}
      >
        <div className="shrink-0 cursor-grab touch-none pb-1 pt-2.5" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="mx-auto h-1.5 w-11 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        {title && (
          <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-1">
            <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              aria-label="بستن"
              className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <X className="size-4.5" />
            </button>
          </div>
        )}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-6">{children}</div>
        {footer && <div className="pb-safe shrink-0 border-t border-slate-100 bg-white/90 px-5 py-3.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------- Skeleton bits ------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/* -------------------------------- Empty state ------------------------------- */

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-scale-in flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-900/40">
      <div className="grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">{icon}</div>
      <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{title}</p>
      {message && <p className="-mt-1 max-w-60 text-[13px] leading-6 text-slate-500 dark:text-slate-400">{message}</p>}
      {action}
    </div>
  );
}

/* ------------------------------- Status badge ------------------------------- */

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  completed: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/10",
  cancelled: "bg-rose-50 text-rose-600 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
  no_show: "bg-amber-50 text-amber-700 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset", STATUS_STYLE[status] ?? STATUS_STYLE.scheduled, className)}>
      {statusLabel(status)}
    </span>
  );
}

/* --------------------------------- Avatar ---------------------------------- */

const AVATAR_TONES = [
  "from-teal-500 to-emerald-500",
  "from-sky-500 to-indigo-500",
  "from-violet-500 to-fuchsia-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initial = name.trim().charAt(0) || "؟";
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const tone = AVATAR_TONES[hash % AVATAR_TONES.length];
  return (
    <div className={cn("grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-base font-extrabold text-white shadow-sm", tone, className)}>
      {initial}
    </div>
  );
}
