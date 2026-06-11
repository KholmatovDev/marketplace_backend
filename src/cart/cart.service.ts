import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { AddToCartDto, UpdateCartItemDto, SyncCartDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private readonly itemRepo: Repository<CartItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { userId },
      relations: { items: { product: { images: true } } },
    });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ userId }));
      cart.items = [];
    }
    return cart;
  }

  async getCart(userId: string) {
    return this.getOrCreateCart(userId);
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const cart = await this.getOrCreateCart(userId);
    const product = await this.productRepo.findOne({ where: { id: dto.productId, isActive: true } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.stock < dto.quantity) {
      throw new BadRequestException(`Only ${product.stock} items in stock`);
    }

    let item = await this.itemRepo.findOne({
      where: { cartId: cart.id, productId: dto.productId },
    });

    if (item) {
      const newQty = item.quantity + dto.quantity;
      if (product.stock < newQty) {
        throw new BadRequestException(`Only ${product.stock} items in stock`);
      }
      item.quantity = newQty;
      await this.itemRepo.save(item);
    } else {
      await this.itemRepo.save(
        this.itemRepo.create({ cartId: cart.id, productId: dto.productId, quantity: dto.quantity }),
      );
    }

    return this.getOrCreateCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.itemRepo.findOne({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Cart item not found');

    if (dto.quantity === 0) {
      await this.itemRepo.remove(item);
    } else {
      item.quantity = dto.quantity;
      await this.itemRepo.save(item);
    }

    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.itemRepo.findOne({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.itemRepo.remove(item);
    return this.getOrCreateCart(userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.itemRepo.delete({ cartId: cart.id });
    return { message: 'Cart cleared' };
  }

  async sync(userId: string, dto: SyncCartDto) {
    const cart = await this.getOrCreateCart(userId);

    for (const syncItem of dto.items) {
      const product = await this.productRepo.findOne({
        where: { id: syncItem.productId, isActive: true },
      });
      if (!product || product.stock === 0) continue;

      const quantity = Math.min(syncItem.quantity, product.stock);
      const existing = await this.itemRepo.findOne({
        where: { cartId: cart.id, productId: syncItem.productId },
      });

      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, product.stock);
        await this.itemRepo.save(existing);
      } else {
        await this.itemRepo.save(
          this.itemRepo.create({ cartId: cart.id, productId: syncItem.productId, quantity }),
        );
      }
    }

    return this.getOrCreateCart(userId);
  }

  async clearCartByUserId(userId: string) {
    const cart = await this.cartRepo.findOne({ where: { userId } });
    if (cart) await this.itemRepo.delete({ cartId: cart.id });
  }
}
