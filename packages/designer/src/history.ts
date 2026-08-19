// ============================================================================
// @xbeeant/form-engine-designer — Schema 撤销/重做历史栈（纯逻辑，可独立测试）
// ============================================================================

import type { NexusSchema } from '@xbeeant/form-engine';

/** 历史记录类型 */
export type HistoryKind = 'edit' | 'replace';

/** 历史条目 */
export interface HistoryEntry {
  /** 变更前的 Schema 快照 */
  schema: NexusSchema;
  kind: HistoryKind;
  /** 触发路径（属性编辑用于合并连续 patch） */
  path: string | null;
  /** 记录时间戳（ms） */
  time: number;
}

/** 历史容量上限 */
export const HISTORY_LIMIT = 50;

/** 连续属性编辑合并窗口（ms） */
export const COALESCE_MS = 400;

/**
 * Schema 撤销/重做历史栈
 *
 * - push 记录「变更前」快照；undo 弹出并恢复，同时把当前状态压入 future
 * - 同一路径的连续属性编辑（kind='edit' 且路径相同、间隔 < COALESCE_MS）
 *   合并为一条记录（保留最早快照），避免滑块拖拽/连续输入产生海量历史
 * - 结构操作（增删/移动/重命名/整体替换）每条独立入栈
 * - 容量上限 HISTORY_LIMIT，超出后丢弃最旧记录
 */
export class SchemaHistory {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get size(): number {
    return this.past.length;
  }

  /**
   * 记录一次变更前的状态快照
   *
   * @param snapshot - 变更前的 Schema
   * @param kind - 记录类型（edit 参与合并，replace 独立入栈）
   * @param path - 编辑路径（同路径 + 窗口内的连续 edit 合并）
   * @param time - 时间戳（默认当前时间，测试可注入）
   */
  push(
    snapshot: NexusSchema,
    kind: HistoryKind = 'edit',
    path: string | null = null,
    time = Date.now(),
  ): void {
    const last = this.past[this.past.length - 1];
    if (
      kind === 'edit' &&
      last &&
      last.kind === 'edit' &&
      last.path !== null &&
      last.path === path &&
      time - last.time < COALESCE_MS
    ) {
      // 合并：保留最早快照，但当前状态已变化，清空 future
      this.future = [];
      return;
    }
    this.past = [
      ...this.past.slice(-(HISTORY_LIMIT - 1)),
      { schema: snapshot, kind, path, time },
    ];
    this.future = [];
  }

  /**
   * 撤销：恢复最近一次变更前的快照
   *
   * @param current - 当前 Schema（压入 future 供重做）
   * @returns 恢复后的 Schema；无可撤销记录时返回 null
   */
  undo(current: NexusSchema): NexusSchema | null {
    const entry = this.past.pop();
    if (!entry) {
      return null;
    }
    this.future = [
      ...this.future,
      { schema: current, kind: entry.kind, path: entry.path, time: Date.now() },
    ];
    return entry.schema;
  }

  /**
   * 重做：恢复最近一次撤销前的状态
   *
   * @returns 恢复后的 Schema；无可重做记录时返回 null
   */
  redo(): NexusSchema | null {
    const entry = this.future.pop();
    if (!entry) {
      return null;
    }
    this.past = [
      ...this.past,
      {
        schema: entry.schema,
        kind: entry.kind,
        path: entry.path,
        time: Date.now(),
      },
    ];
    return entry.schema;
  }

  /** 清空全部历史 */
  clear(): void {
    this.past = [];
    this.future = [];
  }
}
