import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailQueueService } from './email/email-queue.service';
import { EmailProcessor } from './email/email.processors';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    // Conexión a Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD', 'password'),
        },
      }),
      inject: [ConfigService],
    }),

    // Registra la cola 'email'
    BullModule.registerQueue({
      name: 'email',
    }),

    MailModule,
  ],
  providers: [EmailQueueService, EmailProcessor],
  exports: [EmailQueueService],
})
export class QueueModule {}
