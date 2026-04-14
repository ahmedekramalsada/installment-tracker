# متتبع التقسيط | Installment Tracker

A beautiful web app to track installment payments among friends. Admin can manage all purchases, add interest rates and fees, while each friend can log in to view their own payment status.

> **☁️ Cloud-Ready:** Now powered by **Supabase** (PostgreSQL) — deploy anywhere, backup/restore built-in.
> See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed setup instructions.

## Features

- **Admin Panel** - Full control to add/edit/delete friends, purchases, and payments
- **User Accounts** - Each friend gets login credentials to view their own amounts
- **Interest & Fees** - Track interest rates and flat fees per purchase
- **Payment Tracking** - Visual progress bars showing paid vs remaining amounts
- **Payment History** — Every payment is recorded with date, amount, and who made it
- **Audit Trail** — All changes (create/update/delete) are logged automatically
- **WhatsApp Reminders** - One-click monthly payment reminders via WhatsApp
- **Charts & Analytics** - Pie, bar, and area charts for debt analysis
- **Export to PDF/Excel** - Download reports to share
- **Payment Calendar** - Visual calendar of due dates
- **Credit Limit Tracker** - Monitor your total credit usage
- **Overdue Alerts** - Red badges for late payments
- **Error Notifications** - Toast notifications for all API errors
- **PWA Support** - Install on phone home screen
- **Search & Filter** - Find friends and products quickly
- **Arabic RTL** - Full right-to-left Arabic interface
- **Dark Glass UI** - Beautiful frosted glass design with gradients

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Zustand, Recharts |
| Backend | Express 5, **Supabase** (PostgreSQL), JWT Auth |
| Database | **Supabase** (PostgreSQL) — cloud-hosted, auto-backup |
| Validation | Zod (server-side input validation) |
| Security | Rate limiting, bcrypt password hashing |
| Charts | Recharts |
| Export | jsPDF, xlsx |
| Icons | Lucide React |

## Quick Start

### 1. Set Up Supabase (first time, ~5 min)

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the SQL migration from `supabase/migrations/001_initial_schema.sql`
3. Copy your **Project URL** and **service_role key**

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed instructions.

### 2. Install & Run

```bash
# Install dependencies
npm install

# Create .env file with your Supabase credentials
cp .env.example .env
# Edit .env and add your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# Start both frontend and backend
npm run dev

# Or start them separately
npm run dev:server  # Backend on http://localhost:3001
npm run dev:client  # Frontend on http://localhost:5173
```

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |

## Production Build

```bash
npm run build
npm start  # Serves on http://localhost:3001
```

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd installment-tracker

# Start with Docker Compose
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

The app will be available at `http://localhost:3001`

### Using Docker directly

```bash
# Build the image
docker build -t installment-tracker .

# Run the container
docker run -d \
  --name installment-tracker \
  -p 3001:3001 \
  -v tracker-data:/app/data \
  -e JWT_SECRET=your-secret-key \
  installment-tracker
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `SUPABASE_URL` | *(required)* | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | *(required)* | Supabase service role key |
| `JWT_SECRET` | `installment-tracker-secret-key-2026` | JWT signing secret |
| `NODE_ENV` | `production` | Node environment |

### Data Persistence

Data is stored in your Supabase PostgreSQL database, which is automatically backed up daily.
No local database files or Docker volumes needed!

### Backup & Restore

Since data is in Supabase:
- **Backup**: Automatic daily backups in Supabase Dashboard → Settings → Database
- **Restore**: Select any backup point and click "Restore" in Supabase Dashboard
- No manual file copying needed!

## Project Structure

```
├── server/
│   └── src/
│       ├── index.ts           # Express server + rate limiting + morgan
│       ├── db.ts              # Supabase client setup
│       ├── middleware/
│       │   └── auth.ts        # JWT auth + bcrypt login/register
│       └── routes/
│           ├── auth.ts        # Login/register with Zod validation
│           ├── friends.ts     # Friend CRUD
│           ├── purchases.ts   # Purchase CRUD + pay/unpay + payment_history
│           ├── stats.ts       # Dashboard statistics
│           ├── settings.ts    # App settings
│           └── reminders.ts   # WhatsApp reminders
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Supabase migration (run once)
├── src/
│   ├── main.tsx               # App entry + Toast provider
│   ├── App.tsx                # Main app shell
│   ├── components/
│   │   ├── Toast.tsx          # Error/success notification toasts
│   │   ├── Dashboard.tsx      # Stats overview cards
│   │   ├── FriendCard.tsx     # Expandable friend card
│   │   ├── PurchaseCard.tsx   # Individual purchase with progress
│   │   └── ...
│   ├── pages/
│   │   ├── LoginPage.tsx      # Login/register form
│   │   ├── AnalyticsPage.tsx  # Charts & analytics
│   │   └── CalendarPage.tsx   # Payment calendar
│   └── lib/
│       ├── api.ts             # API client with global error handler
│       ├── utils.ts           # Helpers & WhatsApp messages
│       └── export.ts          # PDF/Excel export
├── Dockerfile                 # Multi-stage Docker build (no native deps)
├── docker-compose.yml         # Docker Compose (no volumes needed)
├── SUPABASE_SETUP.md          # Step-by-step Supabase guide
├── .env.example               # Environment variable template
└── package.json
```

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
| POST | `/api/purchases` | Admin | Create purchase |
| PUT | `/api/purchases/:id` | Admin | Update purchase |
| DELETE | `/api/purchases/:id` | Admin | Delete purchase |
| POST | `/api/purchases/:id/pay` | Admin | Pay one month |
| POST | `/api/purchases/:id/unpay` | Admin | Undo last payment |
| GET | `/api/purchases/:id/payments` | Admin | Payment history |
| GET | `/api/stats` | Yes | Dashboard statistics |
| GET | `/api/stats/friends` | Admin | Per-friend stats |
| GET | `/api/stats/monthly` | Admin | Monthly chart data |
| GET | `/api/settings` | Yes | App settings |
| PUT | `/api/settings` | Admin | Update settings |
| GET | `/api/reminders/pending` | Yes | Pending reminders |
| GET | `/api/reminders/count` | Yes | Reminder count |
| POST | `/api/reminders/send-all` | Admin | Mark reminders sent |

## License

MIT
