import { useSyncExternalStore } from 'react';

import { useEngine } from './useEngine';

/**
 * useFieldValue — 精准订阅单个字段值
 *
 * 按路径精准订阅：仅该字段版本变化时重渲染
 */
export function useFieldValue<T = unknown>(path: string): T | undefined {
  const engine = useEngine();

  useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(path, onStoreChange),
    () => engine.getFieldVersion(path),
  );

  return engine.getFieldValue(path) as T | undefined;
}
