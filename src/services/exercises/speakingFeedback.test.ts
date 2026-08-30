import { describe, expect, it } from 'vitest';
import { parseSpeakingFeedback } from './speakingFeedback';

describe('parseSpeakingFeedback', () => {
  it('accepts a well-formed response', () => {
    const result = parseSpeakingFeedback('{"accuracy":82,"fluency":74,"tip":"Soften the r."}');
    expect(result).toEqual({ accuracy: 82, fluency: 74, tip: 'Soften the r.' });
  });

  it('reads a response wrapped in prose or a fence', () => {
    expect(parseSpeakingFeedback('```json\n{"accuracy":90,"fluency":90,"tip":"Good"}\n```')).toEqual(
      { accuracy: 90, fluency: 90, tip: 'Good' },
    );
    expect(parseSpeakingFeedback('Here: {"accuracy":50,"fluency":50,"tip":"Ok"} done')).toEqual({
      accuracy: 50,
      fluency: 50,
      tip: 'Ok',
    });
  });

  it('refuses an unreadable response instead of assuming a pass', () => {
    // This path used to invent accuracy 80 / fluency 75 and "Great job!" and
    // save it as a real result.
    expect(parseSpeakingFeedback('I could not evaluate that.')).toBeNull();
    expect(parseSpeakingFeedback('{"accuracy":')).toBeNull();
    expect(parseSpeakingFeedback('')).toBeNull();
  });

  it('refuses a response missing a score rather than defaulting to 75', () => {
    expect(parseSpeakingFeedback('{"fluency":80,"tip":"x"}')).toBeNull();
    expect(parseSpeakingFeedback('{"accuracy":80,"tip":"x"}')).toBeNull();
  });

  it('refuses scores outside the range they are supposed to be in', () => {
    expect(parseSpeakingFeedback('{"accuracy":140,"fluency":80,"tip":"x"}')).toBeNull();
    expect(parseSpeakingFeedback('{"accuracy":-5,"fluency":80,"tip":"x"}')).toBeNull();
  });

  it('refuses a non-numeric score', () => {
    expect(parseSpeakingFeedback('{"accuracy":"great","fluency":80,"tip":"x"}')).toBeNull();
  });

  it('accepts numeric scores sent as strings', () => {
    expect(parseSpeakingFeedback('{"accuracy":"82","fluency":"74","tip":"x"}')?.accuracy).toBe(82);
  });

  it('rounds fractional scores', () => {
    expect(parseSpeakingFeedback('{"accuracy":82.6,"fluency":74.2,"tip":"x"}')).toEqual({
      accuracy: 83,
      fluency: 74,
      tip: 'x',
    });
  });

  it('says nothing rather than inventing encouragement when no tip came back', () => {
    const result = parseSpeakingFeedback('{"accuracy":80,"fluency":80}');
    expect(result?.tip).toBe('No specific tip was returned for this attempt.');
  });

  it('accepts the boundary scores', () => {
    expect(parseSpeakingFeedback('{"accuracy":0,"fluency":100,"tip":"x"}')).toEqual({
      accuracy: 0,
      fluency: 100,
      tip: 'x',
    });
  });
});
