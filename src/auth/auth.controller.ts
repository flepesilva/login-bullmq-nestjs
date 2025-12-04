import {
  Controller,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Post,
  Get,
  Body,
  BadRequestException,
  Res,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { LocalAuthGuard } from '../auth/guards/local-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RefreshAuthGuard } from '../auth/guards/refresh-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthGuard } from '../auth/guards/google-auth.guard';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RateLimitingGuard } from './guards/rate-limiting.guard';
import { UserResponseInterceptor } from '../user/interceptor/user-response.interceptor';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitingGuard, LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ): Promise<any> {
    const result = await this.authService.login(req.user.id);

    // Configurar cookies HTTP-only
    this.setCookies(response, result.accessToken, result.refreshToken);

    // Devolver información de usuario sin tokens
    return {
      id: result.id,
      message: 'Login successful',
    };
  }

  @Public()
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(registerDto);
    // const user = await this.authService.register(registerDto);
    // const tokens = await this.authService.login(user.id);

    // Configurar cookies HTTP-only
    this.setCookies(response, result.accessToken, result.refreshToken);

    // Devolver información de usuario sin tokens
    return {
      id: result.user.id,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      role: result.user.role,
      message: 'Registration successful',
    };
  }

  @Roles(Role.USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('test')
  async test(@Request() req) {
    return req.user;
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ) {
    const { email } = requestPasswordResetDto;
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    return await this.authService.requestPasswordReset(email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    return await this.authService.resetPassword(token, newPassword);
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  async refreshToken(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.refreshToken(req.user.id).then((tokens) => {
      // Configurar nuevas cookies HTTP-only
      this.setCookies(response, tokens.accessToken, tokens.refreshToken);

      // Devolver respuesta sin tokens
      return {
        id: tokens.id,
        message: 'Tokens refreshed successfully',
      };
    });
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor, UserResponseInterceptor)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // El Guard maneja la redirección a Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    const result = await this.authService.loginWithGoogle(req.user);

    // Configurar cookies HTTP-only
    this.setCookies(res, result.accessToken, result.refreshToken);

    // Redirigir al frontend sin tokens en la URL
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5000'}/auth/google/success`,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(req.user.id);

    // Eliminar las cookies
    this.clearCookies(response);

    return {
      message: 'Logout successful',
    };
  }

  // Método auxiliar para configurar cookies
  private setCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    // Configuración de la cookie del token de acceso
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutos en milisegundos
      path: '/',
    });

    // Configuración de la cookie del token de refresco
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
      path: '/', // Disponible en todas las rutas
    });
  }

  // Método auxiliar para limpiar cookies
  private clearCookies(response: Response) {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/', // Debe coincidir con el path usado al crear la cookie
    });
  }
}
