import PlansTabs from "./PlansTabs";
import Icon from "@/components/icons";

export default function PlansPage() {
  return (
    <main className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[960px]">
        <header className="mb-6 flex items-start gap-4">
          <span className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-brand ring-1 ring-gray-200">
            <Icon name="calendar" className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Plans</h1>
            <p className="mt-0.5 text-[15px] text-gray-600">Your week, your friends, and when everyone’s free.</p>
          </div>
        </header>
        <PlansTabs />
      </div>
    </main>
  );
}
