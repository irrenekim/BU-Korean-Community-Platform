"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { tagMatchesFilter } from "@/lib/tagMatch";
import { dDay, shortWhen, timeAgo } from "@/lib/format";
import type { CategorySlug } from "@/lib/categories";
import Avatar from "./Avatar";
import Icon from "./icons";

// The logged-in home screen: what's next for you, polls waiting on you,
// and new posts from what you follow — all in one glance.

type Upcoming = { id: string; title: string; sport: string; starts_at: string; location: string; status: string };
type PollToVote = { id: string; title: string; sport: string; slots: number };
type FeedPost = { id: number; category: CategorySlug; title: string; tag: string | null; author_name: string | null; created_at: string };

const tabName: Record<CategorySlug, string> = { academics: "Academics", sports: "Sports", housing: "Housing" };

export default function TodayDashboard({ firstName, userId }: { firstName: string; userId: string }) {
  const supabase = useSupabase();
  const [upcoming, setUpcoming] = useState<Upcoming[]>();
  const [polls, setPolls] = useState<PollToVote[]>();
  const [feed, setFeed] = useState<{ posts: FeedPost[]; following: boolean }>();

  useEffect(() => {
    let ignore = false;
    const now = new Date().toISOString();

    // 1. Events you RSVP'd to that haven't happened yet
    (async () => {
      const { data: rsvps } = await supabase.from("sports_event_rsvps").select("event_id,status").eq("user_id", userId);
      const ids = (rsvps ?? []).map((r: { event_id: string }) => r.event_id);
      if (!ids.length) { if (!ignore) setUpcoming([]); return; }
      const { data: events } = await supabase.from("sports_events")
        .select("id,title,sport,starts_at,location").in("id", ids).gte("starts_at", now).order("starts_at").limit(5);
      if (ignore) return;
      const status = new Map((rsvps ?? []).map((r: { event_id: string; status: string }) => [r.event_id, r.status]));
      setUpcoming((events ?? []).map((e: Omit<Upcoming, "status">) => ({ ...e, status: status.get(e.id) ?? "attending" })));
    })().catch(() => !ignore && setUpcoming([]));

    // 2. Open time polls you haven't answered yet
    (async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const [{ data: list }, { data: mine }] = await Promise.all([
        supabase.from("time_polls").select("id,title,sport,time_poll_slots(id,starts_at)").gte("created_at", since).limit(20),
        supabase.from("time_poll_votes").select("slot_id").eq("user_id", userId),
      ]);
      if (ignore) return;
      const myVoteSlots = new Set((mine ?? []).map((v: { slot_id: number }) => v.slot_id));
      type RawPoll = { id: string; title: string; sport: string; time_poll_slots: { id: number; starts_at: string }[] };
      setPolls((list ?? [] as RawPoll[])
        .filter((p: RawPoll) => p.time_poll_slots.some((s) => Date.parse(s.starts_at) > Date.now()))
        .filter((p: RawPoll) => !p.time_poll_slots.some((s) => myVoteSlots.has(s.id)))
        .slice(0, 4)
        .map((p: RawPoll) => ({ id: p.id, title: p.title, sport: p.sport, slots: p.time_poll_slots.length })));
    })().catch(() => !ignore && setPolls([]));

    // 3. New posts matching what you follow (or just the latest posts)
    (async () => {
      const [{ data: follows }, { data: posts }] = await Promise.all([
        supabase.from("follows").select("category,filter_value"),
        supabase.from("posts").select("id,category,title,tag,author_name,created_at")
          .order("created_at", { ascending: false }).limit(60),
      ]);
      if (ignore) return;
      const all = (posts ?? []) as FeedPost[];
      const list = (follows ?? []) as { category: CategorySlug; filter_value: string }[];
      const matching = all.filter((post) =>
        list.some((f) => f.category === post.category && tagMatchesFilter(f.category, f.filter_value, post.tag)));
      setFeed(list.length ? { posts: matching.slice(0, 20), following: true } : { posts: all.slice(0, 20), following: false });
    })().catch(() => !ignore && setFeed({ posts: [], following: false }));

    return () => { ignore = true; };
  }, [supabase, userId]);

  // Read the clock only in the browser (not while the page is pre-built)
  const hour = useSyncExternalStore(noop, () => new Date().getHours(), () => 12);
  const today = useSyncExternalStore(noop,
    () => new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }), () => "Today");
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const next = upcoming?.[0];

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <header>
          <p className="text-sm text-gray-500">{today}</p>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{greeting}, {firstName}</h1>
        </header>

        {/* Up next (shown here on phones; in the right column on big screens) */}
        <div className="xl:hidden"><UpNext next={next} loading={!upcoming} /></div>

        <section aria-labelledby="feed-heading">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 id="feed-heading" className="section-title">{feed?.following ? "From what you follow" : "Latest from everyone"}</h2>
            <Link href="/settings" className="text-sm font-medium text-brand hover:underline">
              {feed?.following ? "Manage" : "Follow topics"}
            </Link>
          </div>
          {!feed ? <p className="muted px-1 py-6">Loading…</p> : feed.posts.length === 0 ? (
            <div className="card px-6 py-10 text-center">
              <p className="font-semibold">{feed.following ? "Nothing new in what you follow" : "No posts yet"}</p>
              <p className="muted mt-1">Pick a tab and write the first post.</p>
            </div>
          ) : (
            <ul className="card divide-y divide-gray-100 overflow-hidden">
              {feed.posts.map((post) => (
                <li key={post.id}>
                  <Link href={`/${post.category}`} className="flex gap-3 px-4 py-4 transition hover:bg-gray-50 sm:px-5">
                    <Avatar name={post.author_name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        <span className="font-bold">{post.author_name || "BU student"}</span>
                        <span className="ml-2 text-gray-500">{timeAgo(post.created_at)}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          <Icon name={post.category} className="h-3.5 w-3.5" />{tabName[post.category]}
                        </span>
                        {post.tag && <span className="tag">{post.tag}</span>}
                      </span>
                      <span className="mt-1.5 block break-words text-[16px] font-bold leading-snug">{post.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Right column */}
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="hidden xl:block"><UpNext next={next} loading={!upcoming} /></div>

        <section className="card p-5">
          <h2 className="section-title">Your schedule</h2>
          {!upcoming ? <p className="muted mt-3">Loading…</p> : upcoming.length === 0 ? (
            <p className="muted mt-2">Games you RSVP to show up here with a countdown.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {upcoming.map((event) => (
                <li key={event.id} className="flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 rounded-lg bg-brand-soft py-1 text-center text-xs font-bold text-brand-dark">{dDay(event.starts_at)}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{event.title}</span>
                    <span className="text-gray-500">{shortWhen(event.starts_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="section-title">Waiting for your answer</h2>
          {!polls ? <p className="muted mt-3">Loading…</p> : polls.length === 0 ? (
            <p className="muted mt-2">No time polls need you right now.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {polls.map((poll) => (
                <li key={poll.id}>
                  <Link href="/sports#find-a-time" className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-3 py-2.5 text-sm hover:bg-gray-100">
                    <span className="min-w-0 truncate"><span className="font-semibold">{poll.title}</span>
                      <span className="block text-xs text-gray-500">{poll.sport} · {poll.slots} times offered</span></span>
                    <span className="shrink-0 font-semibold text-brand">Answer</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function UpNext({ next, loading }: { next: Upcoming | undefined; loading: boolean }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-ink p-5 text-paper">
      <h2 className="text-sm font-semibold text-paper/70">Up next</h2>
      {loading ? <p className="mt-2 text-paper/70">Loading…</p> : next ? (
        <>
          <p className="mt-2 text-4xl font-extrabold tracking-tight">{dDay(next.starts_at)}</p>
          <p className="mt-2 text-lg font-bold leading-snug">{next.title}</p>
          <p className="mt-1 text-sm text-paper/70">{shortWhen(next.starts_at)}</p>
          <p className="text-sm text-paper/70">{next.location}</p>
          {next.status === "waitlisted" && <p className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">You’re on the waitlist</p>}
        </>
      ) : (
        <>
          <p className="mt-2 text-lg font-bold">Nothing planned yet</p>
          <Link href="/sports#events" className="mt-3 inline-flex rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink hover:opacity-90">
            Find a game
          </Link>
        </>
      )}
    </section>
  );
}

const noop = () => () => {};
