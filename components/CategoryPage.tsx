import type { ReactNode } from "react";
import CategoryPosts from "./CategoryPosts";
import { categories, type CategorySlug } from "@/lib/categories";

// Shared layout for the Academics / Sports / Housing tabs.
// Week 2: replace the placeholder box with the real post list from Supabase.
export default function CategoryPage({
  slug,
  children,
}: {
  slug: CategorySlug;
  children?: ReactNode;
}) {
  const cat = categories.find((c) => c.slug === slug)!;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {cat.emoji} {cat.label}
          </h1>
          <p className="mt-1 text-gray-600">{cat.description}</p>
        </div>
      </div>

      {children}

      <CategoryPosts slug={slug} />
    </main>
  );
}
