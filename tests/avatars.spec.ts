import { test, expect } from '@playwright/test';

test.describe('Avatars page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/avatars');
  });

  test('avatars page loads', async ({ page }) => {
    await expect(page).toHaveURL('/avatars');
    await expect(page.getByText('Avatar Generation')).toBeVisible();
  });

  test('sidebar shows Avatars link', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Avatars' })).toBeVisible();
  });

  test('upload zone is present', async ({ page }) => {
    await expect(page.getByText('Upload reference image')).toBeVisible();
  });

  test('mode selector shows both modes', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Likeness Only/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Likeness \+ Environment/i })).toBeVisible();
  });

  test('aspect ratio toggle is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /16:9/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /9:16/i })).toBeVisible();
  });

  test('generate button is disabled without prompt', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Generate Avatar' });
    await expect(btn).toBeDisabled();
  });

  test('generate button enables when prompt is typed', async ({ page }) => {
    await page.locator('#avatar-prompt').fill('A senior woman in a warm cardigan');
    const btn = page.getByRole('button', { name: 'Generate Avatar' });
    await expect(btn).toBeEnabled();
  });
});

test.describe('Campaign Overview - Active Avatar', () => {
  test('shows Active Avatar section', async ({ page }) => {
    await page.goto('/campaigns/camp-1');
    await expect(page.getByText('Active Avatar')).toBeVisible();
  });

  test('shows attach or change button', async ({ page }) => {
    await page.goto('/campaigns/camp-1');
    await expect(
      page.getByRole('button', { name: /Attach Avatar/i })
        .or(page.getByRole('button', { name: /Change/i }))
    ).toBeVisible();
  });
});
