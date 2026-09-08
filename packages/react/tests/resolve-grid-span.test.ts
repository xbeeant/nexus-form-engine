import { describe, expect, it } from 'vitest';

import type { GridContextValue } from '../src/contexts/grid-context';
import { resolveGridSpan } from '../src/utils/resolve-grid-span';

// ── 24 栅格跨度解析单元测试 ────────────────────────────────────────────────
// 语义：表单整体为 24 栅格，
// - 显式 colSpan 优先（24 栅格单位）
// - width（百分比字符串 / 0~1 数值比例）换算为 round(24 × 比例)
// - 未设置 width/colSpan 时按 grid 的 column 均分 round(24/column)

const formGrid: GridContextValue = { column: 2 };
const singleCol: GridContextValue = { column: 1 };

describe('resolveGridSpan', () => {
  it('显式 colSpan 优先，直接作为 24 栅格跨度', () => {
    expect(resolveGridSpan('50%', 6, formGrid)).toBe(6);
    expect(resolveGridSpan(undefined, 24, formGrid)).toBe(24);
    expect(resolveGridSpan(undefined, 0, formGrid)).toBe(0);
  });

  it('width 百分比字符串换算为 24 栅格跨度（占比）', () => {
    expect(resolveGridSpan('50%', undefined, formGrid)).toBe(12); // 半宽
    expect(resolveGridSpan('25%', undefined, formGrid)).toBe(6); // 1/4 宽
    expect(resolveGridSpan('75%', undefined, formGrid)).toBe(18); // 3/4 宽
    expect(resolveGridSpan('100%', undefined, formGrid)).toBe(24); // 全宽
    expect(resolveGridSpan('33.33%', undefined, formGrid)).toBe(8); // 约 1/3 宽
  });

  it('width 数值（0~1 比例）同样换算为 24 栅格跨度', () => {
    expect(resolveGridSpan(0.5, undefined, formGrid)).toBe(12);
    expect(resolveGridSpan(1, undefined, formGrid)).toBe(24);
    expect(resolveGridSpan(0.25, undefined, formGrid)).toBe(6);
  });

  it('width 非法值回退到按 column 均分', () => {
    // '500px' / 空串 / NaN 无法解析为比例 → 回退默认均分
    expect(resolveGridSpan('500px', undefined, formGrid)).toBe(12);
    expect(resolveGridSpan('', undefined, formGrid)).toBe(12);
  });

  it('未设置 width/colSpan 时按 grid 的 column 均分默认占位', () => {
    expect(resolveGridSpan(undefined, undefined, { column: 2 })).toBe(12);
    expect(resolveGridSpan(undefined, undefined, { column: 3 })).toBe(8);
    expect(resolveGridSpan(undefined, undefined, { column: 4 })).toBe(6);
    expect(resolveGridSpan(undefined, undefined, { column: 1 })).toBe(24);
  });

  it('column 无法整除 24 时四舍五入兜底（至少 1 格）', () => {
    expect(resolveGridSpan(undefined, undefined, { column: 5 })).toBe(5);
    expect(
      resolveGridSpan(undefined, undefined, { column: 0 }),
    ).toBeUndefined();
  });

  it('无 grid 上下文且无 width/colSpan 时返回 undefined（退出栅格参与）', () => {
    expect(resolveGridSpan(undefined, undefined, null)).toBeUndefined();
    // 无 grid 上下文（inline/flex/普通流式）时 width 字面生效，不参与栅格
    expect(resolveGridSpan('50%', undefined, null)).toBeUndefined();
    // 显式 colSpan 仍解析（明确声明栅格跨度）
    expect(resolveGridSpan('50%', 12, null)).toBe(12);
  });

  it('无论 grid 列数，width 占比语义不受影响（column 只决定换行默认）', () => {
    expect(resolveGridSpan('50%', undefined, singleCol)).toBe(12);
    expect(resolveGridSpan('25%', undefined, { column: 3 })).toBe(6);
    // 一行两个 50% 字段跨满 24 栅格（2×12=24）
    expect(resolveGridSpan('50%', undefined, formGrid) * 2).toBe(24);
  });
});
