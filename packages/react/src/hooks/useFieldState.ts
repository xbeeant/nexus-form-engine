import type { FieldState } from '@xbeeant/form-engine';
import { useSyncExternalStore } from 'react';

import { useNexusContext } from '../contexts/NexusContext';

/**
 * useFieldState — 精准订阅单个字段状态
 *
 * 按路径精准订阅：只在该字段版本变化时触发重渲染，避免全局订阅拖垮表单
 */
export function useFieldState(path: string): FieldState | undefined {
  const { engine } = useNexusContext();

  useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(path, onStoreChange),
    () => engine.getFieldVersion(path),
    () => engine.getFieldVersion(path),
  );

  return engine.getFieldState(path);
}
