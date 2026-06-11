import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto, SyncCartDto } from './dto/cart.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart with items' })
  getCart(@CurrentUser() user: User) {
    return this.service.getCart(user.id);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add item to cart or increment quantity' })
  addItem(@CurrentUser() user: User, @Body() dto: AddToCartDto) {
    return this.service.addItem(user.id, dto);
  }

  @Patch(':itemId')
  @ApiOperation({ summary: 'Update cart item quantity (0 = remove)' })
  updateItem(
    @CurrentUser() user: User,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.service.updateItem(user.id, itemId, dto);
  }

  @Delete('remove/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(
    @CurrentUser() user: User,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.service.removeItem(user.id, itemId);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear all items in cart' })
  clearCart(@CurrentUser() user: User) {
    return this.service.clear(user.id);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync guest local cart with server cart on login' })
  syncCart(@CurrentUser() user: User, @Body() dto: SyncCartDto) {
    return this.service.sync(user.id, dto);
  }
}
