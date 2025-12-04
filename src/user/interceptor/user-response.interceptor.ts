import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../entities/user.entity';
import { UserResponseDto } from '../dto/user-response.dto';
import { plainToClass } from 'class-transformer';

/**
 * Interceptor to transform User entities to UserResponseDto with backend proxy avatar URLs
 * Generates URLs pointing to backend streaming endpoints instead of exposing S3/R2 URLs
 */
@Injectable()
export class UserResponseInterceptor implements NestInterceptor {

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Handle single user
        if (data && this.isUser(data)) {
          return this.transformUser(data);
        }

        // Handle array of users
        if (Array.isArray(data)) {
          return data.map((item) =>
            this.isUser(item) ? this.transformUser(item) : item,
          );
        }

        return data;
      }),
    );
  }

  /**
   * Check if object is a User entity
   */
  private isUser(obj: any): obj is User {
    return obj && typeof obj === 'object' && 'avatarKey' in obj;
  }

  /**
   * Transform User to UserResponseDto with backend proxy avatar URL
   */
  private transformUser(user: User): UserResponseDto {
    // Generate backend proxy URL instead of exposing S3/R2 URLs
    const avatarUrl = this.generateBackendAvatarUrl(user.avatarKey);

    const dto = plainToClass(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    dto.avatarUrl = avatarUrl;

    return dto;
  }

  /**
   * Generate backend proxy URL for avatar
   * @param avatarKey - S3 key like "avatars/user-123-1234567890.jpg"
   * @returns Backend proxy path like "/images/private/avatars/user-123-1234567890.jpg"
   */
  private generateBackendAvatarUrl(avatarKey: string | null | undefined): string | null {
    if (!avatarKey) {
      return null;
    }

    // Extract filename from key (avatars/user-123-1234567890.jpg -> user-123-1234567890.jpg)
    const filename = avatarKey.replace('avatars/', '');

    // Return backend proxy endpoint path
    return `/images/private/avatars/${filename}`;
  }
}
