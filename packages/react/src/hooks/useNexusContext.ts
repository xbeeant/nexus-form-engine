// ────────────────────────────────────────────────────────────────────────────
// Context
// ────────────────────────────────────────────────────────────────────────────

import type { NexusEngine } from '@nexus/form-engine';
import { createContext, useContext } from 'react';
import type { FormController } from '../components/FormController';
import type { NexusFormConfig } from '../components/NexusForm';

interface NexusContextValue {
  engine: NexusEngine;
  config: NexusFormConfig;
  form: FormController;
}

export const NexusContext = createContext<NexusContextValue | null>(null);

export function useNexusContext(): NexusContextValue {
  const ctx = useContext(NexusContext);
  if (!ctx) {
    throw new Error('[NexusField] Must be used within <NexusFormProvider>');
  }
  return ctx;
}
