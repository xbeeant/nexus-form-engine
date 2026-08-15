import { useMemo, useSyncExternalStore } from 'react';

import { useEngine } from './useEngine';

/**
 * useFormData — 订阅整个表单数据
 *
 * 用 version 作为快照依赖，避免 getFormData() 每次返回新对象引用导致的无谓重渲染
 */
export function useFormData(): Record<string, unknown> {
  const engine = useEngine();

  const _version = useSyncExternalStore(
    engine.subscribeStore,
    engine.getSnapshot,
    engine.getSnapshot,
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: _version 是 formData 失效信号（engine 内部状态，静态分析不可见）
  return useMemo(() => engine.getFormData(), [engine, _version]);
}
