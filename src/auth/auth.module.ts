import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import refreshJwtConfig from './config/refresh-jwt.config';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserService } from 'src/user/user.service';
import { RefreshJwtStrategy } from './strategies/refresh.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { MailModule } from 'src/mail/mail.module';
import resetPasswordJwtConfig from './config/reset-password-jwt.config';
import { GoogleStrategy } from './strategies/google.strategy';
import googleAuthConfig from './config/google.auth.config';
import { StorageModule } from 'src/storage/storage.module';
import { QueueModule } from 'src/queue/queue.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../auth/guards/local-auth.guard';
import { RefreshAuthGuard } from '../auth/guards/refresh-auth.guard';
import { GoogleAuthGuard } from '../auth/guards/google-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RateLimitingGuard } from './guards/rate-limiting.guard';
import { UserResponseInterceptor } from 'src/user/interceptor/user-response.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(refreshJwtConfig),
    ConfigModule.forFeature(resetPasswordJwtConfig),
    ConfigModule.forFeature(googleAuthConfig),
    MailModule,
    StorageModule,
    QueueModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    LocalStrategy,
    JwtStrategy,
    RefreshJwtStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
    RefreshAuthGuard,
    GoogleAuthGuard,
    RolesGuard,
    RateLimitingGuard,
    UserResponseInterceptor
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    RateLimitingGuard
  ],
})
export class AuthModule {}
