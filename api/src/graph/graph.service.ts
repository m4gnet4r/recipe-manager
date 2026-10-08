import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_DEPTH = 50; // defensive cap; real recipe graphs are nowhere near this

export interface TreeNode {
  componentId: string | null; // null for the root recipe itself
  kind: 'ingredient' | 'recipe';
  id: string; // ingredient id or recipe id
  name: string;
  quantity: number | null;
  unitCode: string | null;
  servings?: number; // present when kind === 'recipe'
  children?: TreeNode[]; // present when kind === 'recipe'
  truncatedCycle?: boolean; // true if this node was cut off to break a cycle
}

export interface ExpandedIngredient {
  ingredientId: string;
  name: string;
  unitCode: string;
  totalQuantity: number;
  /** quantity * ingredient.costPerUnit, rounded; omitted if cost is unset. */
  estimatedCost: number | null;
  /** quantity * ingredient.kcalPerUnit, rounded; omitted if kcal is unset. */
  estimatedKcal: number | null;
}

export interface ExpansionTotals {
  /** Sum of every line's estimatedCost; null if no ingredient in the tree has a cost set. */
  totalCost: number | null;
  /** Sum of every line's estimatedKcal; null if no ingredient in the tree has kcal set. */
  totalKcal: number | null;
  /** Sum of prepMin across every recipe node in the tree (root + every sub-recipe,
   *  once per time it's used) — not just the root recipe's own prep time. */
  totalPrepMin: number;
  /** Same idea as totalPrepMin, for cookMin. */
  totalCookMin: number;
}

export interface ExpansionResult {
  ingredients: ExpandedIngredient[];
  totals: ExpansionTotals;
}

@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * True if adding an edge `parentId -> childRecipeId` would create a cycle,
   * i.e. `parentId` is already reachable by following recipe-type
   * components starting from `childRecipeId`.
   */
  async wouldCreateCycle(parentId: string, childRecipeId: string): Promise<boolean> {
    if (parentId === childRecipeId) return true;

    const visited = new Set<string>();
    const queue: string[] = [childRecipeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === parentId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const components = await this.prisma.recipeComponent.findMany({
        where: { parentId: current, kind: 'recipe' },
        select: { childRecipeId: true },
      });
      for (const c of components) {
        if (c.childRecipeId && !visited.has(c.childRecipeId)) {
          queue.push(c.childRecipeId);
        }
      }
    }
    return false;
  }

  /** All recipes that (directly or transitively) use `recipeId` as a component. */
  async getDependents(recipeId: string): Promise<{ id: string; name: string; direct: boolean }[]> {
    const result = new Map<string, boolean>();
    const visited = new Set<string>();
    const queue: { id: string; direct: boolean }[] = [{ id: recipeId, direct: true }];

    while (queue.length > 0) {
      const { id: current, direct } = queue.shift()!;
      if (visited.has(current) && current !== recipeId) continue;
      visited.add(current);

      const parents = await this.prisma.recipeComponent.findMany({
        where: { childRecipeId: current, kind: 'recipe' },
        select: { parentId: true },
      });
      for (const p of parents) {
        const isDirect = direct && current === recipeId;
        if (!result.has(p.parentId)) {
          result.set(p.parentId, isDirect);
          queue.push({ id: p.parentId, direct: isDirect });
        }
      }
    }

    if (result.size === 0) return [];
    const recipes = await this.prisma.recipe.findMany({
      where: { id: { in: [...result.keys()] } },
      select: { id: true, name: true },
    });
    return recipes.map((r) => ({ ...r, direct: result.get(r.id) ?? false }));
  }

  /** Nested composition tree for the explorer UI, lazily-expandable by the caller. */
  async getTree(recipeId: string, maxDepth = MAX_DEPTH): Promise<TreeNode> {
    const path = new Set<string>();

    const build = async (id: string, depth: number): Promise<TreeNode> => {
      const recipe = await this.prisma.recipe.findUniqueOrThrow({
        where: { id },
        include: {
          components: {
            orderBy: { position: 'asc' },
            include: { ingredient: true, childRecipe: true },
          },
        },
      });

      const node: TreeNode = {
        componentId: null,
        kind: 'recipe',
        id: recipe.id,
        name: recipe.name,
        quantity: null,
        unitCode: null,
        servings: recipe.servings,
        children: [],
      };

      if (path.has(id) || depth >= maxDepth) {
        node.truncatedCycle = path.has(id);
        return node;
      }
      path.add(id);

      for (const c of recipe.components) {
        if (c.kind === 'ingredient' && c.ingredient) {
          node.children!.push({
            componentId: c.id,
            kind: 'ingredient',
            id: c.ingredient.id,
            name: c.ingredient.name,
            quantity: Number(c.quantity),
            unitCode: c.unitCode,
          });
        } else if (c.kind === 'recipe' && c.childRecipe) {
          const childNode = await build(c.childRecipe.id, depth + 1);
          node.children!.push({
            ...childNode,
            componentId: c.id,
            quantity: Number(c.quantity),
          });
        }
      }

      path.delete(id);
      return node;
    };

    return build(recipeId, 0);
  }

  /**
   * Flattens the full recipe composition into consolidated ingredient
   * totals, scaling each sub-recipe by (componentQuantity / childServings),
   * and the whole tree by (targetServings / rootServings). Also rolls up
   * estimated cost, estimated calories, and cumulative prep/cook time
   * across every node visited — all via the same recursive traversal.
   */
  async expand(recipeId: string, targetServings?: number): Promise<ExpansionResult> {
    const root = await this.prisma.recipe.findUniqueOrThrow({ where: { id: recipeId } });
    const rootFactor = targetServings ? targetServings / root.servings : 1;

    const totals = new Map<
      string,
      { name: string; unitCode: string; qty: number; costPerUnit: number | null; kcalPerUnit: number | null }
    >();
    const path = new Set<string>();
    let totalPrepMin = 0;
    let totalCookMin = 0;

    const walk = async (id: string, factor: number, depth: number) => {
      if (path.has(id) || depth >= MAX_DEPTH) return; // cycle guard
      path.add(id);

      const recipe = await this.prisma.recipe.findUnique({
        where: { id },
        select: { prepMin: true, cookMin: true },
      });
      totalPrepMin += recipe?.prepMin ?? 0;
      totalCookMin += recipe?.cookMin ?? 0;

      const components = await this.prisma.recipeComponent.findMany({
        where: { parentId: id },
        include: { ingredient: true, childRecipe: true },
      });

      for (const c of components) {
        if (c.kind === 'ingredient' && c.ingredient && c.unitCode) {
          const key = `${c.ingredient.id}__${c.unitCode}`;
          const existing = totals.get(key);
          const amount = Number(c.quantity) * factor;
          if (existing) {
            existing.qty += amount;
          } else {
            totals.set(key, {
              name: c.ingredient.name,
              unitCode: c.unitCode,
              qty: amount,
              costPerUnit: c.ingredient.costPerUnit != null ? Number(c.ingredient.costPerUnit) : null,
              kcalPerUnit: c.ingredient.kcalPerUnit != null ? Number(c.ingredient.kcalPerUnit) : null,
            });
          }
        } else if (c.kind === 'recipe' && c.childRecipe) {
          const childFactor = (factor * Number(c.quantity)) / c.childRecipe.servings;
          await walk(c.childRecipe.id, childFactor, depth + 1);
        }
      }

      path.delete(id);
    };

    await walk(recipeId, rootFactor, 0);

    const round = (n: number) => Math.round(n * 10_000) / 10_000;

    const ingredients: ExpandedIngredient[] = [...totals.entries()]
      .map(([key, v]) => ({
        ingredientId: key.split('__')[0],
        name: v.name,
        unitCode: v.unitCode,
        totalQuantity: round(v.qty),
        estimatedCost: v.costPerUnit != null ? round(v.qty * v.costPerUnit) : null,
        estimatedKcal: v.kcalPerUnit != null ? round(v.qty * v.kcalPerUnit) : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const costLines = ingredients.filter((i) => i.estimatedCost != null);
    const kcalLines = ingredients.filter((i) => i.estimatedKcal != null);

    return {
      ingredients,
      totals: {
        totalCost: costLines.length ? round(costLines.reduce((s, i) => s + i.estimatedCost!, 0)) : null,
        totalKcal: kcalLines.length ? round(kcalLines.reduce((s, i) => s + i.estimatedKcal!, 0)) : null,
        totalPrepMin,
        totalCookMin,
      },
    };
  }
}
