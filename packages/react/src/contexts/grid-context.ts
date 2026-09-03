import { createContext } from 'react';

// 子项未显式设置 colSpan 时使用此默认值
export interface GridContextValue {
  /** 当前 grid 的列数（tailwind colSpan 基准） */
  column: number;
}
export const GridContext = createContext<GridContextValue | null>(null);
