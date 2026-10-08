'use client';

import { useState, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DietType, RecipeDetail } from '../lib/types';

export interface RecipeFormValues {
  name: string;
  description: string;
  servings: number;
  prepMin: string;
  cookMin: string;
  difficulty: string;
  category: string;
  dietType: DietType | '';
  isPublic: boolean;
}

export function RecipeForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<RecipeDetail>;
  submitLabel: string;
  onSubmit: (values: RecipeFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<RecipeFormValues>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    servings: initial?.servings ?? 4,
    prepMin: initial?.prepMin != null ? String(initial.prepMin) : '',
    cookMin: initial?.cookMin != null ? String(initial.cookMin) : '',
    difficulty: initial?.difficulty ?? '',
    category: initial?.category ?? '',
    dietType: (initial?.dietType as DietType) ?? '',
    isPublic: initial?.isPublic ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['recipe-categories'],
    queryFn: () => api.get<string[]>('/recipes/meta/categories'),
  });

  function set<K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          required
          maxLength={150}
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="block text-sm font-medium">Servings</label>
          <input
            type="number"
            min={1}
            required
            value={values.servings}
            onChange={(e) => set('servings', Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Prep (min)</label>
          <input
            type="number"
            min={0}
            value={values.prepMin}
            onChange={(e) => set('prepMin', e.target.value)}
            className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Cook (min)</label>
          <input
            type="number"
            min={0}
            value={values.cookMin}
            onChange={(e) => set('cookMin', e.target.value)}
            className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Difficulty</label>
          <select
            value={values.difficulty}
            onChange={(e) => set('difficulty', e.target.value)}
            className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          >
            <option value="">—</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Category</label>
          <input
            list="recipe-category-options"
            value={values.category}
            onChange={(e) => set('category', e.target.value)}
            placeholder="Start typing or pick an existing one"
            className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          {/* Native typeahead: shows existing categories as you type, but a
              new one can still be typed freely. */}
          <datalist id="recipe-category-options">
            {categoriesQuery.data?.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-sm font-medium">Diet type</label>
          <select
            value={values.dietType}
            onChange={(e) => set('dietType', e.target.value as DietType | '')}
            className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          >
            <option value="">—</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="non-vegetarian">Non-vegetarian</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isPublic}
          onChange={(e) => set('isPublic', e.target.checked)}
        />
        Public (reusable by other users)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-50"
      >
        {busy ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
