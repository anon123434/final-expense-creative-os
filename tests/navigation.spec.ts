import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('root redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('dashboard loads with campaign list', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Campaigns' })).toBeVisible();
    // Button in main area
    await expect(page.getByRole('main').getByRole('link', { name: 'New Campaign' })).toBeVisible();
  });

  test('sidebar links are visible', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'New Campaign' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Claude API Key')).toBeVisible();
    await expect(page.getByText('OpenAI API Key')).toBeVisible();
  });
});
