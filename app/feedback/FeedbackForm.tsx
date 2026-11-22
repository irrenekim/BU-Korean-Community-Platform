"use client";

import { SignInButton, useSession } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/format";
import Avatar from "@/components/Avatar";

type Kind = "bug" | "idea" | "other";
type Item = { id: number; author_name: string; kind: Kind; page: string | null; message: string; status: "new" | "seen" | "fixed"; created_at: string };

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "bug", label: "Something's broken", hint: "What did you do, and what happened instead?" },
  { value: "idea", label: "Idea", hint: "What would make the site more useful for you?" },
  { value: "other", label: "Other", hint: "Anything else you want the team to know." },
];

const PAGES = ["Home", "Academics", "Sports", "Housing", "Plans", "My settings", "Signing in", "Whole site"];

const STATUS: Record<Item["status"], { label: string; className: string }> = {
  new: { label: "New", className: "bg-gray-100 text-gray-600" },
  seen: { label: "Team saw it", className: "bg-brand-soft text-brand-dark" },
  fixed: { label: "Fixed", className: "bg-green-100 text-green-800" },
};

const FILTERS: { value: "all" | Kind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bug", label: "Broken" },
  { value: "idea", label: "Ideas" },
  { value: "other", label: "Other" },
];

// /feedback?from=/sports pre-picks "Sports"
function pageFromPath(path: string | null) {
  if (!path) return "";
  const first = path.split("/")[1] ?? "";
  if (first === "") return "Home";
  if (first === "settings") return "My settings";
  return PAGES.find((p) => p.toLowerCase() === first.toLowerCase()) ?? "";
}

export default function FeedbackForm() {
  const { isLoaded, session } = useSession();
  const supabase = useSupabase();
  const from = useSearchParams().get("from");
  const [items, setItems] = useState<Item[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [reloadKey, setReloadKey] = useState(0);

  // Everyone can read the feedback, logged in or not.
  useEffect(() => {
    let ignore = false;
    supabase
      .from("feedback")
      .select("id,author_name,kind,page,message,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (ignore) return;
        if (error) setLoadError("Feedback isn't set up yet. Run the feedback database file in Supabase.");
        else setItems(data as Item[]);
      });
    return () => { ignore = true; };
  }, [supabase, reloadKey]);

  const firstName =
    session?.user.firstName?.trim() || session?.user.fullName?.trim().split(" ")[0] || "BU student";
  const shown = (items ?? []).filter((item) => filter === "all" || item.kind === filter);

  return (
    <>
      {!isLoaded ? <p role="status">Loading…</p> : session ? (
        <Form initialPage={pageFromPath(from)} authorName={firstName} onSent={() => setReloadKey((k) => k + 1)} />
      ) : (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-gray-700">Log in to send feedback. Anyone can read it below.</p>
          <SignInButton mode="modal"><button className="btn-primary">Log in</button></SignInButton>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">What people have sent{items ? ` (${items.length})` : ""}</h2>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button key={f.value} type="button" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}
                className={`chip px-3 py-1 text-xs ${filter === f.value ? "chip-on" : ""}`}>{f.label}</button>
            ))}
          </div>
        </div>
        {loadError ? <p role="alert" className="text-brand">{loadError}</p>
          : !items ? <p role="status" className="muted">Loading…</p>
          : shown.length === 0 ? (
            <p className="card p-5 text-gray-600">{items.length === 0 ? "Nothing yet. Be the first to tell the team what you think." : "Nothing in this group yet."}</p>
          ) : (
            <ul className="space-y-2">
              {shown.map((item) => (
                <li key={item.id} className="card flex gap-3 p-4">
                  <Avatar name={item.author_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-bold text-ink">{item.author_name}</span>
                      <span className="text-gray-400">{timeAgo(item.created_at)}</span>
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[item.status].className}`}>{STATUS[item.status].label}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="tag">{KINDS.find((k) => k.value === item.kind)?.label}</span>
                      {item.page && <span className="tag bg-gray-100 text-gray-600">{item.page}</span>}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-[15px] text-gray-800">{item.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </section>
    </>
  );
}

function Form({ initialPage, authorName, onSent }: { initialPage: string; authorName: string; onSent: () => void }) {
  const supabase = useSupabase();
  const [kind, setKind] = useState<Kind>("bug");
  const [page, setPage] = useState(initialPage);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (text.length < 5) { setError("Write a little more so the team knows what you mean."); return; }
    setSending(true);
    setError("");
    const { error: sendError } = await supabase
      .from("feedback")
      .insert({ kind, page: page || null, message: text, author_name: authorName.slice(0, 40) });
    setSending(false);
    if (sendError) { setError("Couldn't send it. Check your connection and try again."); return; }
    setMessage("");
    setThanks(true);
    onSent();
  }

  if (thanks) {
    return (
      <div className="card space-y-3 p-5" role="status">
        <h2 className="section-title">Thanks, it&rsquo;s sent</h2>
        <p className="text-gray-600">It&rsquo;s at the top of the list below. The team will mark it when they&rsquo;ve seen or fixed it.</p>
        <button className="btn-secondary" onClick={() => setThanks(false)}>Send another</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-5">
      <fieldset>
        <legend className="section-title">What kind of feedback?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button key={k.value} type="button" aria-pressed={kind === k.value}
              onClick={() => setKind(k.value)} className={`chip ${kind === k.value ? "chip-on" : ""}`}>
              {k.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium">Which part of the site? (optional)
        <select value={page} onChange={(e) => setPage(e.target.value)} className="input">
          <option value="">Not sure</option>
          {PAGES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>

      <label className="block text-sm font-medium">Your message
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={2000}
          placeholder={KINDS.find((k) => k.value === kind)!.hint} className="input resize-y" />
        <span className="mt-1 block text-right text-xs text-gray-400">{message.length}/2000</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={sending} className="btn-primary">{sending ? "Sending…" : "Send feedback"}</button>
        <span className="muted">Everyone can see it, posted as {authorName}.</span>
      </div>
      {error && <p role="alert" className="text-brand">{error}</p>}
    </form>
  );
}
