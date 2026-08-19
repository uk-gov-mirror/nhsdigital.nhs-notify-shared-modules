import { applyEventOverrides, applyOverrides } from '../event-factory';

describe('applyOverrides', () => {
  it('returns the base when no overrides are supplied', () => {
    expect(applyOverrides({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('shallow-merges overrides over the base', () => {
    expect(applyOverrides({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 });
  });
});

describe('applyEventOverrides', () => {
  const base = { id: 'e1', type: 't', data: { clientId: 'c1', value: 1 } };

  it('returns the base when no overrides are supplied', () => {
    expect(applyEventOverrides(base)).toEqual(base);
  });

  it('merges event-level and data-level overrides', () => {
    expect(
      applyEventOverrides(base, {
        event: { type: 't2' },
        data: { value: 2 },
      }),
    ).toEqual({ id: 'e1', type: 't2', data: { clientId: 'c1', value: 2 } });
  });
});
