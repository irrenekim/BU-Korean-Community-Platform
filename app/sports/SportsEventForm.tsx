import { useState, type FormEvent } from "react";
import { useSupabase } from "@/lib/supabase/client";

export const sports = ["Soccer", "Basketball", "Volleyball", "Tennis", "Running", "Other"];

export default function SportsEventForm({ onCreated }: { onCreated: () => void }) {
  const supabase = useSupabase();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const startsAt = new Date(String(fields.get("starts_at")));
    const photoUrl = String(fields.get("photo_url")).trim();

    if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      setError("Choose a date and time in the future.");
      return;
    }
    if (photoUrl && !photoUrl.startsWith("https://")) {
      setError("Use an HTTPS photo URL.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const { error: insertError } = await supabase.from("sports_events").insert({
        title: String(fields.get("title")).trim(),
        sport: fields.get("sport"),
        starts_at: startsAt.toISOString(),
        location: String(fields.get("location")).trim(),
        description: String(fields.get("description")).trim(),
        photo_url: photoUrl || null,
        capacity: Number(fields.get("capacity")),
      });
      if (insertError) throw insertError;
      form.reset();
      onCreated();
    } catch {
      setError("Could not create the event. Check your details and try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1 w-full rounded border px-3 py-2";

  return (
    <details className="rounded-lg border bg-white p-4">
      <summary className="cursor-pointer font-semibold">Create event</summary>
      <form onSubmit={createEvent}>
        <fieldset disabled={saving} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>Title <input name="title" required maxLength={100} className={inputClass} /></label>
          <label>
            Sport
            <select name="sport" className={inputClass}>
              {sports.map((sport) => <option key={sport}>{sport}</option>)}
            </select>
          </label>
          <label>
            Date and time (your local time)
            <input name="starts_at" type="datetime-local" required className={inputClass} />
          </label>
          <label>Location <input name="location" required maxLength={160} className={inputClass} /></label>
          <label>
            Capacity
            <input name="capacity" type="number" required min={1} max={1000} className={inputClass} />
          </label>
          <label>
            Photo URL (optional)
            <input name="photo_url" type="url" maxLength={2048} placeholder="https://" className={inputClass} />
          </label>
          <label className="sm:col-span-2">
            Description
            <textarea name="description" required maxLength={2000} rows={3} className={inputClass} />
          </label>
          <button className="justify-self-start rounded bg-red-700 px-4 py-2 text-white" type="submit">
            {saving ? "Creating…" : "Create event"}
          </button>
        </fieldset>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      </form>
    </details>
  );
}
