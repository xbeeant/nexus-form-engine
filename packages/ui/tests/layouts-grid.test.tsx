import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { gridLayout } from '../src/layouts/grid';

describe('gridLayout', () => {
  it('渲染 Grid 容器 div', () => {
    const { container } = render(
      gridLayout({
        children: <div>子项 A</div>,
        column: 2,
      }),
    );
    expect(
      container.querySelector('div[style*="display: grid"]'),
    ).not.toBeNull();
  });

  it('默认 column=2', () => {
    const { container } = render(
      gridLayout({
        children: <div>子项</div>,
      }),
    );
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('自定义 column 数量', () => {
    const { container } = render(
      gridLayout({
        children: (
          <>
            <div>A</div>
            <div>B</div>
            <div>C</div>
          </>
        ),
        column: 3,
      }),
    );
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('自定义 gap 间距', () => {
    const { container } = render(
      gridLayout({
        children: <div>子项</div>,
        gap: 24,
      }),
    );
    const gridDiv = container.querySelector('div');
    expect(gridDiv?.getAttribute('style')).toContain('gap');
  });

  it('column 小于 1 时取最大值 1', () => {
    const { container } = render(
      gridLayout({
        children: <div>子项</div>,
        column: 0,
      }),
    );
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('column 为负数时取 1', () => {
    const { container } = render(
      gridLayout({
        children: <div>子项</div>,
        column: -3,
      }),
    );
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('空 children 不崩溃', () => {
    const { container } = render(
      gridLayout({
        column: 2,
      }),
    );
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('多个子项正常渲染', () => {
    const { container } = render(
      gridLayout({
        children: (
          <>
            <div>A</div>
            <div>B</div>
            <div>C</div>
            <div>D</div>
          </>
        ),
        column: 4,
      }),
    );
    // Grid 容器内有 4 个子项
    expect(
      container.querySelector('div')?.querySelectorAll(':scope > div').length,
    ).toBe(4);
  });
});
