/**
 * Warm the HTTP cache for monitor-adjacent clips so first playback after navigation is snappy.
 * Playback paths today use Web Audio oscillators; assets support future HTMLAudio / Buffer hooks.
 */
const MONITOR_SOUND_URLS = [
  '/sounds/sqr-beep.wav',
  '/sounds/leads-off-chirp.wav',
] as const;

export function preloadMonitorSounds(): void {
  if (typeof window === 'undefined') return;
  for (const url of MONITOR_SOUND_URLS) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
  }
}
