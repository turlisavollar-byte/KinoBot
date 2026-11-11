import { NextRequest, NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/config';
import { checkRateLimit } from '@/lib/rate-limit';
import { contactFormSchema } from '@/lib/validations';

const MAX_BODY_BYTES = 16 * 1024;

function getClientId(request: Request) {
  return request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

function isSameOriginRequest(request: NextRequest) {
  const originHeader = request.headers.get('origin');
  const refererHeader = request.headers.get('referer');
  const source = originHeader || refererHeader;
  if (!source) return false;

  try {
    const sourceOrigin = new URL(source).origin;
    const configuredOrigin = new URL(SITE_CONFIG.url).origin;
    return sourceOrigin === new URL(request.url).origin || sourceOrigin === configuredOrigin;
  } catch {
    return false;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 });
  }

  const result = contactFormSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validatsiya xatosi', details: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, telegram, phone, plan, message, honeypot } = result.data;
  if (honeypot) {
    return NextResponse.json({ ok: true });
  }

  const rateLimit = await checkRateLimit(getClientId(request));
  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
  };

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Juda ko\'p so\'rov. Iltimos, keyinroq urinib ko\'ring.' },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
        },
      },
    );
  }

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID ?? process.env.TELEGRAM_CONTACT_CHAT_ID;
  if (!telegramBotToken || !telegramChatId) {
    return NextResponse.json(
      { error: 'Contact delivery is temporarily unavailable.' },
      { status: 503, headers: rateLimitHeaders },
    );
  }

  const text = [
    '<b>Yangi xabar</b>',
    '',
    `<b>Ism:</b> ${escapeHtml(name)}`,
    `<b>Email:</b> ${escapeHtml(email)}`,
    telegram ? `<b>Telegram:</b> ${escapeHtml(telegram)}` : '',
    phone ? `<b>Telefon:</b> ${escapeHtml(phone)}` : '',
    plan ? `<b>Tarif:</b> ${escapeHtml(plan)}` : '',
    '',
    `<b>Xabar:</b>\n${escapeHtml(message)}`,
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error('Telegram contact delivery failed', await response.text());
      return NextResponse.json({ error: 'Unable to deliver the contact message.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true }, { headers: rateLimitHeaders });
  } catch (error) {
    console.error('Telegram request failed', error);
    return NextResponse.json({ error: 'Contact delivery timed out.' }, { status: 504 });
  }
}
