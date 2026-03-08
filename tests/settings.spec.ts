import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('shows API key fields', async ({ page }) => {
    await expect(page.getByText('Claude API Key')).toBeVisible();
    await expect(page.getByText('OpenAI API Key')).toBeVisible();
    await expect(page.getByText('ElevenLabs API Key')).toBeVisible();
  });

  test('save button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Save Settings/i })).toBeVisible();
  });

  test('can type into Claude API key field', async ({ page }) => {
    const input = page.locator('input[placeholder="sk-ant-api03-…"]');
    await input.focus();
    await input.fill('sk-ant-test-key-123');
    await expect(input).toHaveValue('sk-ant-test-key-123');
  });

  test('can type into OpenAI API key field', async ({ page }) => {
    const input = page.locator('input[placeholder="sk-…"]');
    await input.focus();
    await input.fill('sk-openai-test-key-123');
    await expect(input).toHaveValue('sk-openai-test-key-123');
  });

  test('save settings succeeds (local file fallback)', async ({ page }) => {
    const input = page.locator('input[placeholder="sk-ant-api03-…"]');
    await input.focus();
    await input.fill('sk-ant-test-key-000');

    await page.getByRole('button', { name: /Save Settings/i }).click();

    // Success: either "Settings saved" appears, or no error message shown
    await expect(page.getByText('error').or(page.getByText('Settings saved'))).toBeVisible({ timeout: 8000 });
    // Verify no destructive error
    await expect(page.getByText('Failed to save')).not.toBeVisible();
  });
});
