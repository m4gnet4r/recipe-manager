import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const UNIT_CODES = ['g', 'ml', 'piece'] as const;

export class CreateIngredientDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsIn(UNIT_CODES)
  defaultUnitCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsBoolean()
  isVegan?: boolean;

  @IsOptional()
  @IsBoolean()
  isVegetarian?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  kcalPerUnit?: number;
}
