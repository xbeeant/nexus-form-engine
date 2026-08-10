// ============================================================================
// useWatch - 响应式字段订阅 Hook
// 目标：提供类似Vue的watch/watchState等响应式订阅功能
// ============================================================================

import type { FieldState, NexusEngine } from '@nexus/form-engine';
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

/**
 * useWatchAll Hook - 监听整个表单数据变化
 *
 * @param engine - NexusEngine实例
 * @param callback - 变化回调函数
 * @param deep - 是否深度比较值（默认false，仅浅比较）
 *
 * @example
 * ```tsx
 * // 监听整个表单
 * useWatchAll(engine, (formData) => {
 *   console.log('Form data changed:', formData);
 * }, { deep: true });
 * ```
 */
export function useWatchAll(
  engine: NexusEngine | null,
  callback: (formData: Record<string, unknown>) => void,
  options?: {
    deep?: boolean;
  },
): Record<string, unknown> {
  const { deep = false } = options || {};
  const lastFormDataRef = useRef<Record<string, unknown>>({});
  const formDataRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    if (!engine) {
      return;
    }

    const formData = engine.getFormData();
    lastFormDataRef.current = formData;
    formDataRef.current = formData;
    callback(formData);

    const unsubscribe = engine.subscribeAll((newFormData) => {
      if (deep) {
        const changed =
          JSON.stringify(newFormData) !==
          JSON.stringify(lastFormDataRef.current);
        if (changed) {
          lastFormDataRef.current = newFormData;
          formDataRef.current = newFormData;
          callback(newFormData);
        }
      } else {
        // 简单浅比较
        let changed = false;
        for (const key in newFormData) {
          if (newFormData[key] !== lastFormDataRef.current[key]) {
            changed = true;
            break;
          }
        }
        if (changed) {
          lastFormDataRef.current = newFormData;
          formDataRef.current = newFormData;
          callback(newFormData);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [engine, deep, callback]);

  return formDataRef.current;
}
