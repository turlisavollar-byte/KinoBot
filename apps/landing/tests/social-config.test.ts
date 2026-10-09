import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SOCIAL_LINKS, VISIBLE_SOCIAL_LINKS } from '../config/social';

test('defines StreamX social links and filters visible links', () => {
  assert.deepEqual(SOCIAL_LINKS.map((link) => link.id), [
    'telegram',
    'facebook',
    'instagram',
    'youtube',
    'github',
    'twitter',
    'linkedin',
  ]);

  const telegram = SOCIAL_LINKS.find((link) => link.id === 'telegram');
  const facebook = SOCIAL_LINKS.find((link) => link.id === 'facebook');
  assert.equal(telegram?.url, process.env.NEXT_PUBLIC_TELEGRAM_URL || 'https://t.me/streamxuz');
  assert.equal(facebook?.url, process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/share/p/1Db8hJeCnH/');
  assert.deepEqual(VISIBLE_SOCIAL_LINKS, SOCIAL_LINKS.filter((link) => link.visible && link.url !== ''));
});