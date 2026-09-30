import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { App } from './App';

test('opens a clearly identified loopstation shell without claiming audio is ready', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'LoopBeats', level: 1 }),
  ).toBeVisible();
  expect(
    screen.getByText('Audio recording and playback are coming next.'),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: /record|play/i }),
  ).not.toBeInTheDocument();
});
