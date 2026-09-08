import { createContext } from 'react';

// 24 栅格总宽度（全表单统一基准，各层 grid 均以此为跨度总数）
export const GRID_TOTAL = 24;

// 子项未显式设置 width/colSpan 时按此规则计算默认跨度
export interface GridContextValue {
  /** 每行默认均分列数：未显式设置 width/colSpan 的子项默认跨度 = round(GRID_TOTAL/column) */
  column: number;
}
export const GridContext = createContext<GridContextValue | null>(null);
