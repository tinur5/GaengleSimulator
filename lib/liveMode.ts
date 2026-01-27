/**
 * Live-Modus für Echtzeit-Simulation
 * 
 * Ermöglicht das Abspielen der Simulation in Echtzeit
 * mit verschiedenen Geschwindigkeiten (1x, 2x, 5x, 10x)
 */

export type LiveModeSpeed = 1 | 2 | 5 | 10;

export interface LiveModeState {
  isActive: boolean;
  speed: LiveModeSpeed;
  currentHour: number;
  currentDate: Date;
  isPaused: boolean;
}

export const DEFAULT_LIVE_MODE_STATE: LiveModeState = {
  isActive: false,
  speed: 1,
  currentHour: new Date().getHours(),
  currentDate: new Date(),
  isPaused: false,
};

/**
 * Berechnet die Verzögerung in Millisekunden basierend auf der Geschwindigkeit
 * Bei 1x = 1 Stunde dauert 3600 Sekunden (real time)
 * Für die Simulation: 1 Stunde = 1 Sekunde bei 1x
 */
export function getUpdateInterval(speed: LiveModeSpeed): number {
  const baseInterval = 1000; // 1 Sekunde = 1 Stunde
  return baseInterval / speed;
}

/**
 * Aktualisiert die Uhrzeit basierend auf der Geschwindigkeit
 */
export function advanceTime(currentState: LiveModeState): LiveModeState {
  const newHour = (currentState.currentHour + 1) % 24;
  const newDate = new Date(currentState.currentDate);
  
  // Wenn wir bei Stunde 0 ankommen, gehen wir zum nächsten Tag
  if (newHour === 0) {
    newDate.setDate(newDate.getDate() + 1);
  }
  
  return {
    ...currentState,
    currentHour: newHour,
    currentDate: newDate,
  };
}

/**
 * Berechnet wie viele Stunden seit einem Startpunkt vergangen sind
 */
export function calculateElapsedHours(startDate: Date, currentDate: Date): number {
  const diff = currentDate.getTime() - startDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60));
}
