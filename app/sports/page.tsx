import { CategoryHeader } from "@/components/CategoryPage";
import SportsTabs from "./SportsTabs";

export default function SportsPage() {
  return (
    <main className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[960px]">
        <CategoryHeader slug="sports" />
        <SportsTabs />
      </div>
    </main>
  );
}
