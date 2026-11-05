import { afterEach, describe, expect, it, vi } from 'vitest';

import { SERVICES } from './services';
import { shellOrigin, shellServices } from './shell';

afterEach(() => vi.restoreAllMocks());

describe('shellOrigin', () => {
  it('keeps an origin the shell accepts', () => {
    expect(shellOrigin('https://console.example.com')).toBe('https://console.example.com');
    expect(shellOrigin('http://localhost:5173')).toBe('http://localhost:5173');
  });

  it('falls back to the production origin, and says so, for one it would refuse', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(shellOrigin('http://10.0.0.5:8080')).toBe('https://savvagent.com');
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('shellServices', () => {
  it('is every listed service, with the list URL on the platform', () => {
    const { services, listUrl } = shellServices('https://savvagent.com');
    expect(services.map((s) => s.slug)).toEqual(SERVICES.map((s) => s.slug));
    expect(listUrl.href).toBe('https://savvagent.com/services/v1.json');
  });
});
