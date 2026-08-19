import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  ThrottlingException,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  awaitMatchingLogEntries,
  createCloudWatchLogsClient,
  queryLogEntries,
} from '../cloudwatch';

jest.mock('@aws-sdk/client-cloudwatch-logs', () => {
  class MockThrottlingException extends Error {
    constructor() {
      super('throttled');
      this.name = 'ThrottlingException';
    }
  }
  return {
    CloudWatchLogsClient: jest.fn(),
    FilterLogEventsCommand: jest.fn((input) => ({ _type: 'Filter', input })),
    ThrottlingException: MockThrottlingException,
  };
});

function client(send: jest.Mock): CloudWatchLogsClient {
  return { send } as unknown as CloudWatchLogsClient;
}

const pollControl = () => {
  let clock = 0;
  return {
    now: jest.fn(() => clock),
    wait: jest.fn().mockImplementation(() => {
      clock += 1000;
      return Promise.resolve();
    }),
  };
};

describe('createCloudWatchLogsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a CloudWatch Logs client for the region', () => {
    createCloudWatchLogsClient({ region: 'eu-west-2' });
    expect(CloudWatchLogsClient).toHaveBeenCalledWith({ region: 'eu-west-2' });
  });
});

describe('queryLogEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns entries with a message, dropping empty ones', async () => {
    const send = jest.fn().mockResolvedValue({
      events: [{ message: 'a' }, { message: '' }, {}, { message: 'b' }],
    });
    await expect(
      queryLogEntries(client(send), 'group', 'pattern', 1000),
    ).resolves.toEqual([{ message: 'a' }, { message: 'b' }]);
  });

  it('returns an empty array when there are no events', async () => {
    const send = jest.fn().mockResolvedValue({});
    await expect(
      queryLogEntries(client(send), 'group', 'pattern', 1000),
    ).resolves.toEqual([]);
  });

  it('applies the lookback window, clamping to zero', async () => {
    const send = jest.fn().mockResolvedValue({ events: [] });
    await queryLogEntries(client(send), 'group', 'pattern', 1000, 5000);
    expect(FilterLogEventsCommand).toHaveBeenCalledWith({
      logGroupName: 'group',
      startTime: 0,
      filterPattern: 'pattern',
    });
  });
});

describe('awaitMatchingLogEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns matched entries once the minimum count is reached', async () => {
    const send = jest.fn().mockResolvedValue({ events: [{ message: 'a' }] });
    await expect(
      awaitMatchingLogEntries(client(send), 'group', 'pattern', 1000),
    ).resolves.toEqual([{ message: 'a' }]);
  });

  it('waits until enough entries match the minimum count', async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({ events: [{ message: 'a' }] })
      .mockResolvedValueOnce({
        events: [{ message: 'a' }, { message: 'b' }],
      });
    const { now, wait } = pollControl();
    await expect(
      awaitMatchingLogEntries(client(send), 'group', 'pattern', 1000, {
        minCount: 2,
        lookbackMs: 100,
        now,
        wait,
        timeoutMs: 10_000,
      }),
    ).resolves.toEqual([{ message: 'a' }, { message: 'b' }]);
  });

  it('retries when CloudWatch throttles', async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce(
        new ThrottlingException({ $metadata: {}, message: 'throttled' }),
      )
      .mockResolvedValueOnce({ events: [{ message: 'a' }] });
    const { now, wait } = pollControl();
    await expect(
      awaitMatchingLogEntries(client(send), 'group', 'pattern', 1000, {
        now,
        wait,
        timeoutMs: 10_000,
      }),
    ).resolves.toEqual([{ message: 'a' }]);
  });

  it('rethrows a non-throttling error', async () => {
    const send = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(
      awaitMatchingLogEntries(client(send), 'group', 'pattern', 1000),
    ).rejects.toThrow('boom');
  });

  it('returns whatever matched when the poll times out', async () => {
    const send = jest.fn().mockResolvedValue({ events: [{ message: 'a' }] });
    const { now, wait } = pollControl();
    await expect(
      awaitMatchingLogEntries(client(send), 'group', 'pattern', 1000, {
        minCount: 2,
        now,
        wait,
        timeoutMs: 500,
      }),
    ).resolves.toEqual([{ message: 'a' }]);
  });
});
