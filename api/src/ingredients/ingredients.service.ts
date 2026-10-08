import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  list(search?: string) {
    return this.prisma.ingredient.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async get(id: string) {
    const ingredient = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) throw new NotFoundException('Ingredient not found');
    return ingredient;
  }

  async create(dto: CreateIngredientDto) {
    const existing = await this.prisma.ingredient.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('An ingredient with this name already exists');
    return this.prisma.ingredient.create({ data: dto });
  }

  async update(id: string, dto: UpdateIngredientDto) {
    await this.get(id);
    return this.prisma.ingredient.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.get(id);
    const usage = await this.prisma.recipeComponent.count({ where: { ingredientId: id } });
    if (usage > 0) {
      throw new ConflictException(
        `Cannot delete: this ingredient is used in ${usage} recipe component(s)`,
      );
    }
    await this.prisma.ingredient.delete({ where: { id } });
    return { success: true };
  }
}
