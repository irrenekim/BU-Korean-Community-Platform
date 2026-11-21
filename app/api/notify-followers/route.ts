import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import type { CategorySlug } from "@/lib/categories";
import { describeFollow, tagMatchesFilter } from "@/lib/tagMatch";

// Called by the website right after someone publishes a post.
// Emails everyone who follows a matching filter (via Resend: resend.com).
// Needs RESEND_API_KEY in .env.local. Without it, nothing is sent.

type FollowerRow = {
  follower_id: string;
  filter_value: string;
  post_category: CategorySlug;
  post_tag: string | null;
  post_title: string;
};

function respond(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function POST(request: Request) {
  const { userId, getToken } = await auth();
  if (!userId) return respond({ error: "Sign in to continue." }, 401);

  const resendKey = process.env.RESEND_API_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!resendKey) return respond({ sent: 0, note: "Email is not set up (no RESEND_API_KEY)." });
  if (!url || !key) return respond({ error: "Database unavailable." }, 503);

  const body = await request.json().catch(() => null);
  const postId = Number(body?.postId);
  if (!Number.isSafeInteger(postId) || postId <= 0) return respond({ error: "Bad post." }, 400);

  try {
    // Runs as the logged-in author: the database only answers for their own new post, once.
    const supabase = createClient(url, key, { accessToken: () => getToken() });
    const { data: rows, error } = await supabase.rpc("claim_post_followers", { p_post_id: postId });
    if (error) throw error;
    const data = (rows ?? []) as FollowerRow[];

    // Keep followers whose filter matches this post (one email per person).
    const reasons = new Map<string, string>();
    for (const row of data) {
      if (!reasons.has(row.follower_id) && tagMatchesFilter(row.post_category, row.filter_value, row.post_tag)) {
        reasons.set(row.follower_id, describeFollow(row.post_category, row.filter_value));
      }
    }
    if (reasons.size === 0) return respond({ sent: 0 });

    const clerk = await clerkClient();
    const ids = [...reasons.keys()].slice(0, 100);
    const { data: users } = await clerk.users.getUserList({ userId: ids, limit: ids.length });

    const first = data[0];
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const link = `${siteUrl}/${first.post_category}`;
    const from = process.env.NOTIFY_FROM || "Korean Community @BU <onboarding@resend.dev>";

    let sent = 0;
    for (const user of users) {
      const to = user.primaryEmailAddress?.emailAddress;
      if (!to) continue;
      // One email per person, so nobody sees anyone else's address.
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `New post: ${first.post_title}`.slice(0, 120),
          html: `<p>A new post matches something you follow (<b>${escapeHtml(reasons.get(user.id)!)}</b>):</p>
<p style="font-size:18px"><b>${escapeHtml(first.post_title)}</b></p>
<p><a href="${escapeHtml(link)}">Open it on Korean Community @BU</a></p>
<p style="color:#888;font-size:12px">You can stop these emails in My settings.</p>`,
        }),
      });
      if (response.ok) sent++;
      else console.error("Resend refused an email:", response.status, await response.text());
    }
    return respond({ sent });
  } catch (error) {
    console.error("notify-followers failed:", error);
    return respond({ error: "Could not send notifications." }, 500);
  }
}
