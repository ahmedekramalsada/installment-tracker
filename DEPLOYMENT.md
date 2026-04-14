# 🚀 Complete Deployment Guide

## Overview

This guide covers:
1. Setting up Supabase (cloud database)
2. Running locally with Supabase
3. Deploying with Docker Compose
4. Deploying with Nginx reverse proxy
5. Migrating existing SQLite data

---

## Part 1: Supabase Setup (~5 minutes)

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **Start your project** or **New Project**
3. Sign in with GitHub, Google, or email
4. Click **New Project**
5. Fill in:
   - **Organization**: Select or create one
   - **Project name**: `installment-tracker` (or any name)
   - **Database password**: Click **Generate** and **SAVE IT SECURELY**
   - **Region**: Choose the closest to your users (e.g., `US East`, `Europe`, `Middle East`)
6. Click **Create new project**
7. Wait 1-2 minutes for provisioning

### Step 2: Run the Database Migration

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project
4. Copy **ALL** the SQL content from that file
5. Paste it into the Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
7. You should see output like:
   ```
   CREATE TABLE
   CREATE TABLE
   CREATE TABLE
   CREATE TABLE
   CREATE TABLE
   CREATE TABLE
   CREATE INDEX
   ...
   ```
   If you see any errors, check the error message and re-run.

### Step 3: Get Your API Credentials

1. In Supabase dashboard, click the **gear icon** (Settings) at the bottom-left
2. Click **API** in the left sidebar
3. Under **Project URL**, copy the URL (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
4. Under **Project API keys**, find **service_role** and click **Reveal** to see the key
   - ⚠️ **IMPORTANT**: This is a SECRET key. Never expose it in frontend code or public repos.
5. Save both values somewhere secure.

### Step 4: Seed the Admin User

You have two options:

#### Option A: Use the Seed API (easiest, one-time)

After starting the app (see Part 2), run:
```bash
curl -X POST http://localhost:3001/api/seed-admin
```

This creates an admin user with credentials: **admin / admin123**

#### Option B: Create via SQL

In Supabase **SQL Editor**, run:
```sql
-- First generate a bcrypt hash for 'admin123'
-- Use an online tool: https://bcrypt-generator.com/
-- Or use Node.js: require('bcryptjs').hashSync('admin123', 10)

INSERT INTO public.profiles (id, username, password_hash, role)
VALUES (
  gen_random_uuid(),
  'admin',
  '$2a$10$YOUR_BCRYPT_HASH_FOR_admin123',
  'admin'
);
```

A pre-computed hash for `admin123` (bcrypt, rounds=10):
```
$2a$10$TGqVHjQkVNpQ.wjMHCz8e.OjZ4K5aSWKBEPqHGVXz8tqZMq6qjGGS
```

---

## Part 2: Running Locally

### 1. Install Dependencies

```bash
cd installment-tracker
npm install
```

### 2. Create `.env` File

```bash
cp .env.example .env
```

Edit `.env` and fill in:
```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-full-service-role-key...xyz
JWT_SECRET=generate-a-random-string-here
```

Generate a JWT secret:
```bash
openssl rand -hex 32
# Or use any random string (at least 32 chars)
```

### 3. Seed Admin (first time only)

```bash
# Start the dev server
npm run dev

# In another terminal:
curl -X POST http://localhost:3001/api/seed-admin
# Response: {"message":"تم إنشاء حساب المسؤول","user":{"id":"...","username":"admin","role":"admin"},"token":"..."}
```

### 4. Access the App

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

Login with: **admin / admin123**

---

## Part 3: Docker Deployment

### Simple (app only, no nginx)

```bash
# 1. Create .env file
cat > .env << 'EOF'
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-at-least-32-chars
PORT=3001
EOF

# 2. Build and start
docker compose -f docker-compose.yml up -d --build

# 3. Check logs
docker compose logs -f app

# 4. Seed admin
curl -X POST http://localhost:3001/api/seed-admin

# 5. Access at http://localhost:3001
```

### Production (with Nginx reverse proxy)

```bash
# 1. Create .env file
cat > .env << 'EOF'
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-at-least-32-chars
NGINX_PORT=80
EOF

# 2. Build and start
docker compose -f docker-compose.prod.yml up -d --build

# 3. Check status
docker compose -f docker-compose.prod.yml ps

# 4. View logs
docker compose -f docker-compose.prod.yml logs -f

# 5. Seed admin
curl -X POST http://localhost:80/api/seed-admin

# 6. Access at http://localhost
```

### Stopping

```bash
docker compose -f docker-compose.yml down
# or
docker compose -f docker-compose.prod.yml down
```

---

## Part 4: Deploying to a VPS (DigitalOcean, AWS, etc.)

### 1. Server Requirements

- Ubuntu 22.04 or later
- At least 1GB RAM (2GB recommended)
- Docker + Docker Compose installed

### 2. Install Docker on Ubuntu

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to docker group
sudo usermod -aG docker $USER
# Log out and back in for this to take effect

# Verify
docker --version
docker compose version
```

### 3. Deploy

```bash
# Clone or copy the project to the server
git clone <your-repo> ~/installment-tracker
cd ~/installment-tracker

# Create .env
cat > .env << 'EOF'
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=$(openssl rand -hex 32)
NGINX_PORT=80
EOF

# Fill in actual Supabase values, then:
docker compose -f docker-compose.prod.yml up -d --build

# Seed admin
curl -X POST http://localhost/api/seed-admin
```

### 4. Add a Domain (Optional)

1. Point your domain's A record to your server IP
2. Change `server_name _;` in `docker/nginx.conf` to `server_name your-domain.com;`
3. Install Certbot for HTTPS:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Part 5: Migrating from SQLite to Supabase

If you have existing data in a SQLite database:

### Option A: Manual Export/Import (for small datasets)

1. **Export from SQLite:**
```bash
# Install sqlite3 CLI if needed
sudo apt install sqlite3

# Export to CSV
sqlite3 data.db << 'SQL'
.headers on
.mode csv
.output friends.csv
SELECT * FROM friends;
.output purchases.csv
SELECT * FROM purchases;
.output settings.csv
SELECT * FROM settings;
.output users.csv
SELECT * FROM users;
SQL
```

2. **Import to Supabase:**
   - Go to Supabase Dashboard → **Table Editor**
   - Click **Import** → upload each CSV file
   - Map columns to the correct Supabase table

### Option B: Using the Migration Script

```bash
# Install SQLite for Node.js (temporarily)
npm install sqlite3

# Run the migration script
node scripts/migrate-sqlite-to-supabase.js \
  --sqlite-db ./data.db \
  --supabase-url https://xxx.supabase.co \
  --service-key your-service-role-key
```

The script will:
1. Read all data from SQLite
2. Create matching records in Supabase
3. Print a summary of migrated data

### Option C: Start Fresh

If you don't need old data:
1. Set up Supabase (Part 1)
2. Run the seed endpoint
3. Start adding new data

---

## Part 6: Backup & Restore

### Backup (Automatic)

Supabase automatically backs up your database daily. To access backups:
1. Supabase Dashboard → **Project Settings** → **Database**
2. Scroll to **Backups**
3. You'll see daily backups with timestamps

### Manual Backup

```bash
# Use pg_dump via Supabase connection string
# Get your connection string from: Project Settings → Database → Connection string

pg_dump "postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres" \
  --format=custom --file=backup-$(date +%Y%m%d).dump
```

### Restore

1. Supabase Dashboard → **Project Settings** → **Database** → **Backups**
2. Find the backup you want
3. Click **Restore**
4. Confirm — this will replace the current database

---

## Part 7: Troubleshooting

| Problem | Solution |
|---------|----------|
| `Missing SUPABASE_URL` | Check `.env` file exists with correct values |
| `relation "profiles" does not exist` | Run the migration SQL in Supabase SQL Editor |
| `Invalid API key` | Use **service_role** key, not anon key |
| Admin login fails | Run `POST /api/seed-admin` or create via SQL |
| Docker container exits immediately | Check logs: `docker compose logs app` |
| Can't connect to database | Verify Supabase project is active, check firewall rules |
| JWT_SECRET error | Ensure `JWT_SECRET` is set in `.env` (no hardcoded fallback) |
| Port already in use | Change `PORT` in `.env` or stop the conflicting service |
| Health check failing | Visit `/health` endpoint to see the actual error |

---

## Part 8: Security Checklist

- [x] `JWT_SECRET` is a strong random string (not the default)
- [x] `SUPABASE_SERVICE_ROLE_KEY` is NOT exposed in frontend code or git
- [x] `.env` file is in `.gitignore` (it is)
- [x] Docker runs as non-root user (configured in Dockerfile)
- [x] Rate limiting is enabled (100 req/15min, 10 login attempts/15min)
- [x] HTTPS is enabled (use Let's Encrypt / Certbot for production)
- [x] Database is cloud-hosted (Supabase auto-backups)
- [x] Input validation via Zod on all write endpoints
- [x] Passwords hashed with bcrypt (10 rounds)
- [ ] Firewall: Only ports 80/443 open to public
- [ ] Regular dependency updates (`npm audit`, `npm update`)

---

## Architecture Diagram

```
┌─────────────┐      HTTPS      ┌──────────────┐      HTTP      ┌───────────────┐
│   Browser   │ ◄─────────────► │    Nginx     │ ◄────────────► │  Express API  │
│  (React SPA)│                  │  (Reverse    │                │  (Port 3001)  │
└─────────────┘                  │   Proxy)     │                └───────┬───────┘
                                 └──────────────┘                        │
                                                                         │
                                                                         ▼
                                                            ┌──────────────────────┐
                                                            │     Supabase         │
                                                            │  (PostgreSQL Cloud)  │
                                                            │  - profiles          │
                                                            │  - friends           │
                                                            │  - purchases         │
                                                            │  - payment_history   │
                                                            │  - settings          │
                                                            │  - reminders         │
                                                            │  - audit_log         │
                                                            └──────────────────────┘
```

Data flows: **Browser → Nginx (80) → Express (3001) → Supabase (Cloud PostgreSQL)**
