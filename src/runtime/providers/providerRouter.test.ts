import { describe, expect, it, vi } from 'vitest';
import { ProviderRouter } from './providerRouter';
import type { LlmGenerateRequest, LlmProvider } from './types';

const request: LlmGenerateRequest = {
  messages: [{ role: 'user', content: 'Hello' }],
};

function provider(id: string, isLocal: boolean, text: string): LlmProvider {
  return {
    id,
    displayName: id,
    isLocal,
    listCapabilities: () => [{ modality: 'llm', model: id, tags: [] }],
    complete: vi.fn(async () => ({ text, model: id, providerId: id })),
  };
}

describe('ProviderRouter connectivity policy', () => {
  it('uses the online primary provider by default', async () => {
    const router = new ProviderRouter();
    router.registerLlmProvider(provider('cloud', false, 'online'), { primaryFor: ['llm'] });
    router.registerLlmProvider(provider('local', true, 'offline'));

    await expect(router.complete(request)).resolves.toMatchObject({
      text: 'online',
      providerId: 'cloud',
    });
  });

  it('never calls a remote provider in offline mode', async () => {
    const router = new ProviderRouter();
    const cloud = provider('cloud', false, 'online');
    const local = provider('local', true, 'offline');
    router.registerLlmProvider(cloud, { primaryFor: ['llm'] });
    router.registerLlmProvider(local);
    router.setConnectivityMode('offline');

    await expect(router.complete(request)).resolves.toMatchObject({
      text: 'offline',
      providerId: 'local',
    });
    expect(cloud.complete).not.toHaveBeenCalled();
    expect(local.complete).toHaveBeenCalledOnce();
  });
});

