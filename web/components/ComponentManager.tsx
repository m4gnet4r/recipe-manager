'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { RecipeDetail, Ingredient, RecipeSummary } from '../lib/types';

const UNITS = ['g', 'ml', 'piece'];

export function ComponentManager({ recipe }: { recipe: RecipeDetail }) {
  const queryClient = useQueryClient();
  const [pickerTab, setPickerTab] = useState<'ingredient' | 'recipe'>('ingredient');
  const [search, setSearch] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('g');
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['recipe', recipe.id] });
  }

  const ingredientResults = useQuery({
    queryKey: ['ingredient-search', search],
    queryFn: () => api.get<Ingredient[]>(`/ingredients?q=${encodeURIComponent(search)}`),
    enabled: pickerTab === 'ingredient' && search.length > 0,
  });

  const recipeResults = useQuery({
    queryKey: ['recipe-search', search],
    queryFn: () => api.get<RecipeSummary[]>(`/recipes?q=${encodeURIComponent(search)}`),
    enabled: pickerTab === 'recipe' && search.length > 0,
  });

  async function createAndAddIngredient() {
    const name = search.trim();
    if (!name) return;
    if (!quantity || quantity <= 0) {
      setError('Enter a quantity first');
      return;
    }
    setError(null);
    try {
      const created = await api.post<Ingredient>('/ingredients', {
        name,
        defaultUnitCode: unit,
      });
      await addIngredient(created);
      queryClient.invalidateQueries({ queryKey: ['ingredient-search'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create ingredient');
    }
  }

  async function addIngredient(ingredient: Ingredient) {
    if (!quantity || quantity <= 0) {
      setError('Enter a quantity first');
      return;
    }
    setError(null);
    try {
      await api.post(`/recipes/${recipe.id}/components`, {
        kind: 'ingredient',
        ingredientId: ingredient.id,
        unitCode: unit,
        quantity,
      });
      setSearch('');
      setQuantity('');
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to add ingredient');
    }
  }

  async function addSubRecipe(sub: RecipeSummary) {
    if (!quantity || quantity <= 0) {
      setError('Enter how many servings of this sub-recipe are used');
      return;
    }
    if (sub.id === recipe.id) {
      setError('A recipe cannot use itself as a component');
      return;
    }
    setError(null);
    try {
      await api.post(`/recipes/${recipe.id}/components`, {
        kind: 'recipe',
        childRecipeId: sub.id,
        quantity,
      });
      setSearch('');
      setQuantity('');
      refresh();
    } catch (e) {
      // Surfaces the backend's circular-dependency / ownership errors directly.
      setError(e instanceof ApiError ? e.message : 'Failed to add sub-recipe');
    }
  }

  async function removeComponent(componentId: string) {
    try {
      await api.delete(`/recipes/${recipe.id}/components/${componentId}`);
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to remove component');
    }
  }

  async function updateQuantity(componentId: string, nextQuantity: number) {
    try {
      await api.put(`/recipes/${recipe.id}/components/${componentId}`, { quantity: nextQuantity });
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update quantity');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-neutral-700">Current components</h2>
        {recipe.components.length === 0 && (
          <p className="mt-2 text-sm text-neutral-500">No components yet — add one below.</p>
        )}
        <ul className="mt-2 divide-y divide-amber-50 rounded border border-amber-100 bg-white">
          {recipe.components.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                    c.kind === 'recipe' ? 'bg-blue-50 text-blue-700' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {c.kind}
                </span>
                <span>{c.kind === 'ingredient' ? c.ingredient?.name : c.childRecipe?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.0001}
                  step="any"
                  defaultValue={Number(c.quantity)}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0 && v !== Number(c.quantity)) updateQuantity(c.id, v);
                  }}
                  className="w-20 rounded border border-amber-200 px-2 py-1 font-mono text-xs"
                />
                {c.unitCode && <span className="text-xs text-neutral-500">{c.unitCode}</span>}
                {c.kind === 'recipe' && <span className="text-xs text-neutral-500">serving(s)</span>}
                <button
                  onClick={() => removeComponent(c.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded border border-amber-100 bg-white p-3">
        <h2 className="text-sm font-semibold text-neutral-700">Add a component</h2>
        <div className="mt-2 flex gap-1 text-sm">
          <button
            onClick={() => {
              setPickerTab('ingredient');
              setSearch('');
            }}
            className={`rounded-full px-3 py-1 ${pickerTab === 'ingredient' ? 'bg-orange-500 text-white' : 'bg-amber-50 text-neutral-600'}`}
          >
            Ingredient
          </button>
          <button
            onClick={() => {
              setPickerTab('recipe');
              setSearch('');
            }}
            className={`rounded-full px-3 py-1 ${pickerTab === 'recipe' ? 'bg-orange-500 text-white' : 'bg-amber-50 text-neutral-600'}`}
          >
            Existing recipe
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            placeholder={pickerTab === 'ingredient' ? 'Search ingredients...' : 'Search recipes...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[180px] flex-1 rounded border border-amber-200 px-3 py-1.5 text-sm"
          />
          <input
            type="number"
            min={0.0001}
            step="any"
            placeholder="qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
            className="w-20 rounded border border-amber-200 px-2 py-1.5 text-sm"
          />
          {pickerTab === 'ingredient' && (
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="rounded border border-amber-200 px-2 py-1.5 text-sm"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          )}
          {pickerTab === 'recipe' && <span className="text-xs text-neutral-500">serving(s) consumed</span>}
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {pickerTab === 'ingredient' && search && (
          <ul className="mt-2 max-h-48 divide-y divide-amber-50 overflow-y-auto rounded border border-amber-100">
            {ingredientResults.data?.map((ing) => (
              <li key={ing.id}>
                <button
                  onClick={() => addIngredient(ing)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                >
                  <span>{ing.name}</span>
                  <span className="text-xs text-neutral-400">default: {ing.defaultUnitCode}</span>
                </button>
              </li>
            ))}
            {ingredientResults.data?.length === 0 && (
              <li className="px-3 py-2 text-sm text-neutral-500">No matches.</li>
            )}
            {/* Not in the catalogue yet — offer to create it on the fly,
                using whatever unit is currently selected, rather than
                forcing the user to leave the recipe form. */}
            {ingredientResults.data &&
              !ingredientResults.data.some((ing) => ing.name.toLowerCase() === search.trim().toLowerCase()) && (
                <li>
                  <button
                    onClick={createAndAddIngredient}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
                  >
                    <span className="text-base leading-none">+</span>
                    <span>
                      Add &quot;{search.trim()}&quot; as a new ingredient ({unit})
                    </span>
                  </button>
                </li>
              )}
          </ul>
        )}

        {pickerTab === 'recipe' && search && (
          <ul className="mt-2 max-h-48 divide-y divide-amber-50 overflow-y-auto rounded border border-amber-100">
            {recipeResults.data
              ?.filter((r) => r.id !== recipe.id)
              .map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => addSubRecipe(r)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  >
                    <span>{r.name}</span>
                    <span className="text-xs text-neutral-400">serves {r.servings}</span>
                  </button>
                </li>
              ))}
            {recipeResults.data?.length === 0 && (
              <li className="px-3 py-2 text-sm text-neutral-500">No matches.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
