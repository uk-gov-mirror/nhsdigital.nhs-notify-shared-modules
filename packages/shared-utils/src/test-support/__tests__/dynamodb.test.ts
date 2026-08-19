import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createDynamoDbDocumentClient } from '../dynamodb';

jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: jest.fn() }));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: jest.fn(() => ({ documentClient: true })) },
}));

describe('createDynamoDbDocumentClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a DynamoDB document client that removes undefined values', () => {
    const result = createDynamoDbDocumentClient({ region: 'eu-west-2' });
    expect(DynamoDBClient).toHaveBeenCalledWith({ region: 'eu-west-2' });
    expect(DynamoDBDocumentClient.from).toHaveBeenCalledWith(
      expect.anything(),
      {
        marshallOptions: { removeUndefinedValues: true },
      },
    );
    expect(result).toEqual({ documentClient: true });
  });
});
