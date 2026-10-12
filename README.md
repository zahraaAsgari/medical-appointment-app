# Medical Appointment — Telegram Mini App

A Telegram Mini App for medical clinics and doctors' offices to manage patient appointments. Built for **clinic receptionists and doctors**, not for patients. The receptionist schedules, views, reschedules, and cancels appointments entirely inside Telegram — no patient self-booking included.

> RTL Persian interface • Jalali (Shamsi) calendar • Mobile-first • Light/Dark theme

---

## ✨ Features

- **Telegram-native authentication** — automatic sign-in via `initData` HMAC validation. No passwords, no email.
- **Daily timeline dashboard** — Jalali day switcher (previous/next day + date picker), free/booked/blocked time blocks, now-line indicator.
- **Appointments** — create, edit, reschedule, cancel, complete, and permanently delete appointments grouped by day.
- **Conflict prevention** — double-booking, outside-working-hours, disabled days, past dates, and blocked (unavailable) slots are all rejected server-side with Persian error messages.
- **Patients (بیماران)** — list, search, add, edit, delete, and per-patient appointment history (name, mobile, short notes only).
- **Working hours** — 7-day Persian-week editor (Saturday–Friday), enable/disable each day, custom open/close times; all scheduling respects them.
- **Unavailable slots (مسدودی)** — block part of a day or a full day (surgery, conference, leave…), list active blocks, and remove them; bookings over a block are rejected.
- **Clinic & doctor profile** — doctor name/title/specialty/license/phone and clinic name/phone/address/website.
- **Telegram Mini App integration** — `ready()`, `expand()`, BackButton, MainButton ("ثبت نوبت"), haptic feedback, theme synchronization, `tel:` links.
- **Light/Dark theme** — respects Telegram/system preference, manual toggle in Profile.
- **Secure multi-user isolation** — server-side sessions, every query scoped to the authenticated user; no cross-user data access.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js **16.3.8** (App Router, Turbopack) |
| UI | React **19.2.6**, Tailwind CSS **4**, Lucide icons |
| Language | TypeScript **5.9.3** (strict) |
| Database | PostgreSQL (Neon-ready) |
| ORM | Drizzle ORM **0.45.2** + `pg` Pool |
| Auth | Telegram `initData` HMAC-SHA256 + server-side DB sessions |
| Dates | jalaali-js (Jalali calendar) |
| Fonts | Vazirmatn (`next/font`) |
| Tests | Node built-in `node:test` |

---

## 🚀 Getting Started (Development)

### Prerequisites

- Node.js 18+ (tested on v22)
- PostgreSQL 14+ (local) or a Neon database

### 1. Install & configure

```bash
npm install
cp .env.example .env
```

Edit `.env` — see [Environment Variables](#-environment-variables). For local development you'll want:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
ALLOW_DEMO_AUTH=true        # enables the dev login (no Telegram needed)
```

### 2. Create the database schema

```bash
npx drizzle-kit push --dialect=postgresql --schema=./src/db/schema.ts --url="$DATABASE_URL"
```

### 3. Run

```bash
npm run dev
```

Open the app. With `ALLOW_DEMO_AUTH=true` it signs you in as a demo doctor with seeded patients — full feature access, no Telegram required.

### Production-like local run

```bash
npm run build
npm start
```

---

## 🔧 Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server (`next start`) |
| `npm run lint` | ESLint (React Compiler rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `node --test src/lib/__tests__/*.test.mjs` | Unit tests (auth gating) |

---

## 🔐 Environment Variables

| Variable | Required in Prod | Purpose | Secret |
|---|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (pooled Neon URL recommended) | **Yes** |
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot token from [@BotFather](https://t.me/BotFather). Signs/validates Telegram `initData` | **Yes** |
| `ALLOW_DEMO_AUTH` | leave unset / `false` | Demo login fallback. **Off unless exactly `true`** (case/whitespace tolerant). Dev-only | No |
| `TELEGRAM_AUTH_MAX_AGE` | recommended `86400` | Seconds `initData` stays fresh. Default `300` lags users who background the app | No |

> `ALLOW_DEMO_AUTH` is **secure-by-default**: unset, `false`, `False`, `0`, `no`, `off`, or any mistyped value all keep anonymous login disabled. Only an explicit `true` enables it — never set it in production.

---

## 🔑 Authentication Model

```
Telegram opens Mini App ─┐
                         ├─ initData ──► POST /api/auth/telegram
Browser (demo, dev only) ┘                    │
                                              ├─ HMAC-SHA256 verify (bot token)
                                              ├─ upsert user by telegram_id
                                              └─ create 24h server-side session
                                                        │
                        clinic_session cookie (HttpOnly, SameSite=None + Secure on HTTPS)
                                                        │
                              required on every /api/* request ──► requireUser()
                                                        │
                                    every query scoped by session user's userId
```

- **Sessions** are single-active per user, stored in the `sessions` table, 24-hour expiry, regenerated on login.
- **Authorization** — every protected route calls `requireUser()`; all queries filter by the session's `userId`. Supplying another user's ID in a request body is ignored.
- **Demo mode** exists only for local development/preview and is disabled by default.

---

## 🗄️ Database

Seven tables: `users`, `sessions`, `clinic_profiles`, `working_hours`, `patients`, `appointments`, `unavailable_slots`.

- All foreign keys cascade from `users`; `appointments` also cascades from `patients`.
- `working_hours` has a `UNIQUE(userId, dayIndex)` constraint (dayIndex 0=Saturday … 6=Friday).
- Times are stored as `HH:mm` text; dates as `DATE`. No extensions required — plain PostgreSQL 14+.

Schema is applied with **drizzle-kit push** (no migration files yet):

```bash
npx drizzle-kit push --dialect=postgresql --schema=./src/db/schema.ts --url="$DATABASE_URL"
```

> Always pass `--url` explicitly; `drizzle.config.json` contains a local development URL.

---

## 🌐 API Overview

All protected routes return `401` without a valid session and scope data to the authenticated user.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/telegram` | Authenticate via Telegram initData / demo |
| GET | `/api/auth/me` | Current session user |
| POST | `/api/auth/logout` | Destroy session |
| GET/POST | `/api/patients` | List / create patients |
| GET/PUT/DELETE | `/api/patients/[id]` | Patient detail, history, edit, delete |
| GET/POST | `/api/appointments` | List / create appointments |
| GET | `/api/appointments/upcoming` | Future scheduled appointments |
| GET | `/api/appointments/date/[date]` | Day timeline: appointments + hours + blocks |
| GET/PUT/DELETE | `/api/appointments/[id]` | Detail, edit, delete |
| POST | `/api/appointments/[id]/cancel` | Cancel (frees the slot) |
| POST | `/api/appointments/[id]/reschedule` | Move to new date/time |
| GET/PUT | `/api/profile` | Doctor profile |
| GET/PUT | `/api/clinic` | Clinic profile |
| GET/PUT | `/api/working-hours` | 7-day schedule |
| GET/POST | `/api/unavailable` | List / create blocked slots |
| DELETE | `/api/unavailable/[id]` | Remove a block |
| GET | `/api/health` | Healthcheck |

---

## 🏗️ Project Structure

```
src/
├── app/
│   ├── layout.tsx            # RTL, Vazirmatn, theme init, Telegram SDK script
│   ├── page.tsx              # 4-tab shell + bottom navigation
│   ├── globals.css
│   └── api/                  # all route handlers (above)
├── components/
│   ├── providers.tsx         # AppProvider: boot/auth gating, sheets, toasts, theme
│   ├── home-tab.tsx          # daily timeline dashboard
│   ├── appointments-tab.tsx  # grouped appointment list
│   ├── patients-tab.tsx      # patient list + search
│   ├── profile-tab.tsx       # doctor/clinic/hours/theme
│   ├── forms.tsx             # patient/appointment/block-time sheet forms
│   ├── date-picker.tsx       # Jalali month grid
│   └── ui.tsx                # design system (Sheet, Button, skeletons…)
├── db/
│   ├── schema.ts             # 7 Drizzle tables
│   └── index.ts              # pg Pool
└── lib/
    ├── session.ts            # cookie session create/verify/destroy
    ├── telegram.ts           # initData HMAC validation
    ├── appointments.ts       # conflict detection
    ├── seed.ts               # dev-time demo data
    ├── format.ts             # Jalali/Persian date + digit helpers
    ├── __tests__/            # node:test unit tests
    └── … (dto, types, api, twa)
```

---

## 🚢 Production Deployment

Target: **Vercel** (recommended — reliably forwards `x-forwarded-proto`, required for the session cookie inside Telegram's iframe) + **Neon PostgreSQL**.

1. **Database** — provision Postgres (Neon works great), then push the schema using the connection URL. Use the **pooled** Neon URL for the app and the **direct** URL for `drizzle-kit push`.
2. **Bot** — create it via `@BotFather`; set the Mini App / Menu Button URL to your exact deployed HTTPS URL. The token must match this bot.
3. **Environment** — set in Vercel (Production + Preview):
   - `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_AUTH_MAX_AGE=86400`
   - leave `ALLOW_DEMO_AUTH` unset or `false`
4. **Deploy** — `npm run build` already passes typecheck, lint, and build.
5. **Verify** — `GET /api/health` → `{"ok":true}`, then test in a real Telegram client (desktop + mobile).

---

## ✅ Testing

- **Unit tests**: `node --test src/lib/__tests__/demo-auth.test.mjs` — 14 cases covering the demo-auth gate (unset/false/case/whitespace variants vs explicit `true`).
- **Verification the project has passed**: `npm run typecheck` (0 errors), `npm run lint` (0 errors), `npm run build` (clean), plus live runtime checks across authentication, conflict detection, isolation, and CRUD flows.
- **Requires a real Telegram client**: first-launch timing, BackButton/MainButton, haptics, `dvh`/safe-area layout against Telegram's native bottom bar.

---

## 🔒 Security Notes

- `TELEGRAM_BOT_TOKEN` and `DATABASE_URL` are server-only secrets — never commit them; `.gitignore` covers `.env*`.
- Telegram `initData` is validated with HMAC-SHA256 (timing-safe compare) plus freshness enforcement.
- Anonymous access creates no session and returns 401 on every protected endpoint.
- Demo auth can never enable itself accidentally (explicit `ALLOW_DEMO_AUTH=true` only).
- An empty `.env` of secrets is tracked nowhere; `.env.example` is provided as placeholders.

---

## 📜 History

```text
6a68043  fix: resolve Telegram startup and patient form layout
18833ad  fix: disable demo auth by default
1a2d623  feat: manage unavailable appointment slots
09ebecc  chore: initial project baseline
```

---

## License

Private internal project for clinic use. All rights reserved unless stated otherwise.
