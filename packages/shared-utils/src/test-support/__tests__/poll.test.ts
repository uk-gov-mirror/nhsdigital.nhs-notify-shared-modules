import {
  DEFAULT_POLL_TIMEOUT_MS,
  POLL_INTERVAL_MS,
  PollTimeoutError,
  delay,
  pollUntil,
  safeJsonParse,
} from '../poll';

describe('constants', () => {
  it('exposes poll interval and default timeout', () => {
    expect(POLL_INTERVAL_MS).toBe(500);
    expect(DEFAULT_POLL_TIMEOUT_MS).toBe(60_000);
  });
});

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns undefined for invalid JSON', () => {
    expect(safeJsonParse('{ not json')).toBeUndefined();
  });
});

describe('delay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves after the given delay', async () => {
    const resolved = jest.fn();
    const promise = delay(1000).then(resolved);
    expect(resolved).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    await promise;
    expect(resolved).toHaveBeenCalledTimes(1);
  });
});

describe('pollUntil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns immediately when the first attempt succeeds, using default options', async () => {
    const attempt = jest.fn().mockResolvedValue(true);
    await pollUntil(attempt, 'thing');
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('retries until the attempt succeeds', async () => {
    const attempt = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    let clock = 0;
    const now = jest.fn(() => clock);
    const advancingWait = jest.fn().mockImplementation(() => {
      clock += 100;
      return Promise.resolve();
    });

    await pollUntil(attempt, 'thing', {
      wait: advancingWait,
      now,
      timeoutMs: 10_000,
      intervalMs: 100,
    });

    expect(attempt).toHaveBeenCalledTimes(3);
    expect(advancingWait).toHaveBeenCalledTimes(2);
  });

  it('throws PollTimeoutError once the deadline passes', async () => {
    const attempt = jest.fn().mockResolvedValue(false);
    let clock = 0;
    const now = jest.fn(() => clock);
    const advancingWait = jest.fn().mockImplementation(() => {
      clock += 1000;
      return Promise.resolve();
    });

    await expect(
      pollUntil(attempt, 'thing', {
        wait: advancingWait,
        now,
        timeoutMs: 500,
        intervalMs: 100,
      }),
    ).rejects.toThrow(PollTimeoutError);
  });

  it('sets the error name on PollTimeoutError', () => {
    expect(new PollTimeoutError('x').name).toBe('PollTimeoutError');
  });
});
