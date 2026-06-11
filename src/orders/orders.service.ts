import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Address } from '../users/entities/address.entity';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Address) private readonly addressRepo: Repository<Address>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cartService: CartService,
  ) {}

  async create(user: User, dto: CreateOrderDto) {
    if (user.isGuest) throw new ForbiddenException('Guests cannot place orders');

    const address = await this.addressRepo.findOne({
      where: { id: dto.addressId, userId: user.id },
    });
    if (!address) throw new NotFoundException('Address not found');

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      let totalAmount = 0;
      const orderItems: Partial<OrderItem>[] = [];

      for (const item of dto.items) {
        const product = await qr.manager.findOne(Product, {
          where: { id: item.productId, isActive: true },
          relations: { images: true },
        });
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
        if (product.stock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for "${product.title}"`);
        }

        const price = Number(product.discountPrice ?? product.price);
        totalAmount += price * item.quantity;

        orderItems.push({
          productId: product.id,
          productTitle: product.title,
          productImage: product.images?.[0]?.url ?? null,
          price,
          quantity: item.quantity,
        });

        await qr.manager.decrement(Product, { id: product.id }, 'stock', item.quantity);
      }

      const orderNumber = await this.generateOrderNumber(qr.manager);

      const order = qr.manager.create(Order, {
        orderNumber,
        userId: user.id,
        status: OrderStatus.PENDING,
        totalAmount,
        addressId: address.id,
        addressSnapshot: {
          title: address.title,
          fullAddress: address.fullAddress,
          city: address.city,
          country: address.country,
        },
        notes: dto.notes,
        items: orderItems as OrderItem[],
      });

      const saved = await qr.manager.save(Order, order);
      await qr.commitTransaction();
      await this.cartService.clearCartByUserId(user.id);

      return this.findOne(saved.id, user.id);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async findAllByUser(userId: string, query: OrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('order.status = :status', { status: query.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, userId?: string) {
    const where: any = { id };
    if (userId) where.userId = userId;

    const order = await this.orderRepo.findOne({
      where,
      relations: { items: true, address: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAllAdmin(query: OrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('order.status = :status', { status: query.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    await this.orderRepo.update(id, { status: dto.status });
    return this.findOne(id);
  }

  private async generateOrderNumber(manager: any): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `ORD-${dateStr}-`;

    const last = await manager
      .createQueryBuilder(Order, 'o')
      .where('o.orderNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('o.orderNumber', 'DESC')
      .getOne();

    const seq = last
      ? String(parseInt(last.orderNumber.split('-')[2]) + 1).padStart(4, '0')
      : '0001';

    return `${prefix}${seq}`;
  }
}
