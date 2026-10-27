// Aviso de fin de descanso: vibración (Android) y un pitido corto (también iPhone, que no vibra desde la web).

let ctx: AudioContext | null = null;

/** Se llama en un toque del usuario: los navegadores solo dejan sonar audio que el usuario "desbloqueó". */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

function beep(at: number, freq: number, dur: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.4, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

export function restFinished() {
  try {
    navigator.vibrate?.([250, 120, 250, 120, 500]);
  } catch {}
  if (ctx && ctx.state === "running") {
    const t = ctx.currentTime;
    beep(t, 880, 0.15);
    beep(t + 0.25, 880, 0.15);
    beep(t + 0.5, 1320, 0.3);
  }
}

/** Mantiene la pantalla encendida durante la sesión (si el navegador lo permite). */
export function keepScreenOn(): () => void {
  let lock: { release: () => Promise<void> } | null = null;
  let stopped = false;
  const request = async () => {
    try {
      const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } })
        .wakeLock;
      if (wl && document.visibilityState === "visible" && !stopped) lock = await wl.request("screen");
    } catch {}
  };
  // Al volver a la app el bloqueo se pierde: se pide otra vez.
  const onVisible = () => void request();
  void request();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    void lock?.release().catch(() => {});
  };
}
