import 'reflect-metadata';
import { BadRequestException, HttpException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './api-exception.filter';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && !process.env.ACCESS_TOKEN_SECRET) throw new Error('ACCESS_TOKEN_SECRET wajib diatur pada production.');
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const attempts = new Map<string, { count: number; resetAt: number }>();
  app.use((request: any, response: any, next: () => void) => {
    if (!request.url.startsWith('/v1/auth/')) return next();
    const key = `${request.ip}:${request.url}`; const now = Date.now(); const current = attempts.get(key);
    const entry = !current || current.resetAt < now ? { count: 1, resetAt: now + 60_000 } : { ...current, count: current.count + 1 }; attempts.set(key, entry);
    response.setHeader('RateLimit-Limit', '20'); response.setHeader('RateLimit-Remaining', String(Math.max(0, 20 - entry.count)));
    if (entry.count > 20) throw new HttpException({ code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba kembali.' }, 429);
    next();
  });
  app.use((request: any, response: any, next: () => void) => { response.setHeader('Cache-Control', request.url.includes('/auth/') ? 'no-store' : 'private, no-cache'); next(); });
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3001'], credentials: true });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const fieldErrors = errors.map((error) => ({
        field: error.property,
        messages: Object.values(error.constraints ?? {})
      }));
      const allMessages = fieldErrors.flatMap((f) => f.messages);
      const message = allMessages.length > 0 ? allMessages.join('. ') : 'Periksa kembali data yang kamu masukkan.';
      return new BadRequestException({
        code: 'VALIDATION_ERROR',
        message,
        fields: fieldErrors
      });
    }
  }));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
void bootstrap();
