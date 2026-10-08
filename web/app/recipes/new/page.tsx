'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { RecipeForm, RecipeFormValues } from '../../../components/RecipeForm';

export default function NewRecipePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleCreate(values: RecipeFormValues) {
    const recipe = await api.post<{ id: string }>('/recipes', {
      name: values.name,
      description: values.description || undefined,
      servings: values.servings,
      prepMin: values.prepMin ? Number(values.prepMin) : undefined,
      cookMin: values.cookMin ? Number(values.cookMin) : undefined,
      difficulty: values.difficulty || undefined,
      category: values.category || undefined,
      dietType: values.dietType || undefined,
      isPublic: values.isPublic,
    });
    queryClient.invalidateQueries({ queryKey: ['recipes'] });
    // Components (ingredients / sub-recipes) are added on the edit page,
    // once the recipe exists and has an id to attach them to.
    router.push(`/recipes/${recipe.id}/edit`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-2">
        <span className="text-3xl" role="img" aria-label="">
          🧑‍🍳
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">New recipe</h1>
          <p className="text-sm text-neutral-500">
            Save the basics first, then add ingredients and sub-recipes on the next screen.
          </p>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <RecipeForm submitLabel="Create & continue" onSubmit={handleCreate} />
      </div>
    </main>
  );
}
