/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('./InteractiveText', () => ({
  InteractiveText: ({ text }: { text: string }) => <span>{text}</span>,
}));

const { HintSection } = await import('./HintSection');

const input = {
  expectedAnswer: 'although',
  languageCode: 'es',
  teachingNote: 'Introduces a contrast.',
  translation: 'although',
};

afterEach(cleanup);

describe('HintSection', () => {
  it('reveals nothing until asked', () => {
    render(<HintSection {...input} />);
    expect(screen.queryByText('Introduces a contrast.')).toBeNull();
  });

  it('reveals one level at a time', () => {
    render(<HintSection {...input} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    expect(screen.getByText('Introduces a contrast.')).toBeTruthy();
  });

  it('reports the level opened so grading can account for the support', () => {
    const onHintLevelOpened = vi.fn();
    render(<HintSection {...input} onHintLevelOpened={onHintLevelOpened} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onHintLevelOpened).toHaveBeenCalledWith(1);
  });

  it('offers no way to open hints once the task is answered', () => {
    render(<HintSection {...input} disabled />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('starts closed again for a freshly mounted task', () => {
    // The session pages key the exercise by task id so this component
    // remounts. Without that key React reused the instance and the ladder
    // stayed open on the next question — showing help the learner never asked
    // for, while the signal still recorded "no hint used".
    const first = render(<HintSection {...input} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Introduces a contrast.')).toBeTruthy();
    first.unmount();

    render(<HintSection {...input} teachingNote="A different note." />);
    expect(screen.queryByText('A different note.')).toBeNull();
  });

  it('renders nothing when there is no hint to give', () => {
    const { container } = render(<HintSection expectedAnswer="" languageCode="es" />);
    expect(container.textContent).toBe('');
  });
});
