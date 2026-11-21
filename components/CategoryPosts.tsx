"use client";

import { SignInButton, useSession } from "@clerk/nextjs";
import { useEffect, useState, type FormEvent } from "react";
import { useSupabase } from "@/lib/supabase/client";
import type { CategorySlug } from "@/lib/categories";
import CategoryFilters, { FILTERS, QuickChips } from "./CategoryFilters";
import Icon from "./icons";
import { COLLEGES, SEP, majorsOf, parseAcademicTag } from "@/lib/academics";
import PostComments from "./PostComments";
import Avatar from "./Avatar";
import { timeAgo } from "@/lib/format";

type Post = {
  id: number;
  author_id: string;
  author_name: string | null;
  title: string;
  body: string;
  tag: string | null;
  created_at: string;
};

export default function CategoryPosts({ slug }: { slug: CategorySlug }) {
  const { isLoaded, session } = useSession();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <p role="status" className="muted">Posts are unavailable while the database is being configured.</p>;
  }
  if (!isLoaded) return <p role="status" className="muted">Loading…</p>;
  if (!session) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="font-semibold">Posts are for BU students</p>
        <p className="muted">Log in with your @bu.edu email to read and write posts.</p>
        <SignInButton mode="modal">
          <button className="btn-primary">Log in</button>
        </SignInButton>
      </div>
    );
  }
  return <SignedInPosts key={session.id + slug} slug={slug} userId={session.user.id}
    authorName={session.user.fullName || session.user.username || "BU student"} />;
}

function SignedInPosts({ slug, userId, authorName }: {
  slug: CategorySlug;
  userId: string;
  authorName: string;
}) {
  const supabase = useSupabase();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Post | "new" | null>(null);
  const pageSize = 20;

  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      try {
        
let query = supabase
  .from("posts")
  .select(
    "id,author_id,author_name,title,body,tag,created_at",
    { count: "exact" }
  )
  .eq("category", slug);

const listed = FILTERS[slug].allOptions ?? FILTERS[slug].options;
const [college, major, extra] = filter.split(SEP);
const isCollege = slug === "academics" && COLLEGES.some((c) => c.code === college);
if (isCollege && !major && !extra) {
  // Whole college, e.g. "CAS" → every "CAS · …" post
  query = query.like("tag", `${college}${SEP}%`);
} else if (isCollege && major && !extra) {
  // One major, with or without a course: "CAS · Economics" or "CAS · Economics · EC 101"
  const exact = `${college}${SEP}${major}`;
  query = query.or(`tag.eq."${exact}",tag.like."${exact}${SEP}*"`);
} else if (filter === "Other" && slug !== "academics") {
  // "Other" = any tag that isn't one of the listed choices
  const known = listed.filter((option) => option !== "Other")
    .map((option) => `"${option}"`).join(",");
  query = query.not("tag", "is", null).not("tag", "in", `(${known})`);
} else if (filter && slug !== "academics" && listed.includes(filter)) {
  // A listed sport / neighborhood: exact match ("Tennis" ≠ "Table Tennis")
  query = query.eq("tag", filter);
} else if (filter) {
  const escaped = filter.replace(/[\\%_]/g, "\\$&");
  query = query.ilike("tag", `%${escaped}%`);
}

const { data, count, error } = await query
  .order("created_at", { ascending: false })
  .order("id", { ascending: false })
  .range(page * pageSize, (page + 1) * pageSize - 1)
  .abortSignal(abort.signal);

        if (error) throw error;
        if (abort.signal.aborted) return;
        setPosts(data);
        setTotal(count ?? 0);
        setLoadError("");
      } catch {
        if (!abort.signal.aborted) setLoadError("Could not load posts. Please try again.");
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => abort.abort();
  }, [supabase, slug, page, revision, filter]);

  function refresh() {
    setLoading(true);
    setRevision((value) => value + 1);
  }

  function changePage(next: number) {
    setLoading(true);
    setPage(next);
  }

  function pickFilter(next: string) {
    if (next === filter) return;
    setLoading(true);
    setPage(0);
    setFilter(next);
  }
  const label = { academics: "Academics", sports: "Sports", housing: "Housing" }[slug];

  const filterPanel = (
    <section className="card space-y-4 p-5" aria-label="More filters">
      <h2 className="section-title">Narrow it down</h2>
      <CategoryFilters slug={slug} value={filter} onChange={pickFilter} />
    </section>
  );

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        <QuickChips slug={slug} value={filter} onChange={pickFilter} />

        {/* Phones/tablets: the detailed filters fold into a disclosure */}
        <details className="card p-0 xl:hidden [&[open]]:p-5">
          <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            More filters{filter && <span className="font-normal text-gray-500">: {filter}</span>}
          </summary>
          <div className="mt-2"><CategoryFilters slug={slug} value={filter} onChange={pickFilter} /></div>
        </details>
        {filter && <div className="xl:hidden"><FollowButton category={slug} filter={filter} /></div>}

        {/* Composer */}
        {editor ? (
          <PostEditor key={editor === "new" ? "new" : editor.id} slug={slug} userId={userId}
            authorName={authorName} post={editor === "new" ? null : editor}
            onCancel={() => setEditor(null)} onSaved={() => {
              setNotice(editor === "new" ? "Post published." : "Changes saved.");
              setEditor(null);
              setPage(0);
              refresh();
            }} />
        ) : (
          <button type="button" onClick={() => { setEditor("new"); setNotice(""); }}
            className="card flex w-full items-center gap-3 p-3 pr-4 text-left transition hover:ring-gray-300">
            <Avatar name={authorName} />
            <span className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm text-gray-500">
              Share something with {label}…
            </span>
            <span className="hidden items-center gap-1 text-sm font-semibold text-brand sm:flex">
              <Icon name="write" className="h-4 w-4" /> Post
            </span>
          </button>
        )}
        {notice && <p role="status" className="rounded-2xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800">{notice}</p>}

        {/* Feed */}
        <section aria-labelledby="category-posts-heading">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 id="category-posts-heading" className="section-title">
              {filter ? `Posts in ${filter}` : "Latest"}
            </h2>
            {!loading && !loadError && <span className="muted">{total} {total === 1 ? "post" : "posts"}</span>}
          </div>
          {loading ? <p role="status" className="muted px-1 py-6">Loading posts…</p> : loadError ? (
            <p role="alert" className="px-1 text-brand">{loadError} <button onClick={refresh} className="underline">Retry</button></p>
          ) : posts.length === 0 ? (
            <div className="card px-6 py-12 text-center">
              <p className="font-semibold">{filter ? `Nothing in ${filter} yet` : "Nothing here yet"}</p>
              <p className="muted mt-1">Start the conversation. Your post shows up here right away.</p>
              <button type="button" onClick={() => setEditor("new")} className="btn-primary mt-4">Write a post</button>
            </div>
          ) : (
            <ul className="card divide-y divide-gray-100 overflow-hidden">
              {posts.map((post) => (
                <li key={post.id}>
                  <article className="flex gap-3 px-4 py-4 sm:px-5">
                    <Avatar name={post.author_name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm">
                          <span className="font-bold">{post.author_name || "BU student"}</span>
                          <time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString()}
                            className="ml-2 text-gray-500">{timeAgo(post.created_at)}</time>
                        </p>
                        {post.author_id === userId && (
                          <button type="button" onClick={() => { setEditor(post); setNotice(""); }}
                            className="ml-auto text-sm font-medium text-gray-500 hover:text-ink">Edit</button>
                        )}
                      </div>
                      {post.tag && <p className="mt-1"><span className="tag">{post.tag}</span></p>}
                      <h3 className="mt-2 break-words text-[17px] font-bold leading-snug">{post.title}</h3>
                      <p className="mt-1 break-words whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700">{post.body}</p>
                      <PostComments postId={post.id} userId={userId} authorName={authorName} />
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
          {!loading && total > pageSize && (
            <div className="mt-4 flex items-center justify-between">
              <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)} className="btn-secondary">Newer</button>
              <span className="muted">Page {page + 1} of {Math.ceil(total / pageSize)}</span>
              <button type="button" disabled={(page + 1) * pageSize >= total} onClick={() => changePage(page + 1)}
                className="btn-secondary">Older</button>
            </div>
          )}
        </section>
      </div>

      {/* Right column (big screens) */}
      <aside className="hidden xl:block">
        <div className="sticky top-6 space-y-4">
          {filterPanel}
          {filter ? <FollowButton category={slug} filter={filter} /> : (
            <section className="card p-5">
              <h2 className="section-title">Get notified</h2>
              <p className="muted mt-1">Pick a filter, then follow it to get an email when someone posts there.</p>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

function PostEditor({ slug, userId, authorName, post, onSaved, onCancel }: {
  slug: CategorySlug;
  userId: string;
  authorName: string;
  post: Post | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const supabase = useSupabase();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get("title")).trim();
    const body = String(fields.get("body")).trim();
    if (!title || !body) {
      setError("Enter a title and body.");
      return;
    }
    setSaving(true);
    setError("");
    const values = { title, body, tag: String(fields.get("tag")).trim() || null };
    try {
      const query = post
        ? supabase.from("posts").update(values).eq("id", post.id).eq("author_id", userId).eq("category", slug)
        : supabase.from("posts").insert({ ...values, category: slug, author_name: authorName });
      const { data: saved, error: saveError } = await query.select("id").single();
      if (saveError) throw saveError;
      if (!post) {
        // New post: email people who follow a matching filter. Doesn't block posting.
        void fetch("/api/notify-followers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: saved.id }),
        }).catch(() => {});
      }
      onSaved();
    } catch {
      setError("Could not save your post. Check your BU account and try again.");
      setSaving(false);
    }
  }

  const inputClass = "input";
  const tagLabel = { academics: "Course / Major", sports: "Sport type", housing: "Neighborhood" }[slug];

  return (
    <form onSubmit={save} className="card p-5 ring-2 ring-brand/20">
      <h3 className="mb-4 text-lg font-semibold">{post ? "Edit your post" : "Create a post"}</h3>
      <fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm font-medium">Title
          <input name="title" required maxLength={200} defaultValue={post?.title} className={inputClass} />
        </label>
        {slug === "academics" ? (
          <AcademicPicker initial={post?.tag ?? ""} inputClass={inputClass} />
        ) : (
          <TagPicker slug={slug} label={tagLabel} initial={post?.tag ?? ""} inputClass={inputClass} />
        )}
        <label className="block text-sm font-medium">Body
          <textarea name="body" required rows={6} maxLength={20000} defaultValue={post?.body} className={inputClass} />
        </label>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary">
            {saving ? "Saving…" : post ? "Save changes" : "Publish post"}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    </form>
  );
}


// Sports and Housing: pick the sport / neighborhood from a fixed list, so the
// filter buttons find the post. "Other" opens a box to type a new one.
function TagPicker({ slug, label, initial, inputClass }: {
  slug: "sports" | "housing";
  label: string;
  initial: string;
  inputClass: string;
}) {
  const options: readonly string[] = FILTERS[slug].allOptions ?? FILTERS[slug].options;
  const startsListed = initial === "" || options.includes(initial);
  const [choice, setChoice] = useState(startsListed ? initial : "Other");
  const [custom, setCustom] = useState(startsListed ? "" : initial);
  const value = choice === "Other" ? custom.trim() || "Other" : choice;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}
        <select required value={choice} onChange={(event) => setChoice(event.target.value)}
          className={inputClass}>
          <option value="" disabled>Choose {slug === "sports" ? "a sport" : "a neighborhood"}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      {choice === "Other" && (
        <label className="block text-sm">
          {slug === "sports" ? "Which sport?" : "Which neighborhood?"} (optional)
          <input value={custom} maxLength={100} onChange={(event) => setCustom(event.target.value)}
            placeholder={slug === "sports" ? "e.g. Table tennis" : "e.g. Somerville"} className={inputClass} />
        </label>
      )}
      <input type="hidden" name="tag" value={value} />
    </div>
  );
}

// Academics: college → major → optional course, saved as "CAS · Economics · EC 101".
function AcademicPicker({ initial, inputClass }: { initial: string; inputClass: string }) {
  const parsed = parseAcademicTag(initial);
  const [college, setCollege] = useState(parsed.college);
  const [major, setMajor] = useState(parsed.major);
  const [course, setCourse] = useState(parsed.course);
  // Older posts with a free-typed tag keep it unless the author picks a college
  const value = college
    ? [college, major, course.trim()].filter(Boolean).join(SEP)
    : parsed.college ? "" : initial;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block text-sm font-medium">College
        <select required value={college}
          onChange={(event) => { setCollege(event.target.value); setMajor(""); }}
          className={inputClass}>
          <option value="" disabled>Choose a college</option>
          {COLLEGES.map((c) => <option key={c.code} value={c.code}>{c.code}: {c.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">Major
        <select required value={major} disabled={!college}
          onChange={(event) => setMajor(event.target.value)} className={inputClass}>
          <option value="" disabled>Choose a major</option>
          {majorsOf(college).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">Course (optional)
        <input value={course} maxLength={20} placeholder="e.g. EC 101"
          onChange={(event) => setCourse(event.target.value.replaceAll("·", ""))} className={inputClass} />
      </label>
      <input type="hidden" name="tag" value={value} />
    </div>
  );
}

const notSetUp = "Following isn't set up yet (run the new database file).";

// "Follow Soccer": get an email when a new post matches this filter.
function FollowButton({ category, filter }: { category: CategorySlug; filter: string }) {
  const supabase = useSupabase();
  const [followId, setFollowId] = useState<number | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    void supabase.from("follows").select("id").eq("category", category).eq("filter_value", filter)
      .maybeSingle().then(({ data, error: loadError }) => {
        if (ignore) return;
        if (loadError) setError(notSetUp);
        setFollowId(data?.id ?? null);
      });
    return () => { ignore = true; };
  }, [supabase, category, filter]);

  async function toggle() {
    setBusy(true);
    setError("");
    if (followId) {
      const { error: deleteError } = await supabase.from("follows").delete().eq("id", followId);
      if (deleteError) setError("Could not unfollow.");
      else setFollowId(null);
    } else {
      const { data, error: insertError } = await supabase.from("follows")
        .insert({ category, filter_value: filter }).select("id").single();
      if (insertError) setError("Could not follow.");
      else setFollowId(data.id);
    }
    setBusy(false);
  }

  if (followId === undefined) return null;
  return (
    <div className="card space-y-2 p-5">
      <button type="button" onClick={() => void toggle()} disabled={busy || error === notSetUp}
        aria-pressed={Boolean(followId)}
        className={`w-full ${followId ? "btn-secondary" : "btn-primary"}`}>
        <Icon name="bell" className="h-4 w-4" />
        {followId ? `Following ${filter}` : `Follow ${filter}`}
      </button>
      <p className="muted">
        {followId ? "We'll email you when a new post matches. Manage in My settings." : "Get an email when a new post matches this filter."}
      </p>
      {error && <p role="alert" className="text-sm text-brand">{error}</p>}
    </div>
  );
}
