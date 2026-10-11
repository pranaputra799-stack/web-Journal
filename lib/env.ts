// Supabase connection settings.
//
// The anon key is safe in the browser bundle: it only grants what Row Level
// Security allows, and RLS is enabled on every table in supabase/schema.sql.
// Never put the service_role key here.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

export const SCREENSHOT_BUCKET = "screenshots";


