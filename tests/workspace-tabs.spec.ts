import { test, expect, type Page } from '@playwright/test';

const MOCK_CAMPAIGN_ID = 'camp-1';

async function goToTab(page: Page, tab: string) {
  // Scope to the workspace tab nav, not the sidebar
  await page.locator('nav[aria-label="Campaign workspace tabs"]').getByRole('link', { name: tab }).click();
}

test.describe('Workspace Tabs (mock campaign)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/campaigns/${MOCK_CAMPAIGN_ID}`);
    await expect(page.getByText('Senior Peace of Mind')).toBeVisible();
  });

  test('Overview tab loads campaign details', async ({ page }) => {
    await expect(page.getByText('Senior Peace of Mind')).toBeVisible();
  });

  test('Concepts tab loads', async ({ page }) => {
    await goToTab(page, 'Concepts');
    await expect(page).toHaveURL(`/campaigns/${MOCK_CAMPAIGN_ID}/concepts`);
    await expect(
      page.getByRole('button', { name: /Generate Concepts/i }).or(
        page.getByText("Don't Leave Your Family")
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test('Script tab loads', async ({ page }) => {
    await goToTab(page, 'Script');
    await expect(page).toHaveURL(`/campaigns/${MOCK_CAMPAIGN_ID}/script`);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('ElevenLabs tab loads', async ({ page }) => {
    await goToTab(page, 'ElevenLabs');
    await expect(page).toHaveURL(`/campaigns/${MOCK_CAMPAIGN_ID}/elevenlabs`);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('Visual Plan tab loads', async ({ page }) => {
    await goToTab(page, 'Visual Plan');
    await expect(page).toHaveURL(`/campaigns/${MOCK_CAMPAIGN_ID}/visual-plan`);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('Prompts tab loads', async ({ page }) => {
    await goToTab(page, 'Prompts');
    await expect(page).toHaveURL(`/campaigns/${MOCK_CAMPAIGN_ID}/prompts`);
  });

  test('Creative Lab tab loads', async ({ page }) => {
    await goToTab(page, 'Creative Lab');
    await expect(page).toHaveURL(`/campaigns/${MOCK_CAMPAIGN_ID}/creative-lab`);
  });
});
