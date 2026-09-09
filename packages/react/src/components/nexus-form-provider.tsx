import type { NexusEngine } from '@xbeeant/form-engine';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { NexusContext } from '../contexts/nexus-context';
import type { FormController } from './form-controller';
import type { NexusFormConfig } from './nexus-form';

/**
 * NexusFormProvider — NexusContext 上下文提供者
 *
 * 将引擎视图、表单配置、FormController 实例注入 React Context，
 * 供子树内的 NexusField / NexusLayout / NexusObject / Hooks 消费。
 */
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
