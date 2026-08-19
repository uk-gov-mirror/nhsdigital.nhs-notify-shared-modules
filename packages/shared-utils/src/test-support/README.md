# `@nhsdigital/nhs-notify-shared-utils/test-support`

Helpers for integration tests: deployment/naming helpers, polling primitives, an
override-based event-factory base, and per-service AWS client factories.

## Subpath layout

The AWS client factories and service helpers are split by service so that
importing one service does **not** load the others' AWS SDK packages. The AWS
SDK clients are optional peer dependencies, so a consumer installs only the ones
it uses.

| Subpath                        | AWS SDK package                    | Exports                                                                                     |
| ------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `./test-support`               | none                               | `getDeploymentDetails`, `buildLambdaLogGroupName`, `pollUntil`, `safeJsonParse`, `applyOverrides`, `applyEventOverrides`, plus types |
| `./test-support/cloudwatch`    | `@aws-sdk/client-cloudwatch-logs`  | `createCloudWatchLogsClient`, `awaitMatchingLogEntries`, `queryLogEntries`                  |
| `./test-support/sqs`           | `@aws-sdk/client-sqs`              | `createSqsClient`, `buildQueueUrl`, `sendSqsEvent`, `awaitMessageMatching`, `purgeQueue`, `purgeQueues` |
| `./test-support/s3`            | `@aws-sdk/client-s3`               | `createS3Client`                                                                            |
| `./test-support/dynamodb`      | `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb` | `createDynamoDbDocumentClient`                                             |
| `./test-support/eventbridge`   | `@aws-sdk/client-eventbridge`      | `createEventBridgeClient`                                                                   |

The `./test-support` barrel is AWS-SDK-free, so it is always safe to import.

## Usage

Import the SDK-free helpers:

```ts
import {
  getDeploymentDetails,
  buildLambdaLogGroupName,
  pollUntil,
} from '@nhsdigital/nhs-notify-shared-utils/test-support';

const deployment = getDeploymentDetails({
  region: 'eu-west-2',
  project: 'nhs',
  component: 'ar',
});
const logGroup = buildLambdaLogGroupName(deployment, 'my-function');
```

Import each service's client factory and helpers individually:

```ts
import {
  createCloudWatchLogsClient,
  awaitMatchingLogEntries,
} from '@nhsdigital/nhs-notify-shared-utils/test-support/cloudwatch';
import {
  createSqsClient,
  awaitMessageMatching,
} from '@nhsdigital/nhs-notify-shared-utils/test-support/sqs';

const logs = createCloudWatchLogsClient(deployment);
const sqs = createSqsClient(deployment);
```

## Polling

`pollUntil` retries an async check until it returns `true`, or throws
`PollTimeoutError` once the timeout elapses. `now` and `wait` are injectable to
keep unit tests deterministic.

```ts
await pollUntil(
  async () => (await countRows()) >= 1,
  'at least one row written',
  { timeoutMs: 30_000, intervalMs: 500 },
);
```

## Event factories

`applyOverrides` and `applyEventOverrides` build fixtures from a base plus
overrides. Domain-specific factories are built on top of these in each bounded
context.

```ts
const event = applyEventOverrides(baseEvent, { data: { messageId: 'm-1' } });
```
