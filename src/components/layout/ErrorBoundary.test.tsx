/**
 * @vitest-environment jsdom
 *
 * Error boundaries only engage in a real DOM render — server rendering never
 * calls getDerivedStateFromError, so the thrown error escapes and the test
 * proves nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): JSX.Element {
  throw new Error('exercise payload was malformed');
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // React logs every caught error; the boundary is what is under test.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary scope="page">
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('catches a throwing child instead of letting it blank the window', () => {
    render(
      <ErrorBoundary scope="page">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('This page ran into a problem')).toBeTruthy();
  });

  it('shows the actual error message so the failure is identifiable', () => {
    render(
      <ErrorBoundary scope="page">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('exercise payload was malformed')).toBeTruthy();
  });

  it('offers a way back to Home from a page failure', () => {
    render(
      <ErrorBoundary scope="page">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Back to Home')).toBeTruthy();
  });

  it('offers only a reload at the app level, where there is no shell left', () => {
    render(
      <ErrorBoundary scope="app">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Numo ran into a problem')).toBeTruthy();
    expect(screen.queryByText('Back to Home')).toBeNull();
    expect(screen.getByText('Reload')).toBeTruthy();
  });

  it('reassures the learner that saved progress survives', () => {
    render(
      <ErrorBoundary scope="app">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/progress is untouched/)).toBeTruthy();
  });

  it('clears the error when the learner navigates to another page', () => {
    const { rerender } = render(
      <ErrorBoundary scope="page" resetKey="/broken">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('This page ran into a problem')).toBeTruthy();

    rerender(
      <ErrorBoundary scope="page" resetKey="/home">
        <p>Recovered</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Recovered')).toBeTruthy();
  });

  it('stays in the error state while the learner remains on the same page', () => {
    const { rerender } = render(
      <ErrorBoundary scope="page" resetKey="/broken">
        <Boom />
      </ErrorBoundary>,
    );
    rerender(
      <ErrorBoundary scope="page" resetKey="/broken">
        <p>Should not appear</p>
      </ErrorBoundary>,
    );
    expect(screen.queryByText('Should not appear')).toBeNull();
  });
});
