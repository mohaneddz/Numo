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

describe('every review card shows what is being asked about', () => {
  it('renders the term on the choice card', async () => {
    const { MultipleReviewExercise } = await import('./MultipleReviewExercise');
    render(
      <MultipleReviewExercise
        question={{ ...question, type: 'multiple', options: ['although', 'because'], correctIndex: 0 }}
        done={false}
        checking={false}
        onGrade={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    expect(screen.getByText('aunque')).toBeTruthy();
  });

  it('renders the term on the build card', async () => {
    const { BuildReviewExercise } = await import('./BuildReviewExercise');
    render(
      <BuildReviewExercise
        question={{ ...question, type: 'build', bank: ['al', 'though'] }}
        done={false}
        checking={false}
        onGrade={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    expect(screen.getByText('aunque')).toBeTruthy();
  });

  it('renders the statement on the true/false card', async () => {
    const { TrueFalseReviewExercise } = await import('./TrueFalseReviewExercise');
    render(
      <TrueFalseReviewExercise
        question={{ ...question, type: 'tf', statement: '"aunque" means "although".', correctBool: true }}
        done={false}
        checking={false}
        onGrade={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    expect(screen.getByText('"aunque" means "although".')).toBeTruthy();
  });
});
