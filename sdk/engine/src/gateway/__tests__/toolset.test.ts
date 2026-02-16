import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildTools } from '../builder.js';
import { buildFromToolSet, parseToolSet } from '../toolset.js';
import type { ToolSet } from '../../types.js';

const petstore = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../../testdata/petstore.json'), 'utf-8'),
);

describe('parseToolSet', () => {
  it('parses valid JSON', () => {
    const ts = parseToolSet(JSON.stringify({
      version: 1,
      target: 'test',
      base_url: 'http://x',
      auth: { type: 'bearer', token: 'tok' },
      endpoints: [],
    }));
    expect(ts.version).toBe(1);
    expect(ts.target).toBe('test');
    expect(ts.endpoints).toHaveLength(0);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseToolSet('{bad')).toThrow();
  });
});

describe('buildFromToolSet round-trip', () => {
  // Build from OpenAPI first
  const auth = { type: 'bearer' as const, token: 'secret' };
  const orig = buildTools(petstore as Record<string, unknown>, 'petstore', 'http://localhost:8080', auth);

  // Convert to ToolSet format
  const ts: ToolSet = {
    version: 1,
    target: 'petstore',
    base_url: 'http://localhost:8080',
    auth,
    endpoints: orig.tools.map(tool => {
      const ep = orig.endpoints.get(tool.function.name)!;
      return {
        name: tool.function.name,
        description: tool.function.description,
        method: ep.method,
        path: ep.path,
        params: ep.params,
        has_body: ep.hasBody,
        parameters: tool.function.parameters,
      };
    }),
  };

  const { tools, endpoints } = buildFromToolSet(ts);

  it('preserves tool count', () => {
    expect(tools).toHaveLength(orig.tools.length);
    expect(endpoints.size).toBe(orig.endpoints.size);
  });

  it('preserves tool names and descriptions', () => {
    for (let i = 0; i < tools.length; i++) {
      expect(tools[i].function.name).toBe(orig.tools[i].function.name);
      expect(tools[i].function.description).toBe(orig.tools[i].function.description);
    }
  });

  it('preserves endpoint routing info', () => {
    for (const [name, origEp] of orig.endpoints) {
      const ep = endpoints.get(name);
      expect(ep).toBeDefined();
      expect(ep!.method).toBe(origEp.method);
      expect(ep!.path).toBe(origEp.path);
      expect(ep!.hasBody).toBe(origEp.hasBody);
      expect(ep!.auth.type).toBe(origEp.auth.type);
      expect(ep!.auth.token).toBe(origEp.auth.token);
    }
  });

  it('preserves param info', () => {
    const origGetPet = orig.endpoints.get('petstore__getPet')!;
    const getPet = endpoints.get('petstore__getPet')!;
    expect(getPet.params).toHaveLength(origGetPet.params.length);
    expect(getPet.params[0].name).toBe('id');
    expect(getPet.params[0].in).toBe('path');
    expect(getPet.params[0].required).toBe(true);
  });
});

describe('buildFromToolSet empty', () => {
  it('handles empty endpoints', () => {
    const ts: ToolSet = {
      version: 1, target: 'x', base_url: 'http://x',
      auth: { type: '' }, endpoints: [],
    };
    const { tools, endpoints } = buildFromToolSet(ts);
    expect(tools).toHaveLength(0);
    expect(endpoints.size).toBe(0);
  });
});
