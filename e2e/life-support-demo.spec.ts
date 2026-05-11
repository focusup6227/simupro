import { test, expect } from '@playwright/test';

/**
 * Demo seeds `warmStartMarketingMonitor` (pads + ECG + power) so the life-support
 * therapy strip is interactive without opening the equipment drawer.
 */
test.describe('Demo — cardiac monitor life-support', () => {
  test('shows defibrillator / TCP therapy panel', async ({ page }) => {
    await page.goto('/demo');

    const panel = page.getByTestId('life-support-panel');
    await expect(panel).toBeVisible({ timeout: 120_000 });

    await expect(panel.getByText('Defibrillator')).toBeVisible();
    await expect(panel.getByText('Transcutaneous pacing')).toBeVisible();
    await expect(page.getByTestId('life-support-charge')).toBeVisible();
    await expect(page.getByTestId('life-support-shock')).toBeVisible();
    await expect(page.getByTestId('life-support-sync')).toBeVisible();
    await expect(page.getByTestId('life-support-pace')).toBeVisible();
  });

  test('charge enables shock control', async ({ page }) => {
    await page.goto('/demo');

    await expect(page.getByTestId('life-support-panel')).toBeVisible({
      timeout: 120_000,
    });

    const shock = page.getByTestId('life-support-shock');
    const charge = page.getByTestId('life-support-charge');

    await expect(shock).toBeDisabled();

    await charge.click();

    await expect(charge).toContainText(/Rdy/i, { timeout: 15_000 });
    await expect(shock).toBeEnabled();
  });

  test('PACE logs TCP on to the demo transcript', async ({ page }) => {
    await page.goto('/demo');

    await expect(page.getByTestId('life-support-panel')).toBeVisible({
      timeout: 120_000,
    });

    await page.getByTestId('life-support-pace').click();

    await expect(
      page.getByText(/Logged · TCP on/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});
