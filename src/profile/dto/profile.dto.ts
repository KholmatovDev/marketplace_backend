import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsBoolean, MinLength, IsPhoneNumber,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateAddressDto {
  @ApiProperty({ example: 'Home' })
  @IsString()
  title: string;

  @ApiProperty({ example: '123 Main Street, apt 4' })
  @IsString()
  fullAddress: string;

  @ApiProperty({ example: 'Tashkent' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: 'UZ', default: 'UZ' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
