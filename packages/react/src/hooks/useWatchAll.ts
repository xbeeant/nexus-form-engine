import type { NexusEngine } from '@nexus/form-engine';
import { useEffect, useRef } from 'react';

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

  // callback 通过 ref 持有最新引用：外部 inline 回调不会导致每次渲染重新订阅
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!engine) {
      return;
    }

    const formData = engine.getFormData();
    lastFormDataRef.current = formData;
    formDataRef.current = formData;
    callbackRef.current(formData);

    const unsubscribe = engine.subscribeAll((newFormData) => {
      if (deep) {
        const changed =
          JSON.stringify(newFormData) !==
          JSON.stringify(lastFormDataRef.current);
        if (changed) {
          lastFormDataRef.current = newFormData;
          formDataRef.current = newFormData;
          callbackRef.current(newFormData);
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
          callbackRef.current(newFormData);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [engine, deep]);

  return formDataRef.current;
}
