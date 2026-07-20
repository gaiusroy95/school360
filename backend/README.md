# Backend — 360schoolERP API

Stack: Node.js, Express, Prisma, TypeScript, Neon PostgreSQL, JWT auth.

## Setup

1. Copy env file:
   ```bash
   cp .env.example .env
   ```
2. Paste your Neon `DATABASE_URL`.
3. Install & migrate:
   ```bash
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   npm run dev
   ```

   For creating new migrations during development:
   ```bash
   npm run prisma:migrate:dev
   ```

## Main endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/api/auth/register` | No | Register |
| POST | `/api/auth/login` | No | Login (JWT) |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/institution` | Yes | Institution |
| GET | `/api/institution/setup` | Yes | All setup tiles |
| PATCH | `/api/institution/setup/:tileKey` | Yes | Update one tile |
| POST | `/api/institution/setup/express` | Yes | Express Setup bulk apply |

## Render.com deploy

**Root Directory:** `backend`

**Build Command:**
```bash
npm install && npm run prisma:migrate && npm run build
```

**Start Command:**
```bash
npm start
```

**Environment variables** (same as `.env.example`):
- `DATABASE_URL` (Neon)
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FRONTEND_URL` (your frontend URL)
- `PORT` (Render sets this automatically; optional)

> Note: `@types/*`, `typescript`, and `prisma` are in `dependencies` so production installs on Render still have them for `tsc` / `prisma generate`.

