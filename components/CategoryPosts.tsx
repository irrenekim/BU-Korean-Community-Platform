"use client";

import { SignInButton, useSession } from "@clerk/nextjs";
import { useEffect, useState, type FormEvent } from "react";
import { useSupabase } from "@/lib/supabase/client";
import type { CategorySlug } from "@/lib/categories";

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
        const { data, count, error } = await supabase.from("posts")
          .select("id,author_id,author_name,title,body,tag,created_at", { count: "exact" })
          .eq("category", slug).order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1).abortSignal(abort.signal);
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
  }, [supabase, slug, page, revision]);

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
              {post.tag && <p className="text-sm text-red-700">{post.tag}</p>}
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
        <label className="block">{tagLabel} (optional)
          <input name="tag" maxLength={100} defaultValue={post?.tag ?? ""} className={inputClass} />
        </label>
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
