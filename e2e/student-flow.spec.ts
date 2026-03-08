import { test, expect } from '@playwright/test';

test.describe('Student Flow', () => {
  test('should load the welcome page', async ({ page }) => {
    await page.goto('/student/welcome?demo=1');

    // Check if the page loads with expected content
    await expect(page).toHaveTitle(/PlateInsight/);
    await expect(page.locator('text=Welcome to Mess')).toBeVisible();
    await expect(page.locator('text=Start Demo')).toBeVisible();
  });

  test('should navigate to capture page with QR params', async ({ page }) => {
    // Simulate QR code scan with parameters
    await page.goto('/student/welcome?eco=test-ecosystem&session=test-session&meal=lunch');

    await expect(page.locator('text=Continue to Camera')).toBeVisible();
    await page.locator('button:has-text("Continue to Camera")').click();

    // Should redirect to capture page
    await expect(page).toHaveURL(/.*capture/, { timeout: 10000 });
    await expect(page.locator('text=Take photo before leaving')).toBeVisible();
  });

  test('should handle camera access', async ({ page, browserName }) => {
    // Skip camera tests on webkit due to permissions issues in CI
    test.skip(browserName === 'webkit', 'Camera permissions not supported in WebKit CI');

    await page.goto('/student/capture');

    // Check if camera permission is requested or error is shown
    const cameraError = page.locator('text=/Camera Access Denied/i');
    const cameraView = page.locator('video');

    // Either camera works or shows error
    await expect(cameraError.or(cameraView)).toBeVisible();
  });
});
