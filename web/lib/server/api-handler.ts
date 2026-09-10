import 'server-only';

import {
  BadRequestException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { NextRequest, NextResponse } from 'next/server';
import type { PublicUser } from './backend/auth-v2.service';
import { getApiRuntime } from './api-runtime';

type JsonObject = Record<string, unknown>;
type SessionResult = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: PublicUser;
  [key: string]: unknown;
};

const avatarKeys = ['najm', 'nura', 'raihan', 'salma', 'fawwaz', 'aaliyah', 'zayd', 'ihsan', 'hana', 'maira'] as const;
const periods = ['PAGI', 'SIANG', 'SORE', 'MALAM'] as const;
const customKinds = ['CHECKLIST', 'COUNTER', 'QUANTITY', 'DURATION', 'CUSTOM'] as const;
const circleKinds = ['CHECKLIST', 'COUNTER', 'DURATION'] as const;
const circleTypes = ['Pribadi', 'Pasangan', 'Keluarga', 'Sahabat', 'Kajian', 'Komunitas'] as const;
const visibilityValues = ['PRIVATE', 'COMPLETION_ONLY', 'PERCENTAGE', 'DETAIL'] as const;

const attempts = new Map<string, { count: number; resetAt: number }>();

function validation(message: string, field?: string): never {
  throw new BadRequestException({
    code: 'VALIDATION_ERROR',
    message,
    ...(field ? { fields: [{ field, messages: [message] }] } : {}),
  });
}

async function readBody(request: NextRequest): Promise<JsonObject> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 1_000_000) validation('Ukuran permintaan terlalu besar.');
  try {
    const value = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) validation('Body JSON tidak valid.');
    return value as JsonObject;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    validation('Body JSON tidak valid.');
  }
}

function textValue(body: JsonObject, key: string, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const value = body[key];
  if (typeof value !== 'string') validation(`${key} harus berupa teks.`, key);
  const normalized = value.trim();
  if (normalized.length < min) validation(`${key} minimal ${min} karakter.`, key);
  if (normalized.length > max) validation(`${key} maksimal ${max} karakter.`, key);
  return normalized;
}

function optionalText(body: JsonObject, key: string, max: number) {
  const value = body[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') validation(`${key} harus berupa teks.`, key);
  if (value.length > max) validation(`${key} maksimal ${max} karakter.`, key);
  return value.trim();
}

function booleanValue(body: JsonObject, key: string, optional?: false): boolean;
function booleanValue(body: JsonObject, key: string, optional: true): boolean | undefined;
function booleanValue(body: JsonObject, key: string, optional = false) {
  const value = body[key];
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'boolean') validation(`${key} harus berupa boolean.`, key);
  return value;
}

function numberValue(body: JsonObject, key: string, optional?: false): number;
function numberValue(body: JsonObject, key: string, optional: true): number | undefined;
function numberValue(body: JsonObject, key: string, optional = false) {
  const value = body[key];
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) validation(`${key} harus berupa angka.`, key);
  return value;
}

function integerValue(body: JsonObject, key: string, min: number, max: number) {
  const value = numberValue(body, key);
  if (!Number.isInteger(value) || value < min || value > max) validation(`${key} harus bernilai ${min}–${max}.`, key);
  return value;
}

function enumValue<const T extends readonly string[]>(body: JsonObject, key: string, values: T): T[number] {
  const value = textValue(body, key);
  if (!values.includes(value)) validation(`${key} tidak valid.`, key);
  return value as T[number];
}

function stringArray(body: JsonObject, key: string, max?: number, required?: true): string[];
function stringArray(body: JsonObject, key: string, max: number, required: false): string[] | undefined;
function stringArray(body: JsonObject, key: string, max = Number.MAX_SAFE_INTEGER, required = true) {
  const value = body[key];
  if (!required && value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) validation(`${key} harus berupa daftar teks.`, key);
  if (value.length > max) validation(`${key} maksimal ${max} pilihan.`, key);
  return value.map((item) => item.trim());
}

function emailValue(body: JsonObject, key = 'email') {
  const value = textValue(body, key, 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) validation('Format alamat email belum valid.', key);
  return value;
}

function passwordValue(body: JsonObject, key = 'password', strong = true) {
  const value = textValue(body, key, 1, 72);
  if (strong && !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/.test(value)) {
    validation('Kata sandi minimal 8 karakter dan wajib memuat huruf, angka, serta simbol.', key);
  }
  return value;
}

function customAmalan(value: unknown, circle = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) validation('Data amalan custom tidak valid.', 'customAmalan');
  const body = value as JsonObject;
  return {
    title: textValue(body, 'title', 2, 100),
    note: textValue(body, 'note', 0, 240),
    period: enumValue(body, 'period', periods),
    kind: enumValue(body, 'kind', circle ? circleKinds : customKinds),
    target: integerValue(body, 'target', 1, 10_000),
    unit: optionalText(body, 'unit', 24),
  };
}

function customAmalanArray(body: JsonObject) {
  const value = body.customAmalan;
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 6) validation('customAmalan maksimal 6 item.', 'customAmalan');
  return value.map((item) => customAmalan(item, true));
}

async function requireUser(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Silakan masuk untuk melanjutkan.' });
  }
  const { auth } = await getApiRuntime();
  return auth.verifyAccess(authorization.slice(7));
}

function applyAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: 'ctj_refresh',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60,
  });
}

function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: 'ctj_refresh',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 0,
  });
}

function sessionResponse(session: SessionResult) {
  const { refreshToken, ...safe } = session;
  const response = NextResponse.json(safe);
  applyAuthCookie(response, refreshToken);
  return response;
}

function rateLimit(request: NextRequest, path: string) {
  if (!path.startsWith('/auth/')) return;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = `${forwarded ?? request.headers.get('x-real-ip') ?? 'unknown'}:${path}`;
  const now = Date.now();
  const current = attempts.get(key);
  const next = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + 60_000 }
    : { count: current.count + 1, resetAt: current.resetAt };
  attempts.set(key, next);
  if (next.count > 20) {
    throw new HttpException({ code: 'RATE_LIMITED', message: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba kembali.' }, 429);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof HttpException) {
    const status = error.getStatus();
    const detail = error.getResponse();
    const payload = typeof detail === 'string'
      ? { statusCode: status, code: 'REQUEST_FAILED', message: detail }
      : { statusCode: status, ...(detail as JsonObject) };
    return NextResponse.json(payload, { status });
  }

  console.error('Unhandled API error', error);
  return NextResponse.json({
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'Terjadi kendala pada server. Silakan coba kembali.',
  }, { status: 500 });
}

function notFound(): never {
  throw new NotFoundException({ code: 'ENDPOINT_NOT_FOUND', message: 'Endpoint API tidak ditemukan.' });
}

export async function handleApiRequest(request: NextRequest, rawSegments: string[]) {
  try {
    const segments = rawSegments[0] === 'v1' ? rawSegments.slice(1) : rawSegments;
    const path = `/${segments.join('/')}`;
    const method = request.method.toUpperCase();
    rateLimit(request, path);

    if (method === 'OPTIONS') return new NextResponse(null, { status: 204 });

    const runtime = await getApiRuntime();
    const { auth, daily, data } = runtime;
    const device = { name: request.headers.get('user-agent') ?? undefined };

    if (method === 'GET' && path === '/health') {
      return NextResponse.json({ status: 'ok', service: 'connected-to-jannah', timestamp: new Date().toISOString() });
    }

    if (method === 'POST' && path === '/auth/register') {
      const body = await readBody(request);
      const session = await auth.register(
        emailValue(body),
        passwordValue(body),
        textValue(body, 'displayName', 2, 40),
        booleanValue(body, 'termsAccepted'),
        textValue(body, 'timezone', 1, 64),
        device,
      );
      return sessionResponse(session);
    }
    if (method === 'POST' && path === '/auth/login') {
      const body = await readBody(request);
      return sessionResponse(await auth.login(emailValue(body), passwordValue(body, 'password', false), device));
    }
    if (method === 'POST' && path === '/auth/refresh') {
      const session = await auth.refresh(request.cookies.get('ctj_refresh')?.value, device);
      return sessionResponse(session);
    }
    if (method === 'POST' && path === '/auth/logout') {
      const result = await auth.logout(request.cookies.get('ctj_refresh')?.value);
      const response = NextResponse.json(result);
      clearAuthCookie(response);
      return response;
    }
    if (method === 'POST' && path === '/auth/forgot-password') {
      const body = await readBody(request);
      return NextResponse.json(await auth.requestPasswordReset(emailValue(body)));
    }
    if (method === 'POST' && path === '/auth/reset-password') {
      const body = await readBody(request);
      return NextResponse.json(await auth.resetPassword(textValue(body, 'token', 20), passwordValue(body)));
    }
    if (method === 'POST' && path === '/auth/verify-email') {
      const body = await readBody(request);
      return NextResponse.json(await auth.verifyEmail(textValue(body, 'token', 20)));
    }

    if (method === 'GET' && path === '/circles/milestones') return NextResponse.json(await data.getCollectiveMilestones());
    if (method === 'GET' && path === '/encouragements') return NextResponse.json(await data.getEncouragements());
    if (method === 'GET' && path === '/journey/milestones') return NextResponse.json(await data.getMilestones());

    let match = path.match(/^\/invites\/([^/]+)$/);
    if (method === 'GET' && match) return NextResponse.json(await data.getInvite(match[1]));

    const user = await requireUser(request);

    if (method === 'GET' && path === '/me') return NextResponse.json(user);
    if (method === 'PATCH' && path === '/me') {
      const body = await readBody(request);
      return NextResponse.json(await auth.updateProfile(user.id, textValue(body, 'displayName', 2, 40)));
    }
    if (method === 'PATCH' && path === '/account') {
      const body = await readBody(request);
      return NextResponse.json(await auth.updateAccount(user.id, {
        displayName: textValue(body, 'displayName', 2, 40),
        timezone: textValue(body, 'timezone', 1, 64),
        language: enumValue(body, 'language', ['id', 'en'] as const),
        avatar: body.avatar === undefined ? undefined : enumValue(body, 'avatar', avatarKeys),
        locationName: optionalText(body, 'locationName', 80),
        latitude: numberValue(body, 'latitude', true),
        longitude: numberValue(body, 'longitude', true),
      }));
    }
    if (method === 'PATCH' && path === '/account/password') {
      const body = await readBody(request);
      return NextResponse.json(await auth.changePassword(
        user.id,
        passwordValue(body, 'currentPassword', false),
        passwordValue(body, 'newPassword'),
      ));
    }
    if (method === 'GET' && path === '/account/export') return NextResponse.json(await auth.exportData(user.id));
    if (method === 'POST' && path === '/account/delete') {
      const body = await readBody(request);
      const result = await auth.deleteAccount(user.id, passwordValue(body, 'password', false));
      const response = NextResponse.json(result);
      clearAuthCookie(response);
      return response;
    }
    if (method === 'GET' && path === '/account/sessions') return NextResponse.json(await auth.sessions(user.id));
    match = path.match(/^\/account\/sessions\/([^/]+)\/revoke$/);
    if (method === 'POST' && match) return NextResponse.json(await auth.revokeSession(user.id, match[1]));
    if (method === 'POST' && path === '/auth/resend-verification') return NextResponse.json(await auth.requestVerification(user.id));

    if (method === 'POST' && path === '/onboarding') {
      const body = await readBody(request);
      const keys = stringArray(body, 'amalanKeys');
      if (!keys.length) validation('Pilih setidaknya satu amalan.', 'amalanKeys');
      return NextResponse.json(await daily.configure(
        user.id,
        keys,
        textValue(body, 'timezone', 1, 64),
        booleanValue(body, 'remindersEnabled'),
        enumValue(body, 'avatar', avatarKeys),
      ));
    }

    if (method === 'GET' && path === '/overview') return NextResponse.json(await data.getOverview(user.id));
    if (method === 'GET' && path === '/daily') return NextResponse.json(await daily.get(user.id));
    if (method === 'GET' && path === '/daily/history') return NextResponse.json(await daily.history(user.id));

    match = path.match(/^\/daily\/([^/]+)\/complete$/);
    if (method === 'POST' && match) {
      const body = await readBody(request);
      const mutationId = textValue(body, 'clientMutationId');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mutationId)) {
        validation('ID mutasi tidak valid.', 'clientMutationId');
      }
      return NextResponse.json(await daily.complete(user.id, match[1], mutationId));
    }
    match = path.match(/^\/daily\/([^/]+)\/skip$/);
    if (method === 'POST' && match) return NextResponse.json(await daily.skip(user.id, match[1]));

    if (method === 'GET' && path === '/amalan/catalog') return NextResponse.json(await daily.catalog(user.id));
    if (method === 'POST' && path === '/amalan/custom') {
      return NextResponse.json(await daily.addCustom(user.id, customAmalan(await readBody(request))));
    }
    if (method === 'POST' && path === '/amalan/templates') {
      const body = await readBody(request);
      return NextResponse.json(await daily.addTemplate(user.id, textValue(body, 'key', 2, 80)));
    }
    if (method === 'POST' && path === '/amalan/activate-all') return NextResponse.json(await daily.activateAllTemplates(user.id));

    match = path.match(/^\/amalan\/([^/]+)\/active$/);
    if (method === 'PATCH' && match) {
      const body = await readBody(request);
      return NextResponse.json(await daily.setActive(user.id, match[1], booleanValue(body, 'active')));
    }
    match = path.match(/^\/amalan\/([^/]+)\/target$/);
    if (method === 'PATCH' && match) {
      const body = await readBody(request);
      return NextResponse.json(await daily.setTarget(user.id, match[1], integerValue(body, 'target', 1, 10_000)));
    }
    match = path.match(/^\/amalan\/([^/]+)\/bookmark$/);
    if (method === 'PATCH' && match) {
      const body = await readBody(request);
      return NextResponse.json(await daily.bookmark(user.id, match[1], booleanValue(body, 'bookmarked')));
    }
    match = path.match(/^\/amalan\/([^/]+)(?:\/delete)?$/);
    if ((method === 'DELETE' || method === 'POST') && match) return NextResponse.json(await daily.deleteAmalan(user.id, match[1]));

    match = path.match(/^\/challenges\/([^/]+)\/join$/);
    if (method === 'POST' && match) return NextResponse.json(await data.joinChallenge(user.id, match[1]));
    match = path.match(/^\/challenges\/([^/]+)\/status$/);
    if (method === 'PATCH' && match) {
      const body = await readBody(request);
      return NextResponse.json(await data.updateChallenge(user.id, match[1], enumValue(body, 'status', ['ACTIVE', 'PAUSED', 'LEFT'] as const)));
    }
    match = path.match(/^\/challenges\/([^/]+)\/calendar$/);
    if (method === 'GET' && match) return NextResponse.json(await data.challengeCalendar(user.id, match[1]));

    if (method === 'POST' && path === '/circles') {
      const body = await readBody(request);
      return NextResponse.json(await data.createCircle(
        user.id,
        textValue(body, 'name', 2, 60),
        enumValue(body, 'type', circleTypes),
        stringArray(body, 'amalanKeys', 12, false) ?? ['subuh'],
        customAmalanArray(body),
      ));
    }

    match = path.match(/^\/circles\/([^/]+)\/testing\/level$/);
    if (method === 'PATCH' && match) {
      const body = await readBody(request);
      return NextResponse.json(await data.setTestCircleLevel(user.id, match[1], integerValue(body, 'level', 1, 30)));
    }
    if (method === 'DELETE' && match) return NextResponse.json(await data.resetTestCircleLevel(user.id, match[1]));

    match = path.match(/^\/circles\/([^/]+)\/amalan$/);
    if (method === 'PATCH' && match) {
      const body = await readBody(request);
      return NextResponse.json(await data.updateCircleAmalan(user.id, match[1], stringArray(body, 'amalanKeys', 12)));
    }
    match = path.match(/^\/circles\/([^/]+)\/amalan\/custom$/);
    if (method === 'POST' && match) return NextResponse.json(await data.addCustomCircleAmalan(user.id, match[1], customAmalan(await readBody(request), true)));
    match = path.match(/^\/circles\/([^/]+)\/amalan\/([^/]+)\/remove$/);
    if (method === 'POST' && match) return NextResponse.json(await data.removeCustomCircleAmalan(user.id, match[1], match[2]));

    match = path.match(/^\/circles\/([^/]+)\/challenge$/);
    if (method === 'GET' && match) return NextResponse.json({ challenge: await data.circleChallenge(user.id, match[1]) });
    if (method === 'POST' && match) {
      const body = await readBody(request);
      return NextResponse.json(await data.startCircleChallenge(user.id, match[1], textValue(body, 'challengeId', 3, 40)));
    }

    match = path.match(/^\/circles\/([^/]+)\/encouragements$/);
    if (method === 'POST' && match) {
      const body = await readBody(request);
      return NextResponse.json(await data.sendEncouragement(user.id, match[1], enumValue(body, 'key', ['ease', 'continue', 'little', 'steadfast', 'goodness'] as const)));
    }
    match = path.match(/^\/circles\/([^/]+)\/invites$/);
    if (method === 'POST' && match) {
      const body = await readBody(request);
      return NextResponse.json(await data.createInvite(user.id, match[1], {
        mode: enumValue(body, 'mode', ['PRIVATE', 'COMMUNITY'] as const),
        maxUses: integerValue(body, 'maxUses', 1, 500),
        expiresInDays: integerValue(body, 'expiresInDays', 1, 30),
        approvalRequired: booleanValue(body, 'approvalRequired'),
      }));
    }
    match = path.match(/^\/circles\/([^/]+)\/members\/([^/]+)$/);
    if (method === 'PATCH' && match) {
      const body = await readBody(request);
      return NextResponse.json(await data.updateMember(user.id, match[1], match[2], enumValue(body, 'action', ['APPROVE', 'REMOVE', 'ADMIN', 'MEMBER'] as const)));
    }
    match = path.match(/^\/circles\/([^/]+)\/leave$/);
    if (method === 'POST' && match) return NextResponse.json(await data.leaveCircle(user.id, match[1]));
    match = path.match(/^\/circles\/([^/]+)\/transfer$/);
    if (method === 'POST' && match) {
      const body = await readBody(request);
      return NextResponse.json(await data.transferOwnership(user.id, match[1], textValue(body, 'memberId', 1)));
    }
    match = path.match(/^\/circles\/([^/]+)\/archive$/);
    if (method === 'POST' && match) return NextResponse.json(await data.archiveCircle(user.id, match[1]));
    match = path.match(/^\/circles\/([^/]+)$/);
    if (method === 'GET' && match) return NextResponse.json(await data.circleDetail(user.id, match[1]));

    match = path.match(/^\/invites\/([^/]+)\/accept$/);
    if (method === 'POST' && match) return NextResponse.json(await data.acceptInvite(user.id, match[1]));

    if (method === 'POST' && path === '/notifications/read-all') return NextResponse.json(await data.markAllNotificationsRead(user.id));
    match = path.match(/^\/notifications\/([^/]+)\/read$/);
    if (method === 'POST' && match) return NextResponse.json(await data.markNotificationRead(user.id, match[1]));

    if (method === 'PATCH' && path === '/privacy') {
      const body = await readBody(request);
      return NextResponse.json(await data.updatePrivacy(user.id, enumValue(body, 'visibility', visibilityValues)));
    }
    if (method === 'PATCH' && path === '/preferences') {
      const body = await readBody(request);
      return NextResponse.json(await data.updatePreferences(user.id, {
        remindersEnabled: booleanValue(body, 'remindersEnabled'),
        reducedMotion: booleanValue(body, 'reducedMotion'),
        quietStart: optionalText(body, 'quietStart', 8),
        quietEnd: optionalText(body, 'quietEnd', 8),
        reminderNotifications: booleanValue(body, 'reminderNotifications', true),
        circleNotifications: booleanValue(body, 'circleNotifications', true),
        milestoneNotifications: booleanValue(body, 'milestoneNotifications', true),
      }));
    }

    return notFound();
  } catch (error) {
    return errorResponse(error);
  }
}
