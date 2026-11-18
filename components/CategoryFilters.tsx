
"use client";

import { useState } from "react";
import type { CategorySlug } from "@/lib/categories";

const FILTERS = {
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
    options: [
      "Soccer",
      "Basketball",
      "Tennis",
      "Volleyball",
      "Badminton",
    ],
  },
  housing: {
    label: "Neighborhood",
    options: [
      "Allston",
      "Fenway",
      "Brookline",
      "Brighton",
      "South Campus",
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
