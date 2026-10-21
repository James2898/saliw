import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

/**
 * Creates a Supabase client for use in Client Components ('use client').
 *
 * Uses NEXT_PUBLIC_ environment variables only.
 * SUPABASE_SERVICE_ROLE_KEY must NEVER appear here.
 */
export function createClient() {
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey
  );
}

// Module-level singleton for Realtime subscriptions.
// Instantiated once per browser page load — survives React Strict Mode remounts.
let _realtimeClient: ReturnType<typeof createClient> | null = null;

export function getRealtimeClient() {
  if (!_realtimeClient) {
    _realtimeClient = createClient();
  }
  return _realtimeClient;
}
