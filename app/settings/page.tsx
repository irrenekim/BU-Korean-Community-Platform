"use client";

import { SignInButton, useSession } from "@clerk/nextjs";
import { useEffect, useState, type FormEvent } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { describeFollow } from "@/lib/tagMatch";
import type { CategorySlug } from "@/lib/categories";
import { normalizePhone } from "@/lib/phone";
import ThemePicker from "@/components/ThemePicker";
import Icon from "@/components/icons";
import Link from "next/link";

type Follow = { id: number; category: CategorySlug; filter_value: string };

export default function SettingsPage() {
  const { isLoaded, session } = useSession();
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:py-8">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight">My settings</h1>
        <p className="mt-1 text-gray-600">How the site looks, your contact info and what you get notified about.</p>
      </div>
      <ThemePicker />
      <Link href="/feedback?from=/settings" className="card flex items-center gap-3 p-5 transition hover:ring-gray-300">
        <Icon name="feedback" className="h-6 w-6 text-brand" />
        <span className="flex-1">
          <span className="section-title block">Send feedback</span>
          <span className="muted">Report something broken or suggest an idea.</span>
        </span>
        <span aria-hidden className="text-gray-400">›</span>
      </Link>
      {!isLoaded ? <p role="status">Loading…</p> : !session ? (
        <SignInButton mode="modal">
          <button className="btn-primary">Log in to see your settings</button>
        </SignInButton>
      ) : (
        <Settings userEmail={session.user.primaryEmailAddress?.emailAddress ?? ""} />
      )}
    </main>
  );
}

function Settings({ userEmail }: { userEmail: string }) {
  const supabase = useSupabase();
  const [phone, setPhone] = useState("");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      const [profile, followList] = await Promise.all([
        supabase.from("profiles").select("phone,email_alerts,sms_alerts").maybeSingle(),
        supabase.from("follows").select("id,category,filter_value").order("created_at"),
      ]);
      if (ignore) return;
      if (profile.error || followList.error) {
        setError("Could not load your settings. Has the new database file been run in Supabase?");
      } else {
        setPhone(profile.data?.phone ?? "");
        setEmailAlerts(profile.data?.email_alerts ?? true);
        setSmsAlerts(profile.data?.sms_alerts ?? false);
        setFollows(followList.data as Follow[]);
      }
      setLoading(false);
    })();
    return () => { ignore = true; };
  }, [supabase]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    const normalized = phone.trim() ? normalizePhone(phone) : null;
    if (phone.trim() && !normalized) {
      setError("Enter a US number like 617-555-1234, or start with + and the country code (e.g. +82 10 1234 5678).");
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase.from("profiles").upsert({
      phone: normalized,
      email_alerts: emailAlerts,
      sms_alerts: Boolean(normalized) && smsAlerts,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
    if (saveError) setError("Could not save. Try again.");
    else {
      if (normalized) setPhone(normalized);
      setMessage("Saved.");
    }
  }

  async function unfollow(id: number) {
    const { error: deleteError } = await supabase.from("follows").delete().eq("id", id);
    if (deleteError) setError("Could not unfollow. Try again.");
    else setFollows((list) => list.filter((follow) => follow.id !== id));
  }

  if (loading) return <p role="status">Loading your settings…</p>;

  return (
    <>
      <form onSubmit={save} className="card space-y-4 p-5">
        <h2 className="section-title">Contact & notifications</h2>
        <label className="block text-sm font-medium">Phone number (optional)
          <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)}
            placeholder="617-555-1234" autoComplete="tel" maxLength={20}
            className="input" />
          <span className="mt-1 block text-sm text-gray-500">Only you can see this. Korean 010 numbers work as typed; for other countries start with + and the country code.</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={emailAlerts} onChange={(event) => setEmailAlerts(event.target.checked)} />
          Email me about new posts I follow{userEmail && <span className="text-gray-500">({userEmail})</span>}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={smsAlerts} disabled={!phone.trim()}
            onChange={(event) => setSmsAlerts(event.target.checked)} />
          Text me too <span className="text-sm text-gray-500">(coming soon)</span>
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
          {message && <p role="status" className="text-green-700">{message}</p>}
        </div>
        {error && <p role="alert" className="text-brand">{error}</p>}
      </form>

      <section className="card space-y-3 p-5">
        <h2 className="section-title">What I follow</h2>
        {follows.length === 0 ? (
          <p className="text-gray-600">Nothing yet. Pick a filter on Academics, Sports or Housing and click Follow.</p>
        ) : (
          <ul className="space-y-2">
            {follows.map((follow) => (
              <li key={follow.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2">
                <span className="text-sm font-medium">{describeFollow(follow.category, follow.filter_value)}</span>
                <button type="button" onClick={() => void unfollow(follow.id)}
                  className="btn-secondary px-3 py-1">Unfollow</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
