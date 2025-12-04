import { registerAs } from '@nestjs/config';
import { StrategyOptions } from 'passport-google-oauth20';

export default registerAs(
  'google-auth',
  (): StrategyOptions => ({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3000/auth/google/callback',
    scope: ['email', 'profile'],
  }), 
);
