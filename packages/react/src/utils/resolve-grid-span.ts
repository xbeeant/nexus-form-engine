import { GRID_TOTAL, type GridContextValue } from '../contexts/grid-context';

/**
 * resolveGridSpan — 统一解析子项在父 24 栅格 grid 中的跨列数
 *
 * 整个表单是统一 24 栅格容器（gridTemplateColumns: repeat(24, 1fr)），
 * 子项（字段/布局/对象/分支）按以下优先级决定 gridColumn: span N：
 *
 * 1. 显式 colSpan（24 栅格单位）优先，直接作为跨度
 * 2. 处于 24 栅格上下文（gridCtx 非空）时，width（百分比字符串如 '50%'，
 *    或 0~1 数值比例）换算为 round(24 × 比例)，即占整个表单宽度的占比
 * 3. 均未设置 → 按父 grid 的 column 均分：round(24/column)，
 *    即「一行显示 column 个等宽字段」
 *
 * 返回 undefined 表示不参与栅格跨度：width 按字面百分比生效
 * （inline-block / Flex 等非栅格容器，gridCtx 为 null 时）。
 */
export function resolveGridSpan(
  width: string | number | undefined,
  colSpan: number | undefined,
  gridCtx: GridContextValue | null,
): number | undefined {
  if (colSpan !== undefined) {
    return colSpan;
  }
  // 仅在 24 栅格上下文内才按 width 换算跨度；
  // 无 grid 上下文（inline/flex/普通流式）时 width 应字面生效而非参与栅格
  if (gridCtx) {
    const ratio = normalizeWidth(width);
    if (ratio !== undefined && ratio > 0) {
      return Math.max(1, Math.round(GRID_TOTAL * ratio));
    }
  }
  if (gridCtx && gridCtx.column > 0) {
    return Math.max(1, Math.round(GRID_TOTAL / gridCtx.column));
  }
  return undefined;
}

/** 归一化 width 为 0~1 比例：百分比字符串（'50%'）或数值（0~1） */
function normalizeWidth(width?: string | number | null): number | undefined {
  if (typeof width === 'number') {
    return Number.isFinite(width) ? width : undefined;
  }

  if (width === undefined || width === null) {
    return undefined;
  }

  const trimmed = width.trim();
  if (trimmed.endsWith('%')) {
    const pct = parseFloat(trimmed);
    return Number.isFinite(pct) ? pct / 100 : undefined;
  }
  const num = Number(trimmed);
  return Number.isFinite(num) && trimmed !== '' ? num : undefined;
}
