import {
  Controller, Get, Post, Body, Param, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place order (not guest)' })
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.service.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get user's orders (paginated)" })
  findAll(@CurrentUser() user: User, @Query() query: OrderQueryDto) {
    return this.service.findAllByUser(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(id, user.id);
  }
}
