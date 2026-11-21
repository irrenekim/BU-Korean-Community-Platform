"use client";

import { useState, type FormEvent } from "react";
import { useSupabase } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import type { Friend } from "./usePlans";

// Pick your @username, add friends by username or invite link, answer requests.
export default function FriendsPanel({ friends, username, myName, onChange }: {
  friends: Friend[];
  username: string | null;
  myName: string;
  onChange: () => void;
}) {
  const supabase = useSupabase();
  const [handle, setHandle] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Someone opened an invite link like /plans?add=irene
  const invitedBy = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("add");

  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter((f) => f.status === "pending" && f.incoming);
  const sent = friends.filter((f) => f.status === "pending" && !f.incoming);

  async function pickUsername(event: FormEvent) {
    event.preventDefault();
    const clean = handle.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9_.]{3,20}$/.test(clean)) {
      return setMessage({ ok: false, text: "Use 3–20 letters, numbers, dots or underscores." });
    }
    setBusy(true);
    const { error } = await supabase.from("profiles")
      .upsert({ username: clean, display_name: myName.slice(0, 60) }, { onConflict: "user_id" });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: error.code === "23505" ? `@${clean} is taken. Try another.` : "Could not save. Try again." });
    setMessage({ ok: true, text: `You're @${clean}.` });
    onChange();
  }

  async function addFriend(raw: string) {
    const clean = raw.trim().toLowerCase().replace(/^@/, "");
    if (!clean) return;
    setBusy(true);
    setMessage(null);
    const { data: found } = await supabase.rpc("find_user_by_username", { p_username: clean });
    const person = (found ?? [])[0] as { user_id: string; display_name: string | null } | undefined;
    if (!person) {
      setBusy(false);
      return setMessage({ ok: false, text: `No one is @${clean} yet. Check the spelling, or send them your invite link.` });
    }
    if (clean === username) {
      setBusy(false);
      return setMessage({ ok: false, text: "That's you!" });
    }
    const { error } = await supabase.from("friendships").insert({ addressee_id: person.user_id });
    setBusy(false);
    if (error) {
      return setMessage({ ok: false, text: error.code === "23505" ? `You and @${clean} are already friends or have a request open.` : "Could not send the request." });
    }
    setSearch("");
    setMessage({ ok: true, text: `Request sent to @${clean}.` });
    onChange();
  }

  async function accept(id: number) {
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    if (error) setMessage({ ok: false, text: "Could not accept." });
    onChange();
  }

  async function remove(id: number, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    const { error } = await supabase.from("friendships").delete().eq("id", id);
    if (error) setMessage({ ok: false, text: "Could not update." });
    onChange();
  }

  const inviteLink = username && typeof window !== "undefined" ? `${window.location.origin}/plans?add=${username}` : "";

  // Step 1: everyone needs a @username before adding friends
  if (!username) {
    return (
      <form onSubmit={pickUsername} className="card mx-auto max-w-lg space-y-4 p-6">
        <div>
          <h2 className="section-title">Pick your @username</h2>
          <p className="muted mt-1">Friends add you with it. You can use your name or your BU login.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 focus-within:border-brand">
          <span className="text-gray-400">@</span>
          <input autoFocus value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={20} placeholder="irenekim"
            aria-label="Username" className="min-w-0 flex-1 bg-transparent py-2.5 outline-none" />
        </div>
        {message && <p role="status" className={`text-sm ${message.ok ? "text-green-700" : "text-brand"}`}>{message.text}</p>}
        <button type="submit" disabled={busy} className="btn-primary">Save username</button>
      </form>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {invitedBy && invitedBy !== username && !friends.some((f) => f.username === invitedBy) && (
          <div className="card flex flex-wrap items-center justify-between gap-3 p-5 ring-2 ring-brand/30">
            <p><span className="font-bold">@{invitedBy}</span> invited you to be friends.</p>
            <button type="button" disabled={busy} onClick={() => void addFriend(invitedBy)} className="btn-primary">Add friend</button>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); void addFriend(search); }} className="card space-y-3 p-5">
          <h2 className="section-title">Add a friend</h2>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-1 rounded-full bg-gray-100 px-4 focus-within:ring-2 focus-within:ring-brand">
              <span className="text-gray-400">@</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="their username" aria-label="Friend's username"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" />
            </div>
            <button type="submit" disabled={busy || !search.trim()} className="btn-primary">Send request</button>
          </div>
          {message && <p role="status" className={`text-sm ${message.ok ? "text-green-700" : "text-brand"}`}>{message.text}</p>}
        </form>

        {incoming.length > 0 && (
          <section className="card p-5">
            <h2 className="section-title">Requests for you</h2>
            <ul className="mt-3 divide-y divide-gray-100">
              {incoming.map((f) => (
                <li key={f.friendship_id} className="flex items-center gap-3 py-3">
                  <Avatar name={f.display_name || f.username} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{f.display_name || f.username}</span>
                    <span className="text-sm text-gray-500">@{f.username}</span></span>
                  <button type="button" onClick={() => void accept(f.friendship_id)} className="btn-primary px-3 py-1.5">Accept</button>
                  <button type="button" onClick={() => void remove(f.friendship_id)} className="btn-secondary px-3 py-1.5">Decline</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-5">
          <h2 className="section-title">Friends <span className="font-normal text-gray-500">{accepted.length}</span></h2>
          {accepted.length === 0 ? (
            <p className="muted mt-2">No friends yet. Add someone by @username or share your invite link.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {accepted.map((f) => (
                <li key={f.friendship_id} className="flex items-center gap-3 py-3">
                  <Avatar name={f.display_name || f.username} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{f.display_name || f.username}</span>
                    <span className="text-sm text-gray-500">@{f.username}</span></span>
                  <button type="button" onClick={() => void remove(f.friendship_id, `Remove @${f.username} from your friends?`)}
                    className="btn-ghost text-sm">Remove</button>
                </li>
              ))}
            </ul>
          )}
          {sent.length > 0 && (
            <p className="muted mt-3">Waiting for: {sent.map((f) => (
              <span key={f.friendship_id} className="mr-2 inline-flex items-center gap-1">@{f.username}
                <button type="button" aria-label={`Cancel request to ${f.username}`} onClick={() => void remove(f.friendship_id)}
                  className="text-brand hover:underline">cancel</button></span>
            ))}</p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-5">
          <h2 className="section-title">You’re @{username}</h2>
          <p className="muted mt-1">Send this link. Anyone with a BU account who opens it can add you in one tap.</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm">{inviteLink}</span>
            <button type="button" onClick={() => { void navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="shrink-0 text-sm font-semibold text-brand">{copied ? "Copied" : "Copy"}</button>
          </div>
        </section>
        <section className="card p-5">
          <h2 className="section-title">What friends can see</h2>
          <p className="muted mt-1">Only when you’re busy, not what you’re doing, unless you turn on “Show the name to friends” for a class. Games you RSVP to are public on Sports anyway.</p>
        </section>
      </aside>
    </div>
  );
}
