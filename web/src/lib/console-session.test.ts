import { describe, expect, it } from 'vitest';

import { toConsoleSession } from './console-session';
import type { Me, Membership, User } from './types';

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'rob@example.com',
    name: 'Rob',
    label: 'brisk-harbor-42',
    locale: null,
    createdAt: '2026-01-01T00:00:00Z',
    disabledAt: null,
    ...overrides
  };
}

function membership(orgSlug: string, role: Membership['role']): Membership {
  return {
    orgId: `id-${orgSlug}`,
    userId: 'u1',
    role,
    orgSlug,
    orgName: `${orgSlug} Inc`,
    plan: 'free'
  };
}

function me(u: User = user(), orgs: Membership[] = []): Me {
  return {
    user: u,
    orgs,
    shouldAddPasskey: false,
    passkeyCount: 1,
    credentialName: 'rob@example.com',
    credentialDisplayName: 'Rob'
  };
}

describe('toConsoleSession', () => {
  const orgs = [membership('acme', 'owner'), membership('globex', 'member')];

  it('maps every membership to a shell org', () => {
    const s = toConsoleSession(me(user(), orgs), undefined, 'https://savvagent.com');
    expect(s.orgs).toEqual([
      { id: 'id-acme', slug: 'acme', name: 'acme Inc', role: 'owner' },
      { id: 'id-globex', slug: 'globex', name: 'globex Inc', role: 'member' }
    ]);
    expect(s.platformUrl).toBe('https://savvagent.com');
  });

  it('takes the current org from the route', () => {
    const s = toConsoleSession(me(user(), orgs), 'globex', 'https://savvagent.com');
    expect(s.currentOrg).toEqual({
      id: 'id-globex',
      slug: 'globex',
      name: 'globex Inc',
      role: 'member'
    });
  });

  it('has no current org off an org page or for an org the user is not in', () => {
    expect(toConsoleSession(me(user(), orgs), undefined, 'https://x.test').currentOrg).toBeNull();
    expect(toConsoleSession(me(user(), orgs), 'initech', 'https://x.test').currentOrg).toBeNull();
  });

  it('passes the name and email through', () => {
    expect(toConsoleSession(me(), undefined, 'https://x.test').user).toEqual({
      id: 'u1',
      email: 'rob@example.com',
      name: 'Rob'
    });
  });

  it('keeps the email as the display name when there is no name', () => {
    const s = toConsoleSession(me(user({ name: null })), undefined, 'https://x.test');
    expect(s.user).toEqual({ id: 'u1', email: 'rob@example.com', name: null });
  });

  it('falls back to the generated label only with neither name nor email', () => {
    const s = toConsoleSession(me(user({ name: null, email: null })), undefined, 'https://x.test');
    expect(s.user).toEqual({ id: 'u1', email: null, name: 'brisk-harbor-42' });
  });
});
