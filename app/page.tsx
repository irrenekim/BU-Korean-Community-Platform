"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, useSession } from "@clerk/nextjs";
import { categories } from "@/lib/categories";
import TodayDashboard from "@/components/TodayDashboard";
import Avatar from "@/components/Avatar";
import Icon from "@/components/icons";

// Example posts for the logged-out intro, so visitors see what the site is for.
const samples = [
  { name: "Irene Kim", when: "12m", tag: "CAS · Economics · EC 101", title: "EC 101 midterm study group, Thursday 7pm at Mugar" },
  { name: "Woojoo", when: "1h", tag: "Soccer", title: "Pickup soccer Sunday at Nickerson, need 4 more" },
  { name: "Soyoung", when: "3h", tag: "Allston", title: "Spring sublet, 1 room, 5 min to West Campus" },
  { name: "Wonwoo", when: "5h", tag: "Questrom · Finance", title: "Anyone taking FE 323 next semester?" },
];

export default function HomePage() {
  const { isLoaded, session } = useSession();
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isLoaded && session && configured) {
    const firstName = session.user.firstName || session.user.fullName?.split(" ")[0] || "there";
    return (
      <main className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[960px]">
          <TodayDashboard firstName={firstName} userId={session.user.id} />
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 lg:px-8 lg:py-14">
      <div className="mx-auto grid max-w-[960px] items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-[40px] font-extrabold leading-[1.1] tracking-tight sm:text-[52px]">
            BU 한인 학생들이<br />모이는 곳
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-gray-600">
            Study groups, pickup games and sublets from Korean students at Boston University, in one feed instead of twenty group chats.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <SignUpButton mode="modal"><button className="btn-primary px-6 py-3 text-base">Join with @bu.edu</button></SignUpButton>
            <SignInButton mode="modal"><button className="btn-secondary px-6 py-3 text-base">Log in</button></SignInButton>
          </div>
          <p className="mt-4 text-sm text-gray-500">Only verified BU emails can join.</p>
        </div>

        {/* What the feed looks like */}
        <div aria-label="Example posts" className="card -rotate-1 divide-y divide-gray-100 overflow-hidden shadow-xl shadow-gray-300/40">
          {samples.map((post) => (
            <div key={post.title} className="flex gap-3 px-5 py-4">
              <Avatar name={post.name} />
              <div className="min-w-0">
                <p className="text-sm"><span className="font-bold">{post.name}</span><span className="ml-2 text-gray-500">{post.when}</span></p>
                <p className="mt-1"><span className="tag">{post.tag}</span></p>
                <p className="mt-1.5 font-bold leading-snug">{post.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-16 grid max-w-[960px] gap-3 md:grid-cols-3">
        {categories.map((cat) => (
          <Link key={cat.slug} href={`/${cat.slug}`} className="card flex items-start gap-4 p-5 transition hover:ring-gray-300">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Icon name={cat.slug} className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-bold">{cat.label}</span>
              <span className="mt-0.5 block text-sm text-gray-600">{cat.description.split(" — ")[0]}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
