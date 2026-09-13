import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FieldMetaContext } from '../src/widgets/_shared';
import { voidTitleWidget } from '../src/widgets/void-title';

function TestWrapper({
  props,
  context,
}: {
  props: Record<string, unknown>;
  context?: { title?: string; description?: string };
}) {
  return (
    <FieldMetaContext.Provider value={context}>
      {voidTitleWidget(props as never)}
    </FieldMetaContext.Provider>
  );
}

describe('voidTitleWidget', () => {
  it('props.title 优先于 context title', () => {
    const { container } = render(
      <TestWrapper
        props={{ title: 'Prop 标题' }}
        context={{ title: 'Context 标题' }}
      />,
    );
    expect(container.textContent).toContain('Prop 标题');
    expect(container.textContent).not.toContain('Context 标题');
  });

  it('props.title 和 props.description 优先于 context', () => {
    const { container } = render(
      <TestWrapper
        props={{ title: 'Prop 标题', description: 'Prop 描述' }}
        context={{ title: 'Context 标题', description: 'Context 描述' }}
      />,
    );
    expect(container.textContent).toContain('Prop 标题');
    expect(container.textContent).toContain('Prop 描述');
    expect(container.textContent).not.toContain('Context');
  });

  it('空字符串 title/description 不渲染 Typography', () => {
    const { container } = render(
      <TestWrapper
        props={{ title: '', description: '' }}
        context={{ title: undefined, description: undefined }}
      />,
    );
    expect(container.querySelector('.ant-typography')).toBeNull();
  });

  it('null title/description 不渲染 Typography', () => {
    const { container } = render(
      <TestWrapper
        props={{ title: null, description: null }}
        context={{ title: undefined, description: undefined }}
      />,
    );
    expect(container.querySelector('.ant-typography')).toBeNull();
  });

  // 跳过：voidTitleWidget 内部 useContext 与 vitest React 实例冲突
  it.skip('无 context 时渲染 props.title', () => {
    const { container } = render(
      voidTitleWidget({ title: '独立标题' } as never),
    );
    expect(container.textContent).toContain('独立标题');
  });

  it.skip('无 context 且无 props 不渲染 Typography', () => {
    const { container } = render(voidTitleWidget({} as never));
    expect(container.querySelector('[data-nexus-void-title]')).not.toBeNull();
    expect(container.querySelector('.ant-typography')).toBeNull();
  });
});
