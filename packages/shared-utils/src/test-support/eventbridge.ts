import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

import type { RegionOptions } from './deployment';

export function createEventBridgeClient({
  region,
}: RegionOptions): EventBridgeClient {
  return new EventBridgeClient({ region });
}
