# 360schoolERP — Mobile Apps

Two React Native (Expo) applications sharing one API and a common package.

| App | Package | Users |
|-----|---------|-------|
| **Student + Parent** | `packages/student-parent` | Students and parents (multi-child for parents) |
| **Staff** | `packages/staff` | Teachers, principals, transport staff |

Shared code: `packages/shared` (API client, auth, types, hooks).

---

## Confirmed implementation steps

Work in this order. **Do not build app screens until Phase A (mobile auth) is done** — existing `/api/academic/*` and `/api/examination/*` routes require admin JWT today.

### Phase 0 — Monorepo scaffold (this folder)

- [x] `mobile/` workspace with `packages/shared`, `packages/student-parent`, `packages/staff`
- [ ] Install dependencies: `cd mobile && npm install`
- [ ] Copy env: `cp packages/student-parent/.env.example packages/student-parent/.env` (and staff)
- [ ] Run apps: `npm run student-parent` / `npm run staff`

### Phase A — Backend mobile platform (critical path)

**Status: implemented** — run migration: `cd backend && npm run prisma:migrate`

1. **Prisma models** — `MobileAccount`, `MobileDevice`, `MobileNotification`, `MobileUpload`
2. **Auth API** — `POST /api/mobile/auth/login`, `change-password`, `GET /api/mobile/auth/me`
3. **Mobile JWT** — `MOBILE_JWT_SECRET` (falls back to `JWT_SECRET`); claim `type: mobile`
4. **Middleware** — `requireMobileAuth`, `requirePasswordChanged`, `requireStudentScope`
5. **Device registration** — `POST /api/mobile/devices/register`
6. **Notification inbox** — `GET /api/mobile/notifications`, `PATCH .../read`, `POST .../read-all`
7. **File uploads** — `POST /api/mobile/uploads` (base64), `GET /api/mobile/uploads/:id/file`

### Phase B — Schema & mobile BFF APIs

**Status: implemented** — migration `20260724110000_mobile_phase_b`

| Schema change | Purpose |
|---------------|---------|
| `AcademicHomework.attachments` | Daily diary PDF / video / image |
| `AcademicSyllabusChapter.lmsMediaItems` + `teacherInstructions` | LMS player |
| `StudentLeaveApplication.attachmentUrl` | Medical leave upload |
| `FeeDue` + `PaymentOrder` | Parent fee dues + payment orders (Razorpay stub) |
| `MobileReminderPreference` | Parent auto-reminder settings |

**BFF endpoints** (mobile JWT, `studentId` query for parents):

| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/mobile/dashboard` | Student, Parent |
| GET | `/api/mobile/homework` | Student, Parent |
| GET | `/api/mobile/timetable` | Student, Parent |
| GET | `/api/mobile/tests` | Student, Parent |
| GET | `/api/mobile/lms` | Student only |
| GET | `/api/mobile/profile` | Student, Parent |
| GET | `/api/mobile/fees` | Parent |
| POST | `/api/mobile/fees/:feeDueId/pay` | Parent |
| GET/PATCH | `/api/mobile/consents` | Parent (approve) |
| GET/POST | `/api/mobile/leave` | Parent |
| GET/PUT | `/api/mobile/reminders` | Parent |

### Phase C — Integrations

**Status: implemented** — migration `20260724120000_mobile_phase_c`

| Service | Backend module | Purpose |
|---------|----------------|---------|
| Expo Push + FCM | `expoPush.ts`, `fcm.ts`, `pushDelivery.ts` | Device push via Expo tokens or legacy FCM |
| MSG91 / WhatsApp | `sms.ts` | Absent alerts to parent mobiles |
| Razorpay | `razorpay.ts`, `mobileFees.ts` | Parent fee orders + verify + webhook |
| Transport GPS | `transport.ts` | Vehicle location pings, incidents, live status |
| Reminder cron | `mobileReminderScheduler.ts` | Fee + homework reminders every 5 min |

**New endpoints:**

| Method | Path | Roles |
|--------|------|-------|
| POST | `/api/mobile/fees/verify-payment` | Parent |
| POST | `/api/mobile/webhooks/razorpay` | Razorpay (signature) |
| GET | `/api/mobile/transport/vehicles` | Transport, Principal |
| GET | `/api/mobile/transport/vehicles/:vehicleId` | Transport, Principal |
| POST | `/api/mobile/transport/location` | Transport |
| POST | `/api/mobile/transport/emergency` | Transport |

**Env (backend):** `FCM_SERVER_KEY`, `MSG91_*`, `WHATSAPP_API_URL`, `RAZORPAY_WEBHOOK_SECRET`, `MOBILE_REMINDER_CRON_ENABLED`, `ABSENT_ALERT_CHANNEL`

**Deferred to Phase E (staff app):** `expo-location` background tracking on device; web admin UI for transport vehicles/routes.

### Phase D — Student + Parent app (`packages/student-parent`)

**Status: MVP implemented** — run `cd mobile && npm install && npm run student-parent`

**Auth flow:** Login (student/parent tab) → forced password reset → child picker (parent, 2+ children) → main tabs

**Tabs:** Home · Diary · Schedule · Tests · Alerts · Profile · LMS (student only)

**Parent screens** (via Profile): Fees · Leave · Consents · Reminders · School website (WebView)

Copy env: `cp packages/student-parent/.env.example packages/student-parent/.env`

**MVP 1 screens**

- [x] Login + forced password reset
- [x] Child picker (parent, multiple children)
- [x] Dashboard (per child)
- [x] Daily diary (attachments viewer)
- [x] Timetable
- [x] Test series (published papers list)
- [x] Notifications inbox
- [x] Profile / logout

**MVP 2 (parent-only)**

- [x] Fees + payment order (Razorpay checkout SDK deferred)
- [x] Leave application + upload
- [x] Consent approval
- [x] Reminder settings
- [x] School website (WebView)

**Student-only:** LMS chapter player (hidden on parent layer per spec)

**Phase F:** push notifications + OTP login — see Phase F section below

### Phase E — Staff app (`packages/staff`)

**Status: MVP implemented** — run `cd mobile && npm install && npm run staff`

**Auth:** Employee code + registered mobile (default password = mobile) → password reset

**Role-based tabs:**

| Role | Tabs |
|------|------|
| Teacher | Home · Attendance · Diary · Tasks · Alerts · Profile |
| Principal | Home · Attendance · Approvals · Alerts · Profile |
| Transport | Home · GPS · Alerts · Profile |

**Staff BFF** (`/api/mobile/staff/*`): dashboard, class attendance, diary create, tasks, schedule, leave, self-attendance (geo), evaluations, marks entry, test papers publish, principal leave approvals. Transport uses `/api/mobile/transport/*`.

**Teacher MVP**

- [x] Login + password reset
- [x] Class attendance (default present, tap absent → parent alerts)
- [x] Daily diary create + publish
- [x] Test papers list + publish to mobile
- [x] Marks entry (sheet list)
- [x] CCE evaluations (list)
- [x] Tasks (roster) with complete action
- [x] Self-attendance (geo check-in)
- [x] Leave application
- [x] Class schedule
- [x] Notifications

**Principal MVP**

- [x] Student/teacher/staff leave approvals
- [x] Schedule viewer
- [ ] Task assignment (web admin)
- [ ] Admission discount / expense approval (deferred)

**Transport MVP**

- [x] GPS location ping (30s interval)
- [x] Emergency alert
- [x] Vehicle list
- [ ] Background location task (deferred — use foreground interval for now)

**Deferred:** AI test creation, full marks entry grid, co-scholastic scoring UI, payroll

**Phase F:** push notifications + OTP login — see Phase F section below

### Phase F — Hardening

**Status: implemented** — migration `20260724130000_mobile_phase_f`

| Item | Details |
|------|---------|
| OTP login | `GET /api/mobile/auth/modes`, `POST .../request-otp`, `POST .../verify-otp`; UI on both login screens |
| Push registration | `expo-notifications` + `POST /api/mobile/devices/register` after sign-in |
| EAS builds | `eas.json` in each app; `npm run build:family` / `build:staff` from `mobile/` |
| Privacy | `mobile/docs/PRIVACY_POLICY.md` + in-app screen at `/(auth)/privacy` |
| E2E stubs | Maestro flows in `mobile/e2e/maestro/` |

**Backend env:** `MOBILE_OTP_ENABLED`, `MOBILE_OTP_REQUIRED`, `MSG91_OTP_TEMPLATE_ID`

**Mobile env:** `EXPO_PUBLIC_PRIVACY_POLICY_URL` (optional hosted policy link)

**Store release checklist:**

1. `eas init` in each app — set real `projectId` in `app.json` `extra.eas.projectId`
2. `cd backend && npm run prisma:migrate` (includes Phase F OTP table)
3. Enable OTP in production: `MOBILE_OTP_ENABLED=true` (optionally `MOBILE_OTP_REQUIRED=true`)
4. `cd mobile && npm install && npm run build:family` / `build:staff`
5. Run Maestro flows against dev builds before release

**Still deferred:** background GPS for transport, full Maestro CI pipeline, Razorpay native checkout

---

## Environment

```bash
# packages/student-parent/.env and packages/staff/.env
EXPO_PUBLIC_API_URL=http://localhost:4000
# EXPO_PUBLIC_API_URL=https://your-api.onrender.com
```

Backend additions (`.env`):

```
FCM_SERVER_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
UPLOAD_BUCKET_URL=
WHATSAPP_API_KEY=
```

---

## Scripts (from `mobile/`)

```bash
npm install
npm run student-parent   # Expo dev — Student + Parent app
npm run staff            # Expo dev — Staff app
npm run build:family     # EAS production build (student-parent)
npm run build:staff      # EAS production build (staff)
npm run lint             # Typecheck all packages
```

---

## Dependency on existing backend

These modules are **already implemented** on the web API and will be wrapped for mobile auth in Phase B:

- Homework: `GET /api/academic/homework/mobile`
- Lesson analytics: `GET /api/academic/analytics/mobile/lesson-performance`
- Co-scholastic: `/api/academic/co-scholastic/mobile/*`
- Teacher tasks: `/api/academic/teacher-roster/mobile/tasks`
- Exams: `/api/examination/mobile/*`
- Attendance, leave, consents, timetable: existing `attendance`, `parentConsents`, academic routes

---

## Suggested timeline

| Phase | Focus | Estimate |
|-------|--------|----------|
| 0 | Scaffold | 1 day |
| A | Mobile auth + notifications + uploads | 2–3 weeks |
| B | Schema + mobile BFF APIs | 2–3 weeks |
| C | FCM, payments, WhatsApp | 2 weeks |
| D | Student + Parent MVP | 4–6 weeks |
| E | Staff MVP (teacher → principal → transport) | 6–10 weeks |
| F | Hardening + store release | 2–4 weeks |

**Total:** ~4–6 months with one full-stack + one mobile developer.
