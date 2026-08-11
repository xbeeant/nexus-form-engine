import type { NexusEngine } from '@nexus/form-engine';

import { useNexusContext } from '../contexts/NexusContext';

export function useEngine(): NexusEngine {
  const { engine } = useNexusContext();
  return engine;
}
