import type { NexusEngine } from '@xbeeant/form-engine';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { NexusContext } from '../contexts/NexusContext';
import type { FormController } from './FormController';
import type { NexusFormConfig } from './NexusForm';

interface NexusFormProviderProps {
  engine: NexusEngine;
  config: NexusFormConfig;
  form: FormController;
  /** 实例标识（缺省 'default'，兼容直接使用引擎/设计器等非多实例场景） */
  instanceId?: string;
  children: ReactNode;
}

export function NexusFormProvider({
  engine,
  config,
  form,
  instanceId = 'default',
  children,
}: NexusFormProviderProps) {
  const value = useMemo(
    () => ({ engine, config, form, instanceId }),
    [engine, config, form, instanceId],
  );
  return (
    <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
  );
}
