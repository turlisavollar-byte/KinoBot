import { NextResponse } from 'next/server';

type ContactPayload = {
  name?: string;
  email?: string;
  telegram?: string;
  phone?: string;
  plan?: string;
  message?: string;
};

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CONTACT_CHAT_ID;

export async function POST(request: Request) {
  if (!telegramBotToken || !telegramChatId) {
    return NextResponse.json(
      { error: 'Telegram contact delivery is not configured.' },
      { status: 503 },
    );
  }

  const body = (await request.json()) as ContactPayload;
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const telegram = String(body.telegram ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const plan = String(body.plan ?? '').trim();
  const message = String(body.message ?? '').trim();

  if (!name || !email || !message || message.length > 2000) {
    return NextResponse.json(
      { error: 'Name, email, and message are required; message must be at most 2000 characters.' },
      { status: 400 },
    );
  }

  const text = [
    '🆕 KinoBot contact form',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Telegram: ${telegram || 'not provided'}`,
    `Phone: ${phone || 'not provided'}`,
    `Plan: ${plan || 'not selected'}`,
    '',
    message,
  ].join('\n');

  const response = await fetch(
    `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramChatId, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(5000),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Telegram contact delivery failed', error);
    return NextResponse.json(
      { error: 'Unable to deliver the contact message.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
