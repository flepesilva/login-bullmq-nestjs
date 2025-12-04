import { HttpException, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http.exception.filter';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import dbConfig from './db/config/db.config';
import mailConfig from './mail/config/mail.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      load: [dbConfig, mailConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfiguration = configService.get('database');
        if (dbConfiguration) {
          return dbConfiguration;
        }

        // Configuración por defecto si no se encuentra la configuración en database
        return {
          type: 'postgres',
          host: configService.get('POSTGRES_HOST') || 'localhost',
          port: parseInt(configService.get('POSTGRES_PORT') || '5432'),
          username: configService.get('POSTGRES_USER') || 'postgres',
          password: configService.get('POSTGRES_PASSWORD') || '',
          database: configService.get('POSTGRES_DB') || 'postgres',
          entities: [join(__dirname, '**', '*.entity.{ts,js}')],
          synchronize: configService.get('TYPEORM_SYNC') === 'true',
        };
      },
    }),
    UserModule,
    AuthModule,
    StorageModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
