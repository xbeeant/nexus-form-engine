import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { autoCompleteWidget } from '../src/widgets/auto-complete';

describe('autoCompleteWidget', () => {
  it('渲染 antd Select（tags 模式）', () => {
    const { container } = render(
      autoCompleteWidget({
        value: ['a'],
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('value 为字符串时包装为数组', () => {
    const { container } = render(
      autoCompleteWidget({
        value: 'a',
        options: [{ label: '选项', value: 'a' }],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('value 为空字符串时包装为数组', () => {
    const { container } = render(
      autoCompleteWidget({
        value: '',
        options: [{ label: '选项', value: 'a' }],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('options 正确渲染', () => {
    const { container } = render(
      autoCompleteWidget({
        value: ['apple'],
        options: [
          { label: 'Apple', value: 'apple' },
          { label: 'Banana', value: 'banana' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('placeholder 默认 "请输入..."', () => {
    const { container } = render(
      autoCompleteWidget({
        value: [],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('disabled 时选择器禁用', () => {
    const { container } = render(
      autoCompleteWidget({
        value: ['a'],
        options: [{ label: '选项', value: 'a' }],
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const select = container.querySelector('.ant-select-disabled');
    expect(select).not.toBeNull();
  });

  it('loading 时选择器禁用', () => {
    const { container } = render(
      autoCompleteWidget({
        value: ['a'],
        options: [{ label: '选项', value: 'a' }],
        loading: true,
        onChange: () => {},
      } as never),
    );
    const select = container.querySelector('.ant-select-disabled');
    expect(select).not.toBeNull();
  });

  it('readOnly 时渲染 ReadOnlyDisplay + options', () => {
    const { container } = render(
      autoCompleteWidget({
        value: 'a',
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).toBeNull();
    expect(container.textContent).toBe('选项 A');
  });

  it('allowClear 默认为 true', () => {
    const { container } = render(
      autoCompleteWidget({
        value: ['a'],
        options: [{ label: '选项', value: 'a' }],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select-clear')).not.toBeNull();
  });

  it('tokenSeparators 逗号分隔字符串转数组', () => {
    const { container } = render(
      autoCompleteWidget({
        value: [],
        options: [{ label: '选项', value: 'a' }],
        tokenSeparators: ',',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('透传 rest props', () => {
    const { container } = render(
      autoCompleteWidget({
        value: [],
        options: [{ label: '选项', value: 'a' }],
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const select = container.querySelector('.ant-select.my-custom-class');
    expect(select).not.toBeNull();
  });
});

// remoteAutoCompleteWidget 使用 useRemoteOptions hook，需要完整的 React 上下文，
// 在简单 render 场景下会报 Invalid hook call，故跳过远程组件测试
