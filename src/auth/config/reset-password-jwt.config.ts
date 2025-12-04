import { registerAs } from '@nestjs/config';
import { JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';

export default registerAs(
  'reset-password-jwt',
  (): JwtSignOptions => ({
    secret: process.env.JWT_RESET_SECRET,
    expiresIn: process.env.JWT_RESET_PASSWORD_EXPIRATION_TIME,
  }),
);
