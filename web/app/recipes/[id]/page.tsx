'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import {
  RecipeDetail,
  TreeNode as TreeNodeType,
  ExpansionResult,
  DependentRecipe,
} from '../../../lib/types';
import { TreeNode } from '../../../components/TreeNode';
import { RecipeImage } from '../../../components/RecipeImage';
import { DietBadge } from '../../../components/DietBadge';
import { categoryEmoji } from '../../../lib/category-visuals';

type Tab = 'explorer' | 'expand' | 'dependents';

function StatChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-neutral-800 shadow-sm backdrop-blur-sm">
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('explorer');
  const [servings, setServings] = useState<number | ''>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const recipeQuery = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => api.get<RecipeDetail>(`/recipes/${id}`),
  });

  const treeQuery = useQuery({
    queryKey: ['recipe-tree', id],
    queryFn: () => api.get<TreeNodeType>(`/recipes/${id}/tree`),
    enabled: tab === 'explorer',
  });

  const expandQuery = useQuery({
    queryKey: ['recipe-expand', id, servings],
    queryFn: () =>
      api.get<ExpansionResult>(`/recipes/${id}/expand${servings ? `?servings=${servings}` : ''}`),
  });

  const dependentsQuery = useQuery({
    queryKey: ['recipe-dependents', id],
    queryFn: () => api.get<DependentRecipe[]>(`/recipes/${id}/dependents`),
    enabled: tab === 'dependents',
  });

  if (recipeQuery.isLoading) return <main className="mx-auto max-w-3xl px-4 py-8">Loading...</main>;
  if (recipeQuery.error) {
    const msg = recipeQuery.error instanceof ApiError ? recipeQuery.error.message : 'Failed to load recipe';
    return <main className="mx-auto max-w-3xl px-4 py-8 text-red-600">{msg}</main>;
  }
  const recipe = recipeQuery.data!;
  const isOwner = user?.id === recipe.ownerId;
  const totals = expandQuery.data?.totals;
  const totalTime = totals ? totals.totalPrepMin + totals.totalCookMin : null;

  async function handleDelete() {
    if (!confirm(`Delete "${recipe.name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      await api.delete(`/recipes/${id}`);
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      router.push('/recipes');
    } catch (e) {
      if (e instanceof ApiError) {
        const dependents = (e.body?.dependents as DependentRecipe[] | undefined) ?? [];
        setDeleteError(
          dependents.length
            ? `${e.body.message}: ${dependents.map((d) => d.name).join(', ')}`
            : e.message,
        );
      }
    }
  }

  return (
    <main className="pb-16">
      {/* Hero */}
      <div className="relative h-64 w-full overflow-hidden sm:h-80">
        <RecipeImage id={recipe.id} name={recipe.name} category={recipe.category} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl px-4 pb-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-sm">
              {categoryEmoji(recipe.category)} {recipe.category ?? 'Uncategorized'}
            </span>
            <DietBadge dietType={recipe.dietType} />
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-white drop-shadow-sm sm:text-4xl">
            {recipe.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatChip icon="🍽" label={`Serves ${recipe.servings}`} />
            {recipe.difficulty && <StatChip icon="🎯" label={recipe.difficulty} />}
            {totalTime != null && totalTime > 0 && <StatChip icon="⏱" label={`${totalTime}m total`} />}
            {totals?.totalCost != null && <StatChip icon="💰" label={`~${totals.totalCost.toFixed(2)} cost`} />}
            {totals?.totalKcal != null && <StatChip icon="🔥" label={`~${Math.round(totals.totalKcal)} kcal`} />}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4">
        <div className="flex items-start justify-between gap-4 pt-6">
          {recipe.description && <p className="text-neutral-700">{recipe.description}</p>}
          {isOwner && (
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/recipes/${id}/edit`}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="rounded-full border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}

        <div className="mt-6 flex gap-1 border-b border-amber-100">
          {(['explorer', 'expand', 'dependents'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t === 'explorer' ? 'Explorer' : t === 'expand' ? 'Total ingredients' : 'Used by'}
            </button>
          ))}
        </div>

        {tab === 'explorer' && (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
            {treeQuery.isLoading && <p className="text-neutral-500">Loading tree...</p>}
            {treeQuery.data && <TreeNode node={treeQuery.data} />}
          </div>
        )}

        {tab === 'expand' && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm">
              <label>Servings:</label>
              <input
                type="number"
                min={1}
                placeholder={String(recipe.servings)}
                value={servings}
                onChange={(e) => setServings(e.target.value ? Number(e.target.value) : '')}
                className="w-20 rounded-full border border-amber-200 px-3 py-1"
              />
              <span className="text-neutral-400">(default: {recipe.servings})</span>
            </div>

            {totals && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-orange-50 p-3 text-center">
                  <div className="text-lg font-bold text-orange-700">
                    {totals.totalCost != null ? totals.totalCost.toFixed(2) : '—'}
                  </div>
                  <div className="text-xs text-neutral-500">Est. cost</div>
                </div>
                <div className="rounded-xl bg-red-50 p-3 text-center">
                  <div className="text-lg font-bold text-red-700">
                    {totals.totalKcal != null ? Math.round(totals.totalKcal) : '—'}
                  </div>
                  <div className="text-xs text-neutral-500">Est. kcal</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <div className="text-lg font-bold text-amber-700">{totals.totalPrepMin}m</div>
                  <div className="text-xs text-neutral-500">Total prep</div>
                </div>
                <div className="rounded-xl bg-rose-50 p-3 text-center">
                  <div className="text-lg font-bold text-rose-700">{totals.totalCookMin}m</div>
                  <div className="text-xs text-neutral-500">Total cook</div>
                </div>
              </div>
            )}

            <table className="mt-5 w-full text-sm">
              <thead>
                <tr className="border-b border-amber-100 text-left text-neutral-500">
                  <th className="py-2 font-medium">Ingredient</th>
                  <th className="py-2 font-medium">Total</th>
                  <th className="py-2 font-medium">Cost</th>
                  <th className="py-2 font-medium">Kcal</th>
                </tr>
              </thead>
              <tbody>
                {expandQuery.data?.ingredients.map((i) => (
                  <tr key={`${i.ingredientId}-${i.unitCode}`} className="border-b border-amber-50">
                    <td className="py-2">{i.name}</td>
                    <td className="py-2 font-mono">
                      {i.totalQuantity}
                      {i.unitCode}
                    </td>
                    <td className="py-2 font-mono text-neutral-500">
                      {i.estimatedCost != null ? i.estimatedCost.toFixed(2) : '—'}
                    </td>
                    <td className="py-2 font-mono text-neutral-500">
                      {i.estimatedKcal != null ? Math.round(i.estimatedKcal) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'dependents' && (
          <div className="mt-4">
            {dependentsQuery.data?.length === 0 && (
              <p className="text-neutral-500">No other recipes use this one as a component.</p>
            )}
            <ul className="space-y-2">
              {dependentsQuery.data?.map((d) => (
                <li key={d.id}>
                  <Link href={`/recipes/${d.id}`} className="text-sm hover:underline">
                    {d.name}
                  </Link>
                  {!d.direct && <span className="ml-2 text-xs text-neutral-400">(indirect)</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
