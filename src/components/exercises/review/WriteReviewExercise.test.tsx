/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../shared/InteractiveText', () => ({
  InteractiveText: ({ text }: { text: string }) => <span>{text}</span>,
}));

const { WriteReviewExercise } = await import('./WriteReviewExercise');

const question = {
  id: 'q1',
  type: 'write' as const,
  term: 'aunque',
  prompt: 'Write the exact meaning.',
  answer: 'although',
};

function setup(overrides: Record<string, unknown> = {}) {
  const onSubmitWrite = vi.fn();
  const onSetText = vi.fn();
  const onSkip = vi.fn();
  const onGrade = vi.fn();

  render(
    <WriteReviewExercise
      question={question}
      done={false}
      checking={false}
      onGrade={onGrade}
      onSubmitWrite={onSubmitWrite}
      onSetText={onSetText}
      onSkip={onSkip}
      {...overrides}
    />,
  );

  return { onSubmitWrite, onSetText, onSkip };
}

afterEach(cleanup);

describe('WriteReviewExercise', () => {
  it('shows the word being asked about', () => {
    // Without this the card asked the learner to type an answer with nothing
    // on screen to answer about.
    setup();
    expect(screen.getByText('aunque')).toBeTruthy();
  });

  it('reports what the learner types', () => {
    const { onSetText } = setup();
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'although' } });
    expect(onSetText).toHaveBeenCalledWith('although');
  });

  it('submits on Enter, as the button label promises', () => {
    const { onSubmitWrite } = setup();
    fireEvent.keyDown(screen.getByLabelText('Your answer'), { key: 'Enter' });
    expect(onSubmitWrite).toHaveBeenCalled();
  });

  it('allows a newline with Shift+Enter instead of submitting', () => {
    const { onSubmitWrite } = setup();
    fireEvent.keyDown(screen.getByLabelText('Your answer'), { key: 'Enter', shiftKey: true });
    expect(onSubmitWrite).not.toHaveBeenCalled();
  });

  it('disables validation while a check is running', () => {
    setup({ checking: true });
    const button = screen.getByText('Validating...').closest('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('offers a skip', () => {
    const { onSkip } = setup();
    fireEvent.click(screen.getByText('Skip (S)'));
    expect(onSkip).toHaveBeenCalled();
  });
});
