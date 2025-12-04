import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { StorageModule } from '../storage/storage.module';
import { UserResponseInterceptor } from './interceptor/user-response.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StorageModule],
  controllers: [UserController],
  providers: [UserService, UserResponseInterceptor],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
