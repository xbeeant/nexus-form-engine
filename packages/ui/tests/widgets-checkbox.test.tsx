import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { checkboxWidget } from '../src/widgets/checkbox';

describe('checkboxWidget', () => {
  it('渲染 antd Checkbox 控件', () => {
    const { container } = render(
      checkboxWidget({
        value: true,
        onChange: () => {},
        title: '同意条款',
      } as never),
    );
    expect(container.querySelector('.ant-checkbox')).not.toBeNull();
  });

  it('value=true 时复选框选中', () => {
    const { container } = render(
      checkboxWidget({
        value: true,
        onChange: () => {},
      } as never),
    );
    const checkbox = container.querySelector('.ant-checkbox-checked');
    expect(checkbox).not.toBeNull();
  });

  it('value=false 时复选框未选中', () => {
    const { container } = render(
      checkboxWidget({
        value: false,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-checkbox-checked')).toBeNull();
  });

  it('显示 title 作为标签文本', () => {
    const { container } = render(
      checkboxWidget({
        value: true,
        onChange: () => {},
        title: '记住我',
      } as never),
    );
    expect(container.textContent).toContain('记住我');
  });

  it('options 配置时显示对应的 checked 标签', () => {
    const { container } = render(
      checkboxWidget({
        value: true,
        options: [{ label: '已选中', value: 'true' }],
        onChange: () => {},
        title: '标题',
      } as never),
    );
    expect(container.textContent).toContain('已选中');
  });

  it('disabled 时复选框禁用', () => {
    const { container } = render(
      checkboxWidget({
        value: true,
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const checkbox = container.querySelector('.ant-checkbox-disabled');
    expect(checkbox).not.toBeNull();
  });

  it('loading 时复选框禁用', () => {
    const { container } = render(
      checkboxWidget({
        value: true,
        loading: true,
        onChange: () => {},
      } as never),
    );
    const checkbox = container.querySelector('.ant-checkbox-disabled');
    expect(checkbox).not.toBeNull();
  });

  it('readOnly 时渲染 ReadOnlyDisplay 显示是/否', () => {
    const { container } = render(
      checkboxWidget({
        value: true,
        options: [{ label: '启用', value: 'true' }],
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-checkbox')).toBeNull();
    // boolean 值在 ReadOnlyDisplay 中优先走 isPrimitive → 返回 是/否
    expect(container.textContent).toBe('是');
  });

  it('readOnly 时 value=true 渲染 是', () => {
    const { container } = render(
      checkboxWidget({
        value: true,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('是');
  });

  it('readOnly 时 value=false 渲染 否', () => {
    const { container } = render(
      checkboxWidget({
        value: false,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('否');
  });

  it('透传 rest props', () => {
    const { container } = render(
      checkboxWidget({
        value: true,
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    // Checkbox 的 rest props 会传给外层容器
    expect(container.querySelector('.ant-checkbox-wrapper')).not.toBeNull();
  });
});
