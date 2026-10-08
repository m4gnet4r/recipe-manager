'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RecipeSummary } from '../lib/types';
import { RecipeImage } from '../components/RecipeImage';
import { DietBadge } from '../components/DietBadge';
import { useAuth } from '../lib/auth-context';

export default function HomePage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['recipes', 'home-teaser'],
    queryFn: () => api.get<RecipeSummary[]>('/recipes'),
  });
  const featured = data?.slice(0, 6) ?? [];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-amber-100 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50">
        <div className="pointer-events-none absolute -right-10 -top-10 text-[12rem] opacity-20 sm:text-[16rem]">
          🍲
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <span className="inline-block rounded-full bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-orange-700 shadow-sm">
            Build a dish from dishes
          </span>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-extrabold leading-tight text-neutral-900 sm:text-5xl">
            Cook up something <span className="text-orange-600">delicious</span>, one reusable recipe at a time.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-neutral-700">
            Every dish here can be built from raw ingredients — or from other recipes you&apos;ve already
            perfected. Change the base sauce once, and every dish built on top updates with it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/recipes"
              className="animate-fade-up rounded-full bg-orange-500 px-6 py-3 font-semibold text-white shadow-md shadow-orange-200 transition-transform hover:scale-105 hover:bg-orange-600"
            >
              Browse recipes
            </Link>
            <Link
              href={user ? '/recipes/new' : '/register'}
              className="animate-fade-up rounded-full border border-neutral-300 bg-white px-6 py-3 font-semibold text-neutral-800 shadow-sm transition-transform hover:scale-105 hover:bg-neutral-50"
            >
              {user ? '+ Create a recipe' : "Start cooking — it's free"}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured recipes teaser */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold text-neutral-900">Fresh off the pass</h2>
            <Link href="/recipes" className="text-sm font-medium text-orange-600 hover:underline">
              See all recipes →
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {featured.map((r, i) => (
              <Link
                key={r.id}
                href={`/recipes/${r.id}`}
                className="group animate-fade-up overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative aspect-square w-full overflow-hidden">
                  <RecipeImage
                    id={r.id}
                    name={r.name}
                    category={r.category}
                    width={300}
                    height={300}
                    className="h-full w-full transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute right-1.5 top-1.5">
                    <DietBadge dietType={r.dietType} />
                  </div>
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-neutral-800">{r.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
