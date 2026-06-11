import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsInt, IsOptional, IsArray, IsUUID,
  Min, MinLength, IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ example: 'Latest Apple smartphone with titanium frame' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ example: 799.99 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  discountPrice?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ example: ['/uploads/products/img.webp'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
