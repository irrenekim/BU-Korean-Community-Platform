"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSupabase } from "@/lib/supabase/client";

type Comment = {
  id: number;
  author_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
};

export default function PostComments({ postId, userId, authorName }: {
  postId: number;
  userId: string;
  authorName: string;
}) {
  const supabase = useSupabase();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    async function load() {
      try {
        const { data, count, error } = await supabase.from("comments")
          .select("id,author_id,author_name,body,created_at", { count: "exact" })
          .eq("post_id", postId).order("created_at").order("id")
          .limit(limit).abortSignal(abort.signal);
        if (error) throw error;
        if (abort.signal.aborted) return;
        setComments(data);
        setTotal(count ?? 0);
        setLoadError(false);
      } catch {
        if (!abort.signal.aborted) setLoadError(true);
      }
    }
    void load();
    return () => abort.abort();
  }, [supabase, postId, open, revision, limit]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) {
      setError("Enter a comment.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.from("comments")
        .insert({ post_id: postId, body, author_name: authorName }).select("id").single();
      if (error) throw error;
      setDraft("");
      setLimit((value) => Math.max(value, total + 1));
      setRevision((value) => value + 1);
    } catch {
      setError("Could not post your comment. Your text has been kept so you can retry.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(commentId: number) {
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.from("comments").delete()
        .eq("id", commentId).eq("post_id", postId).eq("author_id", userId)
        .select("id").single();
      if (error) throw error;
      setComments((current) => current?.filter((comment) => comment.id !== commentId));
      setRevision((value) => value + 1);
    } catch {
      setError("Could not delete your comment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t pt-3">
      <button type="button" aria-expanded={open} aria-controls={`comments-${postId}`}
        className="rounded border px-3 py-1" onClick={() => setOpen(!open)}>
        {open ? "Hide comments" : "Comments"}
      </button>
      {open && (
        <section id={`comments-${postId}`} aria-label="Comments" className="mt-4 space-y-4">
          {loadError ? (
            <p role="alert">Could not load comments.{" "}
              <button type="button" className="underline" onClick={() => setRevision((value) => value + 1)}>Retry</button>
            </p>
          ) : !comments ? <p role="status">Loading comments…</p> : (
            <>
              {comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
              <ul className="space-y-3">
                {comments.map((comment) => (
                  <li key={comment.id} className="rounded bg-gray-50 p-3">
                    <p className="break-words whitespace-pre-wrap">{comment.body}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      {comment.author_name || "BU student"} · <time dateTime={comment.created_at}>
                        {new Date(comment.created_at).toLocaleString()}
                      </time>
                    </p>
                    {comment.author_id === userId && (
                      <button type="button" disabled={busy} onClick={() => void remove(comment.id)}
                        className="mt-2 text-sm text-red-700 underline disabled:opacity-40">
                        Delete comment
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {comments.length < total && (
                <button type="button" className="underline" onClick={() => setLimit((value) => value + 20)}>
                  Load more comments
                </button>
              )}
            </>
          )}
          <form onSubmit={submit}>
            <label htmlFor={`comment-draft-${postId}`} className="block text-sm font-medium">Add a comment</label>
            <textarea id={`comment-draft-${postId}`} required maxLength={5000} rows={3}
              value={draft} disabled={busy} onChange={(event) => setDraft(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2" />
            <button type="submit" disabled={busy} className="mt-2 rounded bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-40">
              {busy ? "Saving…" : "Post comment"}
            </button>
          </form>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </section>
      )}
    </div>
  );
}
