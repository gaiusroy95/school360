# 360schoolERP

Monorepo layout:

- `frontend/` — React + Vite dashboard
- `backend/` — Node.js + Express + Prisma API (Neon PostgreSQL)

## Quick start

### 1. Backend
```bash
cd backend
cp .env.example .env
# Paste your Neon DATABASE_URL and set JWT_SECRET
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```
API: http://localhost:4000

### 2. Frontend
```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:4000
npm install
npm run dev
```
App: http://localhost:3000

Default admin (seeded): `admin@360schoolerp.com` / `Admin@12345`
