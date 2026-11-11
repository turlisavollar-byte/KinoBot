import { expect, test } from '@playwright/test';

test.describe('Contact Form', () => {
  test('enforces required fields without submitting an empty form', async ({ page }) => {
    let requestMade = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/contact')) requestMade = true;
    });

    await page.goto('/#contact');
    await page.locator('#contact button[type="submit"]').click();

    await expect(page.locator('#name')).toHaveAttribute('required', '');
    expect(requestMade).toBe(false);
  });

  test('submits valid input to a mocked API and displays success', async ({ page }) => {
    await page.route('**/api/contact', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    }));

    await page.goto('/#contact');
    const form = page.locator('#contact form');
    await form.locator('#name').fill('Playwright User');
    await form.locator('#email').fill('playwright@example.com');
    await form.locator('#message').fill('This is a test message from Playwright.');
    await expect(form.locator('#name')).toHaveValue('Playwright User');
    await expect(form.locator('#email')).toHaveValue('playwright@example.com');
    await expect(form.locator('#message')).toHaveValue('This is a test message from Playwright.');

    const response = page.waitForResponse((response) => response.url().includes('/api/contact'));
    await form.locator('button[type="submit"]').click();
    expect((await response).status()).toBe(200);

    await expect(page.locator('#contact [role="status"]')).toBeVisible();
    await expect(form.locator('#name')).toHaveValue('');
  });
});