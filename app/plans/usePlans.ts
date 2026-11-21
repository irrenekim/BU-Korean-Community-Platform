"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase/client";
import type { Block } from "@/lib/schedule";

export type Friend = {
  friendship_id: number;
  friend_id: string;
  username: string | null;
  display_name: string | null;
  status: "pending" | "accepted";
  incoming: boolean;
};
export type MyEvent = { id: string; title: string; sport: string; starts_at: string; location: string };

// Everything the Plans tab needs about you: your weekly blocks, the sports events
// you RSVP'd to (from the Sports tab), your friends and your @username.
export function usePlans(userId: string) {
  const supabase = useSupabase();
  const [blocks, setBlocks] = useState<Block[]>();
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [friends, setFriends] = useState<Friend[]>();
  const [username, setUsername] = useState<string | null>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const [mine, rsvps, people, profile] = await Promise.all([
        supabase.from("schedule_blocks").select("id,title,weekday,start_min,end_min,is_public").order("start_min"),
        supabase.from("sports_event_rsvps").select("event_id").eq("user_id", userId).eq("status", "attending"),
        supabase.rpc("my_friends"),
        supabase.from("profiles").select("username").maybeSingle(),
      ]);
      if (ignore) return;
      if (mine.error || people.error) {
        setError("Plans aren't set up yet. Run the friends database file in Supabase.");
        setBlocks([]);
        setFriends([]);
        return;
      }
      setBlocks((mine.data ?? []) as Block[]);
      setFriends((people.data ?? []) as Friend[]);
      setUsername(profile.data?.username ?? null);

      const ids = (rsvps.data ?? []).map((r: { event_id: string }) => r.event_id);
      if (ids.length) {
        const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const { data } = await supabase.from("sports_events")
          .select("id,title,sport,starts_at,location").in("id", ids).gte("starts_at", since).order("starts_at");
        if (!ignore) setEvents((data ?? []) as MyEvent[]);
      } else {
        setEvents([]);
      }
    })();
    return () => { ignore = true; };
  }, [supabase, userId, revision]);

  return { blocks, events, friends, username, error, reload };
}
