import { test, expect } from '@playwright/test';
test('onboarding to first successful call', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.test`;
  await page.goto('/');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder(/Password/).fill('Password123!');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Your first API call')).toBeVisible();
  await page.getByRole('button', { name: 'Create API key' }).click();
  await expect(page.getByText('Copy this now')).toBeVisible();
  await page.getByRole('button', { name: 'Test call' }).click();
  await expect(page.getByText('First successful call recorded')).toBeVisible();
});
