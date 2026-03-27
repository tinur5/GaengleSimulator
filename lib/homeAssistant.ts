import { HaEntityState } from '../types/homeAssistant';

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Fetches a single Home Assistant entity state from the server.
 * Must only be called server-side (route handlers / server utilities).
 * Reads HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN from environment variables.
 */
export async function fetchHaEntity(entityId: string): Promise<HaEntityState> {
  const baseUrl = process.env.HOME_ASSISTANT_URL;
  const token = process.env.HOME_ASSISTANT_TOKEN;

  if (!baseUrl || !token) {
    throw new HaConfigError('HOME_ASSISTANT_URL or HOME_ASSISTANT_TOKEN is not configured');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/states/${entityId}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      // Next.js: short revalidation for near-live energy dashboards
      next: { revalidate: 15 },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new HaTimeoutError(`Request to Home Assistant timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }
    throw new HaNetworkError(`Network error fetching entity ${entityId}: ${String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 || response.status === 403) {
    throw new HaAuthError(`Home Assistant authentication failed (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new HaNetworkError(`Home Assistant returned HTTP ${response.status} for entity ${entityId}`);
  }

  return response.json() as Promise<HaEntityState>;
}

/**
 * Fetches multiple Home Assistant entity states in parallel.
 */
export async function fetchHaEntities(entityIds: string[]): Promise<HaEntityState[]> {
  return Promise.all(entityIds.map((id) => fetchHaEntity(id)));
}

// ---------------------------------------------------------------------------
// Typed error classes
// ---------------------------------------------------------------------------

export class HaConfigError extends Error {
  readonly code = 'ha_unavailable' as const;
  constructor(message: string) {
    super(message);
    this.name = 'HaConfigError';
  }
}

export class HaAuthError extends Error {
  readonly code = 'ha_auth' as const;
  constructor(message: string) {
    super(message);
    this.name = 'HaAuthError';
  }
}

export class HaTimeoutError extends Error {
  readonly code = 'ha_timeout' as const;
  constructor(message: string) {
    super(message);
    this.name = 'HaTimeoutError';
  }
}

export class HaNetworkError extends Error {
  readonly code = 'ha_unavailable' as const;
  constructor(message: string) {
    super(message);
    this.name = 'HaNetworkError';
  }
}

export type HaError = HaConfigError | HaAuthError | HaTimeoutError | HaNetworkError;

export function isHaError(err: unknown): err is HaError {
  return (
    err instanceof HaConfigError ||
    err instanceof HaAuthError ||
    err instanceof HaTimeoutError ||
    err instanceof HaNetworkError
  );
}

export function haErrorCode(
  err: HaError,
): 'ha_unavailable' | 'ha_auth' | 'ha_timeout' | 'unknown' {
  return err.code;
}
