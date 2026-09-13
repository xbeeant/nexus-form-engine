import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stepsLayout } from '../src/layouts/steps';

describe('stepsLayout', () => {
  it('渲染 antd Steps 组件', () => {
    function TestSteps() {
      return stepsLayout({
        node: {
          children: [
            { title: '步骤 1' },
            { title: '步骤 2' },
            { title: '步骤 3' },
          ],
        },
        children: [
          <div key='0'>内容 1</div>,
          <div key='1'>内容 2</div>,
          <div key='2'>内容 3</div>,
        ],
      });
    }
    const { container } = render(<TestSteps />);
    expect(container.querySelector('.ant-steps')).not.toBeNull();
  });

  it('步骤标题正确显示', () => {
    function TestSteps() {
      return stepsLayout({
        node: {
          children: [
            { title: '步骤 1' },
            { title: '步骤 2' },
            { title: '步骤 3' },
          ],
        },
        children: [<div key='0'>内容 1</div>],
      });
    }
    const { container } = render(<TestSteps />);
    expect(container.textContent).toContain('步骤 1');
    expect(container.textContent).toContain('步骤 2');
    expect(container.textContent).toContain('步骤 3');
  });

  it('默认激活第一个步骤并显示对应内容', () => {
    function TestSteps() {
      return stepsLayout({
        node: {
          children: [{ title: '步骤 1' }, { title: '步骤 2' }],
        },
        children: [<div key='0'>第一步</div>, <div key='1'>第二步</div>],
      });
    }
    const { container } = render(<TestSteps />);
    expect(container.textContent).toContain('第一步');
  });

  it('上一步/下一步按钮存在', () => {
    function TestSteps() {
      return stepsLayout({
        node: {
          children: [{ title: '步骤 1' }, { title: '步骤 2' }],
        },
        children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
      });
    }
    const { container } = render(<TestSteps />);
    expect(container.textContent).toContain('上一步');
    expect(container.textContent).toContain('下一步');
  });

  it('第一步时上一步按钮禁用', () => {
    function TestSteps() {
      return stepsLayout({
        node: {
          children: [{ title: '步骤 1' }, { title: '步骤 2' }],
        },
        children: [<div key='0'>内容 1</div>, <div key='1'>内容 2</div>],
      });
    }
    const { container } = render(<TestSteps />);
    const prevBtn =
      container.querySelector<HTMLButtonElement>('.ant-btn:disabled');
    expect(prevBtn).not.toBeNull();
  });

  it('无 title 时使用默认步骤名', () => {
    function TestSteps() {
      return stepsLayout({
        node: { children: [{}] },
        children: [<div key='0'>内容</div>],
      });
    }
    const { container } = render(<TestSteps />);
    expect(container.textContent).toContain('步骤');
  });

  it('空节点不崩溃', () => {
    function TestSteps() {
      return stepsLayout({ node: undefined, children: [] });
    }
    const { container } = render(<TestSteps />);
    expect(container.querySelector('.ant-steps')).not.toBeNull();
  });

  it('空 children 不崩溃', () => {
    function TestSteps() {
      return stepsLayout({
        node: { children: [{ title: '步骤' }] },
        children: [],
      });
    }
    const { container } = render(<TestSteps />);
    expect(container.querySelector('.ant-steps')).not.toBeNull();
  });
});
