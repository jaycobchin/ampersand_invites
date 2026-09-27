import { test, expect } from '@playwright/test';

test('demo directs real signups to live and keeps the link visible in the sample workspace', async ({
  page,
}) => {
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: {
        mode: 'demo',
        demoEnabled: true,
        registrationEnabled: false,
        liveUrl: 'https://live.example.com',
        demoUrl: null,
      },
    }),
  );
  await page.goto('/register');
  await expect(page.getByLabel('Email address')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
    'href',
    'https://live.example.com/login',
  );
  await expect(
    page.getByRole('link', { name: 'Create your real account' }).first(),
  ).toHaveAttribute('href', 'https://live.example.com/register');
  await page.getByRole('button', { name: 'Explore the demo' }).click();
  await expect(page.getByRole('heading', { name: 'Your day. Coming together.' })).toBeVisible();
  await expect(
    page.locator('.demo-bar').getByRole('link', { name: 'Create your real account' }),
  ).toHaveAttribute('href', 'https://live.example.com/register');
});

test('live links to demo and supports direct signup and login links', async ({ page }) => {
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: {
        mode: 'live',
        demoEnabled: false,
        registrationEnabled: true,
        liveUrl: null,
        demoUrl: 'https://demo.example.com',
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Try the demo' })).toHaveAttribute(
    'href',
    'https://demo.example.com',
  );
  await expect(page.getByRole('button', { name: 'Take a little look around' })).toHaveCount(0);
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Your next chapter.' })).toBeVisible();
  await expect(page.getByLabel('Your name')).toBeVisible();
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});
