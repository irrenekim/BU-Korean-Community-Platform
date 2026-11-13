"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { categories } from "@/lib/categories";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Keep track of who is logged in, and update when they log in/out.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          Korean Community <span className="text-red-600">@BU</span>
        </Link>

        <div className="flex gap-4">
          {categories.map((cat) => {
            const active = pathname.startsWith(`/${cat.slug}`);
            return (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className={
                  active
                    ? "border-b-2 border-red-600 font-semibold text-red-600"
                    : "text-gray-600 hover:text-black"
                }
              >
                {cat.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden text-gray-500 sm:inline">{user.email}</span>
              <button
                onClick={handleLogout}
                className="rounded border px-3 py-1 hover:bg-gray-100"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
