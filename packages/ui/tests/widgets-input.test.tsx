import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { inputWidget } from '../src/widgets/input';

describe('inputWidget', () => {
  it('渲染 antd Input 控件', () => {
    const { container } = render(
      inputWidget({
        value: 'hello',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('input')).not.toBeNull();
  });

  it('回显 value 到输入框', () => {
    const { container } = render(
      inputWidget({
        value: 'test value',
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('test value');
  });

  it('空值渲染空字符串', () => {
    const { container } = render(
      inputWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('onChange 写入新值', () => {
    const onChange = vi.fn();
    const { container } = render(
      inputWidget({
        value: '',
        onChange,
      } as never),
    );
    fireEvent.change(container.querySelector('input')!, {
      target: { value: 'new value' },
    });
    expect(onChange).toHaveBeenCalledWith('new value');
  });

  it('placeholder 透传给 Input', () => {
    const { container } = render(
      inputWidget({
        value: '',
        placeholder: '请输入内容',
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.placeholder).toBe('请输入内容');
  });

  it('disabled 时输入框禁用', () => {
    const { container } = render(
      inputWidget({
        value: 'test',
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('loading 时输入框禁用', () => {
    const { container } = render(
      inputWidget({
        value: 'test',
        loading: true,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('readOnly 时渲染 ReadOnlyDisplay 文本', () => {
    const { container } = render(
      inputWidget({
        value: 'readonly value',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('input')).toBeNull();
    expect(container.textContent).toBe('readonly value');
  });

  it('required 透传 required 属性', () => {
    const { container } = render(
      inputWidget({
        value: 'test',
        required: true,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.required).toBe(true);
  });

  it('透传 rest props', () => {
    const { container } = render(
      inputWidget({
        value: 'test',
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const input = container.querySelector<HTMLInputElement>(
      'input.my-custom-class',
    );
    expect(input).not.toBeNull();
  });
});
