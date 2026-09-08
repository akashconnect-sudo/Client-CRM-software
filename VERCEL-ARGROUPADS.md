# Fix `ar-crm-iota.vercel.app` (argroupads Vercel project)

**Nayi (sahi) website:** https://ar-crm-iota-pi.vercel.app/login — project **ar-crm-iota** (personal Vercel).

**Purani URL:** https://ar-crm-iota.vercel.app — project **ar-crm** (team **argroupads-eductions**). Latest `main` deploy ke baad yeh URL automatically **pi** par redirect ho jayegi.

Full steps: [VERCEL-DOMAIN-MIGRATION.md](./VERCEL-DOMAIN-MIGRATION.md)

---

## Step 1 — Neon connection string

From Neon (Connection pooling **ON**, branch `production`):

1. Copy the full string (click **Show password** first).
2. Example shape:
   ```
   postgresql://neondb_owner:YOUR_PASSWORD@ep-damp-mouse-aprwwg9r-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
3. If login fails after deploy, remove `&channel_binding=require` from the URL and save again.

---

## Step 2 — Vercel environment variables

Open: **Vercel → argroupads-eductions → ar-crm → Settings → Environment Variables**

Add for **Production** and **Preview**:

| Name | Value |
|------|--------|
| `DATABASE_URL` | Paste full Neon pooled URL from Step 1 |
| `JWT_SECRET` | Long random string (e.g. `crm-jwt-2026-change-me`) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://ar-crm-iota.vercel.app` |
| `GOOGLE_WEBHOOK_SECRET` | `google-secret-demo` |
| `META_WEBHOOK_VERIFY_TOKEN` | `meta-verify-token-demo` |
| `META_WEBHOOK_SECRET` | `meta-secret-demo` |
| `IVR_WEBHOOK_SECRET` | `ivr-secret-demo` |

Do **not** add `VITE_API_URL`.

---

## Step 3 — Latest code from GitHub

Your screenshot showed an old deploy (`807fffe`). Latest code is on:

`https://github.com/akash-cyber-stack/Client-CRM-software` branch **`main`**

1. **Settings → Git** → confirm repo + branch `main`
2. **Deployments** → **⋯** → **Redeploy** (or push any commit to trigger build)

---

## Step 4 — Database tables (once)

From your PC (paste same `DATABASE_URL` in terminal, one line):

```powershell
cd E:\CRM
$env:DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-damp-mouse-aprwwg9r-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
npx prisma db push --schema=backend/prisma/schema.prisma
```

---

## Step 5 — Test

1. https://ar-crm-iota.vercel.app/api/health → `"database":"connected"`
2. https://ar-crm-iota.vercel.app/login → sign in or register Super Admin

---

## Still `DATABASE_URL` error?

- Env vars added to project **ar-crm** (argroupads), not personal **ar-crm-iota**
- Redeploy **after** saving variables
- Password in URL must be URL-encoded if it contains `@`, `#`, etc.
