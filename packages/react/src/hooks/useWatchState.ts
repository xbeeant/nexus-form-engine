import type { FieldState, NexusEngine } from '@nexus/form-engine';
import { useEffect, useRef } from 'react';

/**
 * useWatchState Hook - 监听单个字段状态变化
 *
 * @param engine - NexusEngine实例
 * @param path - 字段路径
 * @param callback - 状态变化回调函数
 *
 * @example
 * ```tsx
 * // 监听字段状态（visible/disabled/loading等）
 * const isDisabled = useWatchState(engine, 'email', (state) => {
 *   console.log('Disabled:', state.disabled);
 *   console.log('Loading:', state.loading);
 * });
 * ```
 */
export function useWatchState(
  engine: NexusEngine | null,
  path: string,
  callback: (state: FieldState) => void,
): FieldState {
  const stateRef = useRef<FieldState | undefined>(undefined);

  useEffect(() => {
    if (!engine) {
      return;
    }

    const state = engine.getFieldState(path);
    stateRef.current = state;

    if (state) {
      callback(state);
    }

    const unsubscribe = engine.subscribe(path, (newState) => {
      stateRef.current = newState;
      callback(newState);
    });

    return () => {
      unsubscribe();
    };
  }, [engine, path, callback]);

  return stateRef.current || ({} as FieldState);
}
