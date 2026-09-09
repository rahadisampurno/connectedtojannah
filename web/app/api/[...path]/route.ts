import type { NextRequest } from 'next/server';
import { handleApiRequest } from '../../../lib/server/api-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ path: string[] }> };

async function dispatch(request: NextRequest, context: Context) {
  const { path } = await context.params;
  return handleApiRequest(request, path);
}

export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
export const OPTIONS = dispatch;
