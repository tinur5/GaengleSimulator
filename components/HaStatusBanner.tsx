'use client';

import { HaOverviewPayload } from '../types/homeAssistant';

interface HaStatusBannerProps {
  mode: 'live' | 'simulator';
  liveData: HaOverviewPayload | null;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  isFallback: boolean;
  isStale: boolean;
}

export default function HaStatusBanner({
  mode,
  liveData,
  isLoading,
  hasError,
  errorMessage,
  isFallback,
  isStale,
}: HaStatusBannerProps) {
  if (mode === 'simulator' && !isFallback) {
    // Simulator mode chosen explicitly – show subtle info badge only
    return (
      <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-700">
        <span className="text-base">🧪</span>
        <span>
          <strong>Simulator-Modus:</strong> Berechnete Werte basierend auf Lastprofilen &amp;
          Optimierungsstrategien
        </span>
      </div>
    );
  }

  if (isLoading && !liveData) {
    return (
      <div className="mb-4 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-xs text-indigo-700">
        <span className="animate-spin text-base">⏳</span>
        <span>Live-Daten werden geladen …</span>
      </div>
    );
  }

  if (isFallback || (hasError && mode === 'live')) {
    return (
      <div className="mb-4 flex items-start gap-2 bg-amber-50 border-l-4 border-amber-400 rounded-lg px-4 py-3 text-xs text-amber-800">
        <span className="text-lg mt-0.5">⚠️</span>
        <div>
          <p className="font-bold">Home Assistant nicht erreichbar – Fallback auf Simulator</p>
          {errorMessage && (
            <p className="mt-0.5 text-amber-700 opacity-80">{errorMessage}</p>
          )}
          <p className="mt-1 opacity-70">
            Die angezeigten Werte werden simuliert. Sobald die Verbindung
            wiederhergestellt ist, wechselt das Dashboard automatisch zu Live-Daten.
          </p>
          <p className="mt-1 opacity-70">
            Diagnose:{' '}
            <a
              href="/api/ha/status"
              target="_blank"
              rel="noreferrer"
              className="underline hover:opacity-100"
            >
              /api/ha/status
            </a>{' '}
            aufrufen, um den Verbindungsstatus zu prüfen.
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'live' && liveData) {
    const updatedAt = new Date(liveData.timestamp).toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return (
      <div
        className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-2 text-xs ${
          isStale
            ? 'bg-orange-50 border border-orange-300 text-orange-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}
      >
        <span className={`text-base ${isStale ? '' : 'animate-pulse'}`}>
          {isStale ? '🟠' : '🟢'}
        </span>
        <span>
          {isStale ? (
            <>
              <strong>Veraltete Daten</strong> – letztes Update: {updatedAt}. Bitte prüfen Sie die
              Home Assistant Verbindung.
            </>
          ) : (
            <>
              <strong>Live-Daten</strong> von Home Assistant – aktualisiert: {updatedAt}
            </>
          )}
        </span>
        {isLoading && (
          <span className="ml-auto animate-spin text-sm opacity-60">⏳</span>
        )}
      </div>
    );
  }

  return null;
}
