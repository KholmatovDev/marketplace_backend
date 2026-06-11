import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Review } from './entities/review.entity';
import { Favorite } from '../favorites/entities/favorite.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CreateReviewDto } from './dto/review.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductImage) private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Favorite) private readonly favoriteRepo: Repository<Favorite>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findAll(query: ProductQueryDto, userId?: string, onlyActive = true) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { category, minPrice, maxPrice, search, sortBy, order } = query;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.category', 'category');

    if (onlyActive) qb.where('product.isActive = :isActive', { isActive: true });

    if (category) {
      qb.andWhere('category.slug = :slug', { slug: category });
    }
    if (minPrice !== undefined) qb.andWhere('product.price >= :minPrice', { minPrice });
    if (maxPrice !== undefined) qb.andWhere('product.price <= :maxPrice', { maxPrice });
    if (search) {
      qb.andWhere(
        '(LOWER(product.title) LIKE :s OR LOWER(product.description) LIKE :s)',
        { s: `%${search.toLowerCase()}%` },
      );
    }

    const sortField = sortBy ?? 'createdAt';
    const sortOrder = order ?? 'DESC';
    qb.orderBy(`product.${sortField}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    const enriched = await this.enrichWithFavorite(items, userId);
    return { items: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, userId?: string, onlyActive = true): Promise<any> {
    const where: any = { id };
    if (onlyActive) where.isActive = true;

    const product = await this.productRepo.findOne({
      where,
      relations: { images: true, category: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const [enriched] = await this.enrichWithFavorite([product], userId);
    return enriched;
  }

  async create(dto: CreateProductDto, adminId: string): Promise<Product> {
    const product = this.productRepo.create({
      title: dto.title,
      description: dto.description,
      price: dto.price,
      discountPrice: dto.discountPrice,
      stock: dto.stock ?? 0,
      categoryId: dto.categoryId,
      createdById: adminId,
    });
    const saved = await this.productRepo.save(product);

    if (dto.images?.length) {
      const images = dto.images.map((url, i) =>
        this.imageRepo.create({ url, sortOrder: i, productId: saved.id }),
      );
      await this.imageRepo.save(images);
    }

    return this.findOne(saved.id, undefined, false) as any;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id, undefined, false);
    const { images, ...rest } = dto;
    await this.productRepo.update(id, rest as any);

    if (images !== undefined) {
      await this.imageRepo.delete({ productId: id });
      if (images.length) {
        const newImages = images.map((url, i) =>
          this.imageRepo.create({ url, sortOrder: i, productId: id }),
        );
        await this.imageRepo.save(newImages);
      }
    }

    return this.findOne(id, undefined, false) as any;
  }

  async softDelete(id: string): Promise<void> {
    await this.findOne(id, undefined, false);
    await this.productRepo.update(id, { isActive: false });
  }

  async updateStock(id: string, dto: UpdateStockDto): Promise<Product> {
    await this.findOne(id, undefined, false);
    await this.productRepo.update(id, { stock: dto.stock });
    return this.findOne(id, undefined, false) as any;
  }

  async addReview(productId: string, user: User, dto: CreateReviewDto) {
    if (user.isGuest) throw new ForbiddenException('Guests cannot write reviews');

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.reviewRepo.findOne({
      where: { userId: user.id, productId },
    });
    if (existing) throw new ConflictException('You already reviewed this product');

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const review = qr.manager.create(Review, {
        rating: dto.rating,
        comment: dto.comment,
        userId: user.id,
        productId,
      });
      await qr.manager.save(review);

      const { avg, count } = await qr.manager
        .createQueryBuilder(Review, 'r')
        .select('AVG(r.rating)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .where('r.productId = :productId', { productId })
        .getRawOne();

      await qr.manager.update(Product, productId, {
        rating: parseFloat(parseFloat(avg).toFixed(2)) as any,
        reviewCount: parseInt(count),
      });

      await qr.commitTransaction();
      return review;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async getReviews(productId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [items, total] = await this.reviewRepo.findAndCount({
      where: { productId },
      relations: { user: true },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { id: true, name: true, avatar: true },
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private async enrichWithFavorite(products: Product[], userId?: string) {
    if (!userId) return products.map((p) => ({ ...p, isFavorite: false }));

    const favs = await this.favoriteRepo.find({ where: { userId } });
    const favSet = new Set(favs.map((f) => f.productId));
    return products.map((p) => ({ ...p, isFavorite: favSet.has(p.id) }));
  }
}
