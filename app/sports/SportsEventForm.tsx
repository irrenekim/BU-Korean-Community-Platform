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

  const inputClass = "input";

  return (
    <details className="group sm:ml-auto [&[open]]:ml-0 [&[open]]:basis-full [&[open]]:rounded-2xl [&[open]]:border [&[open]]:border-gray-200 [&[open]]:bg-white [&[open]]:p-5 [&[open]]:shadow-sm">
      <summary className="btn-primary cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">Create event</span>
        <span className="hidden group-open:inline">Close</span>
      </summary>
      <form onSubmit={createEvent}>
        <fieldset disabled={saving} className="mt-4 grid gap-3 text-sm font-medium sm:grid-cols-2">
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
          <button className="btn-primary justify-self-start" type="submit">
            {saving ? "Creating…" : "Create event"}
          </button>
        </fieldset>
        {error && <p role="alert" className="mt-2 text-sm text-brand">{error}</p>}
      </form>
    </details>
  );
}
