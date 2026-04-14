-- Fix: Make the audit trigger work with tables that don't have an "id" column
-- Run this in Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  record_id_val bigint;
BEGIN
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
