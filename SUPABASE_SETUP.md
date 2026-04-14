# Supabase Setup Guide

## Quick Start (5 minutes)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose your organization
4. Fill in:
   - **Project name**: `installment-tracker`
   - **Database password**: (save this securely)
   - **Region**: Choose closest to you
5. Wait ~2 minutes for the project to be created

### 2. Run the Migration SQL

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click **Run**
5. You should see all tables created successfully

### 3. Get Your API Keys

1. Go to **Project Settings** (gear icon, bottom left)
2. Click **API**
3. Copy these two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **service_role key** (click "reveal" — keep this secret!)

### 4. Configure the App

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=your-secret-key-change-this
PORT=3001
NODE_ENV=production
```

### 5. Seed the Admin User

Start the server once — it will attempt to seed an admin user:

```bash
npm run dev
```

If the admin user isn't created automatically (since we no longer use SQLite seeding), create it manually:

1. Go to Supabase dashboard → **SQL Editor**
2. Run this query (replace the hash with a real bcrypt hash for `admin123`):

```sql
-- bcrypt hash for 'admin123' with salt rounds 10:
-- $2a$10$TGqVHjQkVNpQ.wjMHCz8e.OjZ4K5aSWKBEPqHGVXz8tqZMq6qjGGS

INSERT INTO public.profiles (id, username, password_hash, role)
VALUES (
  gen_random_uuid(),
  'admin',
  '$2a$10$TGqVHjQkVNpQ.wjMHCz8e.OjZ4K5aSWKBEPqHGVXz8tqZMq6qjGGS',
  'admin'
);
```

### 6. Start the App

```bash
npm run dev
```

Default credentials: **admin / admin123**

---

## Docker Deployment with Supabase

```bash
# Create .env file
cat > .env << EOF
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-key
PORT=3001
NODE_ENV=production
EOF

# Start with Docker Compose
docker compose up -d
```

---

## Migrating from SQLite

If you have existing data in SQLite:

1. **Export your SQLite data** as JSON or CSV
2. **Import into Supabase** via the Table Editor (drag & drop CSV)
3. Or use a migration script like:
   ```bash
   npm install sqlite3
   node scripts/migrate-sqlite-to-supabase.js
   ```

---

## Backup & Restore

### Backup
Go to Supabase → **Project Settings** → **Database** → **Backups**
Supabase automatically backs up your database daily.

### Restore
Go to Supabase → **Project Settings** → **Database** → **Backups** → Select a backup → **Restore**

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `Missing SUPABASE_URL` | Check your `.env` file exists and has the correct values |
| `relation "profiles" does not exist` | Run the migration SQL in Supabase SQL Editor |
| `Invalid API key` | Make sure you're using the **service_role** key, not the anon key |
| Admin can't login | Seed the admin user manually (see step 5 above) |
