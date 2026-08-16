import type { NexusEngine } from '@xbeeant/form-engine';
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

  // callback / paths 通过 ref 持有最新引用：
  // - inline 回调不会导致每次渲染重新订阅
  // - 数组字面量（每次渲染新建引用）不会导致重复订阅
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const pathsRef = useRef(paths);
  pathsRef.current = paths;
  // 仅当路径列表内容变化时才重新订阅（顺序无关，排序后比较）
  const pathsKey = [...paths].sort().join(',');

  // pathsKey：路径列表内容变化的稳定信号（数组引用本身不稳定，不参与依赖比较）
  // biome-ignore lint/correctness/useExhaustiveDependencies: paths 引用不稳定，以内容键 pathsKey 为准
  useEffect(() => {
    if (!engine) {
      return;
    }

    // 初始化
    const watchedPaths = pathsRef.current;
    const initialValues: Record<string, unknown> = {};
    for (const path of watchedPaths) {
      initialValues[path] = engine.getFieldValue(path);
    }
    lastValuesRef.current = initialValues;
    valuesRef.current = initialValues;

    callbackRef.current(initialValues);

    // 按路径精准订阅（依赖图 O(k) 通知），避免 subscribeAll 全表单扫描
    const unsubscribe = watchedPaths.map((path) =>
      engine.subscribe(path, (state) => {
        const newValue = state.value;
        const lastValue = lastValuesRef.current[path];

        const changed = deep
          ? JSON.stringify(newValue) !== JSON.stringify(lastValue)
          : newValue !== lastValue;

        if (changed) {
          lastValuesRef.current[path] = newValue;
          valuesRef.current = { [path]: newValue };
          callbackRef.current(valuesRef.current);
        }
      }),
    );

    return () => {
      for (const unsub of unsubscribe) {
        unsub();
      }
    };
  }, [engine, deep, pathsKey]);

  return valuesRef.current;
}
