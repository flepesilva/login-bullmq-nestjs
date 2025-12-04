// src/mail/mail.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
const Mailjet = require('node-mailjet');

@Injectable()
export class MailService {
  private mailjet;
  private defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('mail.apiKey');
    const apiSecret = this.configService.get<string>('mail.apiSecret');
    const defaultFrom = this.configService.get<string>('mail.defaultFrom');

    if (!apiKey || !apiSecret || !defaultFrom) {
      throw new InternalServerErrorException(
        'Mailjet credentials are not configured.',
      );
    }

    this.defaultFrom = defaultFrom;
    this.mailjet = Mailjet.apiConnect(apiKey, apiSecret);
  }

  private compileTemplate(templateName: string, context: any): string {
    const templatePath = path.join(
      process.cwd(),
      'src',
      'mail',
      'templates',
      `${templateName}.hbs`,
    );
    const source = fs.readFileSync(templatePath, 'utf8');
    const compiled = Handlebars.compile(source);
    return compiled(context);
  }

  private async sendMail(to: string, subject: string, html: string) {
    try {
      await this.mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: this.defaultFrom,
              Name: 'Tu Tienda',
            },
            To: [{ Email: to }],
            Subject: subject,
            HTMLPart: html,
          },
        ],
      });
    } catch (error) {
      console.error(
        'Error sending email with Mailjet:',
        error.response?.data || error,
      );
      throw new InternalServerErrorException('Failed to send email.');
    }
  }

  async sendPasswordChangedEmail(
    to: string,
    username: string,
    resetLink: string,
  ) {
    const html = this.compileTemplate('forgot-password', {
      username,
      resetLink,
    });
    await this.sendMail(to, 'Tu contraseña ha sido cambiada', html);
  }

  async sendPasswordResetEmail(to: string, username: string) {
    const html = this.compileTemplate('password-changed', { username });
    await this.sendMail(to, 'Restablecimiento de contraseña', html);
  }

  async sendWelcomeEmail(to: string, username: string) {
    const html = this.compileTemplate('welcome', { username });
    await this.sendMail(to, 'Bienvenido a nuestra plataforma', html);
  }
}
