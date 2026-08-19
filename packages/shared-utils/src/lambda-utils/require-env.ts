export class MissingEnvironmentVariableError extends Error {
  constructor(name: string) {
    super(`${name} is required`);
    this.name = 'MissingEnvironmentVariableError';
  }
}

export function requireEnv(name: string): string {
  // eslint-disable-next-line security/detect-object-injection -- name is always a controlled string literal at call sites
  const value = process.env[name];
  if (!value) {
    throw new MissingEnvironmentVariableError(name);
  }
  return value;
}
