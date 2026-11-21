"use client";

import { SignInButton, useSession } from "@clerk/nextjs";
import { useEffect, useState, type FormEvent } from "react";
import { useSupabase } from "@/lib/supabase/client";
import type { CategorySlug } from "@/lib/categories";
import CategoryFilters, { FILTERS } from "./CategoryFilters";
import { COLLEGES, SEP, majorsOf, parseAcademicTag } from "@/lib/academics";
import PostComments from "./PostComments";

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
    return <p role="status">Posts are unavailable while the database is being configured.</p>;
  }
  if (!isLoaded) return <p role="status">Loading…</p>;
  if (!session) {
    return (
      <SignInButton mode="modal">
        <button className="rounded border bg-white px-4 py-2">Log in to view and create posts</button>
      </SignInButton>
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

  return (
    <section className="mt-6 space-y-4" aria-labelledby="category-posts-heading">
     <CategoryFilters
  slug={slug}
  value={filter}
  onChange={(next) => {
    if (next === filter) return;
    setLoading(true);
    setPage(0);
    setFilter(next);
  }}
/> 
      <div className="flex items-center justify-between gap-3">
        <h2 id="category-posts-heading" className="text-xl font-semibold">Posts</h2>
        <button type="button" onClick={() => { setEditor("new"); setNotice(""); }}
          className="rounded bg-red-700 px-4 py-2 text-white">+ New post</button>
      </div>
      {editor && (
        <PostEditor key={editor === "new" ? "new" : editor.id} slug={slug} userId={userId}
          authorName={authorName} post={editor === "new" ? null : editor}
          onCancel={() => setEditor(null)} onSaved={() => {
            setNotice(editor === "new" ? "Post published." : "Changes saved.");
            setEditor(null);
            setPage(0);
            refresh();
          }} />
      )}
      {notice && <p role="status">{notice}</p>}
      {loading ? <p role="status">Loading posts…</p> : loadError ? (
        <p role="alert">{loadError} <button onClick={refresh} className="underline">Retry</button></p>
      ) : (
        <>
          {posts.length === 0 && <p>No posts on this page yet.</p>}
          {posts.map((post) => (
            <article key={post.id} className="space-y-3 rounded-lg border bg-white p-5">
              {post.tag && <p className="text-sm text-red-700">{tagIcon[slug]} {post.tag}</p>}
              <h3 className="break-words text-lg font-semibold">{post.title}</h3>
              <p className="break-words whitespace-pre-wrap">{post.body}</p>
              <p className="text-sm text-gray-500">
                {post.author_name || "BU student"} · <time dateTime={post.created_at}>
                  {new Date(post.created_at).toLocaleString()}
                </time>
              </p>
              {post.author_id === userId && (
                <button type="button" onClick={() => { setEditor(post); setNotice(""); }}
                  className="rounded border px-3 py-1">Edit post</button>
              )}
              <PostComments postId={post.id} userId={userId} authorName={authorName} />
            </article>
          ))}
          <div className="flex justify-between">
            <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)}
              className="rounded border px-3 py-2 disabled:opacity-40">Previous</button>
            <button type="button" disabled={(page + 1) * pageSize >= total}
              onClick={() => changePage(page + 1)}
              className="rounded border px-3 py-2 disabled:opacity-40">Next</button>
          </div>
        </>
      )}
    </section>
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
      const { error: saveError } = await query.select("id").single();
      if (saveError) throw saveError;
      onSaved();
    } catch {
      setError("Could not save your post. Check your BU account and try again.");
      setSaving(false);
    }
  }

  const inputClass = "mt-1 w-full rounded border px-3 py-2";
  const tagLabel = { academics: "Course / Major", sports: "Sport type", housing: "Neighborhood" }[slug];

  return (
    <form onSubmit={save} className="rounded-lg border bg-white p-5">
      <h3 className="mb-4 text-lg font-semibold">{post ? "Edit your post" : "Create a post"}</h3>
      <fieldset disabled={saving} className="space-y-4">
        <label className="block">Title
          <input name="title" required maxLength={200} defaultValue={post?.title} className={inputClass} />
        </label>
        {slug === "academics" ? (
          <AcademicPicker initial={post?.tag ?? ""} inputClass={inputClass} />
        ) : (
          <TagPicker slug={slug} label={tagLabel} initial={post?.tag ?? ""} inputClass={inputClass} />
        )}
        <label className="block">Body
          <textarea name="body" required rows={6} maxLength={20000} defaultValue={post?.body} className={inputClass} />
        </label>
        <div className="flex gap-3">
          <button type="submit" className="rounded bg-red-700 px-4 py-2 text-white">
            {saving ? "Saving…" : post ? "Save changes" : "Publish post"}
          </button>
          <button type="button" onClick={onCancel} className="rounded border px-4 py-2">Cancel</button>
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    </form>
  );
}

const tagIcon: Record<CategorySlug, string> = { academics: "📚", sports: "🏅", housing: "📍" };

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
      <label className="block">{label}
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
      <label className="block">College
        <select required value={college}
          onChange={(event) => { setCollege(event.target.value); setMajor(""); }}
          className={inputClass}>
          <option value="" disabled>Choose a college</option>
          {COLLEGES.map((c) => <option key={c.code} value={c.code}>{c.code}: {c.name}</option>)}
        </select>
      </label>
      <label className="block">Major
        <select required value={major} disabled={!college}
          onChange={(event) => setMajor(event.target.value)} className={inputClass}>
          <option value="" disabled>Choose a major</option>
          {majorsOf(college).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label className="block">Course (optional)
        <input value={course} maxLength={20} placeholder="e.g. EC 101"
          onChange={(event) => setCourse(event.target.value.replaceAll("·", ""))} className={inputClass} />
      </label>
      <input type="hidden" name="tag" value={value} />
    </div>
  );
}
