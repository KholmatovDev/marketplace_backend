import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {}

  getBaseUrl(): string {
    const port = this.configService.get<number>('PORT') ?? 3000;
    return this.configService.get<string>('APP_HOST') ?? `http://localhost:${port}`;
  }

  getFileUrl(subpath: string): string {
    return `${this.getBaseUrl()}/uploads/${subpath}`;
  }

  async processProductImage(buffer: Buffer): Promise<string> {
    const filename = `${uuidv4()}.webp`;
    const dest = join(process.cwd(), 'uploads', 'products', filename);

    await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(dest);

    return `/uploads/products/${filename}`;
  }

  async processAvatarImage(buffer: Buffer): Promise<string> {
    const filename = `${uuidv4()}.webp`;
    const dest = join(process.cwd(), 'uploads', 'avatars', filename);

    await sharp(buffer)
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(dest);

    return `/uploads/avatars/${filename}`;
  }

  deleteFile(relativePath: string): void {
    const filename = relativePath.split('/').pop();
    if (!filename || filename.includes('..')) {
      throw new BadRequestException('Invalid path');
    }

    const fullPath = relativePath.startsWith('/uploads/')
      ? join(process.cwd(), relativePath)
      : join(process.cwd(), 'uploads', filename);

    if (!existsSync(fullPath)) throw new NotFoundException('File not found');
    unlinkSync(fullPath);
  }
}
