import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@ApiTags('ingredients')
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredients: IngredientsService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.ingredients.list(q);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.ingredients.get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateIngredientDto) {
    return this.ingredients.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    return this.ingredients.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ingredients.remove(id);
  }
}
