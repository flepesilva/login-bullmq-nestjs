import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  // Método para agregar un email de bienvenida a la cola
  async addWelcomeEmail(to: string, username: string) {
    await this.emailQueue.add(
      'welcome-email',
      {
        to,
        username,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );
  }

  // Método para agregar email de reset de contraseña
  async addPasswordResetEmail(to: string, resetToken: string) {
    await this.emailQueue.add(
      'password-reset-email',
      {
        to,
        resetToken,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );
  }
}
