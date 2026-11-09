import { expect, test } from '@playwright/test';

test('home renders the SPA shell', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('body')).toBeVisible();
});
