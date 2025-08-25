let retryAt = 0;
let waiter: Promise<void> | null = null;

export function setBackoffUntil(ts: number) {
  retryAt = Math.max(retryAt, ts);
  if (waiter) return; // already waiting
  waiter = new Promise<void>((resolve) => {
    const ms = Math.max(0, retryAt - Date.now());
    setTimeout(() => {
      waiter = null;
      // allow next requests immediately; caller may setBackoffUntil again if needed
    }, ms);
  });
}

export async function waitForWindow(): Promise<void> {
  if (!retryAt) return;
  const ms = retryAt - Date.now();
  if (ms <= 0) return;
  if (waiter) await waiter;
}

