import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildTools } from '../builder.js';

const petstore = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../../testdata/petstore.json'), 'utf-8'),
);

describe('buildTools', () => {
  const { tools, endpoints } = buildTools(
    petstore as Record<string, unknown>,
    'petstore',
    'http://localhost:8080',
    { type: 'bearer', token: 'tok' },
  );

  it('generates correct number of tools', () => {
    expect(tools).toHaveLength(5); // 4 API + set_auth
    expect(endpoints.size).toBe(4);
  });

  it('generates correct tool names', () => {
    const names = tools.map(t => t.function.name);
    expect(names).toContain('petstore__listPets');
    expect(names).toContain('petstore__createPet');
    expect(names).toContain('petstore__getPet');
    expect(names).toContain('petstore__deletePet');
  });

  it('sets correct endpoint fields', () => {
    const ep = endpoints.get('petstore__getPet');
    expect(ep).toBeDefined();
    expect(ep!.method).toBe('GET');
    expect(ep!.path).toBe('/api/pets/{id}');
    expect(ep!.auth.type).toBe('bearer');
    expect(ep!.auth.token).toBe('tok');
    expect(ep!.hasBody).toBe(false);
  });

  it('detects path parameters', () => {
    const ep = endpoints.get('petstore__getPet')!;
    const pathParam = ep.params.find(p => p.name === 'id' && p.in === 'path');
    expect(pathParam).toBeDefined();
    expect(pathParam!.required).toBe(true);
  });

  it('detects query parameters', () => {
    const ep = endpoints.get('petstore__listPets')!;
    const limitParam = ep.params.find(p => p.name === 'limit' && p.in === 'query');
    expect(limitParam).toBeDefined();
  });

  it('detects request body', () => {
    const ep = endpoints.get('petstore__createPet')!;
    expect(ep.hasBody).toBe(true);
  });

  it('includes description from summary', () => {
    const listTool = tools.find(t => t.function.name === 'petstore__listPets')!;
    expect(listTool.function.description).toBe('获取宠物列表');
  });

  it('generates parameters schema', () => {
    const createTool = tools.find(t => t.function.name === 'petstore__createPet')!;
    const params = createTool.function.parameters as Record<string, unknown>;
    expect(params.type).toBe('object');
    const props = params.properties as Record<string, unknown>;
    expect(props.body).toBeDefined();
  });
});

describe('buildTools edge cases', () => {
  it('handles empty paths', () => {
    const { tools } = buildTools({}, 'test', 'http://x', { type: '' });
    expect(tools).toHaveLength(0);
  });

  it('handles missing operationId', () => {
    const spec = {
      paths: {
        '/items': {
          get: { summary: 'list items' },
        },
      },
    };
    const { tools } = buildTools(spec, 'api', 'http://x', { type: '' });
    expect(tools).toHaveLength(2); // 1 API + set_auth
    expect(tools[0].function.name).toBe('api__get_items');
  });

  it('sanitizes non-ASCII target names', () => {
    const spec = { paths: { '/x': { get: { operationId: 'test' } } } };
    const { tools } = buildTools(spec, '中文名', 'http://x', { type: '' });
    expect(tools[0].function.name).toBe('target__test');
  });

  it('resolves $ref in parameters', () => {
    const spec = {
      paths: {
        '/items': {
          get: {
            operationId: 'listItems',
            parameters: [
              { $ref: '#/components/parameters/PageSize' },
            ],
          },
        },
      },
      components: {
        parameters: {
          PageSize: {
            name: 'page_size',
            in: 'query',
            schema: { type: 'integer' },
          },
        },
      },
    };
    const { endpoints } = buildTools(spec, 'api', 'http://x', { type: '' });
    const ep = endpoints.get('api__listItems')!;
    expect(ep.params).toHaveLength(1);
    expect(ep.params[0].name).toBe('page_size');
  });
});
