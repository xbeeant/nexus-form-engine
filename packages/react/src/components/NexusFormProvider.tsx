import type { NexusEngine } from '@nexus/form-engine';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { NexusContext } from '../contexts/NexusContext.ts';
import type { FormController } from './FormController';
import type { NexusFormConfig } from './NexusForm.tsx';

interface NexusFormProviderProps {
  engine: NexusEngine;
  config: NexusFormConfig;
  form: FormController;
  children: ReactNode;
}

export function NexusFormProvider({
  engine,
  config,
  form,
  children,
}: NexusFormProviderProps) {
  const value = useMemo(
    () => ({ engine, config, form }),
    [engine, config, form],
  );
  return (
    <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
  );
}
