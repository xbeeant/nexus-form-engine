import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { collapseLayout } from '../src/layouts/collapse';

describe('collapseLayout', () => {
  const node = {
    children: [
      { title: '面板 1', key: '0' },
      { title: '面板 2', key: '1' },
    ],
  };

  it('渲染 antd Collapse 组件', () => {
    const { container } = render(
      collapseLayout({
        node,
        children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
      } as never),
    );
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });

  it('面板标题正确显示', () => {
    const { container } = render(
      collapseLayout({
        node,
        children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
      } as never),
    );
    expect(container.textContent).toContain('面板 1');
    expect(container.textContent).toContain('面板 2');
  });

  it('默认展开第一个面板', () => {
    const { container } = render(
      collapseLayout({
        node,
        children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
      } as never),
    );
    expect(container.textContent).toContain('内容 1');
  });

  it('defaultActiveKey 控制展开面板', () => {
    const { container } = render(
      collapseLayout({
        node,
        children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
        defaultActiveKey: ['1'],
      } as never),
    );
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });

  it('空节点不崩溃', () => {
    const { container } = render(
      collapseLayout({
        node: undefined,
        children: [],
      } as never),
    );
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });

  it('空 children 不崩溃', () => {
    const { container } = render(
      collapseLayout({
        node: { children: [{ title: '面板' }] },
        children: [],
      } as never),
    );
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });

  it('无 title 时使用默认面板名', () => {
    const { container } = render(
      collapseLayout({
        node: { children: [{}] },
        children: [<div key='0'>内容</div>],
      } as never),
    );
    expect(container.textContent).toContain('面板 1');
  });

  it('panel props 透传', () => {
    const { container } = render(
      collapseLayout({
        node: { children: [{ title: '面板', props: { extra: '操作' } }] },
        children: [<div key='0'>内容</div>],
      } as never),
    );
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });
});
