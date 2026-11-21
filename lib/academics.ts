// BU undergraduate schools/colleges and their majors.
// Source: bu.edu/admissions/academics/programs (Nov 2026).
// To add a major, add it to its college's list.
// Academics posts are tagged like "CAS · Economics" or "CAS · Economics · EC 101".

export type College = { code: string; name: string; majors: string[] };

export const COLLEGES: College[] = [
  {
    code: "CAS",
    name: "College of Arts & Sciences",
    majors: [
      "African American & Black Diaspora Studies", "American Studies",
      "Ancient Greek & Latin", "Ancient Greek Language & Culture",
      "Anthropology & Religion", "Anthropology: Biological",
      "Anthropology: Health & Medicine", "Anthropology: Sociocultural",
      "Archaeological & Environmental Science", "Archaeology", "Architectural Studies",
      "Astronomy", "Astronomy & Physics", "Biochemistry & Molecular Biology", "Biology",
      "Biology: Behavioral Biology", "Biology: Cell, Molecular Biology & Genetics",
      "Biology: Ecology & Conservation", "Biology: Neurobiology", "Chemistry",
      "Chemistry & Physics", "Chemistry: Chemical Biology", "Chinese Language & Literature",
      "Cinema & Media Studies", "Classical Civilization", "Classics & Archaeology",
      "Classics & Philosophy", "Classics & Religion", "Comparative Literature",
      "Computer Science", "Computer Science & Economics", "Earth & Environmental Sciences",
      "Economics", "Economics & Mathematics", "English", "Environmental Analysis & Policy",
      "French & Linguistics", "French Studies", "German Language & Literature", "History",
      "History of Art & Architecture", "Holocaust, Genocide & Human Rights Studies",
      "Independent Major", "Italian & Linguistics", "Italian Studies",
      "Japanese & Linguistics", "Japanese Language & Literature",
      "Korean Language & Literature", "Latin Language & Culture", "Linguistics",
      "Linguistics & African Languages", "Linguistics & Computer Science",
      "Linguistics & Philosophy", "Marine Science", "Materials & Nanoscience",
      "Mathematics", "Mathematics & Computer Science", "Mathematics & Mathematics Education",
      "Mathematics & Philosophy", "Mathematics & Physics",
      "Middle Eastern & South Asian Languages & Literatures", "Neuroscience", "Philosophy",
      "Philosophy & Neuroscience", "Philosophy & Physics", "Philosophy & Political Science",
      "Philosophy & Psychology", "Philosophy & Religion", "Physics",
      "Physics & Computer Science", "Political Science", "Psychology", "Religion",
      "Russian Language & Literature", "Science Education", "Sociology", "Spanish",
      "Spanish & Linguistics", "Statistics & Computer Science", "Pre-Med / Pre-Health",
      "Pre-Law",
    ],
  },
  { code: "CDS", name: "Faculty of Computing & Data Sciences", majors: ["Data Science"] },
  {
    code: "Questrom",
    name: "Questrom School of Business",
    majors: [
      "Business Administration (General)", "Accounting", "Business Analytics", "Finance",
      "Global Business", "Information Systems", "Innovation & Entrepreneurship", "Law",
      "Management & Organizations", "Marketing", "Operations & Supply Chain Management",
      "Real Estate", "Strategy",
    ],
  },
  {
    code: "ENG",
    name: "College of Engineering",
    majors: [
      "Biomedical Engineering", "Computer Engineering", "Electrical Engineering",
      "Mechanical Engineering", "Engineering (Undeclared)",
    ],
  },
  {
    code: "COM",
    name: "College of Communication",
    majors: ["Advertising", "Film & Television", "Journalism", "Media Science", "Public Relations"],
  },
  {
    code: "Pardee",
    name: "Pardee School of Global Studies",
    majors: [
      "International Relations", "Asian Studies", "European Studies",
      "Latin American Studies", "Middle East & North Africa Studies",
    ],
  },
  {
    code: "Sargent",
    name: "Sargent College of Health & Rehabilitation Sciences",
    majors: [
      "Behavior & Health", "Health Science", "Human Physiology", "Nutrition",
      "Physical Therapy", "Speech, Language & Hearing Sciences",
      "Linguistics & Speech, Language & Hearing Sciences",
    ],
  },
  {
    code: "CFA",
    name: "College of Fine Arts",
    majors: [
      "Acting", "Art", "Art Education", "Graphic Design", "Painting", "Printmaking",
      "Sculpture", "Music (Performance)", "Music (Nonperformance)", "Music Education",
      "Composition & Theory", "Theatre Arts", "Design & Production", "Stage Management",
    ],
  },
  { code: "CGS", name: "College of General Studies", majors: ["General Studies"] },
  {
    code: "SHA",
    name: "School of Hospitality Administration",
    majors: ["Hospitality Administration", "Hospitality Communications"],
  },
  { code: "Wheelock", name: "Wheelock College of Education", majors: ["Education & Human Development"] },
];

export const SEP = " · ";

// Every college gets an "Undeclared" choice too.
export function majorsOf(code: string): string[] {
  const college = COLLEGES.find((c) => c.code === code);
  return college ? [...college.majors, "Undeclared"] : [];
}

// "CAS · Economics · EC 101" → { college: "CAS", major: "Economics", course: "EC 101" }
export function parseAcademicTag(tag: string) {
  const [college = "", major = "", course = ""] = tag.split(SEP);
  const known = COLLEGES.some((c) => c.code === college);
  return known ? { college, major, course } : { college: "", major: "", course: "" };
}
