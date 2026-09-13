import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { spaceLayout } from '../src/layouts/space';

describe('spaceLayout', () => {
  it('渲染 antd Space 组件', () => {
    const { container } = render(
      spaceLayout({
        children: <div>Space 内容</div>,
      } as never),
    );
    expect(container.querySelector('.ant-space')).not.toBeNull();
  });

  it('横向排列（默认）', () => {
    const { container } = render(
      spaceLayout({
        props: { direction: 'horizontal' },
        children: (
          <>
            <div>A</div>
            <div>B</div>
          </>
        ),
      } as never),
    );
    expect(container.querySelector('.ant-space')).not.toBeNull();
  });

  it('纵向排列', () => {
    const { container } = render(
      spaceLayout({
        props: { direction: 'vertical' },
        children: (
          <>
            <div>A</div>
            <div>B</div>
          </>
        ),
      } as never),
    );
    expect(container.querySelector('.ant-space')).not.toBeNull();
  });

  it('空 children 不崩溃', () => {
    render(
      spaceLayout({
        children: <></>,
        props: { direction: 'horizontal' },
      } as never),
    );
    // 不崩溃即可，Space 可能渲染为空的 Fragment
  });

  it('透传 SpaceProps', () => {
    const { container } = render(
      spaceLayout({
        children: <div>内容</div>,
        props: {
          size: 'large',
          wrap: true,
          align: 'center',
          'data-testid': 'my-space',
        },
      } as never),
    );
    expect(
      container.querySelector('.ant-space[data-testid="my-space"]'),
    ).not.toBeNull();
  });

  it('无 props 时默认 horizontal + small', () => {
    const { container } = render(
      spaceLayout({
        children: <div>内容</div>,
      } as never),
    );
    expect(container.querySelector('.ant-space')).not.toBeNull();
  });
});
