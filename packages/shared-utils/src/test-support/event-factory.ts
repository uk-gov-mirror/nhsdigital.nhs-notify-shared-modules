/**
 * Generic override-pattern helpers for building test event/data fixtures.
 * Domain factories are built on top of these in each bounded context.
 */

export function applyOverrides<T extends object>(
  base: T,
  overrides: Partial<T> = {},
): T {
  return { ...base, ...overrides };
}

export interface EventOverrides<E extends { data: object }> {
  event?: Partial<E>;
  data?: Partial<E['data']>;
}

export function applyEventOverrides<E extends { data: object }>(
  base: E,
  overrides: EventOverrides<E> = {},
): E {
  return {
    ...base,
    ...overrides.event,
    data: { ...base.data, ...overrides.data },
  };
}
