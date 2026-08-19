import {
  ChangeMessageVisibilityCommand,
  PurgeQueueCommand,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';
import type { DeploymentDetails } from '../deployment';
import {
  awaitMessageMatching,
  buildQueueUrl,
  createSqsClient,
  purgeQueue,
  purgeQueues,
  sendSqsEvent,
} from '../sqs';

jest.mock('@aws-sdk/client-sqs', () => ({
  ChangeMessageVisibilityCommand: jest.fn((input) => ({
    _type: 'ChangeVisibility',
    input,
  })),
  PurgeQueueCommand: jest.fn((input) => ({ _type: 'Purge', input })),
  ReceiveMessageCommand: jest.fn((input) => ({ _type: 'Receive', input })),
  SendMessageCommand: jest.fn((input) => ({ _type: 'Send', input })),
  SQSClient: jest.fn(),
}));

describe('createSqsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an SQS client for the region', () => {
    createSqsClient({ region: 'eu-west-2' });
    expect(SQSClient).toHaveBeenCalledWith({ region: 'eu-west-2' });
  });
});

const details: DeploymentDetails = {
  region: 'eu-west-2',
  environment: 'dev',
  project: 'nhs',
  component: 'ar',
  accountId: '123456789012',
};

function client(send: jest.Mock): SQSClient {
  return { send } as unknown as SQSClient;
}

const pollControl = () => {
  let clock = 0;
  return {
    now: jest.fn(() => clock),
    wait: jest.fn().mockImplementation(() => {
      clock += 100;
      return Promise.resolve();
    }),
  };
};

describe('buildQueueUrl', () => {
  it('builds a standard queue url with the queue suffix', () => {
    expect(buildQueueUrl(details, 'inbound')).toBe(
      'https://sqs.eu-west-2.amazonaws.com/123456789012/nhs-dev-ar-inbound-queue',
    );
  });

  it('builds a FIFO queue url', () => {
    expect(buildQueueUrl(details, 'inbound', { fifo: true })).toBe(
      'https://sqs.eu-west-2.amazonaws.com/123456789012/nhs-dev-ar-inbound-queue.fifo',
    );
  });

  it('omits the queue suffix when appendQueueSuffix is false', () => {
    expect(
      buildQueueUrl(details, 'raw-name', { appendQueueSuffix: false }),
    ).toBe(
      'https://sqs.eu-west-2.amazonaws.com/123456789012/nhs-dev-ar-raw-name',
    );
  });
});

describe('sendSqsEvent', () => {
  it('sends a message with the serialised event and no group id by default', async () => {
    const send = jest.fn().mockResolvedValue({});
    await sendSqsEvent(client(send), 'queue-url', { id: 'e1' });
    expect(SendMessageCommand).toHaveBeenCalledWith({
      QueueUrl: 'queue-url',
      MessageBody: JSON.stringify({ id: 'e1' }),
      MessageGroupId: undefined,
      MessageDeduplicationId: undefined,
    });
  });

  it('passes group and deduplication ids', async () => {
    const send = jest.fn().mockResolvedValue({});
    await sendSqsEvent(
      client(send),
      'queue-url',
      { id: 'e1' },
      {
        messageGroupId: 'g1',
        messageDeduplicationId: 'd1',
      },
    );
    expect(SendMessageCommand).toHaveBeenCalledWith({
      QueueUrl: 'queue-url',
      MessageBody: JSON.stringify({ id: 'e1' }),
      MessageGroupId: 'g1',
      MessageDeduplicationId: 'd1',
    });
  });
});

describe('awaitMessageMatching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the first matching message', async () => {
    const message = { Body: JSON.stringify({ match: true }) };
    const send = jest.fn().mockResolvedValue({ Messages: [message] });
    const result = await awaitMessageMatching(
      client(send),
      'queue-url',
      (body) => (body as { match?: boolean }).match === true,
      'a match',
    );
    expect(result).toBe(message);
  });

  it('resets visibility on non-matching messages and retries', async () => {
    const nonMatch = {
      Body: JSON.stringify({ match: false }),
      ReceiptHandle: 'rh-1',
    };
    const match = { Body: JSON.stringify({ match: true }) };
    const send = jest
      .fn()
      .mockResolvedValueOnce({ Messages: [nonMatch] })
      .mockResolvedValueOnce({}) // ChangeMessageVisibility
      .mockResolvedValueOnce({ Messages: [match] });
    const { now, wait } = pollControl();

    const result = await awaitMessageMatching(
      client(send),
      'queue-url',
      (body) => (body as { match?: boolean }).match === true,
      'a match',
      { now, wait, timeoutMs: 10_000 },
    );

    expect(result).toBe(match);
    expect(ChangeMessageVisibilityCommand).toHaveBeenCalledWith({
      QueueUrl: 'queue-url',
      ReceiptHandle: 'rh-1',
      VisibilityTimeout: 0,
    });
  });

  it('treats a malformed body and a message with no receipt handle as non-matching', async () => {
    const malformed = { Body: '{ not json' };
    const empty = {};
    const match = { Body: JSON.stringify({ match: true }) };
    const send = jest
      .fn()
      .mockResolvedValueOnce({ Messages: [malformed, empty] })
      .mockResolvedValueOnce({ Messages: [match] });
    const { now, wait } = pollControl();

    const result = await awaitMessageMatching(
      client(send),
      'queue-url',
      (body) => (body as { match?: boolean } | undefined)?.match === true,
      'a match',
      { now, wait, timeoutMs: 10_000 },
    );

    expect(result).toBe(match);
    expect(ChangeMessageVisibilityCommand).not.toHaveBeenCalled();
  });

  it('honours custom receive options', async () => {
    const message = { Body: JSON.stringify({ match: true }) };
    const send = jest.fn().mockResolvedValue({ Messages: [message] });
    await awaitMessageMatching(
      client(send),
      'queue-url',
      () => true,
      'a match',
      {
        visibilityTimeoutSeconds: 45,
        waitTimeSeconds: 2,
        maxNumberOfMessages: 1,
      },
    );
    expect(ReceiveMessageCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        VisibilityTimeout: 45,
        WaitTimeSeconds: 2,
        MaxNumberOfMessages: 1,
      }),
    );
  });

  it('throws when no matching message arrives before the timeout', async () => {
    const send = jest.fn().mockResolvedValue({});
    const { now, wait } = pollControl();
    await expect(
      awaitMessageMatching(client(send), 'queue-url', () => false, 'a match', {
        now,
        wait,
        timeoutMs: 200,
      }),
    ).rejects.toThrow('a match');
  });
});

describe('purgeQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when the queue url is undefined', async () => {
    const send = jest.fn();
    await purgeQueue(client(send), undefined);
    expect(send).not.toHaveBeenCalled();
  });

  it('purges the queue', async () => {
    const send = jest.fn().mockResolvedValue({});
    await purgeQueue(client(send), 'queue-url');
    expect(PurgeQueueCommand).toHaveBeenCalledWith({ QueueUrl: 'queue-url' });
  });

  it('swallows a PurgeQueueInProgress error', async () => {
    const error = Object.assign(new Error('in progress'), {
      name: 'PurgeQueueInProgress',
    });
    const send = jest.fn().mockRejectedValue(error);
    await expect(
      purgeQueue(client(send), 'queue-url'),
    ).resolves.toBeUndefined();
  });

  it('rethrows other errors', async () => {
    const send = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(purgeQueue(client(send), 'queue-url')).rejects.toThrow('boom');
  });
});

describe('purgeQueues', () => {
  it('purges every supplied queue url', async () => {
    const send = jest.fn().mockResolvedValue({});
    await purgeQueues(client(send), ['a', undefined, 'b']);
    expect(PurgeQueueCommand).toHaveBeenCalledTimes(2);
  });
});
