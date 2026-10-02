import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { App } from './App';

test('opens a clearly identified loopstation shell without claiming audio is ready', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'LoopBeats', level: 1 }),
  ).toBeVisible();
  expect(screen.getByTestId('track-state')).toHaveTextContent('Empty');
  expect(screen.getByRole('button', { name: 'REC' })).toBeDisabled();
});
