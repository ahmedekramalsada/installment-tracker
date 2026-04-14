-- =====================================================
-- Installment Tracker — Supabase Schema
-- Run this in your Supabase SQL Editor
-- =====================================================

-- ── Users (standalone — not using Supabase Auth) ──
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Friends ──
CREATE TABLE IF NOT EXISTS public.friends (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Purchases ──
CREATE TABLE IF NOT EXISTS public.purchases (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  friend_id bigint NOT NULL REFERENCES public.friends(id) ON DELETE CASCADE,
  name text NOT NULL,
  total_amount numeric NOT NULL,
  monthly_payment numeric NOT NULL,
  total_months int NOT NULL,
  months_paid int NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,
  fees numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Payment History (NEW — tracks each individual payment) ──
CREATE TABLE IF NOT EXISTS public.payment_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_id bigint NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ── Settings ──
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- ── Reminders ──
CREATE TABLE IF NOT EXISTS public.reminders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_id bigint NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  month_key text NOT NULL, -- format: 'YYYY-MM'
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(purchase_id, month_key)
);

-- ── Audit Log (NEW — tracks all changes) ──
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  record_id bigint,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_friend_id ON public.purchases(friend_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_purchase_id ON public.payment_history(purchase_id);
CREATE INDEX IF NOT EXISTS idx_reminders_purchase_id ON public.reminders(purchase_id);
CREATE INDEX IF NOT EXISTS idx_reminders_month_key ON public.reminders(month_key);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log(changed_at DESC);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
-- The server uses the service role key which bypasses RLS.
-- RLS is enabled here for future client-side direct access if needed.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Permissive policies (server bypasses via service role key)
CREATE POLICY "allow_all_profiles" ON public.profiles USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_friends" ON public.friends USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_purchases" ON public.purchases USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_payments" ON public.payment_history USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_settings" ON public.settings USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_reminders" ON public.reminders USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_audit" ON public.audit_log USING (true) WITH CHECK (true);

-- =====================================================
-- Triggers for Audit Log
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  record_id_val bigint;
BEGIN
  -- Try to get id field, fall back to NULL if not present (e.g. settings table)
  BEGIN
    IF TG_OP = 'DELETE' THEN
      record_id_val := OLD.id;
    ELSE
      record_id_val := NEW.id;
    END IF;
  EXCEPTION WHEN others THEN
    record_id_val := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, record_id_val, 'INSERT', to_jsonb(NEW), NULL);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, record_id_val, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NULL);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, record_id_val, 'DELETE', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_friends
  AFTER INSERT OR UPDATE OR DELETE ON public.friends
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_purchases
  AFTER INSERT OR UPDATE OR DELETE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_payment_history
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_history
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_reminders
  AFTER INSERT OR UPDATE OR DELETE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- =====================================================
-- Seed Data
-- =====================================================

-- Default credit limit
INSERT INTO public.settings (key, value)
VALUES ('credit_limit', '500000')
ON CONFLICT (key) DO NOTHING;

-- Admin user (password: admin123, hash generated by bcrypt)
-- Run this AFTER the server starts — the server seeds the admin user
-- via the auth register function if not found.
-- Or manually insert with a bcrypt hash:
-- INSERT INTO public.profiles (id, username, password_hash, role)
-- VALUES (gen_random_uuid(), 'admin', '$2a$10$YOUR_BCRYPT_HASH_HERE', 'admin');
