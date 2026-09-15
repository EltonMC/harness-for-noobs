import { describe, expect, it } from 'vitest';
import headersFile from '../public/_headers?raw';

// Guards the security headers Cloudflare serves for every route (ADR 0015).
function headersFor(route: string): Map<string, string> {
  const headers = new Map<string, string>();
  let current: string | null = null;
  for (const line of headersFile.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = line.trim();
      continue;
    }
    if (current !== route) continue;
    const separator = line.indexOf(':');
    headers.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }
  return headers;
}

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter((tokens) => tokens[0])
      .map(([name = '', ...values]) => [name, values]),
  );
}

describe('security headers', () => {
  const headers = headersFor('/*');
  const policy = directives(headers.get('content-security-policy') ?? '');

  it('restricts scripts, framing, plugins, and base URLs', () => {
    expect(policy.get('default-src')).toEqual(["'self'"]);
    expect(policy.get('script-src')).toEqual(["'self'"]);
    expect(policy.get('frame-ancestors')).toEqual(["'none'"]);
    expect(policy.get('object-src')).toEqual(["'none'"]);
    expect(policy.get('base-uri')).toEqual(["'self'"]);
    for (const values of policy.values()) {
      expect(values).not.toContain("'unsafe-eval'");
      expect(values).not.toContain('*');
    }
  });

  it('sends HTTPS, sniffing, framing, referrer, and permission protections', () => {
    expect(Number(headers.get('strict-transport-security')?.match(/max-age=(\d+)/)?.[1])).toBeGreaterThanOrEqual(
      31536000,
    );
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('x-frame-options')).toBe('DENY');
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('permissions-policy')).toContain('camera=()');
  });
});
