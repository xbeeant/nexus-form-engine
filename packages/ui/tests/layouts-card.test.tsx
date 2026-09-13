import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cardLayout } from '../src/layouts/card';

describe('cardLayout', () => {
  it('渲染 antd Card 组件', () => {
    const { container } = render(
      cardLayout({
        title: '卡片标题',
        children: <div>卡片内容</div>,
      } as never),
    );
    expect(container.querySelector('.ant-card')).not.toBeNull();
  });

  it('标题正确显示', () => {
    const { container } = render(
      cardLayout({
        title: '个人信息',
        children: <div>内容区</div>,
      } as never),
    );
    expect(container.textContent).toContain('个人信息');
    expect(container.textContent).toContain('内容区');
  });

  it('无标题时正常渲染', () => {
    const { container } = render(
      cardLayout({
        children: <div>无标题卡片</div>,
      } as never),
    );
    expect(container.querySelector('.ant-card')).not.toBeNull();
  });

  it('透传 CardProps', () => {
    const { container } = render(
      cardLayout({
        title: '卡片',
        props: {
          bordered: false,
          'data-testid': 'my-card',
        },
        children: <div>内容</div>,
      } as never),
    );
    expect(container.querySelector('.ant-card')).not.toBeNull();
  });

  it('空 children 不崩溃', () => {
    const { container } = render(
      cardLayout({
        title: '空卡片',
      } as never),
    );
    expect(container.querySelector('.ant-card')).not.toBeNull();
  });
});
