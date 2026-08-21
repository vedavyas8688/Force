# Vercel Deployment

Deploy this repo as five Vercel projects:

| Project | Vercel root directory | Notes |
| --- | --- | --- |
| Backend API | `backend` | Express serverless function via `api/index.js` |
| Admin | `admin` | Vite app |
| Customer | `customer` | Vite app |
| Developer | `developer` | Vite app |
| Super Admin | `super-admin` | Vite app |

## Backend

Set the backend project root directory to `backend`.

Vercel entry files:

- `backend/api/index.js`
- `backend/vercel.json`

Use `backend/.env.vercel.example` as the variable checklist. Do not upload the local `.env` file.

The backend serverless function is configured in `backend/vercel.json` with a 60 second max duration for AI requests. If your Vercel plan has a lower limit, reduce `AI_TIMEOUT_MS` or move long-running AI analysis to a background worker.

Required production URL shape:

```env
API_PUBLIC_URL=https://forceinfinity-ten.vercel.app
ADMIN_URL=https://force-admin-rosy.vercel.app
CUSTOMER_URL=https://force-customer.vercel.app
DEVELOPER_URL=https://force-tau.vercel.app
CLIENT_ORIGINS=https://force-admin-rosy.vercel.app,https://force-customer.vercel.app,https://force-tau.vercel.app,https://force-super-admin.vercel.app
```

## Frontends

Deploy each frontend as a separate Vercel project with its folder as the root directory.

Set this env var in all four frontend projects:

```env
VITE_API_BASE_URL=https://forceinfinity-ten.vercel.app/api
```

Local VS Code still works because every frontend falls back to:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Workers

Vercel serverless functions do not run long-lived workers. The Express API can deploy to Vercel, but these scripts need a separate always-on process if you rely on queued background jobs:

```bash
npm run worker:github
npm run worker:notifications
```

Run them on a worker-friendly host such as Render, Railway, Fly.io, a VPS, or your local machine during testing.
