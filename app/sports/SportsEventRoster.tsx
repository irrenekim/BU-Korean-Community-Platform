import { useEffect, useState } from "react";

type Participant = {
  id: number;
  name: string;
  status: "attending" | "waitlisted";
  waitlistPosition: number | null;
};

export default function SportsEventRoster({
  eventId,
  revision,
}: {
  eventId: string;
  revision: number;
}) {
  const [open, setOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!open) return;

    const abort = new AbortController();
    async function loadRoster() {
      try {
        const response = await fetch(`/api/sports/events/${eventId}/rsvps`, {
          signal: abort.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not load participants.");
        const roster: Participant[] = await response.json();
        if (abort.signal.aborted) return;
        setParticipants(roster);
        setError(false);
      } catch {
        if (!abort.signal.aborted) setError(true);
      }
    }
    void loadRoster();
    return () => abort.abort();
  }, [eventId, open, revision, retry]);

  return (
    <div className="border-t pt-3">
      <button type="button" aria-expanded={open}
        onClick={() => setOpen(!open)} className="btn-secondary">
        {open ? "Hide participant list" : "View participant list"}
      </button>
      {open && (
        <div className="mt-3 text-sm" aria-live="polite">
          {error ? (
            <p role="alert">
              Could not load participants.{" "}
              <button type="button" className="underline" onClick={() => setRetry((value) => value + 1)}>Retry</button>
            </p>
          ) : !participants ? (
            <p>Loading participants…</p>
          ) : participants.length === 0 ? (
            <p>No registrations yet.</p>
          ) : (
            <ul className="space-y-2">
              {participants.map((person) => (
                <li key={person.id} className="flex flex-wrap justify-between gap-2">
                  <span>{person.name}</span>
                  <span className="text-gray-600">
                    {person.status === "attending" ? "Attending" : `Waitlist #${person.waitlistPosition}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
