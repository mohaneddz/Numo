import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NAVIGATION_COMMANDS, PRACTICE_COMMANDS } from './commandPalette';

/**
 * Every destination the app offers has to exist as a route.
 *
 * The palette, the sidebar and the recommendation cards all navigate by string.
 * Nothing type-checks those against the router, so a renamed or removed route
 * would leave a dead link that only shows up by clicking it.
 */
function registeredRoutes(): string[] {
  const source = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf8');
  return [...source.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]);
}

/** Matches a concrete path against a route pattern, allowing :params. */
function routeExists(path: string, routes: readonly string[]): boolean {
  const pathname = path.split('?')[0];
  return routes.some((route) => {
    const pattern = `^${route
      .replace(/:[^/?]+\?/g, '[^/]*')
      .replace(/:[^/]+/g, '[^/]+')
      .replace(/\/$/, '/?')}$`;
    return new RegExp(pattern).test(pathname);
  });
}

describe('navigation targets', () => {
  const routes = registeredRoutes();

  it('finds the route table', () => {
    expect(routes.length).toBeGreaterThan(20);
  });

  it('registers every palette navigation target', () => {
    for (const command of NAVIGATION_COMMANDS) {
      expect(routeExists(command.to, routes), `${command.label} -> ${command.to}`).toBe(true);
    }
  });

  it('registers every palette practice target', () => {
    for (const command of PRACTICE_COMMANDS) {
      expect(routeExists(command.to, routes), `${command.label} -> ${command.to}`).toBe(true);
    }
  });

  it('registers every sidebar destination', () => {
    const sidebar = readFileSync(resolve(__dirname, '../../components/layout/Sidebar.tsx'), 'utf8');
    const targets = [...sidebar.matchAll(/to:\s*'([^']+)'/g)].map((match) => match[1]);

    expect(targets.length).toBeGreaterThan(5);
    for (const target of targets) {
      expect(routeExists(target, routes), `sidebar -> ${target}`).toBe(true);
    }
  });

  it('rejects a path with no matching route', () => {
    expect(routeExists('/does-not-exist', routes)).toBe(false);
  });

  it('matches routes that take a parameter', () => {
    expect(routeExists('/notebook/abc123', routes)).toBe(true);
  });
});
