"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { categories } from "@/lib/categories";

export default function Navbar() {
  const pathname = usePathname();

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

        <div className="ml-auto flex items-center gap-2 text-sm">
          {/* Shown when logged out */}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded border px-3 py-1 hover:bg-gray-100">Log in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700">
                Sign up
              </button>
            </SignUpButton>
          </Show>

          {/* Shown when logged in: profile picture with Manage account / Sign out */}
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}
