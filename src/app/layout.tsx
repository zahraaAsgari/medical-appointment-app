import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Vazirmatn } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  title: "مدیریت نوبت‌دهی کلینیک",
  description: "مینی‌اپ تلگرام مدیریت نوبت‌های بیماران برای مطب‌ها و کلینیک‌های پزشکی",
  applicationName: "Clinic Appointments",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("clinic_theme");
    var tg = window.Telegram && window.Telegram.WebApp;
    var scheme = tg && tg.colorScheme;
    var dark = stored
      ? stored === "dark"
      : scheme
        ? scheme === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Non-blocking: loads in parallel and runs before hydration. Missing CDN must never stall the app. */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" defer />
      </head>
      <body className={`${vazir.variable} bg-slate-100 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
