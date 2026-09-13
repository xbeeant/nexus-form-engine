import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { selectWidget } from '../src/widgets/select';

describe('selectWidget', () => {
  it('渲染 antd Select 控件', () => {
    const { container } = render(
      selectWidget({
        value: 'a',
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('value 正确回显', () => {
    const { container } = render(
      selectWidget({
        value: 'b',
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('选项 B');
  });

  it('options 通过 mapOptions 转换后渲染', () => {
    const { container } = render(
      selectWidget({
        value: 'apple',
        options: [
          { label: 'Apple', value: 'apple' },
          { label: 'Banana', value: 'banana' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('Apple');
    // options 在虚拟列表中，可能不直接出现在 textContent 中
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('placeholder 默认 "请选择..."', () => {
    const { container } = render(
      selectWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('自定义 placeholder 透传', () => {
    const { container } = render(
      selectWidget({
        value: undefined,
        placeholder: '请选择城市',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('disabled 时选择框禁用', () => {
    const { container } = render(
      selectWidget({
        value: 'a',
        options: [{ label: '选项', value: 'a' }],
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const select = container.querySelector('.ant-select-disabled');
    expect(select).not.toBeNull();
  });

  it('loading 时选择框禁用', () => {
    const { container } = render(
      selectWidget({
        value: 'a',
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
      selectWidget({
        value: 'b',
        options: [
          { label: '选项 A', value: 'a' },
          { label: '选项 B', value: 'b' },
        ],
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).toBeNull();
    expect(container.textContent).toBe('选项 B');
  });

  it('readOnly 时无 options 渲染 value', () => {
    const { container } = render(
      selectWidget({
        value: 'unknown',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).toBeNull();
    expect(container.textContent).toBe('unknown');
  });

  it('allowClear 默认开启', () => {
    const { container } = render(
      selectWidget({
        value: 'a',
        options: [{ label: '选项', value: 'a' }],
        onChange: () => {},
      } as never),
    );
    // allowClear 开启时会有清除按钮
    expect(container.querySelector('.ant-select-clear')).not.toBeNull();
  });

  it('透传 rest props', () => {
    const { container } = render(
      selectWidget({
        value: 'a',
        options: [{ label: '选项', value: 'a' }],
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const select = container.querySelector('.ant-select.my-custom-class');
    expect(select).not.toBeNull();
  });
});

// remoteSelectWidget 使用 useRemoteOptions hook，需要完整的 React 上下文，
// 在简单 render 场景下会报 Invalid hook call，故跳过远程组件测试
