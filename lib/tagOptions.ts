// Tag choices for each category, shared by the filters, the post form and the
// follow emails (lib/tagMatch.ts). Plain data, so server code can use it too.
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

// Every neighborhood people can pick when writing a Housing post (A–Z).
export const ALL_NEIGHBORHOODS = [
  "Allston", "Back Bay", "Beacon Hill", "Brighton", "Brookline",
  "Brookline: Coolidge Corner", "Brookline: Brookline Village", "BU Central Campus",
  "BU East Campus", "BU Fenway Campus", "BU South Campus", "BU West Campus",
  "Cambridge", "Charlestown", "Chinatown", "Dorchester", "Downtown", "East Boston",
  "Fenway", "Jamaica Plain", "Kenmore", "Malden", "Medford", "Mission Hill",
  "Newton", "North End", "Quincy", "Roxbury", "Seaport", "Somerville",
  "South Boston", "South End", "Watertown", "West End",
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
    // The 6 most popular areas get quick buttons
    options: ["Allston", "Brighton", "Fenway", "Brookline", "Back Bay", "Cambridge", "Other"],
    allOptions: [...ALL_NEIGHBORHOODS, "Other"],
  },
};
