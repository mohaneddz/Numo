import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroqProvider } from './groqProvider';

describe('GroqProvider saved online configuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rotates saved keys and uses the selected online model', async () => {
    const settings = {
      ai: {
        'GROQ APIs': ['first-key', 'second-key'],
        'Groq Base URL': 'https://provider.example/v1',
        'Online Chat Model': 'selected-chat-model',
      },
    };
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => key === 'numo_settings_state_v1'
        ? JSON.stringify(settings)
        : null,
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: { message: 'quota reached' } }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({
          choices: [{ message: { content: 'ready' } }],
          usage: { total_tokens: 3 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new GroqProvider();
    const response = await provider.complete({
      messages: [{ role: 'user', content: 'test' }],
      maxTokens: 8,
    });

    expect(response.text).toBe('ready');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer first-key',
    });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer second-key',
    });
    const requestBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(requestBody.model).toBe('selected-chat-model');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://provider.example/v1/chat/completions');
  });
});
