import type { NexusEngine } from '@xbeeant/form-engine';

import { useNexusContext } from '../contexts/nexus-context';

/**
 * useEngine — 获取当前 NexusContext 中的引擎视图实例
 *
 * 必须在 NexusFormProvider 子树内使用，否则抛出异常。
 * 用于需要直接操作引擎（如 subscribeField / getFieldValue）的自定义组件或 Hook。
 */
export function useEngine(): NexusEngine {
  const { engine } = useNexusContext();
  return engine;
}
