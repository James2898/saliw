import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components ('use client').
 *
 * Uses NEXT_PUBLIC_ environment variables only.
 * SUPABASE_SERVICE_ROLE_KEY must NEVER appear here.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
