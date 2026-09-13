import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { tabsLayout } from '../src/layouts/tabs';

describe('tabsLayout', () => {
  it('渲染 antd Tabs 组件', () => {
    function TestTabs() {
      return tabsLayout({
        node: {
          children: [
            { title: '标签 1' },
            { title: '标签 2' },
            { title: '标签 3' },
          ],
        },
        children: [
          <div key='0'>内容 1</div>,
          <div key='1'>内容 2</div>,
          <div key='2'>内容 3</div>,
        ],
      });
    }
    const { container } = render(<TestTabs />);
    expect(container.querySelector('.ant-tabs')).not.toBeNull();
  });

  it('标签标题正确显示', () => {
    function TestTabs() {
      return tabsLayout({
        node: {
          children: [{ title: '标签 1' }, { title: '标签 2' }],
        },
        children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
      });
    }
    const { container } = render(<TestTabs />);
    expect(container.textContent).toContain('标签 1');
    expect(container.textContent).toContain('标签 2');
    expect(container.textContent).toContain('内容 1');
  });

  it('无 title 时使用默认标签名', () => {
    function TestTabs() {
      return tabsLayout({
        node: { children: [{}] },
        children: [<div key='0'>内容</div>],
      });
    }
    const { container } = render(<TestTabs />);
    expect(container.textContent).toContain('Tab 1');
  });

  it('空节点不崩溃', () => {
    function TestTabs() {
      return tabsLayout({ node: undefined, children: [] });
    }
    const { container } = render(<TestTabs />);
    expect(container.querySelector('.ant-tabs')).not.toBeNull();
  });

  it('空 children 不崩溃', () => {
    function TestTabs() {
      return tabsLayout({
        node: { children: [{ title: 'Tab' }] },
        children: [],
      });
    }
    const { container } = render(<TestTabs />);
    expect(container.querySelector('.ant-tabs')).not.toBeNull();
  });

  it('默认激活第一个 tab', () => {
    function TestTabs() {
      return tabsLayout({
        node: {
          children: [{ title: '标签 1' }, { title: '标签 2' }],
        },
        children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
      });
    }
    const { container } = render(<TestTabs />);
    const activeTab = container.querySelector('.ant-tabs-tab-active');
    expect(activeTab).not.toBeNull();
  });

  it('透传 props 到 Tabs', () => {
    function TestTabs() {
      return tabsLayout({
        node: { children: [{ title: 'Tab' }] },
        children: [<div key='0'>内容</div>],
        props: { size: 'small' },
      });
    }
    const { container } = render(<TestTabs />);
    expect(container.querySelector('.ant-tabs')).not.toBeNull();
  });
});
