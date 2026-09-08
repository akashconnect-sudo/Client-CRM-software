# Neon DB — cloud setup (stable connection)

Aapka database **pehle se Neon cloud** par hai (`neon.tech`). Local PC par database nahi chal raha — disconnect isliye hota tha kyunki:

1. **Galat connection** — direct URL use ho raha tha, serverless ke liye **Pooled** chahiye  
2. **Free tier sleep** — 5 minute inactive ke baad Neon compute so jata hai (cold start ~1–2 sec)

---

## Maine project me kya fix kiya

| File | Change |
|------|--------|
| `backend/.env` | `DATABASE_URL` → **pooler** host + `pgbouncer=true` |
| `backend/.env` | `DIRECT_URL` → migrations ke liye direct host |
| `backend/prisma/schema.prisma` | `directUrl` add |
| `backend/.env.example` | Neon pooled + direct template |

**Local restart:** backend band karke dubara `npm run dev`.

---

## Step 1 — Neon Console (aapka account)

1. Open: [https://console.neon.tech](https://console.neon.tech)  
2. Project select karo (e.g. `ep-damp-mouse-...`)  
3. **Connect** button → **Connection string**  
4. Do strings copy karo:

| Use | Neon tab | Hostname me |
|-----|----------|-------------|
| App + Vercel | **Pooled** | `-pooler` (e.g. `ep-xxx-pooler.region.aws.neon.tech`) |
| `prisma db push` | **Direct** | bina `-pooler` |

Pooled URL end me add karo (agar nahi hai):

```text
?sslmode=require&pgbouncer=true
```

---

## Step 2 — Local `backend/.env`

```env
DATABASE_URL="postgresql://USER:PASS@ep-xxx-pooler....neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASS@ep-xxx....neon.tech/neondb?sslmode=require"
```

Password kabhi GitHub par commit mat karo.

Test:

```powershell
cd E:\CRM\backend
npx prisma db execute --stdin --schema=prisma/schema.prisma <<< "SELECT 1"
# ya
node ../scripts/test-neon-connection.js
```

---

## Step 3 — Vercel (production cloud)

1. [Vercel Dashboard](https://vercel.com) → project **ar-crm-iota-pi** (ya jo CRM project hai)  
2. **Settings** → **Environment Variables**  
3. Add / update:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Neon **Pooled** string (`pgbouncer=true`) |
| `DIRECT_URL` | Neon **Direct** string (optional; migrations ke liye) |
| `JWT_SECRET` | strong random string |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://ar-crm-iota-pi.vercel.app` |

4. **Deployments** → latest → **Redeploy**

CLI (agar login ho):

```powershell
copy scripts\vercel-env.example scripts\vercel-env.local
# vercel-env.local me apna Pooled + Direct URL paste karo
powershell -File scripts\push-vercel-env.ps1
npx vercel deploy --prod
```

Check: `https://ar-crm-iota-pi.vercel.app/api/health` → `"database":"connected"`

---

## Step 4 — Kabhi bhi disconnect na ho (optional paid)

**Free Neon:** 5 min baad sleep — pehli API call par 1–2 sec delay normal hai.

**Paid Neon (Launch ~$5/mo):**

1. Neon Console → project → **Settings**  
2. **Scale to zero** → **Disable** (ya longer suspend time)  
3. Compute hamesha warm rahega — almost zero “Can’t reach database” errors

---

## Quick checklist

- [ ] `DATABASE_URL` me `-pooler` hostname hai  
- [ ] `pgbouncer=true` query param hai  
- [ ] Vercel par same `DATABASE_URL` + Redeploy  
- [ ] Backend restart after `.env` change  
- [ ] Health OK: `/api/health`  

## Agar ab bhi error aaye

| Error | Fix |
|-------|-----|
| `Can't reach database server` | Neon project **Resume** / internet; pooled URL check |
| `Environment variable not found: DATABASE_URL` | Vercel env add + redeploy |
| `Environment variable not found: DIRECT_URL` | `backend/.env` me `DIRECT_URL` add ya schema se hatao (migrations nahi chala rahe) |
| Slow first request | Free tier cold start — paid plan ya wait 2 sec retry |

Support: [Neon docs — Prisma](https://neon.tech/docs/guides/prisma)
