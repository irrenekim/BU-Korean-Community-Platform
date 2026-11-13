import Link from "next/link";
import { categories } from "@/lib/categories";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <section className="mb-10 text-center">
        <h1 className="text-4xl font-bold">BU 한인 학생 커뮤니티</h1>
        <p className="mt-3 text-lg text-gray-600">
          Academics, sports, and housing — all in one place for Korean students at Boston University.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/${cat.slug}`}
            className="rounded-lg border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-3xl">{cat.emoji}</div>
            <h2 className="mt-2 text-xl font-semibold">{cat.label}</h2>
            <p className="mt-1 text-sm text-gray-600">{cat.description}</p>
          </Link>
        ))}
      </section>

      <p className="mt-10 text-center text-sm text-gray-500">
        Only verified <strong>@bu.edu</strong> emails can join.{" "}
        <Link href="/login" className="text-red-600 underline">
          Log in or sign up
        </Link>
      </p>
    </main>
  );
}
