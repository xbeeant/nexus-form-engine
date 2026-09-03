import type { NexusEngine } from '@xbeeant/form-engine';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { NexusContext } from '../contexts/nexus-context';
import type { FormController } from './form-controller';
import type { NexusFormConfig } from './nexus-form';

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
