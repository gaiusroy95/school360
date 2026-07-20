# Frontend — 360schoolERP Dashboard

```bash
cp .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL` to the backend URL (default `http://localhost:4000`).

Login uses JWT against the backend (`/api/auth/login`).

## Vercel deploy

**Root Directory:** `frontend`  
**Build Command:** `npm install && npm run build`  
**Output Directory:** `dist`

### Required environment variable (Build + Production)
```text
VITE_API_URL=https://YOUR-BACKEND.onrender.com
```
Do **not** leave this empty. Vite bakes it in at **build time**, so after changing it you must **redeploy**.

Also set on the **backend (Render)**:
```text
FRONTEND_URL=https://school360-weld.vercel.app
```
so CORS allows the frontend.