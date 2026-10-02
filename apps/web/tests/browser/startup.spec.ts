import { expect, test } from '@playwright/test';

test('the production application opens without runtime errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('LoopBeats');
  await expect(
    page.getByRole('heading', { name: 'LoopBeats', level: 1 }),
  ).toBeVisible();
  for (const name of ['Track 1 · Loop', 'Track 2 · Loop']) {
    await expect(
      page
        .getByRole('region', { name })
        .getByRole('button', { name: 'REC', exact: true }),
    ).toBeDisabled();
  }
  expect(errors).toEqual([]);
});
