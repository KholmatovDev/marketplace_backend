import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite) private readonly repo: Repository<Favorite>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  async findAll(user: User) {
    if (user.isGuest) throw new ForbiddenException('Guests cannot use favorites');
    const favs = await this.repo.find({
      where: { userId: user.id },
      relations: { product: { images: true, category: true } },
      order: { createdAt: 'DESC' },
    });
    return favs.map((f) => ({ ...f.product, isFavorite: true }));
  }

  async add(user: User, productId: string) {
    if (user.isGuest) throw new ForbiddenException('Guests cannot use favorites');

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.repo.findOne({ where: { userId: user.id, productId } });
    if (existing) return { message: 'Already in favorites' };

    await this.repo.save(this.repo.create({ userId: user.id, productId }));
    return { message: 'Added to favorites' };
  }

  async remove(user: User, productId: string) {
    if (user.isGuest) throw new ForbiddenException('Guests cannot use favorites');
    await this.repo.delete({ userId: user.id, productId });
    return { message: 'Removed from favorites' };
  }
}
