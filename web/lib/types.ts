export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export type DietType = 'vegetarian' | 'non-vegetarian' | 'vegan';

export interface RecipeSummary {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  category: string | null;
  difficulty: string | null;
  dietType: DietType | null;
  prepMin: number | null;
  cookMin: number | null;
  isPublic: boolean;
  ownerId: string;
  updatedAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  defaultUnitCode: string;
  category?: string | null;
  isVegan?: boolean | null;
  isVegetarian?: boolean | null;
}

export interface RecipeComponent {
  id: string;
  kind: 'ingredient' | 'recipe';
  quantity: string | number;
  unitCode: string | null;
  note: string | null;
  ingredient: Ingredient | null;
  childRecipe: { id: string; name: string; servings: number } | null;
}

export interface RecipeDetail extends RecipeSummary {
  components: RecipeComponent[];
}

export interface TreeNode {
  componentId: string | null;
  kind: 'ingredient' | 'recipe';
  id: string;
  name: string;
  quantity: number | null;
  unitCode: string | null;
  servings?: number;
  children?: TreeNode[];
  truncatedCycle?: boolean;
}

export interface ExpandedIngredient {
  ingredientId: string;
  name: string;
  unitCode: string;
  totalQuantity: number;
  estimatedCost: number | null;
  estimatedKcal: number | null;
}

export interface ExpansionTotals {
  totalCost: number | null;
  totalKcal: number | null;
  totalPrepMin: number;
  totalCookMin: number;
}

export interface ExpansionResult {
  ingredients: ExpandedIngredient[];
  totals: ExpansionTotals;
}

export interface DependentRecipe {
  id: string;
  name: string;
  direct: boolean;
}
