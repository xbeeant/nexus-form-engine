import type { GridContextValue } from '../contexts/GridContext';

/**
 * resolveColSpan — 统一解析子项在父 Grid 中的跨列数
 */
export function resolveColSpan(
  colSpan: number | undefined,
  gridCtx: GridContextValue | null,
): number | undefined {
  if (colSpan !== undefined) {
    return colSpan;
  }

  // 在 grid 容器内：把 24 栅格语义缩放到当前 column
  if (gridCtx && gridCtx.column > 0) {
    return Math.max(1, Math.round(gridCtx.column / 24));
  }
}
