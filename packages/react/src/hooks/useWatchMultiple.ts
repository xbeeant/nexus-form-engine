import type { NexusEngine } from '@nexus/form-engine';
import { useEffect, useRef } from 'react';

/**
 * useWatchMultiple Hook - 监听多个字段值变化
 *
 * @param engine - NexusEngine实例
 * @param paths - 字段路径数组
 * @param callback - 变化回调函数
 * @param deep - 是否深度比较值（默认false，仅浅比较）
 *
 * @example
 * ```tsx
 * // 监听多个字段
 * const values = useWatchMultiple(engine, ['name', 'email', 'age'], (values) => {
 *   console.log('Values changed:', values);
 * }, { deep: true });
 * ```
 */
export function useWatchMultiple(
  engine: NexusEngine | null,
  paths: string[],
  callback: (values: Record<string, unknown>) => void,
  options?: {
    deep?: boolean;
  },
): Record<string, unknown> {
  const { deep = false } = options || {};
  const lastValuesRef = useRef<Record<string, unknown>>({});
  const valuesRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    if (!engine) {
      return;
    }

    // 初始化
    const initialValues: Record<string, unknown> = {};
    paths.forEach((path) => {
      initialValues[path] = engine.getFieldValue(path);
    });
    lastValuesRef.current = initialValues;
    valuesRef.current = initialValues;

    callback(initialValues);

    // 监听所有字段变化
    const unsubscribe = engine.subscribeAll((formData) => {
      const changedPaths = paths.filter((path) => {
        const value = formData[path];
        const lastValue = lastValuesRef.current[path];

        return deep
          ? JSON.stringify(value) !== JSON.stringify(lastValue)
          : value !== lastValue;
      });

      if (changedPaths.length > 0) {
        // 更新lastValues
        paths.forEach((path) => {
          lastValuesRef.current[path] = formData[path];
        });

        // 构建变化的值对象
        const changedValues: Record<string, unknown> = {};
        changedPaths.forEach((path) => {
          changedValues[path] = formData[path];
        });

        valuesRef.current = changedValues;
        callback(changedValues);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [engine, paths, deep, callback]);

  return valuesRef.current;
}
