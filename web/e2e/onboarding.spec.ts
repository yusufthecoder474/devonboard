import { test, expect } from '@playwright/test';
// Works for both variants: variant A shows one step at a time (Next
// buttons appear between steps), variant B shows everything at once.
test('onboarding to first successful call', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.test`;
  await page.goto('/');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder(/Password/).fill('Password123!');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Your first API call')).toBeVisible();
  await page.getByRole('button', { name: 'Create API key' }).click();
  await expect(page.getByText('Copy this now')).toBeVisible();
  const next = page.getByRole('button', { name: 'Next', exact: true });
  if (await next.isVisible()) await next.click();
  await page.getByRole('button', { name: 'Copy snippet' }).click();
  if (await next.isVisible()) await next.click();
  await page.getByRole('button', { name: 'Test call' }).click();
  await expect(page.getByText('First successful call recorded')).toBeVisible();
});
