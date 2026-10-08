import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRecipeDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(1)
  servings!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prepMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cookMin?: number;

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsIn(['vegetarian', 'non-vegetarian', 'vegan'])
  dietType?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
