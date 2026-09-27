import { test, expect } from '@playwright/test';

test('couple demo edits, household RSVP, quote selection, and vendor response work together', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A day to remember/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Take a little look around' }).click();
  await expect(page.getByRole('heading', { name: 'Your day. Coming together.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Wedding website', exact: true }).click();
  await page
    .getByLabel('Your story', { exact: true })
    .fill('A beautiful story, saved for our favourite people.');
  await page.getByRole('button', { name: 'Save website', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Your wedding website is updated.');
  await page.reload();
  await expect(page.getByLabel('Your story', { exact: true })).toHaveValue(
    'A beautiful story, saved for our favourite people.',
  );

  await page.getByRole('button', { name: 'Guest list', exact: false }).first().click();
  await page.getByRole('button', { name: 'Add guest', exact: true }).click();
  await page.getByLabel('First name', { exact: true }).fill('Test');
  await page.getByLabel('Last name', { exact: true }).fill('Guest');
  await page.getByLabel('Email', { exact: true }).fill('browser-guest@example.com');
  await page.getByLabel('Household / invitation group', { exact: false }).fill('Browser household');
  await page.getByLabel('They’re welcome to bring a plus-one').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Add guest', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const guestRow = page.getByRole('row').filter({ hasText: 'browser-guest@example.com' });
  await expect(guestRow).toBeVisible();
  await guestRow.getByRole('button', { name: 'Get invite link' }).click();
  const href = await page.getByRole('link', { name: 'Preview invitation' }).getAttribute('href');
  const guest = await context.newPage();
  await guest.setViewportSize({ width: 390, height: 844 });
  await guest.goto(href!);
  await expect(guest.getByRole('heading', { name: 'Will you celebrate with us?' })).toBeVisible();
  await guest.getByLabel('Plus-one first name').fill('Sam');
  await guest.getByLabel('Plus-one last name').fill('Lee');
  const accept = guest.getByLabel('Joyfully accept', { exact: true });
  for (let i = 0; i < (await accept.count()); i++) await accept.nth(i).check();
  await guest.getByLabel('Dietary needs or allergies for Test').fill('Vegetarian');
  await guest.getByRole('button', { name: 'Send our response' }).click();
  await expect(guest.getByRole('heading', { name: 'We’ve saved your reply.' })).toBeVisible();
  await guest.screenshot({ path: 'test-results/invitation-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await expect(
    page.getByRole('row').filter({ hasText: 'browser-guest@example.com' }),
  ).toContainText('Attending');
  await expect(
    page.getByRole('row').filter({ hasText: 'browser-guest@example.com' }),
  ).toContainText('Vegetarian');

  await page.getByRole('button', { name: 'Vendors', exact: true }).click();
  await page.getByRole('button', { name: 'Compare quotes' }).click();
  await page
    .getByRole('row')
    .filter({ hasText: 'Wildflower Studio' })
    .getByRole('button', { name: 'View quote' })
    .click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Choose this vendor' }).click();
  await expect(page.getByRole('status')).toContainText('Your budget is updated.');
  await page.getByRole('button', { name: 'Budget', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Florals' })).toContainText('$2,300');
  await page.getByRole('button', { name: 'Try the vendor workspace' }).click();
  await page.getByRole('button', { name: 'Open Wildflower Studio workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Your conversations.' })).toBeVisible();
  await page.getByRole('button', { name: 'Create quote', exact: true }).click();
  await page.getByLabel('Quote title', { exact: true }).fill('Updated garden collection');
  await page.getByLabel('Item 1 name', { exact: true }).fill('Wedding flowers');
  await page.getByLabel('Item 1 price', { exact: true }).fill('2500');
  await page.getByRole('button', { name: 'Send quote', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Your quote is ready');
  await page.getByRole('button', { name: 'Back to the couple workspace' }).click();
  await page.getByRole('button', { name: 'Vendors', exact: true }).click();
  await page.getByRole('button', { name: 'Compare quotes' }).click();
  await expect(
    page.getByRole('cell', { name: 'Updated garden collection', exact: false }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('a partner can follow an enquiry through a chosen vendor and restart the demo', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Take a little look around' }).click();
  await expect(page.getByRole('heading', { name: 'Your day. Coming together.' })).toBeVisible();
  const original = await page.evaluate(async () => (await fetch('/api/workspace')).json());

  await page.getByRole('button', { name: 'Vendors', exact: true }).click();
  await page.getByRole('button', { name: 'Compare quotes' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Wildflower Studio' })).toContainText(
    '$2,300',
  );
  await expect(page.getByRole('row').filter({ hasText: 'Meadow & Muse' })).toContainText('$2,650');

  await page.getByRole('button', { name: 'Discover vendors' }).click();
  await page.getByRole('button', { name: 'View Sunday Stories', exact: true }).click();
  await page.getByRole('button', { name: 'Enquire about your wedding' }).click();
  await page
    .getByLabel('Tell them what you have in mind')
    .fill(
      'We would love eight hours of photography for our garden wedding, including the ceremony and dinner.',
    );
  await page.getByRole('button', { name: 'Send enquiry', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    'Your enquiry is in their vendor workspace.',
  );
  await page.getByRole('button', { name: 'Try the vendor workspace' }).click();
  await page.getByRole('button', { name: 'Open Sunday Stories workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Hello, Sunday Stories.' })).toBeVisible();
  await expect(page.locator('.lead-card')).toContainText('eight hours of photography');
  await expect(page.locator('.lead-card')).toContainText('120 guests');
  await page.getByRole('button', { name: 'Create quote', exact: true }).click();
  await page.getByLabel('Start with a package').selectOption({ label: 'The wedding day story' });
  await expect(page.getByLabel('Quote title', { exact: true })).toHaveValue(
    'The wedding day story',
  );
  await expect(page.getByLabel('Inclusions and notes')).toHaveValue(/400 edited photographs/);
  await page.getByRole('button', { name: 'Send quote', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Your quote is ready');
  await page.getByRole('button', { name: 'Back to the couple workspace' }).click();
  await page.getByRole('button', { name: 'Vendors', exact: true }).click();
  await page.getByRole('button', { name: 'Compare quotes' }).click();
  const photography = page.getByRole('row').filter({ hasText: 'Sunday Stories' });
  await expect(photography).toContainText('400 edited photographs');
  await photography.getByRole('button', { name: 'View quote' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Choose this vendor' }).click();
  await expect(page.getByRole('status')).toContainText('Your budget is updated.');
  await page.getByRole('button', { name: 'Budget', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Photography' })).toContainText('$2,800');

  await page.getByRole('button', { name: 'Restart demo' }).click();
  await page.getByRole('button', { name: 'Keep exploring' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Photography' })).toContainText('$2,800');
  await page.getByRole('button', { name: 'Restart demo' }).click();
  await page.getByRole('button', { name: 'Start a fresh demo' }).click();
  await expect(page.getByRole('status')).toContainText('A fresh sample wedding is ready.');
  await expect(page.getByRole('heading', { name: 'Your day. Coming together.' })).toBeVisible();
  const restarted = await page.evaluate(async () => (await fetch('/api/workspace')).json());
  expect(restarted.wedding.id).not.toBe(original.wedding.id);
  expect(restarted.wedding.selections).toHaveLength(0);
  expect(restarted.quotes).toHaveLength(2);

  await page.getByRole('button', { name: 'Try the vendor workspace' }).click();
  await page.getByRole('button', { name: 'Open Meadow & Muse workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Hello, Meadow & Muse.' })).toBeVisible();
  await expect(page.locator('.lead-quote')).toContainText('The candlelit garden collection');
  await page.getByRole('button', { name: 'Restart demo' }).click();
  await page.getByRole('button', { name: 'Start a fresh demo' }).click();
  await expect(page.getByRole('heading', { name: 'Your day. Coming together.' })).toBeVisible();
});

test('mobile navigation, task changes, and empty account onboarding are usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Take a little look around' }).click();
  await expect(page.getByRole('heading', { name: 'Your day. Coming together.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  await page.getByRole('button', { name: 'Add a task' }).click();
  await page.getByLabel('What needs doing?').fill('Order thank you cards');
  await page.getByRole('button', { name: 'Save task' }).click();
  await expect(page.getByText('Order thank you cards', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Complete Order thank you cards', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Reopen Order thank you cards', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Let’s plan your wedding' }).click();
  await page.getByLabel('Your name', { exact: true }).fill('New Couple');
  await page.getByLabel('Email address').fill(`browser-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('test-password-1234');
  await page.getByRole('button', { name: 'Create your account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Let’s make it yours.' })).toBeVisible();
  await page.getByLabel('Your name', { exact: true }).fill('Alex');
  await page.getByLabel('Your partner’s name').fill('Jamie');
  await page.getByLabel('Wedding date', { exact: true }).fill('2027-10-02');
  await page.getByRole('button', { name: 'Create our wedding' }).click();
  await expect(page.getByRole('heading', { name: 'Your day. Coming together.' })).toBeVisible();
  await expect(page.getByText('Alex & Jamie').first()).toBeVisible();
});
