import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

type Registration = {
  id: number;
  user_id: string;
  status: "attending" | "waitlisted";
};

const cacheHeaders = { "Cache-Control": "private, no-store" };
const pageSize = 100;

function respond(data: unknown, status = 200) {
  return Response.json(data, { status, headers: cacheHeaders });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { userId, getToken } = await auth();
  if (!userId) return respond({ error: "Sign in to continue." }, 401);

  const { eventId } = await params;
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(eventId)) {
    return respond({ error: "Event unavailable." }, 404);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return respond({ error: "Database unavailable." }, 503);

  try {
    const supabase = createClient(url, key, { accessToken: () => getToken() });
    const { data: event, error: eventError } = await supabase.from("sports_events")
      .select("id").eq("id", eventId).eq("organizer_id", userId).maybeSingle();
    if (eventError) throw eventError;
    if (!event) return respond({ error: "Event unavailable." }, 404);

    const registrations: Registration[] = [];
    let cursor = 0;
    for (;;) {
      const { data, error } = await supabase.from("sports_event_rsvps")
        .select("id,user_id,status").eq("event_id", eventId).gt("id", cursor)
        .order("id").limit(pageSize).returns<Registration[]>();
      if (error) throw error;
      registrations.push(...data);
      if (data.length < pageSize) break;
      cursor = data[data.length - 1].id;
    }

    const clerk = await clerkClient();
    const names = new Map<string, string>();
    for (let index = 0; index < registrations.length; index += pageSize) {
      const batch = registrations.slice(index, index + pageSize);
      const { data: users } = await clerk.users.getUserList({
        userId: batch.map((entry) => entry.user_id),
        limit: batch.length,
      });
      for (const user of users) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
        const name = fullName || user.username || user.primaryEmailAddress?.emailAddress.split("@")[0];
        if (name) names.set(user.id, name);
      }
    }

    let waitlistPosition = 0;
    return respond(registrations.map((entry) => ({
      id: entry.id,
      name: names.get(entry.user_id) || "Name unavailable",
      status: entry.status,
      waitlistPosition: entry.status === "waitlisted" ? ++waitlistPosition : null,
    })));
  } catch {
    return respond({ error: "Could not load the participant list." }, 500);
  }
}
