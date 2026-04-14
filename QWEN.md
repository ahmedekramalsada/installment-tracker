# Installment Tracker - Project Context

## Project Overview

**Installment Tracker** (متتبع التقسيط) is a full-stack web application for tracking installment payments among friends. It features a bilingual Arabic/English interface with full RTL support, a dark glass-morphism UI, and comprehensive payment management capabilities.

**☁️ Cloud-Ready:** Now powered by **Supabase** (PostgreSQL) — deploy anywhere, automatic daily backups, no local database files needed.

### Key Features
- **Admin Panel** — Full CRUD for friends, purchases, and payments
- **User Accounts** — Friends can log in to view their own payment status
- **Interest & Fees** — Track interest rates and flat fees per purchase
- **Payment Tracking** — Visual progress bars showing paid vs remaining amounts
- **Payment History** — Every payment recorded with date, amount, and who made it
- **Audit Trail** — All changes auto-logged via database triggers
- **WhatsApp Reminders** — One-click monthly payment reminders
- **Charts & Analytics** — Pie, bar, and area charts for debt analysis
- **Export to PDF/Excel** — Download reports for sharing
- **Payment Calendar** — Visual calendar of due dates
- **Error Notifications** — Toast notifications for all API errors
- **PWA Support** — Installable on phone home screens
- **Dark Glass UI** — Frosted glass design with gradients

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Zustand (state), Recharts |
| Backend | Express 5, **Supabase** (PostgreSQL), JWT Auth, bcryptjs |
| Database | **Supabase** (PostgreSQL) — cloud-hosted, auto-backup |
| Validation | Zod (server-side input validation) |
| Security | Rate limiting (express-rate-limit), morgan logging |
| Charts | Recharts |
| Export | jsPDF, xlsx |
| Icons | Lucide React |
| Build | Vite 8, tsx (dev server) |
| Deployment | Docker + Docker Compose |

## Project Structure

```
├── server/
│   └── src/
│       ├── index.ts           # Express server + rate limiting + morgan logging
│       ├── db.ts              # Supabase client (service role key)
│       ├── middleware/
│       │   └── auth.ts        # JWT auth + bcrypt login/register via Supabase
│       └── routes/
│           ├── auth.ts        # Login/register with Zod validation
│           ├── friends.ts     # Friend CRUD (Supabase queries)
│           ├── purchases.ts   # Purchase CRUD + pay/unpay + payment_history
│           ├── stats.ts       # Dashboard statistics (computed in JS)
│           ├── settings.ts    # App settings (key-value in Supabase)
│           └── reminders.ts   # WhatsApp reminders
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Run once in Supabase SQL Editor
├── src/
│   ├── main.tsx               # App entry + Toast provider + error handler
│   ├── App.tsx                # Main app shell with tabs
│   ├── pages/
│   │   ├── LoginPage.tsx      # Login/register form
│   │   ├── AnalyticsPage.tsx  # Charts & analytics
│   │   └── CalendarPage.tsx   # Payment calendar
│   ├── components/
│   │   ├── Toast.tsx          # Error/success/info notification toasts
│   │   ├── Dashboard.tsx      # Stats overview cards
│   │   ├── FriendCard.tsx     # Expandable friend card
│   │   ├── PurchaseCard.tsx   # Purchase with progress bar
│   │   └── ...                # Various UI components
│   ├── lib/
│   │   ├── api.ts             # API client with global error handler
│   │   ├── utils.ts           # Helpers & WhatsApp message generators
│   │   └── export.ts          # PDF/Excel export utilities
│   ├── store/                 # Zustand auth store
│   └── types/                 # TypeScript interfaces
├── public/                    # Static assets (PWA icons)
├── SUPABASE_SETUP.md          # Step-by-step Supabase setup guide
├── Dockerfile                 # Multi-stage build (no native deps)
├── docker-compose.yml         # No volumes needed (cloud DB)
├── vite.config.ts             # Vite config with React + Tailwind
├── tsconfig.json              # Root TypeScript config
└── package.json               # Dependencies and scripts
```

## Database Schema (Supabase PostgreSQL)

- **profiles** — User accounts (id UUID, username, password_hash, role)
- **friends** — Friends (id, user_id, name, phone)
- **purchases** — Installment purchases (id, friend_id, name, total_amount, monthly_payment, total_months, months_paid, interest_rate, fees, start_date, notes)
- **payment_history** — Individual payment records (id, purchase_id, amount, payment_date, notes, created_by)
- **settings** — App key-value settings (e.g., credit_limit)
- **reminders** — Reminder tracking (id, purchase_id, month_key, sent_at)
- **audit_log** — Auto-populated by triggers on all tables (id, table_name, record_id, action, old_data, new_data, changed_by, changed_at)

### Audit Triggers
Automatic triggers log all INSERT, UPDATE, DELETE operations on friends, purchases, payment_history, settings, and reminders tables.

## Building and Running

### Prerequisites
- A **Supabase** project (free at supabase.com)
- Node.js 20+

### Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# Start both frontend and backend
npm run dev

# Or start them separately
npm run dev:server   # Backend on http://localhost:3001
npm run dev:client   # Frontend on http://localhost:5173
```

### Production Build

```bash
npm run build         # Builds both client and server
npm start             # Serves full app on http://localhost:3001
```

### Docker

```bash
# Docker Compose (recommended)
cp .env.example .env
# Edit .env with Supabase credentials
docker compose up -d
docker compose logs -f
docker compose down

# Direct Docker
docker build -t installment-tracker .
docker run -d --name installment-tracker -p 3001:3001 \
  -e SUPABASE_URL=https://xxx.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -e JWT_SECRET=your-secret \
  installment-tracker
```

### Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `SUPABASE_URL` | *(required)* | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | *(required)* | Supabase service role key |
| `JWT_SECRET` | `installment-tracker-secret-key-2026` | JWT signing secret |
| `NODE_ENV` | `production` | Node environment |

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (frontend + backend) |
| `npm run dev:server` | Start backend only (tsx watch) |
| `npm run dev:client` | Start frontend only (Vite) |
| `npm run build` | Build both client and server |
| `npm run build:client` | Build frontend (Vite) |
| `npm run build:server` | Build server (tsc) |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |

## Development Conventions

- **TypeScript** throughout both frontend and server
- **Zod** for server-side input validation on all route handlers
- **Zustand** for frontend state management (auth store)
- **Supabase** service role key for server-side DB operations (bypasses RLS)
- **JWT tokens** stored in localStorage for auth (bcrypt hashed passwords)
- **Rate limiting**: 100 req/15min on API, 10 login attempts/15min
- **Morgan** logging in dev mode
- **Global error handler** on server (500 JSON response)
- **Toast notifications** on frontend for all API errors
- **Vite proxy** in dev mode forwards `/api` requests to backend on port 3001
- No native build dependencies (Docker image is lightweight Alpine)

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/register` | No | Register new user |
| GET | `/api/auth/me` | Yes | Get current user |
| GET | `/api/friends` | Yes | List friends |
| POST | `/api/friends` | Admin | Create friend |
| PUT | `/api/friends/:id` | Admin | Update friend |
| DELETE | `/api/friends/:id` | Admin | Delete friend |
| GET | `/api/purchases` | Yes | List purchases |
| GET | `/api/purchases/friend/:id` | Yes | Get friend's purchases |
| GET | `/api/purchases/:id` | Yes | Get single purchase |
| GET | `/api/purchases/:id/payments` | Admin | Payment history |
| POST | `/api/purchases` | Admin | Create purchase |
| PUT | `/api/purchases/:id` | Admin | Update purchase |
| DELETE | `/api/purchases/:id` | Admin | Delete purchase |
| POST | `/api/purchases/:id/pay` | Admin | Pay one month (+ records in payment_history) |
| POST | `/api/purchases/:id/unpay` | Admin | Undo last payment |
| GET | `/api/stats` | Yes | Dashboard statistics |
| GET | `/api/stats/friends` | Admin | Per-friend stats |
| GET | `/api/stats/monthly` | Admin | Monthly chart data |
| GET | `/api/settings` | Yes | App settings |
| PUT | `/api/settings` | Admin | Update settings |
| GET | `/api/reminders/pending` | Yes | Pending reminders |
| GET | `/api/reminders/count` | Yes | Reminder count |
| POST | `/api/reminders/send-all` | Admin | Mark reminders sent |
| POST | `/api/reminders/cleanup` | Admin | Clean old reminders |

## Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/001_initial_schema.sql` in SQL Editor
3. Copy Project URL and service_role key to `.env`
4. Seed admin user (see `SUPABASE_SETUP.md`)
5. Start the app

## Important Notes

- **No SQLite** — all data lives in Supabase cloud PostgreSQL
- **No Docker volume** needed for database — data persists in Supabase
- **Automatic backups** — Supabase does daily backups
- **Deploy anywhere** — just set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- **Audit log** is auto-populated by database triggers
- **Payment history** is recorded automatically on each pay/unpay action
- Server uses **service role key** which bypasses Row Level Security
- Frontend communicates via Express REST API (not direct Supabase client)
