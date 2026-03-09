import { test, expect } from '@playwright/test';

test('avatar generation produces real images', async ({ page }) => {
  await page.goto('http://localhost:3000/avatars');
  await page.locator('#avatar-prompt').fill('A woman in her 50s, warm smile, professional attire');
  await page.getByRole('button', { name: 'Generate Avatar' }).click();

  // Progress bar should appear
  await expect(page.getByText('Expanding prompt with GPT-4o…')).toBeVisible({ timeout: 5000 });

  // Wait for images (up to 3 min)
  await expect(page.locator('img[alt="Front"]')).toBeVisible({ timeout: 180000 });

  await page.screenshot({ path: 'test-results/avatar-success.png', fullPage: true });
  
  // No mock warning
  await expect(page.getByText(/No Gemini API key/i)).not.toBeVisible();
});
