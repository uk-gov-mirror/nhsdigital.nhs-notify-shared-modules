import { S3Client } from '@aws-sdk/client-s3';
import { createS3Client } from '../s3';

jest.mock('@aws-sdk/client-s3', () => ({ S3Client: jest.fn() }));

describe('createS3Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an S3 client for the region', () => {
    createS3Client({ region: 'eu-west-2' });
    expect(S3Client).toHaveBeenCalledWith({ region: 'eu-west-2' });
  });
});
