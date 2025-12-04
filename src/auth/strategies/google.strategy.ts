import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, StrategyOptions } from 'passport-google-oauth20';
import { ConfigType } from '@nestjs/config';
import { AuthService } from '../auth.service';
import googleAuthConfig from '../config/google.auth.config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(googleAuthConfig.KEY)
    private googleConfig: ConfigType<typeof googleAuthConfig>,
    private authService: AuthService,
  ) {
    super(googleConfig);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    try {
      const { name, emails, photos } = profile;

      if (!emails || emails.length === 0) {
        throw new Error('No se pudo obtener el email del perfil de Google');
      }

      const user = {
        email: emails[0].value,
        firstName: name?.givenName || emails[0].value.split('@')[0],
        lastName: name?.familyName || '',
        avatarUrl: photos && photos.length > 0 ? photos[0].value : undefined,
        accessToken,
        refreshToken,
      };

      return await this.authService.validateOrCreateGoogleUser(user);
    } catch (error) {
      throw error;
    }
  }
}
