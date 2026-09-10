import 'server-only';
import 'reflect-metadata';

import { ServiceUnavailableException } from '@nestjs/common';
import { AppDataV2Service } from './backend/app-data-v2.service';
import { AuthV2Service } from './backend/auth-v2.service';
import { DailyV2Service } from './backend/daily-v2.service';
import { DatabaseService } from './backend/database.service';
import { EmailService } from './backend/email.service';

type ApiRuntime = {
  auth: AuthV2Service;
  daily: DailyV2Service;
  data: AppDataV2Service;
  ready: Promise<void>;
};

const globalRuntime = globalThis as typeof globalThis & {
  __ctjApiRuntime?: ApiRuntime;
};

function createRuntime(): ApiRuntime {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    throw new ServiceUnavailableException({
      code: 'DATABASE_NOT_CONFIGURED',
      message: 'DATABASE_URL belum dikonfigurasi.',
    });
  }
  if (process.env.NODE_ENV === 'production' && !process.env.ACCESS_TOKEN_SECRET) {
    throw new ServiceUnavailableException({
      code: 'AUTH_NOT_CONFIGURED',
      message: 'ACCESS_TOKEN_SECRET belum dikonfigurasi.',
    });
  }

  const database = new DatabaseService();
  const email = new EmailService();
  return {
    auth: new AuthV2Service(database, email),
    daily: new DailyV2Service(database),
    data: new AppDataV2Service(database),
    ready: database.onModuleInit(),
  };
}

export async function getApiRuntime() {
  if (!globalRuntime.__ctjApiRuntime) {
    globalRuntime.__ctjApiRuntime = createRuntime();
  }

  try {
    await globalRuntime.__ctjApiRuntime.ready;
    return globalRuntime.__ctjApiRuntime;
  } catch (error) {
    globalRuntime.__ctjApiRuntime = undefined;
    throw error;
  }
}
