import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const baseUrl = process.env.E2E_BASE_URL;

test('single Next.js service serves UI, auth, and persistent daily data', {
  skip: baseUrl ? false : 'set E2E_BASE_URL to run the production smoke test',
}, async () => {
  let cookie = '';
  let accessToken = '';

  async function request(path, options = {}) {
    const headers = new Headers(options.headers);
    if (options.body) headers.set('content-type', 'application/json');
    if (cookie) headers.set('cookie', cookie);
    if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const nextCookie = response.headers.get('set-cookie');
    if (nextCookie) cookie = nextCookie.split(';', 1)[0];
    const body = await response.json();
    assert.ok(response.ok, `${options.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`);
    return body;
  }

  const page = await fetch(`${baseUrl}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Connected to Jannah/i);

  const health = await request('/api/v1/health');
  assert.equal(health.status, 'ok');

  const email = `single-service-${Date.now()}@example.com`;
  const password = 'DeployTest!2026';
  const registered = await request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      displayName: 'Deploy Test',
      email,
      password,
      termsAccepted: true,
      timezone: 'Asia/Jakarta',
    }),
  });
  accessToken = registered.accessToken;
  assert.equal(registered.user.email, email);
  assert.match(cookie, /^ctj_refresh=/);

  await request('/api/v1/onboarding', {
    method: 'POST',
    body: JSON.stringify({
      avatar: 'najm',
      amalanKeys: ['subuh', 'quran'],
      timezone: 'Asia/Jakarta',
      remindersEnabled: true,
    }),
  });

  const daily = await request('/api/v1/daily');
  assert.equal(daily.entries.length, 2);
  await request(`/api/v1/daily/${daily.entries[0].id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ clientMutationId: randomUUID() }),
  });

  accessToken = '';
  const refreshed = await request('/api/v1/auth/refresh', { method: 'POST' });
  accessToken = refreshed.accessToken;
  assert.equal(refreshed.user.email, email);

  const persisted = await request('/api/v1/daily');
  assert.equal(persisted.entries.filter((entry) => entry.completed).length, 1);

  await request('/api/v1/auth/logout', { method: 'POST' });
  accessToken = '';
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  accessToken = login.accessToken;
  assert.equal(login.user.email, email);

  const me = await request('/api/v1/me');
  assert.equal(me.email, email);
});
