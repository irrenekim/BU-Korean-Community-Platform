import type { ReactNode } from "react";
import CategoryPosts from "./CategoryPosts";
import Icon from "./icons";
import { categories, type CategorySlug } from "@/lib/categories";

// Page title at the top of Academics / Sports / Housing
export function CategoryHeader({ slug, children }: { slug: CategorySlug; children?: ReactNode }) {
  const cat = categories.find((c) => c.slug === slug)!;
  // The descriptions in lib/categories.ts are written with a dash; show the first half big.
  const [lead, rest] = cat.description.split(" — ");
  return (
    <header className="mb-6 flex items-start gap-4">
      <span className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-brand ring-1 ring-gray-200">
        <Icon name={slug} className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{cat.label}</h1>
        <p className="mt-0.5 text-[15px] text-gray-600">{lead}{rest && <span className="text-gray-500">. {rest[0].toUpperCase() + rest.slice(1)}</span>}</p>
        {children}
      </div>
    </header>
  );
}

// Shared layout for the Academics / Housing tabs (Sports has its own, with tabs).
export default function CategoryPage({ slug }: { slug: CategorySlug }) {
  return (
    <main className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[960px]">
        <CategoryHeader slug={slug} />
        <CategoryPosts slug={slug} />
      </div>
    </main>
  );
}
