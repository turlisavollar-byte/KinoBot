import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/contact/route';
import { checkRateLimit } from '../lib/rate-limit';
import { contactFormSchema } from '../lib/validations';

const originalFetch = globalThis.fetch;
const originalToken = process.env.TELEGRAM_BOT_TOKEN;
const originalChatId = process.env.TELEGRAM_CHAT_ID;
const originalForwardedFor = process.env.CONTACT_RATE_LIMIT_MAX;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN = originalToken;
  if (originalChatId === undefined) delete process.env.TELEGRAM_CHAT_ID;
  else process.env.TELEGRAM_CHAT_ID = originalChatId;
  if (originalForwardedFor === undefined) delete process.env.CONTACT_RATE_LIMIT_MAX;
  else process.env.CONTACT_RATE_LIMIT_MAX = originalForwardedFor;
});

test('escapes user input before sending Telegram HTML', async () => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  process.env.TELEGRAM_CHAT_ID = 'test-chat';
  let telegramPayload: { chat_id: string; text: string; parse_mode: string } | undefined;

  globalThis.fetch = async (_input, init) => {
    telegramPayload = JSON.parse(String(init?.body));
    return new Response('{}', { status: 200 });
  };

  const response = await POST(new NextRequest('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      'x-forwarded-for': '192.0.2.90',
    },
    body: JSON.stringify({
      name: '<b>Test & "Friend"</b>',
      email: 'test@example.com',
      telegram: '@<streamx>&',
      phone: '+998 <90>',
      plan: '<Premium>',
      message: 'Hello <b>world</b> & welcome!',
    }),
  }));

  assert.equal(response.status, 200);
  assert.equal(telegramPayload?.chat_id, 'test-chat');
  assert.equal(telegramPayload?.parse_mode, 'HTML');
  assert.match(telegramPayload?.text ?? '', /Ism:<\/b> &lt;b&gt;Test &amp; &quot;Friend&quot;&lt;\/b&gt;/);
  assert.match(telegramPayload?.text ?? '', /Telegram:<\/b> @&lt;streamx&gt;&amp;/);
  assert.match(telegramPayload?.text ?? '', /Telefon:<\/b> \+998 &lt;90&gt;/);
  assert.match(telegramPayload?.text ?? '', /Tarif:<\/b> &lt;Premium&gt;/);
  assert.match(telegramPayload?.text ?? '', /Hello &lt;b&gt;world&lt;\/b&gt; &amp; welcome!/);
});

test('rejects cross-origin contact requests', async () => {
  const response = await POST(new NextRequest('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { origin: 'https://attacker.example' },
    body: JSON.stringify({}),
  }));

  assert.equal(response.status, 403);
});

test('returns fake success for honeypot submissions without delivery', async () => {
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChatId = process.env.TELEGRAM_CHAT_ID;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;

  try {
    const response = await POST(new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Spam Bot',
        email: 'spam@example.com',
        message: 'Automated spam submission',
        honeypot: 'filled by bot',
      }),
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  } finally {
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previousToken;
    if (previousChatId === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = previousChatId;
  }
});

test('validates contact fields with Zod', () => {
  assert.equal(contactFormSchema.safeParse({
    name: 'A',
    email: 'not-an-email',
    message: 'short',
  }).success, false);

  assert.equal(contactFormSchema.safeParse({
    name: 'StreamX User',
    email: 'user@example.com',
    message: 'A valid contact message.',
    honeypot: '',
  }).success, true);
});

test('fallback rate limiter allows five requests and rejects the sixth', async () => {
  const ip = `test-${randomUUID()}`;
  const results = await Promise.all(Array.from({ length: 6 }, () => checkRateLimit(ip)));

  assert.equal(results.filter((result) => result.success).length, 5);
  assert.equal(results.filter((result) => !result.success).length, 1);
  assert.equal(results.at(-1)?.remaining, 0);
});