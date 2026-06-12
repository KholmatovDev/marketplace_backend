import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BannersService } from '../banners/banners.service';
import { CreateBannerDto, UpdateBannerDto } from '../banners/dto/banner.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

import { ProductsService } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';

import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { UpdateStockDto } from '../products/dto/update-stock.dto';
import { ProductQueryDto } from '../products/dto/product-query.dto';
import { CreateCategoryDto } from '../categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../categories/dto/update-category.dto';
import { SortCategoryDto } from '../categories/dto/sort-category.dto';
import { OrderQueryDto } from '../orders/dto/order-query.dto';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
    private readonly bannersService: BannersService,
  ) {}

  // ─── Categories ─────────────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List all categories including inactive (Admin)' })
  getAllCategories() {
    return this.categoriesService.findAllAdmin();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category (Admin)' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update category (Admin)' })
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Patch('categories/:id/sort')
  @ApiOperation({ summary: 'Update category sort order (Admin)' })
  sortCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SortCategoryDto,
  ) {
    return this.categoriesService.updateSort(id, dto.sortOrder);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete category (Admin)' })
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.softDelete(id);
  }

  // ─── Products ───────────────────────────────────────────────────────────────

  @Get('products')
  @ApiOperation({ summary: 'List ALL products including inactive (Admin)' })
  findAllProducts(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query, undefined, false);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create product (Admin)' })
  createProduct(@Body() dto: CreateProductDto, @CurrentUser() admin: User) {
    return this.productsService.create(dto, admin.id);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update product (Admin)' })
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Patch('products/:id/stock')
  @ApiOperation({ summary: 'Update product stock (Admin)' })
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.productsService.updateStock(id, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete product (Admin)' })
  deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.softDelete(id);
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'List all orders, filterable by status (Admin)' })
  findAllOrders(@Query() query: OrderQueryDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Full order detail (Admin)' })
  findOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Update order status (Admin)' })
  updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users (Admin)' })
  findAllUsers() {
    return this.usersService.findAll();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by id (Admin)' })
  findUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (Admin)' })
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  // ─── Banners ─────────────────────────────────────────────────────────────────

  @Get('banners')
  @ApiOperation({ summary: 'List all banners (Admin)' })
  findAllBanners() {
    return this.bannersService.findAllAdmin();
  }

  @Post('banners')
  @ApiOperation({ summary: 'Create banner (Admin)' })
  createBanner(@Body() dto: CreateBannerDto) {
    return this.bannersService.create(dto);
  }

  @Patch('banners/:id')
  @ApiOperation({ summary: 'Update banner (Admin)' })
  updateBanner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBannerDto,
  ) {
    return this.bannersService.update(id, dto);
  }

  @Delete('banners/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete banner (Admin)' })
  deleteBanner(@Param('id', ParseUUIDPipe) id: string) {
    return this.bannersService.remove(id);
  }
}
