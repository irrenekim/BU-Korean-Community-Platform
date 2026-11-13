"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Passwordless login: enter a bu.edu email → click the sign-in link in your inbox.
// The same page handles both sign-up (first time) and log-in.
// Open the link in the SAME browser you requested it from.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleaned = email.trim().toLowerCase();

    // Only BU students can join. (The database also checks this — see supabase/schema.sql)
    if (!cleaned.endsWith("@bu.edu")) {
      setError("Please use your @bu.edu email address.");
      return;
    }

    setLoading(true);
    const { error } = await createClient().auth.signInWithOtp({
      email: cleaned,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setEmail(cleaned);
      setSent(true);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Log in / Sign up</h1>
      <p className="mt-1 text-sm text-gray-600">
        Only verified BU students can join. No password needed.
      </p>

      {!sent ? (
        <form onSubmit={sendLink} className="mt-6 space-y-3">
          <label className="block text-sm font-medium">BU email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="yourname@bu.edu"
            className="w-full rounded border bg-white px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-red-600 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Email me a sign-in link"}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-3 rounded border bg-white p-4 text-sm">
          <p>
            📬 We sent a sign-in link to <strong>{email}</strong>.
          </p>
          <p className="text-gray-600">
            Open it <strong>in this same browser</strong> to log in. Check your spam folder if you
            don&apos;t see it.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-gray-500 underline"
          >
            Use a different email
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}