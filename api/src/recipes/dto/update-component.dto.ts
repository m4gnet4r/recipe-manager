import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateComponentDto {
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  quantity?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
