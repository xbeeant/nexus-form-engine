import type { NexusEngine } from '@xbeeant/form-engine';

import { useNexusContext } from '../contexts/nexus-context';

export function useEngine(): NexusEngine {
  const { engine } = useNexusContext();
  return engine;
}
