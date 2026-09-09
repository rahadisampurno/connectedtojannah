import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<any>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : {};
    const body = typeof raw === 'string' ? { message: raw } : raw as Record<string, unknown>;
    response.status(status).json({
      statusCode: status,
      code: typeof body.code === 'string' ? body.code : status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED',
      message: typeof body.message === 'string' ? body.message : status === 500 ? 'Terjadi kendala pada server.' : 'Permintaan belum berhasil.',
      ...(Array.isArray(body.fields) ? { fields: body.fields } : {}),
    });
  }
}
