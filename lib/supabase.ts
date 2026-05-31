import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseConfig =
  Boolean(supabaseUrl && supabaseAnonKey);

export const hasSupabaseAdminConfig =
  Boolean(supabaseUrl && supabaseServiceRoleKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

export const supabaseAdmin =
  hasSupabaseAdminConfig
    ? createClient(
        supabaseUrl!,
        supabaseServiceRoleKey!
      )
    : null;
