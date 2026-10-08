import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

type MaybeUser = { id: string; email: string } | undefined;

@ApiTags('recipes')
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @UseGuards(OptionalAuthGuard)
  @Get()
  list(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('dietType') dietType?: string,
    @CurrentUser() user?: MaybeUser,
  ) {
    return this.recipes.list({ q, category, dietType, viewerId: user?.id });
  }

  /** Distinct category list, for the browse-page filter and the create-recipe
   *  category typeahead. Declared before `:id` so it isn't swallowed by it. */
  @Get('meta/categories')
  listCategories() {
    return this.recipes.listCategories();
  }

  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  getShallow(@Param('id') id: string, @CurrentUser() user?: MaybeUser) {
    return this.recipes.getShallow(id, user?.id);
  }

  /** Full nested composition — the Recipe Explorer's data source. */
  @UseGuards(OptionalAuthGuard)
  @Get(':id/tree')
  getTree(@Param('id') id: string, @CurrentUser() user?: MaybeUser) {
    return this.recipes.getTree(id, user?.id);
  }

  /** Consolidated ingredient totals, recursively flattened. */
  @UseGuards(OptionalAuthGuard)
  @Get(':id/expand')
  getExpansion(@Param('id') id: string, @CurrentUser() user?: MaybeUser, @Query('servings') servingsRaw?: string) {
    let servings: number | undefined;
    if (servingsRaw !== undefined) {
      servings = Number(servingsRaw);
      if (!Number.isFinite(servings) || servings <= 0) {
        throw new BadRequestException('servings must be a positive number');
      }
    }
    return this.recipes.getExpansion(id, servings, user?.id);
  }

  /** Recipes that use this recipe as a component, directly or transitively. */
  @UseGuards(OptionalAuthGuard)
  @Get(':id/dependents')
  getDependents(@Param('id') id: string, @CurrentUser() user?: MaybeUser) {
    return this.recipes.getDependents(id, user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateRecipeDto) {
    return this.recipes.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: UpdateRecipeDto) {
    return this.recipes.update(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.recipes.remove(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/components')
  addComponent(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateComponentDto,
  ) {
    return this.recipes.addComponent(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/components/:componentId')
  updateComponent(
    @Param('id') id: string,
    @Param('componentId') componentId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateComponentDto,
  ) {
    return this.recipes.updateComponent(id, componentId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/components/:componentId')
  removeComponent(
    @Param('id') id: string,
    @Param('componentId') componentId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.recipes.removeComponent(id, componentId, user.id);
  }
}
