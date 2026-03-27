import { NextResponse } from 'next/server';
import { fetchHaEntities, isHaError, haErrorCode } from '../../../../lib/homeAssistant';
import { HA_ENTITY_ID_LIST, mapHaStatesToOverview } from '../../../../lib/haMapper';
import { HaEntityState, HaErrorResponse } from '../../../../types/homeAssistant';

// Revalidate every 15 seconds on Vercel (ISR / edge cache)
export const revalidate = 15;

export async function GET(): Promise<NextResponse> {
  try {
    const entityStates: HaEntityState[] = await fetchHaEntities(HA_ENTITY_ID_LIST);

    // Build a lookup map entityId → state
    const stateMap: Record<string, HaEntityState> = {};
    for (const entity of entityStates) {
      stateMap[entity.entity_id] = entity;
    }

    const payload = mapHaStatesToOverview(stateMap);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    if (isHaError(err)) {
      const errorBody: HaErrorResponse = {
        error: err.message,
        code: haErrorCode(err),
        timestamp: new Date().toISOString(),
      };
      const status = err.code === 'ha_auth' ? 401 : 503;
      return NextResponse.json(errorBody, { status });
    }

    // Unexpected error
    const errorBody: HaErrorResponse = {
      error: 'Unexpected server error',
      code: 'unknown',
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
