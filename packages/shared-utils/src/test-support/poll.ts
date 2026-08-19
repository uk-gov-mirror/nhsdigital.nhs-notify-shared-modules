export const POLL_INTERVAL_MS = 500;
export const DEFAULT_POLL_TIMEOUT_MS = 60_000;

export class PollTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PollTimeoutError';
  }
}

export function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface PollOptions {
  timeoutMs?: number;
  intervalMs?: number;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
}

/**
 * Repeatedly runs `attempt` until it resolves `true`, throwing a
 * `PollTimeoutError` once the timeout elapses. `now`/`wait` are injectable to
 * keep tests deterministic.
 */
export async function pollUntil(
  attempt: () => Promise<boolean>,
  description: string,
  options: PollOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? POLL_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const wait = options.wait ?? delay;
  const deadline = now() + timeoutMs;

  let done = await attempt();
  while (!done) {
    if (now() >= deadline) {
      throw new PollTimeoutError(
        `Timed out after ${timeoutMs}ms — ${description}`,
      );
    }
    await wait(intervalMs);
    done = await attempt();
  }
}
