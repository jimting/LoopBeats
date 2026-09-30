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
  await expect(
    page.getByText('Audio recording and playback are coming next.'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
