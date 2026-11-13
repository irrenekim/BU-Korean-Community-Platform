import { createBrowserClient } from "@supabase/ssr";

// Every feature (login, posts, comments) calls createClient() to talk to Supabase.
// The two values come from .env.local (see README).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
