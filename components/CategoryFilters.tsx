
"use client";

import { useState } from "react";
import type { CategorySlug } from "@/lib/categories";

// Every sport people can pick when writing a Sports post (A–Z).
// To add one, add it here. "Other" is added automatically.
export const ALL_SPORTS = [
  "American Football", "Archery", "Badminton", "Baseball", "Basketball",
  "Billiards", "Bowling", "Boxing", "Cheerleading", "Climbing / Bouldering",
  "Cricket", "Cycling", "Dance", "Dodgeball", "Esports", "Fencing",
  "Field Hockey", "Figure Skating", "Flag Football", "Frisbee / Ultimate",
  "Futsal", "Golf", "Gym / Weightlifting", "Gymnastics", "Hiking",
  "Ice Hockey", "Ice Skating", "Jiu-Jitsu", "Judo", "Kayaking",
  "Kickboxing", "Lacrosse", "Pickleball", "Pilates", "Rowing", "Rugby",
  "Running", "Sailing", "Skiing", "Snowboarding", "Soccer", "Softball",
  "Squash", "Surfing", "Swimming", "Table Tennis", "Taekwondo", "Tennis",
  "Track & Field", "Volleyball", "Water Polo", "Wrestling", "Yoga",
];

type FilterConfig = {
  label: string;
  options: string[];      // quick filter buttons ("Other" last)
  allOptions?: string[];  // full list for the dropdowns, if longer than the buttons
};

// Shared with the post form (CategoryPosts.tsx), so the dropdown
// people pick from always matches these filter buttons.
export const FILTERS: Record<CategorySlug, FilterConfig> = {
  academics: {
    label: "Course / Major",
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
    // The 6 most popular sports get quick buttons
    options: [
      "Soccer",
      "Basketball",
      "Volleyball",
      "Tennis",
      "Badminton",
      "Running",
      "Other",
    ],
    allOptions: [...ALL_SPORTS, "Other"],
  },
  housing: {
    label: "Neighborhood",
    options: [
      "Allston",
      "Brighton",
      "Fenway",
      "Brookline",
      "Back Bay",
      "South End",
      "Cambridge",
      "South Campus",
      "Other",
    ],
  },
};

export default function CategoryFilters({
  slug,
  value,
  onChange,
}: {
  slug: CategorySlug;
  value: string;
  onChange: (value: string) => void;
}) {
  const [input, setInput] = useState(value);
  const config = FILTERS[slug];

  function applyFilter(next: string) {
    setInput(next);
    onChange(next.trim());
  }

  return (
    <div className="space-y-4 rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
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
          className="mb-2 block text-sm font-medium"
        >
          {config.label}
        </label>

        <div className="flex gap-2">
          <input
            id={`filter-${slug}`}
            type="search"
            value={input}
            maxLength={100}
            placeholder={`Search by ${config.label}`}
            onChange={(event) =>
              setInput(event.target.value)
            }
            className="min-w-0 flex-1 rounded border px-3 py-2"
          />

          <button
            type="submit"
            className="rounded bg-red-700 px-4 py-2 text-white"
          >
            Search
          </button>
        </div>
      </form>

      {config.allOptions && (
        <label className="block text-sm font-medium">
          More {config.label.toLowerCase()}s
          <select
            value={config.allOptions.includes(value) ? value : ""}
            onChange={(event) => applyFilter(event.target.value)}
            className="mt-1 block w-full rounded border px-3 py-2 font-normal sm:w-64"
          >
            <option value="">All</option>
            {config.allOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        {["", ...config.options].map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => applyFilter(option)}
            className={`rounded-full border px-3 py-1 text-sm ${
              value === option
                ? "bg-red-700 text-white"
                : "bg-gray-50 text-gray-700"
            }`}
          >
            {option || "All"}
          </button>
        ))}
      </div>
    </div>
  );
}
