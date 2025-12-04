// src/queue/processors/email.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../../mail/mail.service'; // 👈 USA tu MailService existente

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailService: MailService, // 👈 Inyecta TU servicio existente
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Procesando job ${job.id} de tipo ${job.name}`);

    try {
      switch (job.name) {
        case 'welcome-email':
          // Llama a TU método existente
          await this.mailService.sendWelcomeEmail(
            job.data.to,
            job.data.username,
          );
          break;

        case 'password-reset-email':
          // Llama a TU método existente
          await this.mailService.sendPasswordResetEmail(
            job.data.to,
            job.data.resetToken,
          );
          break;
      }

      this.logger.log(`Job ${job.id} completado exitosamente`);
    } catch (error) {
      this.logger.error(`Job ${job.id} falló:`, error);
      throw error; // Esto activa el sistema de reintentos
    }
  }
}
