import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Address } from '../users/entities/address.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Address]), UploadModule],
  providers: [ProfileService],
  controllers: [ProfileController],
})
export class ProfileModule {}
