import { S3Client } from '@aws-sdk/client-s3';

import type { RegionOptions } from './deployment';

export function createS3Client({ region }: RegionOptions): S3Client {
  return new S3Client({ region });
}
