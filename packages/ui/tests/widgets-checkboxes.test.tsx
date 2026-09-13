import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { checkboxesWidget } from '../src/widgets/checkboxes';

describe('checkboxesWidget', () => {
  it('渲染 antd Checkbox.Group 控件', () => {
    const { container } = render(
      checkboxesWidget({
        value: ['a', 'b'],
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
          { label: '选项 C', value: 'c' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-checkbox-group')).not.toBeNull();
  });

  it('value 数组正确回显', () => {
    const { container } = render(
      checkboxesWidget({
        value: ['a'],
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('选项 A');
    expect(container.textContent).toContain('选项 B');
  });

  it('空值渲染空数组', () => {
    const { container } = render(
      checkboxesWidget({
        value: undefined,
        options: [{ label: '选项 A', value: 'a' }],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-checkbox-group')).not.toBeNull();
  });

  it('空值回退为 []', () => {
    const { container } = render(
      checkboxesWidget({
        value: null,
        options: [{ label: '选项', value: 'a' }],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-checkbox-group')).not.toBeNull();
  });

  it('disabled 时复选框组禁用', () => {
    const { container } = render(
      checkboxesWidget({
        value: ['a'],
        options: [{ label: '选项', value: 'a' }],
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const checked = container.querySelector('.ant-checkbox-disabled');
    expect(checked).not.toBeNull();
  });

  it('loading 时复选框组禁用', () => {
    const { container } = render(
      checkboxesWidget({
        value: ['a'],
        options: [{ label: '选项', value: 'a' }],
        loading: true,
        onChange: () => {},
      } as never),
    );
    const checked = container.querySelector('.ant-checkbox-disabled');
    expect(checked).not.toBeNull();
  });

  it('readOnly 时渲染 ReadOnlyDisplay + options', () => {
    const { container } = render(
      checkboxesWidget({
        value: ['b'],
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-checkbox')).toBeNull();
    expect(container.textContent).toBe('选项 B');
  });

  it('readOnly 空数组时渲染占位符', () => {
    const { container } = render(
      checkboxesWidget({
        value: [],
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('-');
  });

  it('透传 rest props', () => {
    const { container } = render(
      checkboxesWidget({
        value: ['a'],
        options: [{ label: '选项', value: 'a' }],
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const group = container.querySelector(
      '.ant-checkbox-group.my-custom-class',
    );
    expect(group).not.toBeNull();
  });
});
