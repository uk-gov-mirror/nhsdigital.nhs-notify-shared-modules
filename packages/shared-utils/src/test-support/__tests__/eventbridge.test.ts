import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { createEventBridgeClient } from '../eventbridge';

jest.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: jest.fn(),
}));

describe('createEventBridgeClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an EventBridge client for the region', () => {
    createEventBridgeClient({ region: 'eu-west-2' });
    expect(EventBridgeClient).toHaveBeenCalledWith({ region: 'eu-west-2' });
  });
});
