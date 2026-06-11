import {
  Controller, Get, Post, Body, Param, Query,
  ParseUUIDPipe, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateReviewDto } from './dto/review.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List active products (public, isFavorite if JWT provided)' })
  findAll(@Query() query: ProductQueryDto, @Request() req: any) {
    return this.service.findAll(query, req.user?.id, true);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get product detail (public, isFavorite if JWT provided)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.findOne(id, req.user?.id, true);
  }

  @Public()
  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get paginated reviews for product' })
  getReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.service.getReviews(id, pagination);
  }

  @Post(':id/reviews')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add review (JWT required, not guest)' })
  addReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: User,
  ) {
    return this.service.addReview(id, user, dto);
  }
}
