import { useCallback, useRef, useSyncExternalStore } from 'react';

import { useNexusContext } from '../contexts/nexus-context';

const EMPTY_MAP: Readonly<Record<string, boolean>> = Object.freeze({});

/**
 * 批量订阅多个字段路径的 hidden 联动状态。
 *
 * 任一字段 hidden 变化（自身联动 / 祖先继承）即触发本 hook 重渲染，
 * 供 card-list / simple-list 等「列表项多字段 row」场景：
 * 整行 row 根据 hidden 联动确定是否整体隐藏（label + 控件一起 display:none），
 * 避免单纯依赖 RenderItemControl 内部占位时 label 仍渲染造成的"空 label 行"。
 *
 * 性能：
 * - 复用 engine.subscribeField（单 path 版本订阅），聚合触发 O(k)
 * - 稳定快照：内容相同时返回同一引用，React 不会重渲死循环
 * - SSR 安全：getServerSnapshot 返回稳定空 map
 *
 * @example
 * ```tsx
 * const itemPaths = useMemo(
 *   () => array.flatMap((_, i) =>
 *     Object.keys(objProperties).map((k) => `${dataPath}[${i}].${k}`),
 *   ),
 *   [array, dataPath, objProperties],
 * );
 * const hiddenMap = useFieldsHidden(itemPaths);
 * ```
 */
export function useFieldsHidden(
  paths: string[],
): Readonly<Record<string, boolean>> {
  const { engine } = useNexusContext();

  // paths 引用不稳定（每次渲染新建数组），用 ref 持有最新值
  const pathsRef = useRef<string[]>(paths);
  pathsRef.current = paths;

  // 稳定快照缓存：内容相同时返回同一对象引用，避免 React useSyncExternalStore 重渲死循环
  const cachedKeyRef = useRef<string>('');
  const cachedMapRef = useRef<Readonly<Record<string, boolean>>>(EMPTY_MAP);

  const getSnapshot = useCallback(() => {
    const current = pathsRef.current;
    // 用 key 字符串作 dirty 标记
    const key = current
      .map((p) => `${p}:${engine.isHidden(p) ? 1 : 0}`)
      .join('|');
    if (key !== cachedKeyRef.current) {
      cachedKeyRef.current = key;
      const map: Record<string, boolean> = {};
      for (const p of current) {
        map[p] = engine.isHidden(p);
      }
      cachedMapRef.current = map;
    }
    return cachedMapRef.current;
  }, [engine]);

  return useSyncExternalStore(
    (onStoreChange) => {
      const unsubs = pathsRef.current.map((p) =>
        engine.subscribeField(p, onStoreChange),
      );
      return () => {
        for (const u of unsubs) {
          u();
        }
      };
    },
    getSnapshot,
    () => EMPTY_MAP,
  );
}
