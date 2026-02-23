import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client using the service_role key.
 * Bypasses RLS — only use in server-side cron jobs / background tasks.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
