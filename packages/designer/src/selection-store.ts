// ============================================================================
// 设计器「选中节点」外部存储（纯逻辑，无 React 依赖）
//
// 对齐核心引擎 §3.4 的「按路径精准版本订阅」哲学：画布每个节点经
// useIsSelected(pathKey) 订阅自己的选中态，选中切换时只有
// 「旧选中节点 → false」与「新选中节点 → true」两个节点的快照变化，
// 各自重渲染；其余 CanvasNode 子树（含内部 NexusField 表单组件）全部跳过。
// 选中热路径从 O(N) 降为 O(1)，且与 schema/mode/catalog 完全解耦——
// 不再经由巨型 Context 广播，顶部操作栏 / Palette / Canvas 主体均不感知。
// ============================================================================

/** 路径数组 → 稳定字符串 key（JSON 序列化，任意 key 内容均安全） */
export function toPathKey(path: string[]): string {
  return JSON.stringify(path);
}

export interface SelectionStore {
  /** 订阅选中变化；返回取消订阅函数（供 useSyncExternalStore 消费） */
  subscribe(listener: () => void): () => void;
  /** 当前选中路径（数组引用仅在 set 时替换，可作稳定快照） */
  getPath(): string[] | null;
  /** 当前选中路径的稳定字符串 key（null 表示未选中） */
  getPathKey(): string | null;
  /** 指定 pathKey 是否命中当前选中（供按节点精准订阅） */
  isSelected(pathKey: string): boolean;
  /** 更新选中；与当前选中相同时不通知（避免无谓重渲染） */
  set(path: string[] | null): void;
}

export function createSelectionStore(): SelectionStore {
  let path: string[] | null = null;
  let pathKey: string | null = null;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getPath() {
      return path;
    },
    getPathKey() {
      return pathKey;
    },
    isSelected(key) {
      return pathKey === key;
    },
    set(next) {
      const nextKey = next === null ? null : toPathKey(next);
      if (nextKey === pathKey) {
        return;
      }
      path = next;
      pathKey = nextKey;
      // 快照遍历：允许订阅者在通知中安全退订
      for (const listener of [...listeners]) {
        listener();
      }
    },
  };
}
