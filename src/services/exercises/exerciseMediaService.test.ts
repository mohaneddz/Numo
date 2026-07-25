import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveExerciseImage } from './exerciseMediaService';

const completeWithEchoMock = vi.fn();
const imageSearchMock = vi.fn();

const mediaCacheStore: Record<string, unknown> = {};
const getJsonMock = vi.fn(async (_key?: string) => mediaCacheStore);
const setJsonMock = vi.fn(async (_key: string, value: Record<string, unknown>, _namespace?: string) => {
  Object.keys(mediaCacheStore).forEach((entry) => delete mediaCacheStore[entry]);
  Object.assign(mediaCacheStore, value);
});

vi.mock('../aiProvider', () => ({
  completeWithEcho: (...args: unknown[]) => completeWithEchoMock(...args),
}));

vi.mock('../../utils/webSearch', () => ({
  imageSearch: (...args: unknown[]) => imageSearchMock(...args),
}));

vi.mock('../../persistence', () => ({
  initializePersistence: async () => ({
    repositories: {
      settings: {
        getJson: (key: string) => getJsonMock(key),
        setJson: (key: string, value: Record<string, unknown>, namespace?: string) => setJsonMock(key, value, namespace),
      },
    },
  }),
}));

describe('resolveExerciseImage', () => {
  beforeEach(() => {
    completeWithEchoMock.mockReset();
    imageSearchMock.mockReset();
    getJsonMock.mockClear();
    setJsonMock.mockClear();
    Object.keys(mediaCacheStore).forEach((entry) => delete mediaCacheStore[entry]);
  });

  it('uses imageSearch with sanitized query input and returns search result', async () => {
    completeWithEchoMock.mockResolvedValue('{"query":"[[Katze]] object photo"}');
    imageSearchMock.mockResolvedValue([
      {
        title: 'Cat',
        url: 'https://upload.wikimedia.org/example-cat.jpg',
        snippet: 'cat photo',
        source: 'wikimedia',
        domain: 'image',
        thumbnail: 'https://upload.wikimedia.org/example-cat-thumb.jpg',
        image: {},
      },
    ]);

    const result = await resolveExerciseImage({
      languageCode: 'de',
      concept: '[[Katze]]',
      prompt: "What do we call the thing in this picture in [[German]]?",
      fallbackLabel: '[[Katze]]',
    });

    expect(imageSearchMock).toHaveBeenCalled();
    const firstQuery = String(imageSearchMock.mock.calls[0]?.[0] ?? '');
    expect(firstQuery).not.toContain('[[');
    expect(firstQuery).toContain('Katze');
    expect(result.imageUrl).toBe('https://upload.wikimedia.org/example-cat.jpg');
    expect(result.attribution).toContain('wikimedia');
    expect(setJsonMock).toHaveBeenCalledTimes(1);
  });

  it('retries with alternate query candidates when the planned query returns no images', async () => {
    completeWithEchoMock.mockResolvedValue('{"query":"too specific query"}');
    imageSearchMock.mockImplementation(async (query: string) => {
      if (query.includes('isolated object')) {
        return [
          {
            title: 'Cat isolated',
            url: 'https://upload.wikimedia.org/cat-isolated.jpg',
            snippet: 'cat isolated',
            source: 'wikimedia',
            domain: 'image',
            thumbnail: 'https://upload.wikimedia.org/cat-isolated-thumb.jpg',
            image: {},
          },
        ];
      }
      return [];
    });

    const result = await resolveExerciseImage({
      languageCode: 'de',
      concept: '[[Katze]]',
      prompt: 'Which word matches the object in this image?',
      fallbackLabel: '[[Katze]]',
    });

    expect(imageSearchMock.mock.calls.length).toBeGreaterThan(1);
    expect(result.imageUrl).toBe('https://upload.wikimedia.org/cat-isolated.jpg');
    expect(result.query).toContain('isolated object');
  });

  it('falls back to a built-in offline visual after search attempts fail', async () => {
    completeWithEchoMock.mockResolvedValue('{"query":"no result query"}');
    imageSearchMock.mockResolvedValue([]);

    const result = await resolveExerciseImage({
      languageCode: 'de',
      concept: '[[Katze]]',
      prompt: 'Look at the image and choose the matching German word.',
      fallbackLabel: '[[Katze]]',
    });

    expect(imageSearchMock).toHaveBeenCalled();
    expect(result.imageUrl).toBe('/continue_learning.png');
    expect(result.attribution).toBe('Built-in offline visual');
  });
});
