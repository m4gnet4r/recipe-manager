import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

const componentInclude = {
  ingredient: true,
  childRecipe: { select: { id: true, name: true, servings: true } },
} satisfies Prisma.RecipeComponentInclude;

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: GraphService,
  ) {}

  async list(opts: { q?: string; category?: string; dietType?: string; viewerId?: string }) {
    const { q, category, dietType, viewerId } = opts;
    return this.prisma.recipe.findMany({
      where: {
        AND: [
          q ? { name: { contains: q, mode: 'insensitive' } } : {},
          category ? { category } : {},
          dietType ? { dietType } : {},
          viewerId ? { OR: [{ isPublic: true }, { ownerId: viewerId }] } : { isPublic: true },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        servings: true,
        category: true,
        difficulty: true,
        dietType: true,
        prepMin: true,
        cookMin: true,
        isPublic: true,
        ownerId: true,
        updatedAt: true,
      },
    });
  }

  /** Distinct, non-empty category values across all recipes — powers the
   *  category typeahead on the create/edit form and the browse-page filter. */
  async listCategories(): Promise<string[]> {
    const rows = await this.prisma.recipe.findMany({
      where: { category: { not: null } },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category!).filter(Boolean);
  }

  /** Shallow fetch: the recipe plus its direct components only. */
  async getShallow(id: string, viewerId?: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: { components: { orderBy: { position: 'asc' }, include: componentInclude } },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (!recipe.isPublic && recipe.ownerId !== viewerId) {
      throw new ForbiddenException('This recipe is private');
    }
    return recipe;
  }

  async getTree(id: string, viewerId?: string) {
    await this.getShallow(id, viewerId); // visibility + existence check
    return this.graph.getTree(id);
  }

  async getExpansion(id: string, servings?: number, viewerId?: string) {
    await this.getShallow(id, viewerId);
    return this.graph.expand(id, servings);
  }

  async getDependents(id: string, viewerId?: string) {
    await this.getShallow(id, viewerId);
    return this.graph.getDependents(id);
  }

  private async assertOwner(id: string, ownerId: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.ownerId !== ownerId) throw new ForbiddenException('You do not own this recipe');
    return recipe;
  }

  async create(ownerId: string, dto: CreateRecipeDto) {
    const existing = await this.prisma.recipe.findUnique({
      where: { ownerId_name: { ownerId, name: dto.name } },
    });
    if (existing) throw new ConflictException('You already have a recipe with this name');
    return this.prisma.recipe.create({ data: { ...dto, ownerId } });
  }

  async update(id: string, ownerId: string, dto: UpdateRecipeDto) {
    await this.assertOwner(id, ownerId);
    return this.prisma.recipe.update({ where: { id }, data: dto });
  }

  async remove(id: string, ownerId: string) {
    await this.assertOwner(id, ownerId);
    try {
      await this.prisma.recipe.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        const dependents = await this.graph.getDependents(id);
        throw new ConflictException({
          message: 'Cannot delete: this recipe is used as a component by other recipes',
          dependents,
        });
      }
      throw e;
    }
    return { success: true };
  }

  async addComponent(recipeId: string, ownerId: string, dto: CreateComponentDto) {
    await this.assertOwner(recipeId, ownerId);

    if (dto.kind === 'ingredient') {
      if (!dto.ingredientId || !dto.unitCode) {
        throw new BadRequestException('ingredientId and unitCode are required for ingredient components');
      }
      const ingredient = await this.prisma.ingredient.findUnique({ where: { id: dto.ingredientId } });
      if (!ingredient) throw new NotFoundException('Ingredient not found');

      const position = await this.nextPosition(recipeId);
      return this.prisma.recipeComponent.create({
        data: {
          parentId: recipeId,
          kind: 'ingredient',
          ingredientId: dto.ingredientId,
          quantity: dto.quantity,
          unitCode: dto.unitCode,
          note: dto.note,
          position,
        },
        include: componentInclude,
      });
    }

    // kind === 'recipe'
    if (!dto.childRecipeId) {
      throw new BadRequestException('childRecipeId is required for recipe components');
    }
    const childRecipe = await this.prisma.recipe.findUnique({ where: { id: dto.childRecipeId } });
    if (!childRecipe) throw new NotFoundException('Sub-recipe not found');
    if (dto.childRecipeId === recipeId) {
      throw new ConflictException('A recipe cannot use itself as a component');
    }

    const cyclic = await this.graph.wouldCreateCycle(recipeId, dto.childRecipeId);
    if (cyclic) {
      throw new ConflictException(
        `Adding "${childRecipe.name}" here would create a circular dependency`,
      );
    }

    const position = await this.nextPosition(recipeId);
    return this.prisma.recipeComponent.create({
      data: {
        parentId: recipeId,
        kind: 'recipe',
        childRecipeId: dto.childRecipeId,
        quantity: dto.quantity,
        note: dto.note,
        position,
      },
      include: componentInclude,
    });
  }

  async updateComponent(recipeId: string, componentId: string, ownerId: string, dto: UpdateComponentDto) {
    await this.assertOwner(recipeId, ownerId);
    const component = await this.prisma.recipeComponent.findUnique({ where: { id: componentId } });
    if (!component || component.parentId !== recipeId) {
      throw new NotFoundException('Component not found on this recipe');
    }
    return this.prisma.recipeComponent.update({
      where: { id: componentId },
      data: dto,
      include: componentInclude,
    });
  }

  async removeComponent(recipeId: string, componentId: string, ownerId: string) {
    await this.assertOwner(recipeId, ownerId);
    const component = await this.prisma.recipeComponent.findUnique({ where: { id: componentId } });
    if (!component || component.parentId !== recipeId) {
      throw new NotFoundException('Component not found on this recipe');
    }
    await this.prisma.recipeComponent.delete({ where: { id: componentId } });
    return { success: true };
  }

  private async nextPosition(recipeId: string) {
    const last = await this.prisma.recipeComponent.findFirst({
      where: { parentId: recipeId },
      orderBy: { position: 'desc' },
    });
    return (last?.position ?? -1) + 1;
  }
}
