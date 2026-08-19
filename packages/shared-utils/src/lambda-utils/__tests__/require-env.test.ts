import { MissingEnvironmentVariableError, requireEnv } from '../require-env';

describe('requireEnv', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns the value when the variable is set', () => {
    process.env.TEST_VAR = 'hello';
    expect(requireEnv('TEST_VAR')).toBe('hello');
  });

  it('throws MissingEnvironmentVariableError when the variable is undefined', () => {
    delete process.env.MISSING_VAR;
    expect(() => requireEnv('MISSING_VAR')).toThrow(
      MissingEnvironmentVariableError,
    );
    expect(() => requireEnv('MISSING_VAR')).toThrow('MISSING_VAR is required');
  });

  it('throws MissingEnvironmentVariableError when the variable is empty string', () => {
    process.env.EMPTY_VAR = '';
    expect(() => requireEnv('EMPTY_VAR')).toThrow(
      MissingEnvironmentVariableError,
    );
  });
});
