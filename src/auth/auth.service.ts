import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { UserService } from 'src/user/user.service';
import { MailService } from 'src/mail/mail.service';
import { compare } from 'bcrypt';
import { AuthJwtPayload } from './types/jwt-payload.type';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import refreshJwtConfig from './config/refresh-jwt.config';
import resetJwtConfig from './config/reset-password-jwt.config';
import { CurrentUser } from '../common/types/current-user.type';
import { RegisterDto } from './dto/register.dto';
import { DataSource } from 'typeorm';
import { EmailQueueService } from 'src/queue/email/email-queue.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailService: MailService,
    @Inject(refreshJwtConfig.KEY)
    private refreshTokenConfig: ConfigType<typeof refreshJwtConfig>,
    @Inject(resetJwtConfig.KEY)
    private resetPasswordTokenConfig: ConfigType<typeof resetJwtConfig>,
    private dataSource: DataSource,
    private emailQueueService: EmailQueueService,
  ) {}

  async login(userId: number) {
    const { accessToken, refreshToken } = await this.generateTokens(userId);
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.userService.updateRefreshToken(userId, hashedRefreshToken);

    return {
      id: userId,
      accessToken,
      refreshToken,
    };
  }
  //forgot-password
  async requestPasswordReset(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) return; // No revelar existencia
    const token = await this.jwtService.signAsync(
      { sub: user.id },
      //cambiar por la config
      this.resetPasswordTokenConfig,
    );
    const resetLink = `https://localhost:5050/reset-password?token=${token}`;
    await this.mailService.sendPasswordChangedEmail(
      user.email,
      user.firstName,
      resetLink,
    );

    return {
      message: 'Password reset link sent to your email',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const payload = this.jwtService.verify(token, {
      secret: this.resetPasswordTokenConfig.secret,
    });
    const user = await this.userService.findOne(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    // No hashear aquí, la entidad se encargará de ello
    await this.userService.setPassword(user.id, newPassword);
    await this.mailService.sendPasswordResetEmail(user.email, user.firstName);
    return {
      message: 'Password changed successfully',
    };
  }

  async getProfile(userId: number) {
    const user = await this.userService.findOne(userId);
    if (!user) throw new UnauthorizedException('User not found');
    // Retornar entidad User completa para que el interceptor agregue avatarUrl
    return user;
  }

  async generateTokens(userId: number) {
    const payload: AuthJwtPayload = { sub: userId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, this.refreshTokenConfig),
    ]);
    return {
      accessToken,
      refreshToken,
    };
  }

  async register(registerDto: RegisterDto) {
    // Asignar rol USER por defecto para registros normales
    const userWithRole = {
      ...registerDto,
      role: Role.USER,
    };

    const user = await this.dataSource.transaction(async (manager) => {
      const user = await this.userService.create(userWithRole, manager);
      return user;
    });
    const to = registerDto.email;
    const username = registerDto.firstName;

    await this.emailQueueService.addWelcomeEmail(to, username);

    const { accessToken, refreshToken } = await this.generateTokens(user.id);
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.userService.updateRefreshToken(user.id, hashedRefreshToken);
    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async logout(userId: number) {
    // Eliminar el token de refresco almacenado
    await this.userService.removeRefreshToken(userId);
    return {
      message: 'Logout successful',
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const isMatch = await compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async validateJwtUser(userId: number) {
    const user = await this.userService.findOne(userId);
    if (!user) throw new UnauthorizedException('User not found!');
    const currentUser: CurrentUser = { id: user.id, role: user.role };
    return currentUser;
  }

  async validateRefreshToken(userId: number, refreshToken: string) {
    const user = await this.userService.findOne(userId);
    if (!user || !user.hashedRefreshToken)
      throw new UnauthorizedException('Invalid Refresh Token');

    const refreshTokenMatches = await argon2.verify(
      user.hashedRefreshToken,
      refreshToken,
    );
    if (!refreshTokenMatches)
      throw new UnauthorizedException('Invalid Refresh Token');

    return { id: userId };
  }

  async refreshToken(userId: number) {
    const { accessToken, refreshToken } = await this.generateTokens(userId);
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.userService.updateRefreshToken(userId, hashedRefreshToken);
    return {
      id: userId,
      accessToken,
      refreshToken,
    };
  }

  async validateOrCreateGoogleUser(googleUser: any) {
    let user = await this.userService.findByEmail(googleUser.email);

    if (!user) {
      // Si el usuario no existe, crearlo
      const newUser = {
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        email: googleUser.email,
        avatarUrl: googleUser.avatarUrl,
        // Generamos una contraseña aleatoria que el usuario nunca necesitará usar
        // ya que iniciará sesión con Google
        password:
          Math.random().toString(36).slice(-10) +
          Math.random().toString(36).slice(-10),
        // Asignar rol USER por defecto para usuarios de Google
        role: Role.USER,
      };

      user = await this.dataSource.transaction(async (manager) => {
        const createdUser = await this.userService.create(newUser, manager);
        return createdUser;
      });

      await this.mailService.sendWelcomeEmail(user.email, user.firstName);
    }

    return user;
  }

  async loginWithGoogle(user: any) {
    return this.login(user.id);
  }
}
