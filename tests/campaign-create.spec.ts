import { test, expect } from '@playwright/test';

test.describe('Campaign Creation', () => {
  test('new campaign form loads', async ({ page }) => {
    await page.goto('/campaigns/new');
    await expect(page.getByRole('heading', { name: 'New Campaign' })).toBeVisible();
    await expect(page.getByLabel('Campaign Title')).toBeVisible();
  });

  test('create a campaign with only required fields and land on workspace', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.getByLabel('Campaign Title').fill('Playwright Test Campaign');
    await page.getByRole('button', { name: 'Create Campaign' }).click();
    await expect(page).toHaveURL(/\/campaigns\/camp-/, { timeout: 10000 });
    await expect(page.getByText('Playwright Test Campaign')).toBeVisible();
  });

  test('workspace shows all tabs after creation', async ({ page }) => {
    await page.goto('/campaigns/new');
    await page.getByLabel('Campaign Title').fill('Tab Test Campaign');
    await page.getByRole('button', { name: 'Create Campaign' }).click();
    await expect(page).toHaveURL(/\/campaigns\/camp-/, { timeout: 10000 });

    for (const tab of ['Overview', 'Concepts', 'Script', 'ElevenLabs', 'Visual Plan', 'Prompts', 'Versions', 'Creative Lab']) {
      await expect(page.getByRole('link', { name: tab })).toBeVisible();
    }
  });

  test('create campaign with full details', async ({ page }) => {
    await page.goto('/campaigns/new');

    await page.getByLabel('Campaign Title').fill('Full Detail Campaign');
    await page.getByLabel('Offer Name').fill('Final Expense Whole Life');
    await page.getByLabel('Phone Number').fill('1-800-555-0199');
    await page.getByLabel('Benefit Amount').fill('$15,000');
    await page.getByLabel('Affordability Anchor').fill('Less than $1 a day');
    await page.getByLabel('Deadline Text').fill('Call before midnight tonight');

    await page.selectOption('#personaId', { index: 1 });
    await page.selectOption('#emotionalTone', { index: 1 });
    await page.getByRole('button', { name: '60 seconds' }).click();

    await page.getByRole('button', { name: 'Create Campaign' }).click();
    await expect(page).toHaveURL(/\/campaigns\/camp-/, { timeout: 10000 });
    await expect(page.getByText('Full Detail Campaign')).toBeVisible();
  });

  test('cancel returns to previous page', async ({ page }) => {
    await page.goto('/dashboard');
    // Use the sidebar link specifically
    await page.getByRole('navigation').getByRole('link', { name: 'New Campaign' }).click();
    await expect(page).toHaveURL('/campaigns/new');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL('/dashboard');
  });
});
