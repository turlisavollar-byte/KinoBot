import { expect, test } from '@playwright/test';

test.describe('StreamX Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows StreamX page metadata', async ({ page }) => {
    await expect(page).toHaveTitle(/StreamX/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png/);
  });

  test('renders the main landing sections', async ({ page }) => {
    for (const section of ['hero', 'features', 'pricing', 'faq', 'contact', 'demo']) {
      await expect(page.locator(`#${section}`)).toBeVisible();
    }
  });

  test('contains no KinoBot branding', async ({ page }) => {
    const html = await page.content();
    expect(html).not.toContain('KinoBot');
    expect(html.toLowerCase()).not.toContain('kinobot');
  });

  test('navigation scrolls to Features', async ({ page }) => {
    await page.getByRole('navigation').getByRole('button', { name: 'Xususiyatlar' }).click();
    await expect(page.locator('#features')).toBeInViewport();
  });

  test('fits a narrow mobile viewport without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('shows configured social destinations', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Telegram' })).toHaveAttribute('href', 'https://t.me/streamxuz');
    await expect(footer.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://www.facebook.com/share/p/1Db8hJeCnH/');
  });
});