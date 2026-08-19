import {
  ChangeMessageVisibilityCommand,
  type Message,
  PurgeQueueCommand,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

import type { DeploymentDetails, RegionOptions } from './deployment';
import { type PollOptions, pollUntil, safeJsonParse } from './poll';

export function createSqsClient({ region }: RegionOptions): SQSClient {
  return new SQSClient({ region });
}

export interface BuildQueueUrlOptions {
  fifo?: boolean;
  appendQueueSuffix?: boolean;
}

export function buildQueueUrl(
  { accountId, component, environment, project, region }: DeploymentDetails,
  name: string,
  options: BuildQueueUrlOptions = {},
): string {
  const appendQueueSuffix = options.appendQueueSuffix ?? true;
  const suffix = options.fifo ? 'queue.fifo' : 'queue';
  const csi = `${project}-${environment}-${component}`;
  const queueName = appendQueueSuffix
    ? `${csi}-${name}-${suffix}`
    : `${csi}-${name}`;
  return `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
}

export interface SendSqsEventOptions {
  messageGroupId?: string;
  messageDeduplicationId?: string;
}

export async function sendSqsEvent<T>(
  client: SQSClient,
  queueUrl: string,
  event: T,
  options: SendSqsEventOptions = {},
): Promise<void> {
  await client.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(event),
      MessageGroupId: options.messageGroupId,
      MessageDeduplicationId: options.messageDeduplicationId,
    }),
  );
}

export interface AwaitMessageOptions extends PollOptions {
  visibilityTimeoutSeconds?: number;
  waitTimeSeconds?: number;
  maxNumberOfMessages?: number;
}

export async function awaitMessageMatching(
  client: SQSClient,
  queueUrl: string,
  predicate: (body: unknown) => boolean,
  description: string,
  options: AwaitMessageOptions = {},
): Promise<Message> {
  const visibilityTimeout = options.visibilityTimeoutSeconds ?? 30;
  const waitTimeSeconds = options.waitTimeSeconds ?? 5;
  const maxNumberOfMessages = options.maxNumberOfMessages ?? 10;
  let matched: Message | undefined;

  await pollUntil(
    async () => {
      const response = await client.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          AttributeNames: ['All'],
          MessageAttributeNames: ['All'],
          MaxNumberOfMessages: maxNumberOfMessages,
          WaitTimeSeconds: waitTimeSeconds,
          VisibilityTimeout: visibilityTimeout,
        }),
      );

      const messages = response.Messages ?? [];
      for (const message of messages) {
        const parsed = message.Body ? safeJsonParse(message.Body) : undefined;
        if (predicate(parsed)) {
          matched = message;
          return true;
        }
        if (message.ReceiptHandle) {
          await client.send(
            new ChangeMessageVisibilityCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: message.ReceiptHandle,
              VisibilityTimeout: 0,
            }),
          );
        }
      }
      return false;
    },
    description,
    options,
  );

  return matched as Message;
}

export async function purgeQueue(
  client: SQSClient,
  queueUrl: string | undefined,
): Promise<void> {
  if (!queueUrl) {
    return;
  }

  try {
    await client.send(new PurgeQueueCommand({ QueueUrl: queueUrl }));
  } catch (error) {
    if (error instanceof Error && error.name === 'PurgeQueueInProgress') {
      return;
    }
    throw error;
  }
}

export async function purgeQueues(
  client: SQSClient,
  queueUrls: (string | undefined)[],
): Promise<void> {
  await Promise.all(queueUrls.map((url) => purgeQueue(client, url)));
}
