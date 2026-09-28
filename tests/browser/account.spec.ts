import { test, expect } from '@playwright/test';

test('sign-in offers recovery and recovery does not disclose whether an account exists', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  await expect(page.getByRole('heading', { name: 'A fresh start.' })).toBeVisible();
  let requestedEmail = '';
  await page.route('**/api/auth/forgot-password', async (route) => {
    requestedEmail = route.request().postDataJSON().email;
    await route.fulfill({
      json: {
        message: 'If an account exists for that address, we’ll email a password reset link.',
      },
    });
  });
  await page.getByLabel('Email address').fill('pilot@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
  expect(requestedEmail).toBe('pilot@example.com');
});

test('reset captures a fragment token, validates confirmation, and handles expired links', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let body: any;
  await page.route('**/api/auth/reset-password', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 400,
      json: { error: 'This link has expired or has already been used. Please request a new one.' },
    });
  });
  const token = 'a'.repeat(64);
  await page.goto(`/reset-password#token=${token}`);
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.screenshot({ path: 'test-results/account-reset-mobile.png', fullPage: true });
  await page.getByLabel('New password', { exact: true }).fill('new-password-123');
  await page.getByLabel('Confirm new password').fill('different-password');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toHaveText('The passwords do not match.');
  expect(body).toBeUndefined();
  await page.getByLabel('Confirm new password').fill('new-password-123');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toContainText('expired');
  expect(body.token).toBe(token);
  expect(body.password).toBe('new-password-123');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: 'Request a new reset link' }).click();
  await expect(page.getByLabel('Email address')).toBeVisible();
});

test('verification requires an explicit action and the signup password', async ({ page }) => {
  const calls: any[] = [];
  await page.route('**/api/auth/verify-email', async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({ json: { message: 'Your email is verified. Sign in to continue.' } });
  });
  await page.goto(`/verify-email#token=${'b'.repeat(64)}`);
  await expect(page.getByRole('heading', { name: 'Confirm your email.' })).toBeVisible();
  expect(calls).toHaveLength(0);
  await page.getByLabel('Your password').fill('signup-password-123');
  await page.getByRole('button', { name: 'Verify my email' }).click();
  await expect(page.getByRole('status')).toContainText('Your email is verified');
  expect(calls).toEqual([{ token: 'b'.repeat(64), password: 'signup-password-123' }]);
  await page.getByRole('link', { name: 'Back to sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});

test('unverified accounts see their email and can resend or sign out', async ({ page }) => {
  await page.route('**/api/workspace', (route) =>
    route.fulfill({
      json: {
        user: {
          id: 'pilot',
          name: 'Pilot',
          email: 'pilot@example.com',
          role: 'couple',
          demo: false,
          emailVerified: false,
          verificationRequired: true,
        },
        wedding: null,
        vendors: [],
        enquiries: [],
        quotes: [],
      },
    }),
  );
  await page.route('**/api/auth/resend-verification', (route) =>
    route.fulfill({ json: { message: 'Check your inbox and spam folder.' } }),
  );
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Check your inbox.' })).toBeVisible();
  await expect(page.getByText('pilot@example.com', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resend verification email' }).click();
  await expect(page.getByRole('status')).toContainText('Check your inbox');
  await page.getByRole('button', { name: 'Sign out / use another email' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});
