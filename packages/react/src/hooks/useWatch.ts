import type { NexusEngine } from '@nexus/form-engine';
import { useEffect, useRef } from 'react';

/**
 * useWatch Hook - 监听单个字段值变化
 *
 * @param engine - NexusEngine实例
 * @param path - 字段路径
 * @param callback - 变化回调函数
 * @param deep - 是否深度比较值（默认false，仅浅比较）
 *
 * @example
 * ```tsx
 * // 监听单个字段
 * const name = useWatch(engine, 'profile.name', (value) => {
 *   console.log('Name changed:', value);
 * });
 *
 * // 深度比较对象
 * const profile = useWatch(engine, 'profile', (value) => {
 *   console.log('Profile changed:', value);
 * }, { deep: true });
 * ```
 */
export function useWatch(
  engine: NexusEngine | null,
  path: string,
  callback: (value: unknown) => void,
  options?: {
    deep?: boolean;
  },
): unknown {
  const { deep = false } = options || {};
  const lastValueRef = useRef<unknown>(undefined);

  useEffect(() => {
    if (!engine) {
      return;
    }

    const value = engine.getFieldValue(path);

    // 初始化时立即执行一次
    if (lastValueRef.current === undefined) {
      lastValueRef.current = value;
    }

    // 比较值是否变化
    const shouldCall = deep
      ? JSON.stringify(value) !== JSON.stringify(lastValueRef.current)
      : value !== lastValueRef.current;

    if (shouldCall) {
      lastValueRef.current = value;
      callback(value);
    }

    // 订阅字段变化
    const unsubscribe = engine.subscribe(path, (state) => {
      const newValue = state.value;

      // 比较值是否变化
      const shouldUpdate = deep
        ? JSON.stringify(newValue) !== JSON.stringify(lastValueRef.current)
        : newValue !== lastValueRef.current;

      if (shouldUpdate) {
        lastValueRef.current = newValue;
        callback(newValue);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [engine, path, deep, callback]);

  return lastValueRef.current;
}
