import { GRID_TOTAL, GridContext } from '@xbeeant/form-engine-react';
import type { CSSProperties } from 'react';

export const gridLayout = ({
  children,
  column = 2,
  gap = 12,
}: {
  children?: React.ReactNode;
  column?: number;
  gap?: number;
}) => {
  // 统一 24 栅格语义（与表单顶层一致）：
  // - gridTemplateColumns 固定 24 列，而非直接声明 column 列
  // - 子项默认跨度 = round(24/column)，即一行显示 column 个等宽子项
  // - 子项可通过 width（占比）/ colSpan（24 栅格单位）调整跨度实现不等宽
  const resolvedColumn = Math.max(1, column);

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID_TOTAL}, minmax(0, 1fr))`,
    gap: `${gap}px`,
    marginBottom: 16,
  };
  return (
    <GridContext.Provider value={{ column: resolvedColumn }}>
      <div style={style}>{children}</div>
    </GridContext.Provider>
  );
};
