# `@nhsdigital/nhs-notify-shared-utils/lambda-utils`

Small, dependency-light helpers for Lambda handlers.

## Import

```ts
import {
  CORRELATION_ID_ATTRIBUTE,
  formatZodIssues,
  MissingEnvironmentVariableError,
  readSqsStringAttribute,
  requireEnv,
} from '@nhsdigital/nhs-notify-shared-utils/lambda-utils';
```

## `requireEnv`

Reads a required environment variable. Throws
`MissingEnvironmentVariableError` when the variable is unset or empty.

```ts
const tableName = requireEnv('TABLE_NAME');
```

## `readSqsStringAttribute`

Reads a `String` message attribute from an SQS record, or `undefined` when the
attribute is absent or not a string. `CORRELATION_ID_ATTRIBUTE` is the shared
`correlationId` attribute name.

```ts
const correlationId = readSqsStringAttribute(record, CORRELATION_ID_ATTRIBUTE);
```

The record only needs a `messageAttributes` map (see `SqsRecordLike`), so the
helper stays decoupled from the `aws-lambda` types.

## `formatZodIssues`

Turns an array of Zod issues into a single readable string. It is pure: it does
not log or throw. Any `ZodError.issues` array is accepted.

```ts
const result = schema.safeParse(input);
if (!result.success) {
  throw new Error(`Invalid input — ${formatZodIssues(result.error.issues)}`);
}
// "items.0.id: Required; name: Expected string"
```
