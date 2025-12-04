import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Observable } from 'rxjs';

// Un objeto simple para almacenar las solicitudes recientes
const ipRequests = new Map<string, { count: number; firstRequest: number }>();

@Injectable()
export class RateLimitingGuard implements CanActivate {
  // Límite de solicitudes (ej: 5 intentos)
  private limit = 5;
  // Ventana de tiempo en milisegundos (ej: 15 minutos = 900000 ms)
  private windowMs = 15 * 60 * 1000;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;

    // Si es la primera vez que vemos esta IP, inicializamos sus datos
    if (!ipRequests.has(ip)) {
      ipRequests.set(ip, { count: 1, firstRequest: Date.now() });
      return true;
    }

    const requests = ipRequests.get(ip)!;
    const currentTime = Date.now();

    // Si ha pasado el tiempo de la ventana, reiniciamos el contador
    if (currentTime - requests.firstRequest > this.windowMs) {
      requests.count = 1;
      requests.firstRequest = currentTime;
      return true;
    }

    // Incrementamos el contador
    requests.count++;

    // Si ha superado el límite, bloqueamos la solicitud
    if (requests.count > this.limit) {
      const remainingTime = Math.ceil(
        (requests.firstRequest + this.windowMs - currentTime) / 1000,
      );
      throw new HttpException(
        `Demasiados intentos. Por favor, inténtelo de nuevo en ${remainingTime} segundos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
