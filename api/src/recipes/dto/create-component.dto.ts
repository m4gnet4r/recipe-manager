import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateIf } from 'class-validator';

export class CreateComponentDto {
  @IsIn(['ingredient', 'recipe'])
  kind!: 'ingredient' | 'recipe';

  @ValidateIf((o: CreateComponentDto) => o.kind === 'ingredient')
  @IsUUID()
  ingredientId?: string;

  @ValidateIf((o: CreateComponentDto) => o.kind === 'ingredient')
  @IsIn(['g', 'ml', 'piece'])
  unitCode?: string;

  @ValidateIf((o: CreateComponentDto) => o.kind === 'recipe')
  @IsUUID()
  childRecipeId?: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
