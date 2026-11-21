"use client";

import { SignInButton, useSession } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Icon, { type IconName } from "@/components/icons";
import WeekCalendar from "./WeekCalendar";
import FriendsPanel from "./FriendsPanel";
import FindTime from "./FindTime";
import { usePlans } from "./usePlans";

const tabs: { id: "week" | "friends" | "find"; label: string; icon: IconName }[] = [
  { id: "week", label: "My week", icon: "calendar" },
  { id: "find", label: "Find a time", icon: "clock" },
  { id: "friends", label: "Friends", icon: "friends" },
];
type TabId = (typeof tabs)[number]["id"];

export default function PlansTabs() {
  const { isLoaded, session } = useSession();
  if (!isLoaded) return <p role="status" className="muted">Loading…</p>;
  if (!session) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="font-semibold">Log in to plan with friends</p>
        <p className="muted">Add your classes, add friends, and see when everyone’s free.</p>
        <SignInButton mode="modal"><button className="btn-primary">Log in</button></SignInButton>
      </div>
    );
  }
  return <SignedInPlans userId={session.user.id} name={session.user.fullName || session.user.username || "BU student"} />;
}

function SignedInPlans({ userId, name }: { userId: string; name: string }) {
  const [tab, setTab] = useState<TabId>("week");
  const plans = usePlans(userId);

  // Tab lives in the address (#week, #find, #friends); invite links land on Friends.
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === id)) setTab(id as TabId);
      else if (new URLSearchParams(window.location.search).get("add")) setTab("friends");
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function choose(id: TabId) {
    setTab(id);
    history.replaceState(null, "", `${window.location.search}#${id}`);
  }

  const requests = plans.friends?.filter((f) => f.status === "pending" && f.incoming).length ?? 0;

  return (
    <div>
      <div role="tablist" aria-label="Plans sections" className="flex gap-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => choose(t.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 pb-3 text-[15px] transition ${
              tab === t.id ? "border-brand font-bold text-ink" : "border-transparent font-medium text-gray-500 hover:text-ink"
            }`}>
            <Icon name={t.icon} className="h-[18px] w-[18px]" />
            {t.label}
            {t.id === "friends" && requests > 0 && (
              <span className="rounded-full bg-brand px-1.5 text-xs font-bold text-on-brand">{requests}</span>
            )}
          </button>
        ))}
      </div>

      {plans.error && <p role="alert" className="mt-4 rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900">{plans.error}</p>}

      <div role="tabpanel" className="mt-6">
        {!plans.blocks || !plans.friends ? <p role="status" className="muted">Loading your plans…</p> : (
          <>
            {tab === "week" && <WeekCalendar blocks={plans.blocks} events={plans.events} onChange={plans.reload} />}
            {tab === "find" && (
              <FindTime blocks={plans.blocks} events={plans.events}
                friends={plans.friends.filter((f) => f.status === "accepted")} onAddFriends={() => choose("friends")} />
            )}
            {tab === "friends" && (
              <FriendsPanel friends={plans.friends} username={plans.username ?? null} myName={name} onChange={plans.reload} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
