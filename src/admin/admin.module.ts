import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { BannersModule } from '../banners/banners.module';

@Module({
  imports: [ProductsModule, CategoriesModule, OrdersModule, UsersModule, BannersModule],
  controllers: [AdminController],
})
export class AdminModule {}
