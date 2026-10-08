'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DietType, RecipeSummary } from '../../lib/types';
import { DietBadge } from '../../components/DietBadge';
import { RecipeImage } from '../../components/RecipeImage';
import { categoryEmoji } from '../../lib/category-visuals';

const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'non-vegetarian', label: 'Non-vegetarian' },
];

export default function RecipesPage() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [dietType, setDietType] = useState('');

  const categoriesQuery = useQuery({
    queryKey: ['recipe-categories'],
    queryFn: () => api.get<string[]>('/recipes/meta/categories'),
  });

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (dietType) params.set('dietType', dietType);
  const qs = params.toString();

  const { data, isLoading, error } = useQuery({
    queryKey: ['recipes', q, category, dietType],
    queryFn: () => api.get<RecipeSummary[]>(`/recipes${qs ? `?${qs}` : ''}`),
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-neutral-900">Recipes</h1>
          <p className="mt-1 text-sm text-neutral-500">{data?.length ?? '…'} dishes to explore</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Search recipes..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-56 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-full border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-orange-400"
          >
            <option value="">All categories</option>
            {categoriesQuery.data?.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={dietType}
            onChange={(e) => setDietType(e.target.value)}
            className="rounded-full border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-orange-400"
          >
            <option value="">Any diet</option>
            {DIET_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
              <div className="img-shimmer h-40 w-full animate-shimmer" />
              <div className="space-y-2 p-4">
                <div className="img-shimmer h-4 w-2/3 animate-shimmer rounded" />
                <div className="img-shimmer h-3 w-1/2 animate-shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-6 text-red-600">Failed to load recipes.</p>}

      <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        {data?.map((r, i) => (
          <li key={r.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
            <Link
              href={`/recipes/${r.id}`}
              className="group block h-full overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-100"
            >
              <div className="relative h-40 w-full overflow-hidden">
                <RecipeImage
                  id={r.id}
                  name={r.name}
                  category={r.category}
                  className="h-full w-full transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute right-2 top-2">
                  <DietBadge dietType={r.dietType} />
                </div>
                <div className="absolute bottom-2 left-3">
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-neutral-800 shadow-sm">
                    {categoryEmoji(r.category)} {r.category ?? 'Uncategorized'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="font-display font-semibold text-neutral-900">{r.name}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                  <span>🍽 serves {r.servings}</span>
                  {r.difficulty && <span>· {r.difficulty}</span>}
                  {(r.prepMin || r.cookMin) && (
                    <span>⏱ {(r.prepMin ?? 0) + (r.cookMin ?? 0)}m</span>
                  )}
                </div>
                {r.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{r.description}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {data && data.length === 0 && (
        <p className="mt-10 text-center text-neutral-500">No recipes found{q ? ` for "${q}"` : ''}.</p>
      )}
    </main>
  );
}
