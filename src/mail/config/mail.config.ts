// src/mail/config/mail.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  apiKey: process.env.MAILJET_API_KEY,
  apiSecret: process.env.MAILJET_SECRET_KEY,
  defaultFrom: process.env.MAIL_FROM,
}));
