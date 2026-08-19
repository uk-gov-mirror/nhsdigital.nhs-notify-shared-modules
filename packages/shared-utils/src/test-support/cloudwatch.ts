import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  ThrottlingException,
} from '@aws-sdk/client-cloudwatch-logs';

import type { RegionOptions } from './deployment';
import { type PollOptions, PollTimeoutError, pollUntil } from './poll';

export function createCloudWatchLogsClient({
  region,
}: RegionOptions): CloudWatchLogsClient {
  return new CloudWatchLogsClient({ region });
}

export interface LogEntry {
  message: string;
}

export interface AwaitLogEntriesOptions extends PollOptions {
  minCount?: number;
  lookbackMs?: number;
}

export async function queryLogEntries(
  client: CloudWatchLogsClient,
  logGroupName: string,
  filterPattern: string,
  startTime: number,
  lookbackMs = 0,
): Promise<LogEntry[]> {
  const queryStartTime = Math.max(0, startTime - lookbackMs);
  const response = await client.send(
    new FilterLogEventsCommand({
      logGroupName,
      startTime: queryStartTime,
      filterPattern,
    }),
  );
  return (response.events ?? [])
    .filter((event): event is typeof event & { message: string } =>
      Boolean(event.message),
    )
    .map((event) => ({ message: event.message }));
}

/**
 * Polls a CloudWatch log group until at least `minCount` entries match the
 * filter, returning whatever matched (possibly fewer than `minCount`) if the
 * poll times out. CloudWatch throttling is retried rather than failing.
 */
export async function awaitMatchingLogEntries(
  client: CloudWatchLogsClient,
  logGroupName: string,
  filterPattern: string,
  startTime: number,
  options: AwaitLogEntriesOptions = {},
): Promise<LogEntry[]> {
  const minCount = options.minCount ?? 1;
  const lookbackMs = options.lookbackMs ?? 0;
  let matched: LogEntry[] = [];

  try {
    await pollUntil(
      async () => {
        try {
          matched = await queryLogEntries(
            client,
            logGroupName,
            filterPattern,
            startTime,
            lookbackMs,
          );
          return matched.length >= minCount;
        } catch (error) {
          if (error instanceof ThrottlingException) {
            return false;
          }
          throw error;
        }
      },
      `log entries in ${logGroupName}`,
      options,
    );
  } catch (error) {
    if (!(error instanceof PollTimeoutError)) throw error;
  }

  return matched;
}
