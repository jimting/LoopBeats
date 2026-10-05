import { render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { App } from './App';

test('opens a clearly identified loopstation shell without claiming audio is ready', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'LoopBeats', level: 1 }),
  ).toBeVisible();
  for (const name of ['Track 1 · Loop', 'Track 2 · Loop']) {
    const track = within(screen.getByRole('region', { name }));
    expect(track.getByTestId('track-state')).toHaveTextContent('Empty');
    expect(track.getByRole('button', { name: /REC\/PLAY/ })).toBeDisabled();
  }
});
