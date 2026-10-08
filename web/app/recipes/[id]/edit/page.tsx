'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import { RecipeDetail } from '../../../../lib/types';
import { RecipeForm, RecipeFormValues } from '../../../../components/RecipeForm';
import { ComponentManager } from '../../../../components/ComponentManager';

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const recipeQuery = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => api.get<RecipeDetail>(`/recipes/${id}`),
  });

  async function handleUpdate(values: RecipeFormValues) {
    await api.put(`/recipes/${id}`, {
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
    queryClient.invalidateQueries({ queryKey: ['recipe', id] });
    queryClient.invalidateQueries({ queryKey: ['recipes'] });
  }

  if (authLoading || recipeQuery.isLoading) {
    return <main className="mx-auto max-w-2xl px-4 py-8">Loading...</main>;
  }
  if (recipeQuery.error) {
    const msg = recipeQuery.error instanceof ApiError ? recipeQuery.error.message : 'Failed to load recipe';
    return <main className="mx-auto max-w-2xl px-4 py-8 text-red-600">{msg}</main>;
  }
  const recipe = recipeQuery.data!;

  if (!user || user.id !== recipe.ownerId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-red-600">You don&apos;t have permission to edit this recipe.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-neutral-900">Edit recipe</h1>

      <section className="mt-6 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-700">Details</h2>
        <div className="mt-2">
          <RecipeForm initial={recipe} submitLabel="Save details" onSubmit={handleUpdate} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-700">Components</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Build this recipe from raw ingredients and/or other recipes you (or other users) have already
          created, rather than redefining their contents here.
        </p>
        <div className="mt-2">
          <ComponentManager recipe={recipe} />
        </div>
      </section>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => router.push(`/recipes/${id}`)}
          className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
        >
          Done
        </button>
      </div>
    </main>
  );
}
