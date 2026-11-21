"use client";

import { SignInButton, useSession } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import CategoryPosts from "@/components/CategoryPosts";
import SportsEvents from "./SportsEvents";
import TimePolls from "./TimePolls";
import Icon, { type IconName } from "@/components/icons";

// Sports is split into three tabs instead of one long page.
// The tab is kept in the address (#events, #find-a-time, #posts) so links and Back work.
const tabs: { id: "events" | "find-a-time" | "posts"; label: string; icon: IconName }[] = [
  { id: "events", label: "Events", icon: "calendar" },
  { id: "find-a-time", label: "Find a time", icon: "clock" },
  { id: "posts", label: "Posts", icon: "comment" },
];
type TabId = (typeof tabs)[number]["id"];

export default function SportsTabs() {
  const [tab, setTab] = useState<TabId>("events");

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === id)) setTab(id as TabId);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function choose(id: TabId) {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <div>
      <div role="tablist" aria-label="Sports sections" className="flex gap-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`} onClick={() => choose(t.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 pb-3 text-[15px] transition ${
              tab === t.id ? "border-brand font-bold text-ink" : "border-transparent font-medium text-gray-500 hover:text-ink"
            }`}>
            <Icon name={t.icon} className="h-[18px] w-[18px]" />
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6">
        {tab === "events" && <SportsEvents />}
        {tab === "find-a-time" && <PollsTab />}
        {tab === "posts" && <CategoryPosts slug="sports" />}
      </div>
    </div>
  );
}

function PollsTab() {
  const { isLoaded, session } = useSession();
  if (!isLoaded) return <p role="status" className="muted">Loading…</p>;
  if (!session) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="font-semibold">Log in to find a time with other students</p>
        <SignInButton mode="modal"><button className="btn-primary">Log in</button></SignInButton>
      </div>
    );
  }
  return <TimePolls userId={session.user.id} />;
}
