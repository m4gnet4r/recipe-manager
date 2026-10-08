/**
 * Seeds the database from the provided dataset:
 *   prisma/seed-data/ingredients.json
 *   prisma/seed-data/recipes.json
 *
 * Load order matters:
 *   1. units          (fixed: g / ml / piece — the only units in the dataset)
 *   2. ingredients     (no dependencies)
 *   3. recipes         (shell rows first, so forward-referencing
 *                        recipe->recipe components can resolve)
 *   4. recipe_components (ingredient refs + recipe refs, two-pass)
 *
 * All recipes are seeded under one system/demo user so the dataset is
 * immediately browsable; real users create their own recipes afterwards.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';
import { INGREDIENT_ATTRIBUTES, DEFAULT_ATTRIBUTES } from './seed-data/ingredient-attributes';

const prisma = new PrismaClient();

type RawIngredient = { id: string; name: string; unit: 'g' | 'ml' | 'piece' };
type RawComponent =
  | { type: 'ingredient'; ingredient_id: string; quantity: number; unit: string }
  | { type: 'recipe'; recipe_id: string; quantity?: number };
type RawRecipe = {
  id: string;
  name: string;
  category?: string;
  servings: number;
  description?: string;
  components: RawComponent[];
};

// Resolved relative to the working directory (always the project root,
// /app in the Docker image) rather than __dirname, since this file is
// compiled to dist/prisma/seed.js at build time — __dirname would then
// point at dist/prisma instead of the source prisma/ directory where
// seed-data actually lives.
const DATA_DIR = path.join(process.cwd(), 'prisma', 'seed-data');

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
}

type DietType = 'vegan' | 'vegetarian' | 'non-vegetarian';

/**
 * The provided dataset has no prep/cook time fields, which left the
 * recursive time-rollup feature demonstrating correct-but-trivial zeros.
 * These are illustrative category-based estimates (± a small, deterministic
 * per-recipe jitter so dishes in the same category aren't identical) —
 * not real timings — purely so the rollup has real numbers to sum.
 */
const CATEGORY_TIME_MIN: Record<string, { prep: number; cook: number }> = {
  Sauces: { prep: 10, cook: 15 },
  Indian: { prep: 15, cook: 30 },
  Bakery: { prep: 20, cook: 35 },
  Pasta: { prep: 10, cook: 15 },
  Marinades: { prep: 10, cook: 0 },
  Asian: { prep: 15, cook: 15 },
  Desserts: { prep: 20, cook: 25 },
  Breakfast: { prep: 10, cook: 10 },
  Sides: { prep: 10, cook: 15 },
  Italian: { prep: 15, cook: 20 },
  Rice: { prep: 10, cook: 20 },
  'Main Course': { prep: 20, cook: 30 },
  Specialty: { prep: 15, cook: 20 },
  Meal: { prep: 20, cook: 25 },
};
const DEFAULT_TIME_MIN = { prep: 10, cook: 15 };

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function estimateTimes(id: string, category?: string): { prepMin: number; cookMin: number } {
  const base = (category && CATEGORY_TIME_MIN[category]) || DEFAULT_TIME_MIN;
  const jitter = (hashString(id) % 11) - 5; // -5..+5, deterministic per recipe
  return {
    prepMin: Math.max(5, base.prep + jitter),
    cookMin: Math.max(0, base.cook + jitter),
  };
}

/**
 * Classifies a recipe (by its raw dataset id) by recursively walking its
 * full ingredient closure — including ingredients pulled in via sub-recipes
 * — and taking the "strictest" (worst) classification found: any
 * non-vegetarian ingredient anywhere in the tree makes the whole dish
 * non-vegetarian; otherwise any non-vegan-but-vegetarian ingredient makes
 * it vegetarian; otherwise it's vegan. A recipe with no ingredients at all
 * (empty tree) is left unclassified (null).
 */
function classifyRecipeDiet(
  id: string,
  byId: Map<string, RawRecipe>,
  cache: Map<string, DietType | null>,
  path: Set<string>,
): DietType | null {
  if (cache.has(id)) return cache.get(id)!;
  if (path.has(id)) return null; // cycle guard
  path.add(id);

  const recipe = byId.get(id);
  let worst: DietType = 'vegan';
  let sawAnyIngredient = false;

  for (const c of recipe?.components ?? []) {
    if (c.type === 'ingredient') {
      sawAnyIngredient = true;
      const attrs = INGREDIENT_ATTRIBUTES[c.ingredient_id] ?? DEFAULT_ATTRIBUTES;
      if (!attrs.isVegetarian) worst = 'non-vegetarian';
      else if (!attrs.isVegan && worst !== 'non-vegetarian') worst = 'vegetarian';
    } else {
      const childResult = classifyRecipeDiet(c.recipe_id, byId, cache, path);
      if (childResult) {
        sawAnyIngredient = true;
        if (childResult === 'non-vegetarian') worst = 'non-vegetarian';
        else if (childResult === 'vegetarian' && worst !== 'non-vegetarian') worst = 'vegetarian';
      }
    }
  }

  path.delete(id);
  const result = sawAnyIngredient ? worst : null;
  cache.set(id, result);
  return result;
}

async function main() {
  console.log('Seeding units...');
  await prisma.unit.createMany({
    data: [
      { code: 'g', dimension: 'mass' },
      { code: 'ml', dimension: 'volume' },
      { code: 'piece', dimension: 'count' },
    ],
    skipDuplicates: true,
  });

  console.log('Seeding demo user...');
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@recipes.local' },
    update: {},
    create: {
      email: 'demo@recipes.local',
      passwordHash: await argon2.hash('ChangeMe123!'),
      displayName: 'Demo Seed User',
    },
  });

  const rawIngredients = readJson<RawIngredient[]>('ingredients.json');
  const rawRecipes = readJson<RawRecipe[]>('recipes.json');

  console.log(`Seeding ${rawIngredients.length} ingredients...`);
  // dataset ids (e.g. "ing_tomato") -> our generated UUIDs
  const ingredientIdMap = new Map<string, string>();
  for (const ing of rawIngredients) {
    const attrs = INGREDIENT_ATTRIBUTES[ing.id] ?? DEFAULT_ATTRIBUTES;
    const row = await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: {
        defaultUnitCode: ing.unit,
        costPerUnit: attrs.costPerUnit,
        kcalPerUnit: attrs.kcalPerUnit,
        isVegetarian: attrs.isVegetarian,
        isVegan: attrs.isVegan,
      },
      create: {
        name: ing.name,
        defaultUnitCode: ing.unit,
        costPerUnit: attrs.costPerUnit,
        kcalPerUnit: attrs.kcalPerUnit,
        isVegetarian: attrs.isVegetarian,
        isVegan: attrs.isVegan,
      },
    });
    ingredientIdMap.set(ing.id, row.id);
  }

  console.log(`Seeding ${rawRecipes.length} recipe shells...`);
  const recipeIdMap = new Map<string, string>();
  for (const r of rawRecipes) {
    const { prepMin, cookMin } = estimateTimes(r.id, r.category);
    const row = await prisma.recipe.upsert({
      where: { ownerId_name: { ownerId: demoUser.id, name: r.name } },
      update: {
        description: r.description,
        servings: r.servings,
        category: r.category,
        prepMin,
        cookMin,
        isPublic: true,
      },
      create: {
        ownerId: demoUser.id,
        name: r.name,
        description: r.description,
        servings: r.servings,
        category: r.category,
        prepMin,
        cookMin,
        isPublic: true,
      },
    });
    recipeIdMap.set(r.id, row.id);
  }

  console.log('Seeding recipe components (ingredients + sub-recipes)...');
  for (const r of rawRecipes) {
    const parentId = recipeIdMap.get(r.id)!;
    // clear existing components for idempotent re-seeding
    await prisma.recipeComponent.deleteMany({ where: { parentId } });

    let position = 0;
    for (const c of r.components) {
      if (c.type === 'ingredient') {
        const ingredientId = ingredientIdMap.get(c.ingredient_id);
        if (!ingredientId) {
          console.warn(`  ! unknown ingredient_id ${c.ingredient_id} in recipe ${r.id}, skipping`);
          continue;
        }
        await prisma.recipeComponent.create({
          data: {
            parentId,
            kind: 'ingredient',
            ingredientId,
            quantity: c.quantity,
            unitCode: c.unit,
            position: position++,
          },
        });
      } else {
        const childRecipeId = recipeIdMap.get(c.recipe_id);
        if (!childRecipeId) {
          console.warn(`  ! unknown recipe_id ${c.recipe_id} in recipe ${r.id}, skipping`);
          continue;
        }
        if (childRecipeId === parentId) {
          console.warn(`  ! self-referencing component in recipe ${r.id}, skipping`);
          continue;
        }
        await prisma.recipeComponent.create({
          data: {
            parentId,
            kind: 'recipe',
            childRecipeId,
            quantity: c.quantity ?? 1,
            position: position++,
          },
        });
      }
    }
  }

  console.log('Classifying recipes as vegan / vegetarian / non-vegetarian...');
  const rawRecipeById = new Map(rawRecipes.map((r) => [r.id, r]));
  const dietCache = new Map<string, DietType | null>();
  let classifiedCount = 0;
  for (const r of rawRecipes) {
    const dietType = classifyRecipeDiet(r.id, rawRecipeById, dietCache, new Set());
    if (dietType) {
      await prisma.recipe.update({ where: { id: recipeIdMap.get(r.id)! }, data: { dietType } });
      classifiedCount++;
    }
  }

  console.log('Seed complete.');
  console.log(`  users: 1 (demo@recipes.local / ChangeMe123!)`);
  console.log(`  ingredients: ${rawIngredients.length}`);
  console.log(`  recipes: ${rawRecipes.length} (${classifiedCount} classified by diet type)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
