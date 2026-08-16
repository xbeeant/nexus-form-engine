import { GridContext } from '@xbeeant/form-engine-react';
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
  // tailwind 风格的 grid：
  // - gridTemplateColumns 实际声明 N 列（N = column），而非 24 栅格
  // - 子项可通过 colSpan 横跨 N 列（gridColumn: span N，tailwind 等价于 col-span-N）
  // - 子项未设置 colSpan 时默认占 1 列
  const resolvedColumn = Math.max(1, column);

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${resolvedColumn}, 1fr)`,
    gap: `${gap}px`,
    marginBottom: 16,
  };
  return (
    <GridContext.Provider value={{ column: resolvedColumn }}>
      <div style={style}>{children}</div>
    </GridContext.Provider>
  );
};
