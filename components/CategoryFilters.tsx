
"use client";

import { useState } from "react";
import type { CategorySlug } from "@/lib/categories";
import { COLLEGES, SEP, majorsOf } from "@/lib/academics";
import Icon from "./icons";

export { FILTERS, ALL_SPORTS, ALL_NEIGHBORHOODS } from "@/lib/tagOptions";
import { FILTERS } from "@/lib/tagOptions";

// Quick filters: one scrollable row of chips at the top of the feed.
// Academics shows colleges (CAS, Questrom, …); Sports and Housing show the most popular choices.
export function QuickChips({ slug, value, onChange }: {
  slug: CategorySlug;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = slug === "academics" ? COLLEGES.map((c) => c.code) : FILTERS[slug].options;
  const active = slug === "academics" ? value.split(SEP)[0] : value;
  return (
    <div role="group" aria-label={`Filter by ${FILTERS[slug].label.toLowerCase()}`}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {["", ...options].map((option) => (
        <button key={option} type="button" aria-pressed={active === option}
          title={slug === "academics" ? COLLEGES.find((c) => c.code === option)?.name : undefined}
          onClick={() => onChange(option)}
          className={`chip shrink-0 ${active === option ? "chip-on" : ""}`}>
          {option || "All"}
        </button>
      ))}
    </div>
  );
}

// The detailed filters: free-text search plus the full list (every sport /
// neighborhood) or, on Academics, the majors of the chosen college.
export default function CategoryFilters({
  slug,
  value,
  onChange,
}: {
  slug: CategorySlug;
  value: string;
  onChange: (value: string) => void;
}) {
  const [input, setInput] = useState("");
  const config = FILTERS[slug];
  const [college, major] = value.split(SEP);
  const selectedCollege = COLLEGES.find((c) => c.code === college);

  function apply(next: string) {
    onChange(next.trim());
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(event) => { event.preventDefault(); apply(input); }}>
        <label htmlFor={`filter-${slug}`} className="sr-only">Search {config.label}</label>
        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 focus-within:ring-2 focus-within:ring-brand">
          <Icon name="search" className="h-4 w-4 shrink-0 text-gray-400" />
          <input id={`filter-${slug}`} type="search" value={input} maxLength={100}
            placeholder={slug === "academics" ? "Search a course, e.g. EC 101" : `Search ${config.label.toLowerCase()}s`}
            onChange={(event) => setInput(event.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-gray-500" />
        </div>
      </form>

      {slug === "academics" ? (
        selectedCollege ? (
          <label className="block text-sm">
            <span className="font-semibold">Major in {selectedCollege.code}</span>
            <select value={major ?? ""} onChange={(event) => apply(event.target.value ? college + SEP + event.target.value : college)}
              className="input">
              <option value="">Every {selectedCollege.code} major</option>
              {majorsOf(college).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        ) : (
          <p className="text-sm text-gray-500">Pick a college above to narrow it down to one major.</p>
        )
      ) : config.allOptions && (
        <label className="block text-sm">
          <span className="font-semibold">Every {config.label.toLowerCase()}</span>
          <select value={config.allOptions.includes(value) ? value : ""} onChange={(event) => apply(event.target.value)}
            className="input">
            <option value="">All</option>
            {config.allOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      )}

      {value && (
        <button type="button" onClick={() => { setInput(""); apply(""); }} className="text-sm font-medium text-brand hover:underline">
          Clear filter “{value}”
        </button>
      )}
    </div>
  );
}
