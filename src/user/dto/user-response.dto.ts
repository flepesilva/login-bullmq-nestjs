import { Exclude, Expose } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';

/**
 * DTO for user data in responses
 * Excludes sensitive fields and adds avatarUrl as computed property
 */
export class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  email: string;

  @Expose()
  isActive: boolean;

  @Expose()
  role: Role;

  @Expose()
  isOAuthUser: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  /**
   * Presigned URL for avatar (generated on-demand)
   * This field is set by the controller/service before returning
   */
  @Expose()
  avatarUrl: string | null;

  // Excluded fields
  @Exclude()
  password: string;

  @Exclude()
  hashedRefreshToken: string | null;

  @Exclude()
  avatarKey: string; // Internal S3 key, not exposed to client

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
