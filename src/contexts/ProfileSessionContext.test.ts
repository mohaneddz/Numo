import { describe, expect, it } from 'vitest';
import { PersistenceUnavailableError } from '../persistence';
import { mapProfileSessionBootstrapError } from './ProfileSessionContext';

describe('mapProfileSessionBootstrapError', () => {
  it('maps PersistenceUnavailableError to unsupported_runtime in browser mode', () => {
    const mapped = mapProfileSessionBootstrapError(new PersistenceUnavailableError(), false);
    expect(mapped.status).toBe('unsupported_runtime');
    expect(mapped.message).toContain('Tauri runtime');
  });

  it('maps PersistenceUnavailableError to error in tauri mode', () => {
    const mapped = mapProfileSessionBootstrapError(new PersistenceUnavailableError(), true);
    expect(mapped.status).toBe('error');
    expect(mapped.message).toContain('failed inside Tauri runtime');
  });

  it('maps unknown errors to generic error status', () => {
    const mapped = mapProfileSessionBootstrapError(new Error('boom'), false);
    expect(mapped.status).toBe('error');
    expect(mapped.message).toBe('boom');
  });
});
