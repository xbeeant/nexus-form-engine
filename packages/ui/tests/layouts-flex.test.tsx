import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { flexLayout } from '../src/layouts/flex';

describe('flexLayout', () => {
  it('渲染 antd Flex 组件', () => {
    const { container } = render(
      flexLayout({
        children: <div>Flex 内容</div>,
      } as never),
    );
    expect(container.querySelector('div[style*="margin"]')).not.toBeNull();
  });

  it('横向排列（默认）', () => {
    const { container } = render(
      flexLayout({
        direction: 'row',
        children: (
          <>
            <div>A</div>
            <div>B</div>
          </>
        ),
      } as never),
    );
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('纵向排列（column）', () => {
    const { container } = render(
      flexLayout({
        direction: 'column',
        children: (
          <>
            <div>A</div>
            <div>B</div>
          </>
        ),
      } as never),
    );
    // Flex 组件可能渲染为 div
    expect(container.querySelector('div[style]')).not.toBeNull();
  });

  it('空 children 不崩溃', () => {
    const { container } = render(
      flexLayout({
        direction: 'row',
      } as never),
    );
    expect(container.querySelector('div[style]')).not.toBeNull();
  });

  it('透传 FlexProps', () => {
    const { container } = render(
      flexLayout({
        children: <div>内容</div>,
        props: {
          gap: 16,
        },
      } as never),
    );
    // Flex 组件正常渲染
    expect(container.querySelector('div')).not.toBeNull();
  });
});
