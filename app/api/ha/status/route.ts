import { NextResponse } from 'next/server';
import { fetchHaEntity, isHaError, haErrorCode } from '../../../../lib/homeAssistant';
import { HA_ENTITY_IDS } from '../../../../lib/haMapper';

// Always dynamic – used for diagnostics, must never be cached
export const dynamic = 'force-dynamic';

/** Maximum characters of the raw URL shown in the response (origin only is used, but kept as safety cap) */
const MAX_DISPLAYED_URL_LENGTH = 40;

interface HaStatusResponse {
  urlConfigured: boolean;
  tokenConfigured: boolean;
  urlValue: string;            // Partial URL shown for confirmation (origin only, no credentials)
  connectionOk: boolean;
  error?: string;
  errorCode?: string;
  timestamp: string;
}

/**
 * Diagnostic endpoint – returns Home Assistant connection status.
 * Never exposes the actual token. Safe to call from any client.
 *
 * GET /api/ha/status
 */
export async function GET(): Promise<NextResponse<HaStatusResponse>> {
  const rawUrl = (process.env.HOME_ASSISTANT_URL ?? '').trim();
  const rawToken = (process.env.HOME_ASSISTANT_TOKEN ?? '').trim();

  const urlConfigured = rawUrl.length > 0;
  const tokenConfigured = rawToken.length > 0;

  // Show only the origin (scheme + host) so the user can verify without exposing the full value
  let urlValue = '(nicht gesetzt)';
  if (urlConfigured) {
    try {
      const parsed = new URL(rawUrl);
      urlValue = parsed.origin;
    } catch {
      urlValue = `(ungültig: "${rawUrl.slice(0, MAX_DISPLAYED_URL_LENGTH)}…")`;
    }
  }

  if (!urlConfigured || !tokenConfigured) {
    return NextResponse.json({
      urlConfigured,
      tokenConfigured,
      urlValue,
      connectionOk: false,
      error: !urlConfigured && !tokenConfigured
        ? 'HOME_ASSISTANT_URL und HOME_ASSISTANT_TOKEN sind nicht gesetzt.'
        : !urlConfigured
          ? 'HOME_ASSISTANT_URL ist nicht gesetzt.'
          : 'HOME_ASSISTANT_TOKEN ist nicht gesetzt.',
      timestamp: new Date().toISOString(),
    });
  }

  // Try to fetch one entity as a live connection test
  try {
    await fetchHaEntity(HA_ENTITY_IDS.pvPower);
    return NextResponse.json({
      urlConfigured,
      tokenConfigured,
      urlValue,
      connectionOk: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const error = isHaError(err) ? err.message : String(err);
    const errorCode = isHaError(err) ? haErrorCode(err) : 'unknown';
    return NextResponse.json({
      urlConfigured,
      tokenConfigured,
      urlValue,
      connectionOk: false,
      error,
      errorCode,
      timestamp: new Date().toISOString(),
    });
  }
}
