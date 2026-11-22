import { Suspense } from "react";
import Icon from "@/components/icons";
import FeedbackForm from "./FeedbackForm";

export const metadata = { title: "Feedback · Korean Community @BU" };

export default function FeedbackPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 lg:py-8">
      <div className="flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white ring-1 ring-gray-200">
          <Icon name="feedback" className="h-7 w-7 text-brand" />
        </span>
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">Feedback</h1>
          <p className="mt-1 text-gray-600">
            Something broken, confusing, or missing? Tell the BU LIKELION team. We read every one.
          </p>
        </div>
      </div>
      <Suspense fallback={<p role="status">Loading…</p>}>
        <FeedbackForm />
      </Suspense>
    </main>
  );
}
