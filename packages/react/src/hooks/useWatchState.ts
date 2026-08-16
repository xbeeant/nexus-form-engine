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

  // callback 通过 ref 持有最新引用：外部 inline 回调不会导致每次渲染重新订阅
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!engine) {
      return;
    }

    const state = engine.getFieldState(path);
    stateRef.current = state;

    if (state) {
      callbackRef.current(state);
    }

    const unsubscribe = engine.subscribe(path, (newState) => {
      stateRef.current = newState;
      callbackRef.current(newState);
    });

    return () => {
      unsubscribe();
    };
  }, [engine, path]);

  return stateRef.current || ({} as FieldState);
}
