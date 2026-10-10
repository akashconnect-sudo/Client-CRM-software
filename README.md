# Client CRM Software

Client CRM Software is a full-stack CRM platform built for lead management, sales team tracking, call history management, IVR call recording integration, and campaign-based lead handling.

This project is designed for businesses that manage large volumes of leads from multiple sources and need a structured system to assign, track, follow up, and convert leads efficiently.

## Live Demo

<<<<<<< HEAD
https://salesleadcrm.duckdns.org/
=======
https://salesleadcrm.duckdns.org/login
>>>>>>> 5e93e08 (Update domain to salesleadcrm.duckdns.org and add GSC verification)

## Features

- Secure authentication
- Role-based access control
- Super Admin, Manager, and Sales Employee roles
- Lead management dashboard
- Manual lead creation
- Bulk lead import using CSV/Excel
- Assign imported leads to sales employees
- Round-robin lead assignment
- Employee management
- IVR call log integration
- Call recording URL storage
- Employee-wise call history
- Follow-up tracking
- Lead status management
- Dashboard analytics
- Reports and CSV export
- Google Ads lead integration
- Meta Ads lead integration
- Responsive user interface

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT |
| Deployment | Vercel (app) + optional GPU host for AI |
| Database Hosting | Neon PostgreSQL |
| AI (optional) | Self-hosted on RunPod/EC2 — see [`ai-inference/README.md`](ai-inference/README.md) |

## Project Structure

```text
Client-CRM-software/
├── api/
├── backend/
├── frontend/
├── samples/
├── scripts/
├── README.md
├── LICENSE
├── package.json
├── vercel.json
└── DEPLOY.md
