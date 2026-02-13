import { useState, useEffect, useRef } from 'react';
import type { EngineConfig, NLUIEngine } from './types.js';
import { createEngine } from './engine.js';
import { createClientAdapter } from './adapter.js';

/**
 * React hook that initializes an NLUIEngine and returns a client-compatible adapter.
 * Drop the result straight into <ChatInterface client={client} />.
 *
 * ```tsx
 * import { useNLUIEngine } from '@nlui/engine/react';
 * import { ChatInterface } from '@nlui/react-ui';
 *
 * function App() {
 *   const client = useNLUIEngine({
 *     llm: { apiBase: 'https://api.openai.com/v1', apiKey: 'sk-xxx', model: 'gpt-4' },
 *     targets: [{ name: 'petstore', spec: 'https://petstore.swagger.io/v2/swagger.json' }],
 *   });
 *
 *   if (!client) return <div>Loading engine...</div>;
 *   return <ChatInterface client={client} />;
 * }
 * ```
 */
export function useNLUIEngine(config: EngineConfig) {
  const [client, setClient] = useState<ReturnType<typeof createClientAdapter> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    createEngine(config)
      .then(engine => setClient(createClientAdapter(engine)))
      .catch(setError);
  }, []); // config is intentionally excluded — engine is init-once

  return { client, error };
}

/**
 * Lower-level hook that exposes the raw NLUIEngine instance.
 * Use this if you need direct engine access (tools, conversations, etc).
 */
export function useEngine(config: EngineConfig) {
  const [engine, setEngine] = useState<NLUIEngine | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    createEngine(config)
      .then(setEngine)
      .catch(setError);
  }, []);

  return { engine, error };
}
