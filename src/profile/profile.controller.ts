import {
  Controller, Get, Patch, Post, Delete, Body, Param,
  ParseUUIDPipe, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UploadService } from '../upload/upload.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UpdateProfileDto, CreateAddressDto, UpdateAddressDto } from './dto/profile.dto';
import { memoryStorage } from 'multer';

const avatarMulter = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new BadRequestException('Only JPEG, PNG, WEBP allowed'), false);
    }
    cb(null, true);
  },
};

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Patch('update')
  @ApiOperation({ summary: 'Update name and phone' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload avatar (JPEG/PNG/WEBP, max 5MB, resized to 256x256)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', avatarMulter))
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const avatarPath = await this.uploadService.processAvatarImage(file.buffer);
    await this.profileService.updateAvatar(user.id, avatarPath);
    return { avatarUrl: avatarPath };
  }

  // ─── Addresses ──────────────────────────────────────────────────────────────

  @Get('addresses')
  @ApiOperation({ summary: 'List user addresses' })
  getAddresses(@CurrentUser() user: User) {
    return this.profileService.getAddresses(user.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Create address' })
  createAddress(@CurrentUser() user: User, @Body() dto: CreateAddressDto) {
    return this.profileService.createAddress(user.id, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update address' })
  updateAddress(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.profileService.updateAddress(user.id, id, dto);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete address' })
  deleteAddress(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.profileService.deleteAddress(user.id, id);
  }

  @Patch('addresses/:id/default')
  @ApiOperation({ summary: 'Set address as default' })
  setDefault(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.profileService.setDefault(user.id, id);
  }
}
