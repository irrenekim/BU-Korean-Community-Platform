"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Icon, { type IconName } from "./icons";

// The app frame around every page:
// big screens get a menu on the left; phones get a top bar and tabs at the bottom.

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/academics", label: "Academics", icon: "academics" },
  { href: "/sports", label: "Sports", icon: "sports" },
  { href: "/housing", label: "Housing", icon: "housing" },
  { href: "/plans", label: "Plans", icon: "calendar" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-base font-extrabold text-on-brand">한</span>
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold tracking-tight text-ink">Korean Community</span>
        <span className="block text-xs font-medium text-gray-500">Boston University</span>
      </span>
    </Link>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Remember which page they were on, so the form can pre-pick it.
  const feedbackHref = pathname.startsWith("/feedback") ? "/feedback" : `/feedback?from=${encodeURIComponent(pathname)}`;

  return (
    <div className="mx-auto flex min-h-screen max-w-[1260px]">
      {/* Left menu (laptops and up) */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-6 border-r border-gray-200 px-5 py-6 lg:flex">
        <Logo />
        <nav aria-label="Main" className="flex flex-col gap-1">
          {[...links, { href: "/settings", label: "My settings", icon: "settings" as const }].map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] transition ${
                  active ? "bg-white font-bold text-ink shadow-sm ring-1 ring-gray-200" : "font-medium text-gray-600 hover:bg-white/70 hover:text-ink"
                }`}>
                <Icon name={link.icon} className={`h-[22px] w-[22px] ${active ? "text-brand" : ""}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <Link href={feedbackHref} aria-current={pathname.startsWith("/feedback") ? "page" : undefined}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] transition ${
              pathname.startsWith("/feedback") ? "bg-white font-bold text-ink shadow-sm ring-1 ring-gray-200" : "font-medium text-gray-600 hover:bg-white/70 hover:text-ink"
            }`}>
            <Icon name="feedback" className={`h-[22px] w-[22px] ${pathname.startsWith("/feedback") ? "text-brand" : ""}`} />
            Send feedback
          </Link>
          <Show when="signed-out">
            <p className="text-sm text-gray-600">Join with your @bu.edu email to post, comment and RSVP.</p>
            <SignUpButton mode="modal"><button className="btn-primary w-full">Sign up</button></SignUpButton>
            <SignInButton mode="modal"><button className="btn-secondary w-full">Log in</button></SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
              <UserButton />
              <span className="text-sm text-gray-600">Your account</span>
            </div>
          </Show>
          <p className="px-2 text-xs text-gray-400">Made by BU LIKELION</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (phones and tablets) */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-paper/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <Logo />
          <div className="flex items-center gap-2">
            <Link href={feedbackHref} aria-label="Send feedback" title="Send feedback"
              className={`grid h-9 w-9 place-items-center rounded-full ${pathname.startsWith("/feedback") ? "bg-white text-brand ring-1 ring-gray-200" : "text-gray-600 hover:bg-white"}`}>
              <Icon name="feedback" className="h-[22px] w-[22px]" />
            </Link>
            <Show when="signed-out">
              <SignInButton mode="modal"><button className="btn-primary px-3 py-1.5">Log in</button></SignInButton>
            </Show>
            <Show when="signed-in"><UserButton /></Show>
          </div>
        </header>

        <div className="flex-1 pb-24 lg:pb-10">{children}</div>
      </div>

      {/* Bottom tabs (phones and tablets) */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {[...links, { href: "/settings", label: "Me", icon: "settings" as const }].map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "font-bold text-brand" : "font-medium text-gray-500"}`}>
              <Icon name={link.icon} className="h-6 w-6" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
