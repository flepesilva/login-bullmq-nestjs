import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { Role } from '../common/enums/role.enum';
import { AssetType } from '../common/enums/asset-type.enum';
import { StorageService } from '../storage/storage.service';
import { Request, Express } from 'express';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private storageService: StorageService,
  ) {}

  async updateRefreshToken(userId: number, hashedRefreshToken: string) {
    return await this.userRepository.update(
      { id: userId },
      { hashedRefreshToken },
    );
  }

  async create(
    createUserDto: CreateUserDto,
    manager?: EntityManager,
    creatorRole?: Role,
  ): Promise<User> {
    const repo = manager ? manager.getRepository(User) : this.userRepository;
    const existingUser = await repo.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    // Asignar rol por defecto si no se especifica
    if (!createUserDto.role) {
      createUserDto.role = Role.USER;
    }

    // Solo ADMIN puede crear usuarios con rol ADMIN
    if (createUserDto.role === Role.ADMIN) {
      if (creatorRole !== Role.ADMIN) {
        throw new ForbiddenException(
          'Solo administradores pueden crear usuarios con roles privilegiados',
        );
      }
    }

    const user = repo.create(createUserDto);
    return await repo.save(user);
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: number) {
    return this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'avatarKey',
        'hashedRefreshToken',
        'role',
      ],
    });
  }

  async setPassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await argon2.verify(user.password, currentPassword);
    if (!isMatch) throw new UnauthorizedException('Incorrect current password');

    const hashed = await argon2.hash(newPassword);
    await this.userRepository.update(userId, { password: hashed });
  }

  async findByEmail(email: string) {
    return await this.userRepository.findOne({
      where: {
        email,
      },
    });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.userRepository.update(id, updateUserDto);
  }

  remove(id: number) {
    return this.userRepository.delete(id);
  }

  async removeRefreshToken(userId: number) {
    await this.userRepository.update(userId, {
      hashedRefreshToken: null,
    });
  }

  async uploadProfilePicture(userId: number, file: any): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Generar un nombre de archivo único
    const fileExt = file.originalname.split('.').pop();
    const key = `avatars/user-${userId}-${Date.now()}.${fileExt}`;

    // uploadFile returns the S3 key for private assets (not a URL)
    const avatarKey = await this.storageService.uploadFile(
      AssetType.AVATAR,
      key,
      file.buffer,
      file.mimetype,
    );

    user.avatarKey = avatarKey;
    await this.userRepository.save(user);

    // Return the user entity (controller will transform to DTO with presigned URL)
    return user;
  }
}
