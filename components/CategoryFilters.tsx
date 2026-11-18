
"use client";

import { useEffect, useState } from "react";
import { useSession } from "@clerk/nextjs";
import { useSupabase } from "@/lib/supabase/client";
import type { CategorySlug } from "@/lib/categories";

const FILTERS: Record<
  CategorySlug,
  {
    label: string;
    placeholder: string;
    options: string[];
  }
> = {
  academics: {
    label: "Course / Major",
    placeholder: "Search by course or major",
    options: [
      "CS 111",
      "EC 101",
      "Computer Science",
      "Economics",
      "Business",
      "Engineering",
    ],
  },
  sports: {
    label: "Sport Type",
    placeholder: "Search by sport",
    options: [
      "Soccer",
      "Basketball",
      "Tennis",
      "Volleyball",
      "Badminton",
      "Baseball",
    ],
  },
  housing: {
    label: "Neighborhood",
    placeholder: "Search by neighborhood",
    options: [
      "Allston",
      "Fenway",
      "Brookline",
      "South Campus",
      "Brighton",
      "Kenmore",
    ],
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
  requestId: string;
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
  const { isLoaded, isSignedIn, session } = useSession();

  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");

  const config = FILTERS[slug];

  function applyFilter(value: string) {
    setInput(value);
    setFilter(value.trim());
  }

  return (
    <section className="mt-6 space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Filters
          </h2>

          <button
            type="button"
            onClick={() => applyFilter("")}
            className="text-sm text-red-600 hover:underline"
          >
            Clear filters
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            applyFilter(input);
          }}
        >
          <label
            htmlFor={`filter-${slug}`}
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            {config.label}
          </label>

          <div className="flex flex-wrap gap-2">
            <input
              id={`filter-${slug}`}
              type="search"
              value={input}
              maxLength={100}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder={config.placeholder}
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
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
          {["", ...config.options].map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => applyFilter(option)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                filter === option
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {option || "All"}
            </button>
          ))}
        </div>
      </div>

      {!isLoaded ? (
        <p className="text-gray-500">Loading...</p>
      ) : !isSignedIn || !session ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          Please sign in with your BU account to view posts.
        </div>
      ) : (
        <PostResults
          key={JSON.stringify([session.id, slug, filter])}
          slug={slug}
          filter={filter}
        />
      )}
    </section>
  );
}

function PostResults({
  slug,
  filter,
}: {
  slug: CategorySlug;
  filter: string;
}) {
  const supabase = useSupabase();

  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const requestId = `${page}:${retry}`;

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
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
          const escaped = filter.replace(
            /[\\%_]/g,
            "\\$&"
          );

          query = query.ilike("tag", `%${escaped}%`);
        }

        const { data, error, count } = await query;

        if (cancelled) return;

        if (error) {
          console.error("Category filter query failed:", error);

          setResult({
            requestId,
            posts: [],
            count: 0,
            error: "Unable to load posts. Please try again.",
          });

          return;
        }

        setResult({
          requestId,
          posts: data ?? [],
          count: count ?? 0,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;

        console.error("Unable to fetch posts:", error);

        setResult({
          requestId,
          posts: [],
          count: 0,
          error: "Something went wrong. Please try again.",
        });
      }
    }

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, [supabase, slug, filter, page, requestId]);

  const current =
    result?.requestId === requestId ? result : null;

  if (!current) {
    return (
      <p role="status" className="text-gray-500">
        Loading posts...
      </p>
    );
  }

  if (current.error) {
    return (
      <div role="alert" className="rounded-lg border bg-white p-5">
        <p className="text-red-600">{current.error}</p>

        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="mt-3 rounded-md border px-4 py-2 text-gray-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-live="polite">
      <p className="text-sm text-gray-500">
        {current.count} posts found
      </p>

      {current.posts.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-gray-500">
          {filter
            ? "No matching posts found."
            : "No posts yet."}
        </div>
      ) : (
        current.posts.map((post) => (
          <article
            key={post.id}
            className="rounded-lg border bg-white p-5"
          >
            {post.tag && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-600">
                {post.tag}
              </span>
            )}

            <h3 className="mt-3 text-lg font-semibold text-gray-900">
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

      {current.count > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((value) => value - 1)}
            className="rounded border px-4 py-2 disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm text-gray-500">
            Page {page + 1}
          </span>

          <button
            type="button"
            disabled={
              (page + 1) * PAGE_SIZE >= current.count
            }
            onClick={() => setPage((value) => value + 1)}
            className="rounded border px-4 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
