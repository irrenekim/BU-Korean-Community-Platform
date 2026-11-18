
"use client";

import { useEffect, useState } from "react";
import { useSession } from "@clerk/nextjs";
import { useSupabase } from "@/lib/supabase/client";
import type { CategorySlug } from "@/lib/categories";

const FILTERS = {
  academics: {
    label: "Course / Major",
    placeholder: "e.g. CS 111, Computer Science",
    suggestions: ["CS 111", "EC 101", "Computer Science", "Economics"],
  },
  sports: {
    label: "Sport Type",
    placeholder: "e.g. Soccer, Basketball",
    suggestions: ["Soccer", "Basketball", "Tennis", "Volleyball"],
  },
  housing: {
    label: "Neighborhood",
    placeholder: "e.g. Allston, Fenway",
    suggestions: ["Allston", "Fenway", "Brookline", "South Campus"],
  },
};

type Post = {
  id: number;
  title: string;
  body: string;
  tag: string | null;
  author_name: string | null;
};

type Result = {
  key: string;
  posts: Post[];
  count: number;
  error: string | null;
};

const PAGE_SIZE = 20;

export default function CategoryFilters({
  slug,
}: {
  slug: CategorySlug;
}) {
  const supabase = useSupabase();
  const { isLoaded, isSignedIn, session } = useSession();

  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const config = FILTERS[slug];
  const requestKey = JSON.stringify([
    session?.id, slug, filter, page,
  ]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    async function fetchPosts() {
      try {
        let query = supabase
          .from("posts")
          .select("id, title, body, tag, author_name", {
            count: "exact",
          })
          .eq("category", slug)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(
            page * PAGE_SIZE,
            (page + 1) * PAGE_SIZE - 1
          );

        if (filter) {
          const escaped = filter.replace(/[\\%_]/g, "\\$&");
          query = query.ilike("tag", `%${escaped}%`);
        }

        const { data, error, count } = await query;

        if (!cancelled) {
          setResult({
            key: requestKey,
            posts: data ?? [],
            count: count ?? 0,
            error: error ? "Unable to load posts." : null,
          });
        }
      } catch {
        if (!cancelled) {
          setResult({
            key: requestKey,
            posts: [],
            count: 0,
            error: "Unable to load posts.",
          });
        }
      }
    }

    void fetchPosts();

    return () => {
      cancelled = true;
    };
  }, [
    supabase, slug, filter, page,
    isLoaded, isSignedIn, requestKey,
  ]);

  function applyFilter(value: string) {
    setInput(value);
    setFilter(value.trim());
    setPage(0);
  }

  const current = result?.key === requestKey ? result : null;

  return (
    <section>
      <div className="mb-6 rounded-lg border bg-white p-5 text-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Filters</h2>
          <button
            type="button"
            onClick={() => applyFilter("")}
            className="text-sm text-red-600 hover:underline"
          >
            Clear filters
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilter(input);
          }}
        >
          <label
            htmlFor="category-filter"
            className="mb-2 block text-sm font-medium"
          >
            {config.label}
          </label>

          <div className="flex flex-wrap gap-2">
            <input
              id="category-filter"
              type="search"
              value={input}
              maxLength={100}
              onChange={(e) => setInput(e.target.value)}
              placeholder={config.placeholder}
              className="min-w-0 flex-1 rounded-md border px-3 py-2"
            />

            <button
              type="submit"
              className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {["", ...config.suggestions].map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => applyFilter(option)}
              className={`rounded-full border px-3 py-1 text-sm ${
                filter === option
                  ? "border-red-600 bg-red-600 text-white"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {option || "All"}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite">
        {!isLoaded ? (
          <p>Loading...</p>
        ) : !isSignedIn ? (
          <p>Please sign in to view posts.</p>
        ) : !current ? (
          <p>Loading posts...</p>
        ) : current.error ? (
          <p role="alert" className="text-red-600">
            {current.error}
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {current.count} posts found
            </p>

            <div className="space-y-4">
              {current.posts.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-white p-8 text-center text-gray-500">
                  No matching posts found.
                </div>
              ) : (
                current.posts.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-lg border bg-white p-5 text-gray-900"
                  >
                    {post.tag && (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-600">
                        {post.tag}
                      </span>
                    )}

                    <h3 className="mt-3 text-lg font-semibold">
                      {post.title}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-gray-600">
                      {post.body}
                    </p>

                    <p className="mt-4 text-xs text-gray-500">
                      {post.author_name || "Unknown author"}
                    </p>
                  </article>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-between">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border px-3 py-2 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={(page + 1) * PAGE_SIZE >= current.count}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border px-3 py-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
