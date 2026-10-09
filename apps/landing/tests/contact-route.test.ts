import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { POST } from '../app/api/contact/route';

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

  const response = await POST(new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
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
  assert.match(telegramPayload?.text ?? '', /Name: &lt;b&gt;Test &amp; &quot;Friend&quot;&lt;\/b&gt;/);
  assert.match(telegramPayload?.text ?? '', /Telegram: @&lt;streamx&gt;&amp;/);
  assert.match(telegramPayload?.text ?? '', /Phone: \+998 &lt;90&gt;/);
  assert.match(telegramPayload?.text ?? '', /Plan: &lt;Premium&gt;/);
  assert.match(telegramPayload?.text ?? '', /Hello &lt;b&gt;world&lt;\/b&gt; &amp; welcome!/);
});