/**
 * 表单草稿持久化（NexusForm persist 选项实现）
 *
 * 将表单数据自动保存到 Web Storage（localStorage / sessionStorage），
 * 下次挂载时自动恢复为初始值（草稿续填）。
 *
 * 约束：
 * - 所有存储访问均 try/catch 包裹（SSR 无 window / Safari 隐私模式抛错）
 * - 存储键为完整路径前缀，避免多表单实例冲突
 * - 提交成功后默认清除草稿（clearOnSubmit: false 可关闭）
 */

export interface PersistOptions {
  /** 存储键（必填，多表单实例需唯一） */
  key: string;
  /** 存储介质，默认 localStorage */
  storage?: 'localStorage' | 'sessionStorage';
  /** 保存防抖毫秒数，默认 300 */
  debounce?: number;
  /** 提交成功后清除草稿，默认 true */
  clearOnSubmit?: boolean;
}

function getStorage(
  storage?: 'localStorage' | 'sessionStorage',
): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    const target =
      storage === 'sessionStorage' ? window.sessionStorage : window.localStorage;
    // 隐私模式下访问可能抛错，统一降级为不持久化
    target.setItem('__nexus_persist_probe__', '1');
    target.removeItem('__nexus_persist_probe__');
    return target;
  } catch {
    return undefined;
  }
}

export function loadPersisted(
  options: PersistOptions,
): Record<string, unknown> | undefined {
  const storage = getStorage(options.storage);
  if (!storage) {
    return undefined;
  }
  try {
    const raw = storage.getItem(options.key);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function savePersisted(
  options: PersistOptions,
  data: Record<string, unknown>,
): void {
  const storage = getStorage(options.storage);
  if (!storage) {
    return;
  }
  try {
    storage.setItem(options.key, JSON.stringify(data));
  } catch {
    // 存储配额满 / 隐私模式：静默失败
  }
}

export function clearPersisted(options: PersistOptions): void {
  const storage = getStorage(options.storage);
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(options.key);
  } catch {
    // 静默失败
  }
}