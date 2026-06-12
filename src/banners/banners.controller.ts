import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly service: BannersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active banners sorted by sortOrder' })
  findAll() {
    return this.service.findAll();
  }
}
