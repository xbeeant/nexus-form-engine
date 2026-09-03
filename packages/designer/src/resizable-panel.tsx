// ============================================================================
// @xbeeant/form-engine-designer — 可拖拽调整宽度 / 可折叠面板
// ============================================================================

import type { CSSProperties } from 'react';
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
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const next =
        side === 'left'
          ? e.clientX - rect.left // 左面板：拖右边缘 = 距左边界距离
          : rect.right - e.clientX; // 右面板：拖左边缘 = 距右边界距离

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
    background: collapsed ? '#fafafa' : undefined,
  };

  const handleClass = [
    'nexus-resize-handle',
    dragging ? 'nexus-resize-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleStyle: CSSProperties = isLeft ? { right: -2 } : { left: -2 };

  // 折叠按钮跟随面板侧
  const toggleBtnStyle: CSSProperties = {
    position: 'absolute',
    top: 8,
    zIndex: 20,
  };
  if (isLeft) {
    toggleBtnStyle.right = collapsed ? 7 : 8;
  } else {
    toggleBtnStyle.left = collapsed ? 7 : 8;
  }

  // chevron-right 基准图标，按面板侧/折叠态旋转
  const chevronRotation = isLeft
    ? collapsed
      ? 'rotate(0deg)'
      : 'rotate(180deg)'
    : collapsed
      ? 'rotate(180deg)'
      : 'rotate(0deg)';

  // 折叠态竖排标题
  const collapsedLabel =
    collapsed && collapsedTitle ? (
      <div className='flex h-full items-center justify-center bg-[#fafafa] select-none'>
        <span
          className='text-[11px] font-medium text-[#999] whitespace-nowrap tracking-[3px]'
          style={{ writingMode: 'vertical-lr' }}
        >
          {collapsedTitle}
        </span>
      </div>
    ) : null;

  // 拖拽蒙层：防止 iframe / canvas 内容吞掉 mousemove 事件
  const dragOverlay = dragging ? (
    <div className='fixed inset-0 z-[9999]' style={{ cursor: 'col-resize' }} />
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
        <button
          type='button'
          className='nexus-panel-toggle'
          style={toggleBtnStyle}
          onClick={toggle}
          title={collapsed ? `展开${collapsedTitle}` : `折叠${collapsedTitle}`}
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? `展开${collapsedTitle}` : `折叠${collapsedTitle}`
          }
        >
          <svg
            width='10'
            height='10'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            strokeLinecap='round'
            strokeLinejoin='round'
            style={{
              transform: chevronRotation,
              transition: 'transform 180ms ease',
            }}
            aria-hidden='true'
          >
            <polyline points='9 18 15 12 9 6' />
          </svg>
        </button>

        {/* 折叠时仅显示竖排标题，展开时渲染完整内容 */}
        {collapsed ? collapsedLabel : children}
      </div>
    </>
  );
}
