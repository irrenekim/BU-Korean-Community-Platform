// One place to define the three category tabs.
// The navbar, homepage, and category pages all read from this list.
export const categories = [
  {
    slug: "academics",
    label: "Academics",
    emoji: "📚",
    description: "Study partners, notes, and course tips — filter by course or major.",
  },
  {
    slug: "sports",
    label: "Sports",
    emoji: "⚽",
    description: "Pickup games and match viewings — find people to play with.",
  },
  {
    slug: "housing",
    label: "Housing",
    emoji: "🏠",
    description: "Roommates, sublets, and listings — search by neighborhood.",
  },
] as const;

export type CategorySlug = (typeof categories)[number]["slug"];
