/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('./InteractiveText', () => ({
  InteractiveText: ({ text }: { text: string }) => <span>{text}</span>,
}));

const { ExerciseShell } = await import('./ExerciseShell');

afterEach(cleanup);

describe('ExerciseShell', () => {
  it('renders the title, prompt and children', () => {
    render(
      <ExerciseShell title="Meaning Selection" prompt="What does this mean?">
        <p>Options</p>
      </ExerciseShell>,
    );

    expect(screen.getByText('Meaning Selection')).toBeTruthy();
    expect(screen.getByText('What does this mean?')).toBeTruthy();
    expect(screen.getByText('Options')).toBeTruthy();
  });

  it('shows the pronunciation hint when the content carries one', () => {
    // Generated content has always carried a scriptHint; nothing rendered it,
    // so a learner of a non-Latin script never saw the reading produced for
    // them.
    render(
      <ExerciseShell title="Reading" prompt="你好" scriptHint="nǐ hǎo">
        <p>Body</p>
      </ExerciseShell>,
    );

    expect(screen.getByText('nǐ hǎo')).toBeTruthy();
  });

  it('renders nothing extra when there is no pronunciation to show', () => {
    const { container } = render(
      <ExerciseShell title="Reading" prompt="casa">
        <p>Body</p>
      </ExerciseShell>,
    );

    expect(container.querySelector('.italic')).toBeNull();
  });

  it('omits the progress badge when no progress is given', () => {
    render(
      <ExerciseShell title="Reading">
        <p>Body</p>
      </ExerciseShell>,
    );
    expect(screen.queryByText(/\d+\s*\/\s*\d+/)).toBeNull();
  });
});
