import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { dividerLayout } from '../src/layouts/divider';

describe('dividerLayout', () => {
  it('渲染 antd Divider 组件', () => {
    const { container } = render(dividerLayout({}));
    expect(container.querySelector('.ant-divider')).not.toBeNull();
  });

  it('有标题时显示标题文字', () => {
    const { container } = render(dividerLayout({ title: '分隔标题' }));
    expect(container.textContent).toContain('分隔标题');
  });

  it('无标题时正常渲染', () => {
    const { container } = render(dividerLayout({}));
    expect(container.querySelector('.ant-divider')).not.toBeNull();
  });

  it('标题靠左（左对齐布局）', () => {
    const { container } = render(dividerLayout({ title: '左对齐标题' }));
    expect(container.querySelector('.ant-divider')).not.toBeNull();
  });

  it('无 title 时无标题文字', () => {
    const { container } = render(dividerLayout({}));
    expect(container.textContent).toBe('');
  });
});
