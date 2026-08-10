// ============================================================================
// @nexus/form-engine-designer — 可拖拽调整宽度 / 可折叠面板
// ============================================================================

import { Button } from 'antd';
import type { CSSProperties} from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ResizablePanelProps {
  /** 面板位于左侧还是右侧（决定拖拽手柄位置） */
  side: 'left' | 'right';
  /** 默认展开宽度（px） */
  defaultWidth: number;
  /** 最小宽度 */
  minWidth: number;
  /** 最大宽度 */
  maxWidth: number;
  /** 面板内容 */
  children: React.ReactNode;
  /** 折叠状态时的竖排标题 */
  collapsedTitle: string;
}

/**
 * 可拖拽调整宽度的侧边面板，支持折叠/展开。
 *
 * - 拖拽手柄位于面板内侧边缘（左面板：右边缘，右面板：左边缘）
 * - 折叠按钮位于手柄附近的一角
 * - 拖拽时全局禁用文本选中，防止误操作
 */
export function ResizablePanel({
  side,
  defaultWidth,
  minWidth,
  maxWidth,
  children,
  collapsedTitle,
}: ResizablePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);

  // 折叠前记忆宽度，展开时恢复
  const preCollapseWidthRef = useRef(defaultWidth);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      if (prev) {
        // 展开：恢复之前宽度
        setWidth(preCollapseWidthRef.current);
      } else {
        // 折叠：记忆当前宽度
        preCollapseWidthRef.current = width;
      }
      return !prev;
    });
  }, [width]);

  // ─── 拖拽调整宽度 ─────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;

      const next = side === 'left'
        ? e.clientX - rect.left    // 左面板：拖右边缘 = 距左边界距离
        : rect.right - e.clientX;  // 右面板：拖左边缘 = 距右边界距离

      setWidth(Math.max(minWidth, Math.min(maxWidth, Math.round(next))));
    };

    const handleMouseUp = () => setDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 拖拽时禁用文本选中 & 全局 col-resize 光标
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragging, minWidth, maxWidth, side]);

  // ─── 渲染 ─────────────────────────────────────────────────────
  const isLeft = side === 'left';
  const collapsedWidth = 36;

  const containerStyle: CSSProperties = {
    width: collapsed ? collapsedWidth : width,
    flexShrink: 0,
    overflow: 'hidden',
    transition: dragging ? 'none' : 'width 180ms ease',
    position: 'relative',
  };

  const handleClass = [
    'nexus-resize-handle',
    dragging ? 'nexus-resize-active' : '',
    isLeft ? '' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleStyle: CSSProperties = isLeft ? { right: -2 } : { left: -2 };

  // 折叠按钮跟随面板侧
  const toggleBtnStyle: CSSProperties = {
    position: 'absolute',
    top: 4,
    zIndex: 20,
    padding: '0 4px',
    minWidth: 24,
    height: 24,
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  if (isLeft) {
    toggleBtnStyle.right = collapsed ? 0 : 4;
  } else {
    toggleBtnStyle.left = collapsed ? 0 : 4;
  }

  // 折叠态竖排标题
  const collapsedLabel =
    collapsed && collapsedTitle ? (
      <div className='h-full flex items-center justify-center select-none'>
        <span
          className='text-[11px] text-[#999] whitespace-nowrap'
          style={{ writingMode: 'vertical-lr', letterSpacing: 2 }}
        >
          {collapsedTitle}
        </span>
      </div>
    ) : null;

  // 拖拽蒙层：防止 iframe / canvas 内容吞掉 mousemove 事件
  const dragOverlay =
    dragging ? (
      <div
        className='fixed inset-0 z-[9999]'
        style={{ cursor: 'col-resize' }}
      />
    ) : null;

  return (
    <>
      {dragOverlay}
      <div ref={panelRef} style={containerStyle}>
        {/* 拖拽手柄 */}
        <div
          className={handleClass}
          style={handleStyle}
          onMouseDown={handleMouseDown}
        />

        {/* 折叠/展开按钮 */}
        <Button
          type='text'
          size='small'
          onClick={toggle}
          style={toggleBtnStyle}
          title={collapsed ? `展开${collapsedTitle}` : `折叠${collapsedTitle}`}
        >
          {collapsed ? (isLeft ? '▶' : '◀') : (isLeft ? '◀' : '▶')}
        </Button>

        {/* 折叠时仅显示竖排标题，展开时渲染完整内容 */}
        {collapsed ? collapsedLabel : children}
      </div>
    </>
  );
}
