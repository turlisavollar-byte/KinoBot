import { NextResponse } from 'next/server';

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  telegram?: unknown;
  phone?: unknown;
  plan?: unknown;
  message?: unknown;
};

const MAX_REQUESTS = (() => {
  const value = Number(process.env.CONTACT_RATE_LIMIT_MAX ?? 5);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5;
})();
const RATE_WINDOW_MS = (() => {
  const value = Number(process.env.CONTACT_RATE_LIMIT_WINDOW ?? 60 * 60 * 1000);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 60 * 60 * 1000;
})();
const MAX_BODY_BYTES = 16 * 1024;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function resetRateLimit() {
  for (const [key, value] of rateLimitStore) {
    if (value.resetAt <= Date.now()) rateLimitStore.delete(key);
  }
}

function getClientId(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function checkRateLimit(request: Request) {
  resetRateLimit();
  const id = getClientId(request);
  const current = rateLimitStore.get(id);
  if (!current || current.resetAt <= Date.now()) {
    rateLimitStore.set(id, { count: 1, resetAt: Date.now() + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID ?? process.env.TELEGRAM_CONTACT_CHAT_ID;

  if (!telegramBotToken || !telegramChatId) {
    return NextResponse.json(
      { error: 'Contact delivery is temporarily unavailable.' },
      { status: 503 },
    );
  }

  if (!checkRateLimit(request)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
  }

  let body: ContactPayload;
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    }
    body = JSON.parse(rawBody) as ContactPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const telegram = typeof body.telegram === 'string' ? body.telegram.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const plan = typeof body.plan === 'string' ? body.plan.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (name.length < 2 || name.length > 100 || !isValidEmail(email) || email.length > 254 || message.length < 10 || message.length > 2000) {
    return NextResponse.json({ error: 'Please check the required fields and message length.' }, { status: 400 });
  }

  if (telegram.length > 100 || phone.length > 30 || plan.length > 100) {
    return NextResponse.json({ error: 'One or more fields are too long.' }, { status: 400 });
  }

  const text = [
    '🆕 StreamX contact form',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Telegram: ${telegram || 'not provided'}`,
    `Phone: ${phone || 'not provided'}`,
    `Plan: ${plan || 'not selected'}`,
    '',
    message,
  ].join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramChatId, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error('Telegram contact delivery failed', await response.text());
      return NextResponse.json({ error: 'Unable to deliver the contact message.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram request failed', error);
    return NextResponse.json({ error: 'Contact delivery timed out.' }, { status: 504 });
  }
}
