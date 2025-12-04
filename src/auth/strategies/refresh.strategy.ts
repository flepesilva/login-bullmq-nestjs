import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthJwtPayload } from '../types/jwt-payload.type';
import { Inject, Injectable } from '@nestjs/common';
import refreshJwtConfig from '../config/refresh-jwt.config';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor(
    @Inject(refreshJwtConfig.KEY)
    private refreshJwtConfiguration: ConfigType<typeof refreshJwtConfig>,
    private authService: AuthService,
  ) {
    if (!refreshJwtConfiguration.secret) {
      throw new Error(
        'Refresh JWT secret is not defined in the configuration.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extraer el token de la cookie 'refresh_token'
          return request?.cookies?.refresh_token || null;
        },
        // Mantener compatibilidad con el método anterior
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: refreshJwtConfiguration.secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: AuthJwtPayload) {
    // Obtener el refresh token de la cookie
    const refreshToken = req.cookies?.refresh_token;

    // Si no hay cookie, intentar obtenerlo del encabezado para compatibilidad
    if (!refreshToken) {
      const authorizationHeader = req.get('authorization');
      if (!authorizationHeader) {
        throw new Error('Refresh token not found');
      }
      const headerToken = authorizationHeader.replace('Bearer', '').trim();
      return this.authService.validateRefreshToken(payload.sub, headerToken);
    }

    return this.authService.validateRefreshToken(payload.sub, refreshToken);
  }
}
