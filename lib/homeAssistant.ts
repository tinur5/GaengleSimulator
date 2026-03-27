import { HaEntityState } from '../types/homeAssistant';

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Fetches a single Home Assistant entity state from the server.
 * Must only be called server-side (route handlers / server utilities).
 * Reads HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN from environment variables.
 */
export async function fetchHaEntity(entityId: string): Promise<HaEntityState> {
  const baseUrl = (process.env.HOME_ASSISTANT_URL ?? '').trim();
  const token = (process.env.HOME_ASSISTANT_TOKEN ?? '').trim();

  if (!baseUrl && !token) {
    throw new HaConfigError(
      'Umgebungsvariablen HOME_ASSISTANT_URL und HOME_ASSISTANT_TOKEN sind nicht gesetzt.',
    );
  }
  if (!baseUrl) {
    throw new HaConfigError(
      'Umgebungsvariable HOME_ASSISTANT_URL ist nicht gesetzt.',
    );
  }
  if (!token) {
    throw new HaConfigError(
      'Umgebungsvariable HOME_ASSISTANT_TOKEN ist nicht gesetzt.',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new HaConfigError(
      `HOME_ASSISTANT_URL ist keine gültige URL: "${baseUrl}". Beispiel: https://homeassistant.local:8123`,
    );
  }

  const url = `${parsedUrl.href.replace(/\/$/, '')}/api/states/${entityId}`;

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
      const timeoutSec = DEFAULT_TIMEOUT_MS / 1000;
      throw new HaTimeoutError(`Verbindung zu Home Assistant hat nach ${timeoutSec}s das Zeitlimit überschritten. Bitte prüfen Sie, ob Home Assistant erreichbar ist.`);
    }
    throw new HaNetworkError(`Netzwerkfehler beim Abruf von "${entityId}": ${String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 || response.status === 403) {
    throw new HaAuthError(`Home Assistant Authentifizierung fehlgeschlagen (HTTP ${response.status}). Bitte prüfen Sie den Access Token.`);
  }

  if (response.status === 404) {
    throw new HaNetworkError(`Sensor "${entityId}" nicht in Home Assistant gefunden (HTTP 404). Bitte prüfen Sie die Sensor-IDs.`);
  }

  if (!response.ok) {
    throw new HaNetworkError(`Home Assistant antwortete mit HTTP ${response.status} für Sensor "${entityId}".`);
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
