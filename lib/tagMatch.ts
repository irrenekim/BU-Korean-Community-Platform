// Does a post's tag match a filter? Same rules as the filter on each tab,
// used to decide who gets a "new post" email.
import type { CategorySlug } from "@/lib/categories";
import { COLLEGES, SEP } from "@/lib/academics";
import { FILTERS } from "@/lib/tagOptions";

export function tagMatchesFilter(category: CategorySlug, filter: string, tag: string | null): boolean {
  if (!tag) return false;
  const [college, major, extra] = filter.split(SEP);
  const isCollege = category === "academics" && COLLEGES.some((c) => c.code === college);

  if (isCollege && !major && !extra) return tag.startsWith(college + SEP);
  if (isCollege && major && !extra) {
    const exact = college + SEP + major;
    return tag === exact || tag.startsWith(exact + SEP);
  }

  const listed = FILTERS[category].allOptions ?? FILTERS[category].options;
  if (filter === "Other" && category !== "academics") {
    return !listed.some((option) => option !== "Other" && option === tag);
  }
  if (category !== "academics" && listed.includes(filter)) return tag === filter;
  return tag.toLowerCase().includes(filter.toLowerCase());
}

// How a filter is shown to people, e.g. "Soccer" or "CAS · Economics".
export function describeFollow(category: CategorySlug, filter: string) {
  const tab = { academics: "Academics", sports: "Sports", housing: "Housing" }[category];
  return `${tab}: ${filter}`;
}
