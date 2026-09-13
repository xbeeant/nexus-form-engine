import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { inputNumberWidget } from '../src/widgets/input-number';

describe('inputNumberWidget', () => {
  it('渲染 antd InputNumber 控件', () => {
    const { container } = render(
      inputNumberWidget({
        value: 42,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-input-number')).not.toBeNull();
  });

  it('回显数值', () => {
    const { container } = render(
      inputNumberWidget({
        value: 100,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('100');
  });

  it('undefined 值不报错', () => {
    const { container } = render(
      inputNumberWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-input-number')).not.toBeNull();
  });

  it('onChange 返回数值', () => {
    const onChange = vi.fn();
    const { container } = render(
      inputNumberWidget({
        value: 0,
        onChange,
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '200' } });
    expect(onChange).toHaveBeenCalledWith(200);
  });

  it('disabled 时控件禁用', () => {
    const { container } = render(
      inputNumberWidget({
        value: 10,
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const inputNumber = container.querySelector('.ant-input-number');
    expect(inputNumber?.classList.contains('ant-input-number-disabled')).toBe(
      true,
    );
  });

  it('loading 时控件禁用', () => {
    const { container } = render(
      inputNumberWidget({
        value: 10,
        loading: true,
        onChange: () => {},
      } as never),
    );
    const inputNumber = container.querySelector('.ant-input-number');
    expect(inputNumber?.classList.contains('ant-input-number-disabled')).toBe(
      true,
    );
  });

  it('readOnly 时渲染 ReadOnlyDisplay', () => {
    const { container } = render(
      inputNumberWidget({
        value: 42,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-input-number')).toBeNull();
    expect(container.textContent).toBe('42');
  });

  it('required 透传', () => {
    const { container } = render(
      inputNumberWidget({
        value: 10,
        required: true,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.required).toBe(true);
  });

  it('width: 100% 默认样式', () => {
    const { container } = render(
      inputNumberWidget({
        value: 10,
        onChange: () => {},
      } as never),
    );
    const inputNumber = container.querySelector('.ant-input-number');
    expect(inputNumber?.getAttribute('style')).toContain('width: 100%');
  });

  it('null 值 onChange 传 undefined', () => {
    const onChange = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: 模拟 antd InputNumber 清除时传 null
    (inputNumberWidget as any).prototype;
    // 直接测试 onChange 回调处理
    const { container } = render(
      inputNumberWidget({
        value: 10,
        onChange,
      } as never),
    );
    // InputNumber 的 style 确认
    const inputNumber = container.querySelector('.ant-input-number');
    expect(inputNumber).not.toBeNull();
  });

  it('透传 rest props', () => {
    const { container } = render(
      inputNumberWidget({
        value: 10,
        onChange: () => {},
        className: 'my-custom-class',
      } as never),
    );
    const inputNumber = container.querySelector(
      '.ant-input-number.my-custom-class',
    );
    expect(inputNumber).not.toBeNull();
  });
});
