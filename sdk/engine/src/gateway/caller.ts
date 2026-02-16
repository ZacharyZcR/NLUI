import type { Endpoint } from '../types.js';
import type { Executor } from '../toolloop/loop.js';

/**
 * GatewayCaller executes HTTP requests against OpenAPI endpoints.
 * Implements the Executor interface for the ToolLoop.
 */
export class GatewayCaller implements Executor {
  private endpoints: Map<string, Endpoint>;

  constructor(endpoints: Map<string, Endpoint>) {
    this.endpoints = endpoints;
  }

  addEndpoints(endpoints: Map<string, Endpoint>) {
    for (const [k, v] of endpoints) this.endpoints.set(k, v);
  }

  hasTool(name: string): boolean {
    return this.endpoints.has(name);
  }

  async execute(toolName: string, argsJSON: string, authToken: string): Promise<string> {
    const ep = this.endpoints.get(toolName);
    if (!ep) throw new Error(`Unknown tool: ${toolName}`);

    const args: Record<string, unknown> = argsJSON ? JSON.parse(argsJSON) : {};

    // Build URL with path parameters
    let urlPath = ep.path;
    for (const p of ep.params) {
      if (p.in === 'path' && p.name in args) {
        urlPath = urlPath.replace(`{${p.name}}`, encodeURIComponent(String(args[p.name])));
        delete args[p.name];
      }
    }
    const fullURL = new URL(urlPath, ep.baseURL.replace(/\/+$/, '') + '/');

    // Query parameters
    for (const p of ep.params) {
      if (p.in === 'query' && p.name in args) {
        fullURL.searchParams.set(p.name, String(args[p.name]));
        delete args[p.name];
      }
    }

    // Request body
    let body: string | undefined;
    if (ep.hasBody && args.body !== undefined) {
      body = JSON.stringify(args.body);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Auth
    const token = authToken || ep.auth.token || '';
    if (ep.auth.type === 'bearer' && token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (ep.auth.type === 'header' && token && ep.auth.headerName) {
      headers[ep.auth.headerName] = token;
    }

    // Header parameters
    for (const p of ep.params) {
      if (p.in === 'header' && p.name in args) {
        headers[p.name] = String(args[p.name]);
      }
    }

    const resp = await fetch(fullURL.toString(), {
      method: ep.method,
      headers,
      body: body ?? undefined,
    });

    const respText = await resp.text();
    if (resp.status >= 400) return `HTTP ${resp.status}: ${respText}`;
    return respText;
  }
}
