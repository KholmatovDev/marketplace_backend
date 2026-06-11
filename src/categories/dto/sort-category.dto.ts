import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SortCategoryDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder: number;
}
