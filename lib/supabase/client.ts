"use client";

import { useMemo } from "react";
import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";

// Use this inside any component that reads or writes the database:
//
//   const supabase = useSupabase();
//   const { data } = await supabase.from("posts").select("*");
//
// It sends the logged-in user's Clerk token to Supabase, so the
// security rules in supabase/schema.sql know who is asking.
export function useSupabase() {
  const { session } = useSession();

  return useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          async accessToken() {
            return (await session?.getToken()) ?? null;
          },
        }
      ),
    [session]
  );
}
