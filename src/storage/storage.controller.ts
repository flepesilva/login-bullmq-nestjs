import {
  Controller,
  Get,
  Param,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  Request,
  Response,
  StreamableFile,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { Readable } from 'stream';

/**
 * Controller for serving private assets via backend proxy
 * Streams images directly without exposing S3/R2 URLs
 * Public assets should be accessed directly from S3
 */
@Controller('images')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Stream private avatar image
   * Users can only access their own avatar, admins can access any avatar
   *
   * @example GET /images/private/avatars/user-123-1234567890.jpg
   * @returns Image stream (binary data)
   */
  @Get('private/avatars/:filename')
  async getPrivateAvatar(
    @Param('filename') filename: string,
    @Request() req,
    @Response({ passthrough: false }) res: ExpressResponse,
  ): Promise<void> {
    const key = `avatars/${filename}`;

    // Extract userId from filename (format: user-{id}-{timestamp}.{ext})
    const userIdMatch = filename.match(/^user-(\d+)-/);
    if (!userIdMatch) {
      throw new NotFoundException('Invalid avatar filename');
    }

    const avatarUserId = parseInt(userIdMatch[1], 10);

    // Authorization: User can access own avatar, admin can access any
    if (req.user.userId !== avatarUserId && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('You can only access your own avatar');
    }

    // Verify avatar exists in database
    const user = await this.userRepository.findOne({
      where: { id: avatarUserId },
      select: ['id', 'avatarKey'],
    });

    if (!user || user.avatarKey !== key) {
      throw new NotFoundException('Avatar not found');
    }

    // Stream the image from S3
    const { stream, contentType, contentLength, lastModified } =
      await this.storageService.streamPrivateAsset(key);

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', contentLength);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache 1 hour in browser
    res.setHeader('Last-Modified', lastModified.toUTCString());
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Pipe the S3 stream to the response
    const readableStream = stream as Readable;
    readableStream.pipe(res);
  }
}
